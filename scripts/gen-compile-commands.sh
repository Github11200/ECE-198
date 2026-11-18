#!/usr/bin/env bash
# Regenerate compile_commands.json so clangd gives intellisense for the
# Arduino sketches in Zed / VS Code.
#
# What it does:
#   1. Compiles both sketches with arduino-cli (ESP32 core), asking only for
#      the compilation database (fast, no binary output).
#   2. Merges the two databases and adds entries for the real .ino paths
#      (arduino-cli only records the preprocessed .ino.cpp copies).
#
# Requirements: arduino-cli with the esp32 core installed, clangd, and the
# .clangd + .zed/settings.json files in this repo (query-driver setup).
#
# Usage: scripts/gen-compile-commands.sh [FQBN]
#   default FQBN: esp32:esp32:esp32
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FQBN="${1:-esp32:esp32:esp32}"
BUILD_SKETCH="$REPO_ROOT/.arduino-build/sketch"
BUILD_ROOT="$REPO_ROOT/.arduino-build/root"

echo ">> compiling $REPO_ROOT/ECE198-OLED-IMU ($FQBN)"
arduino-cli compile --fqbn "$FQBN" --only-compilation-database \
  --build-path "$BUILD_SKETCH" "$REPO_ROOT/ECE198-OLED-IMU"

echo ">> compiling wrapper sketch at repo root"
arduino-cli compile --fqbn "$FQBN" --only-compilation-database \
  --build-path "$BUILD_ROOT" "$REPO_ROOT"

python3 - "$REPO_ROOT" <<'PY'
import json, sys

root = sys.argv[1]
out_path = f"{root}/compile_commands.json"
sources = [
    f"{root}/.arduino-build/sketch/compile_commands.json",
    f"{root}/.arduino-build/root/compile_commands.json",
]

merged, seen = [], set()
def add(entry):
    key = (entry["file"], tuple(entry.get("arguments", [])) if "arguments" in entry else entry.get("command"))
    if key not in seen:
        seen.add(key)
        merged.append(entry)

for src in sources:
    for entry in json.load(open(src)):
        add(entry)
        # clangd matches by exact path, so mirror each preprocessed
        # sketch.ino.cpp entry under the real .ino path.
        if entry["file"].endswith(".ino.cpp"):
            real = entry["file"].replace(".arduino-build/sketch/sketch/", "ECE198-OLED-IMU/")
            real = real.replace(".arduino-build/root/sketch/", "")
            real = real[: -len(".cpp")]
            if real != entry["file"]:
                clone = dict(entry)
                clone["file"] = real
                add(clone)

json.dump(merged, open(out_path, "w"), indent=2)
print(f">> wrote {out_path} ({len(merged)} entries)")
PY

echo ">> done. Restart Zed (or run 'editor: restart language server') to pick it up."

# ECE198 OLED + IMU firmware

Wearable that shows one participant's live exercise feedback (reps/target,
range %, cue) on the OLED. It subscribes to the Convex `feedback:live` query
over the Convex WebSocket sync protocol, directly from the board over Wi-Fi,
using the bundled Convex client in `src/convex` (see
[CONVEX_README.md](CONVEX_README.md)). It recovers on its own from Wi-Fi drops
and lost Convex connections.

```
laptop tracker -> publish_feedback.py -> Convex (feedback row) -> ESP32 -> OLED
```

## Setup

1. `cp secrets.example.h secrets.h` and fill in Wi-Fi (eduroam = identity +
   password; a WPA2 hotspot = leave identity empty) and `PARTICIPANT_ID`.
   `secrets.h` is git-ignored. Escape `\` and `"` in the password.
2. From the repo root, link the Convex deployment (`npx convex dev`) and make
   sure `FEEDBACK_READ_TOKEN` / `FEEDBACK_PUBLISH_TOKEN` are set on it and in
   `../.env`.
3. `tools/write-local-config.sh` writes the git-ignored `local_config.h`
   (Convex URL + read token from `../.env.local` / `../.env`), which overrides
   the Convex values in `secrets.h`.
4. `pio run -t upload`, then `pio device monitor`.

Use a cloud deployment (`https://<name>.convex.cloud`). A local `npx convex
dev` backend on the laptop is not reachable on eduroam, which blocks
device-to-device traffic.

## Testing

- `pio test -e native`: host unit tests for the feedback model and the Convex
  protocol client (no board needed).
- `python3 ECE198-OLED-IMU/tools/e2e_test.py` (from the repo root, board
  plugged in, serial monitor closed): hardware end-to-end test against the
  real Convex deployment. Covers live updates, a dropped Convex connection, a
  15 s Wi-Fi outage, a stalled laptop relay, session end, crashes and memory.
- Serial commands (115200 baud): `status`, `drop convex`, `drop wifi <s>`,
  `imu on|off`.
- `node ECE198-OLED-IMU/tools/fake-relay.mjs 30` (from the repo root):
  publishes a fake P01 session once a second so you can watch the OLED count
  up without the camera tracker, then publishes "no session".

## Screens

| OLED | Meaning |
|------|---------|
| `P01 Squats`, then `Reps: 3 / 8`, `Good`, `Short`, `Range %`, `Track %`, cue | live session (stats from the Convex `feedback:live` dashboard snapshot; `-` = not sent yet) |
| `P01 Done` + the same stats | final results, held 60 s after the session ends |
| `No session currently going` | no session, or the laptop relay stopped updating for > 6 s |
| `Not in session` | a session is running without this participant |
| `Connecting Wi-Fi...` / `Connecting server...` / `Connection lost` | link down; the old cue is cleared |
| `Server error` + reason | query failed (e.g. wrong read token) |

The top-right dot is filled when connected to Convex. The serial log
(115200 baud) prints `[WiFi]`, `[Convex]`, `[Feedback]`, `[OLED]` and a
`[Status]` line (heap, message counts) every 10 s.

## Hardware

ESP32 Dev Module + SSD1306 128x64 OLED (I2C 0x3C) + DFRobot BMX160 IMU.
I2C on SDA=13, SCL=14. Built with PlatformIO (`platformio.ini`).

## VS Code

1. Install the **PlatformIO IDE** extension (`platformio.platformio-ide`).
   It brings in Microsoft C/C++ (`ms-vscode.cpptools`) for IntelliSense.
2. Open **this folder** (`code ECE198-OLED-IMU`), not the repo root.
   PlatformIO only detects `platformio.ini` at the workspace root.
3. Wait for PlatformIO to finish "Configuring project" on first open.
   It installs the toolchain/libraries and writes
   `.vscode/c_cpp_properties.json` (git-ignored, machine-specific).

Status bar / PlatformIO sidebar → Project Tasks → `esp32dev`:

| Action  | Button | Shortcut | CLI |
|---------|--------|----------|-----|
| Build   | ✓      | Ctrl+Alt+B | `pio run` |
| Upload  | →      | Ctrl+Alt+U | `pio run -t upload` |
| Serial monitor (115200, timestamps, crash decoder) | 🔌 | — | `pio device monitor` |
| Clean   | 🗑     | —          | `pio run -t clean` |

Upload auto-detects the port. If it can't, add `upload_port = /dev/ttyUSB0`
(and `monitor_port`) under `[env:esp32dev]`. If upload hangs at
"Connecting...", hold the board's **BOOT** button until it starts writing.

## If IntelliSense shows include errors

- Command palette → **PlatformIO: Rebuild IntelliSense Index**
  (or `pio project init --ide vscode`), then **Developer: Reload Window**.
- Do this after changing `lib_deps` or `build_flags` in `platformio.ini`.

## Libraries

Declared in `platformio.ini` `lib_deps`. PlatformIO installs them into `.pio/`
automatically, so no Arduino Library Manager steps are needed.

#!/usr/bin/env bash
# One-time setup so PlatformIO can upload to / monitor the ESP32 over USB.
#   - installs PlatformIO's udev rules (makes USB-serial adapters like the
#     CH340 on the ESP32 dev board read/write for the logged-in user)
#   - adds the user to the uucp group (Arch's serial-port group) as a fallback
#
# Usage: sudo scripts/setup-esp32-serial.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  exec sudo "$0" "$@"
fi

TARGET_USER="${SUDO_USER:-$(logname)}"
USER_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
DEST=/etc/udev/rules.d/99-platformio-udev.rules

# Prefer the copy bundled with the installed PlatformIO Core (no network).
SRC="$(find "$USER_HOME/.platformio/penv" -name 99-platformio-udev.rules -print -quit 2>/dev/null || true)"
if [[ -n "$SRC" ]]; then
  echo ">> installing $SRC -> $DEST"
  install -m 0644 "$SRC" "$DEST"
else
  echo ">> downloading udev rules -> $DEST"
  curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core/develop/platformio/assets/system/99-platformio-udev.rules -o "$DEST"
  chmod 0644 "$DEST"
fi

echo ">> reloading udev"
udevadm control --reload-rules
udevadm trigger --subsystem-match=tty

echo ">> adding $TARGET_USER to uucp"
usermod -aG uucp "$TARGET_USER"

sleep 1
for dev in /dev/ttyUSB* /dev/ttyACM*; do
  [[ -e "$dev" ]] && ls -l "$dev"
done
echo ">> done. Unplug/replug the board if it still shows crw-rw----."

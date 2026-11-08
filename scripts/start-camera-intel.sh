#!/usr/bin/env bash
# Run the AlphaPose camera bridge with the Intel OpenVINO GPU settings.
# Start a "Live AlphaPose camera" session in the Admin Panel first.
set -euo pipefail
cd "$(dirname "$0")/.."
VENV_PYTHON="${ALPHAPOSE_PYTHON:-../.venv-alphapose/bin/python}"
if [ ! -x "$VENV_PYTHON" ]; then
  echo "The installed AlphaPose environment was not found at $VENV_PYTHON." >&2
  echo "Set ALPHAPOSE_PYTHON or see docs/WINDOWS_ALPHAPOSE.md for setup instructions." >&2
  exit 1
fi
export PYTHONUTF8=1
export TORCH_HOME="$PWD/../.torch"
export MPLCONFIGDIR="$PWD/../.matplotlib"
export OMP_NUM_THREADS=4
exec "$VENV_PYTHON" -u -m backend.camera.bridge camera --repo "${ALPHAPOSE_REPO:-../AlphaPose}" \
  --openvino-device "${OPENVINO_DEVICE:-GPU}" --cpu-threads 4 --show-camera \
  --diagnostics data/tracking-diagnostics.json "$@"

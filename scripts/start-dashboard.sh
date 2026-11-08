#!/usr/bin/env bash
# Serve the dashboard (and the built frontend, if present) with the Python app.
set -euo pipefail
cd "$(dirname "$0")/.."
exec "${PYTHON:-python3}" -m backend.tracker.server "$@"

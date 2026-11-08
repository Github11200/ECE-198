#!/usr/bin/env bash
# Install missing frontend dependencies, build the static export, then start the Python app.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f frontend/node_modules/next/package.json ]; then
  npm --prefix frontend ci
fi
npm --prefix frontend run build
exec "${PYTHON:-python3}" -m backend.tracker.server "$@"

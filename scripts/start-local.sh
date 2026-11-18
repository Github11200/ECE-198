#!/usr/bin/env bash
# Start the website, API, and optional Convex publisher.
# The Python backend serves the built SvelteKit site (frontend/out) and the API
# on one origin, and launches AlphaPose itself when an instructor starts a
# camera session.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load laptop publishing configuration without exposing tokens to the frontend.
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PYTHON="${PYTHON:-python3}"
PORT=8000
BUILD_MODE=auto   # auto | always | never
OPEN_BROWSER=1
SERVER_ARGS=()

usage() {
  cat <<'EOF'
Usage: ./scripts/start-local.sh [options] [-- <server options>]

Starts the CCCARE website and backend at http://127.0.0.1:8000.
The website is a static SvelteKit build (frontend/out) served by the Python backend.

Options:
  --port PORT          Serve on PORT (default 8000)
  --build              Rebuild the website before starting
  --no-build           Skip the build; serve the existing export if present
  --no-open            Do not open the browser automatically
  -h, --help           Show this help

AlphaPose environment variables:
  ALPHAPOSE_PYTHON     Python in the AlphaPose venv
                       (default ../.venv-alphapose/bin/python)
  ALPHAPOSE_REPO       AlphaPose checkout (default ../AlphaPose)
  OPENVINO_DEVICE      GPU, CPU, or native (default: GPU if models exist)

Examples:
  ./scripts/start-local.sh
  OPENVINO_DEVICE=GPU ./scripts/start-local.sh
  ./scripts/start-local.sh --port 8001 --no-open
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --port)
      [ "$#" -ge 2 ] || { echo "--port needs a value" >&2; exit 2; }
      PORT="$2"; SERVER_ARGS+=(--port "$PORT"); shift 2 ;;
    --port=*)
      PORT="${1#*=}"; SERVER_ARGS+=(--port "$PORT"); shift ;;
    --build) BUILD_MODE=always; shift ;;
    --no-build) BUILD_MODE=never; shift ;;
    # Accept older launcher commands. Camera startup now belongs to the server.
    --camera) shift ;;
    --camera-wait)
      [ "$#" -ge 2 ] || { echo "--camera-wait needs a value" >&2; exit 2; }
      shift 2 ;;
    --no-open) OPEN_BROWSER=0; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; SERVER_ARGS+=("$@"); break ;;
    *) SERVER_ARGS+=("$1"); shift ;;
  esac
done

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Python was not found. Set PYTHON to a Python 3.10+ interpreter." >&2
  exit 1
fi
if ! "$PYTHON" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "Python 3.10 or newer is required (found $("$PYTHON" --version 2>&1))." >&2
  exit 1
fi

if [ "$BUILD_MODE" != never ]; then
  if [ ! -f frontend/node_modules/@sveltejs/kit/package.json ]; then
    echo "Installing frontend dependencies (first run only)..."
    npm --prefix frontend ci
  fi
  if [ "$BUILD_MODE" = always ] || [ ! -f frontend/out/index.html ]; then
    echo "Building the website..."
    npm --prefix frontend run build
  fi
fi

if [ ! -f frontend/out/index.html ]; then
  echo "Warning: no website build found in frontend/out; the original dashboard at /tracker will be the fallback." >&2
fi

URL="http://127.0.0.1:$PORT"
SERVER_PID=""
PUBLISHER_PID=""

cleanup() {
  trap - INT TERM EXIT
  if [ -n "$PUBLISHER_PID" ] && kill -0 "$PUBLISHER_PID" 2>/dev/null; then
    kill "$PUBLISHER_PID" 2>/dev/null || true
    wait "$PUBLISHER_PID" 2>/dev/null || true
  fi
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

echo "Starting backend and website at $URL ..."
"$PYTHON" -m backend.tracker.server ${SERVER_ARGS[@]+"${SERVER_ARGS[@]}"} &
SERVER_PID=$!

http_ok() {
  "$PYTHON" - "$1" <<'PY' >/dev/null 2>&1
import sys
import urllib.request
try:
    with urllib.request.urlopen(sys.argv[1], timeout=1) as response:
        raise SystemExit(0 if response.status == 200 else 1)
except Exception:
    raise SystemExit(1)
PY
}

ready=0
for _ in $(seq 1 60); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if http_ok "$URL/api/session"; then
    ready=1
    break
  fi
  sleep 0.5
done

if [ "$ready" -ne 1 ]; then
  echo "The server did not become ready on $URL. Check the output above." >&2
  exit 1
fi

if [ -n "${CONVEX_SITE_URL:-}" ] && [ -n "${FEEDBACK_PUBLISH_TOKEN:-}" ]; then
  "$PYTHON" -u -m backend.wearable.publish_feedback --port "$PORT" --url "$CONVEX_SITE_URL" &
  PUBLISHER_PID=$!
  echo "Convex publisher started: sessions and AlphaPose frames will upload with retries."
else
  echo "Convex publisher is not configured. Session data will queue locally until it is connected."
fi

echo "Website ready: $URL"
echo "Original dashboard: $URL/tracker"

if [ "$OPEN_BROWSER" -eq 1 ]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 &
  else
    echo "Open $URL in your browser."
  fi
fi

echo "Start a Live AlphaPose camera session from the Admin Panel to open the webcam."
echo "Press Ctrl+C to stop."
wait "$SERVER_PID"

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${TRAJECTUM_HOME:-$HOME/TRAJECTUM}"
REPO="https://github.com/martinveron2/TRAJECTUM.git"
API_HOST="${TRAJECTUM_API_HOST:-0.0.0.0}"
API_PORT="${TRAJECTUM_API_PORT:-8000}"
WEB_HOST="${TRAJECTUM_WEB_HOST:-0.0.0.0}"
WEB_PORT="${TRAJECTUM_WEB_PORT:-5173}"

say() { printf '\n[TRAJECTUM] %s\n' "$*"; }

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm/node is required" >&2
  exit 1
fi

say "Syncing canonical repository into $ROOT"
if [ -d "$ROOT/.git" ]; then
  git -C "$ROOT" fetch origin
  git -C "$ROOT" checkout main
  git -C "$ROOT" pull --ff-only origin main
else
  rm -rf "$ROOT"
  git clone "$REPO" "$ROOT"
fi

mkdir -p "$ROOT/runtime/logs" "$ROOT/runtime/pids"

say "Preparing Python environment"
if [ ! -x "$ROOT/.venv/bin/python" ]; then
  python3 -m venv "$ROOT/.venv"
fi
"$ROOT/.venv/bin/python" -m pip install -q --upgrade pip
for module in core physics cad validation api reporting; do
  "$ROOT/.venv/bin/pip" install -q -e "$ROOT/backend/$module[dev]"
done

say "Preparing web frontend"
cd "$ROOT/frontend/web"
npm install --silent

stop_pidfile() {
  local name="$1"
  local pidfile="$ROOT/runtime/pids/$name.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
      for _ in {1..20}; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.2
      done
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

say "Stopping previous TRAJECTUM dev processes"
stop_pidfile api
stop_pidfile web

say "Starting API on $API_HOST:$API_PORT"
nohup "$ROOT/.venv/bin/uvicorn" trajectum_api.main:app   --host "$API_HOST" --port "$API_PORT"   >"$ROOT/runtime/logs/api.log" 2>&1 &
echo $! > "$ROOT/runtime/pids/api.pid"

say "Starting web on $WEB_HOST:$WEB_PORT"
cd "$ROOT/frontend/web"
nohup npm run dev -- --host "$WEB_HOST" --port "$WEB_PORT"   >"$ROOT/runtime/logs/web.log" 2>&1 &
echo $! > "$ROOT/runtime/pids/web.pid"

sleep 2

say "Running canonical UTN CDR case (blockers are expected until inputs are frozen)"
set +e
"$ROOT/.venv/bin/trajectum-cdr"   "$ROOT/data/reference-cases/utn-frh-g07/vehicle.cdr.json"
CDR_CODE=$?
set -e

say "Status"
API_PID="$(cat "$ROOT/runtime/pids/api.pid")"
WEB_PID="$(cat "$ROOT/runtime/pids/web.pid")"
if kill -0 "$API_PID" 2>/dev/null; then
  echo "API: RUNNING (pid $API_PID) -> http://<AWS-IP>:$API_PORT"
else
  echo "API: FAILED - see $ROOT/runtime/logs/api.log"
fi
if kill -0 "$WEB_PID" 2>/dev/null; then
  echo "WEB: RUNNING (pid $WEB_PID) -> http://<AWS-IP>:$WEB_PORT"
else
  echo "WEB: FAILED - see $ROOT/runtime/logs/web.log"
fi

echo
echo "Logs:"
echo "  tail -f $ROOT/runtime/logs/api.log"
echo "  tail -f $ROOT/runtime/logs/web.log"
echo
echo "Stop:"
echo "  bash $ROOT/scripts/aws_stop.sh"
echo
if [ "$CDR_CODE" -eq 2 ]; then
  echo "CDR engine is healthy; case is intentionally blocked by unresolved engineering inputs."
fi

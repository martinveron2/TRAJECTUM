#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${TRAJECTUM_HOME:-$HOME/TRAJECTUM}"
for name in api web; do
  pidfile="$ROOT/runtime/pids/$name.pid"
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
      echo "[TRAJECTUM] stopped $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
done

#!/usr/bin/env bash
set -euo pipefail

# Boot a throwaway LifeOS Web API backed by a temporary SQLite database.
# The developer's configured database (e.g. ~/.lifeos/lifeos.db) is never
# touched: the CLI runs with an isolated HOME and LIFEOS_DATABASE_URL.

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"

port="${E2E_API_PORT:-8765}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --port)
      port="${2:?missing port}"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

home_dir="$(mktemp -d "${TMPDIR:-/tmp}/lifeos-e2e-api.XXXXXX")"
db_url="sqlite+aiosqlite:///${home_dir}/e2e.db"
server_pid=""

cleanup() {
  if [ -n "${server_pid}" ]; then
    kill "${server_pid}" 2>/dev/null || true
    wait "${server_pid}" 2>/dev/null || true
  fi
  rm -rf "${home_dir}"
}
trap cleanup EXIT INT TERM

export HOME="${home_dir}"
export LIFEOS_DATABASE_URL="${db_url}"

if ! command -v lifeos >/dev/null 2>&1; then
  echo "[e2e] lifeos CLI not found; install it with: uv tool install \"lifeos-cli[web,postgres]==1.0.2\"" >&2
  exit 1
fi

echo "[e2e] bootstrap temporary LifeOS config (HOME=${home_dir})"
lifeos init \
  --non-interactive \
  --database-url "${db_url}" \
  --timezone UTC \
  --language en \
  --skip-ping \
  --skip-migrate >/dev/null
lifeos db upgrade >/dev/null

echo "[e2e] start LifeOS Web API on 127.0.0.1:${port}"
lifeos web serve --host 127.0.0.1 --port "${port}" &
server_pid=$!

for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${port}/api/v1/areas/" >/dev/null 2>&1; then
    echo "[e2e] LifeOS Web API ready"
    wait "${server_pid}"
    exit 0
  fi
  sleep 1
done

echo "[e2e] LifeOS Web API failed to become ready within 90s" >&2
exit 1

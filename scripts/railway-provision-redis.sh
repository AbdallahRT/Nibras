#!/usr/bin/env bash
# Add Railway Redis (if missing) and wire REDIS_URL to api + worker.
# Usage: ./scripts/railway-provision-redis.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.railway/bin:${PATH}"

API_SERVICE="${RAILWAY_API_SERVICE:-api}"
WORKER_SERVICE="${RAILWAY_WORKER_SERVICE:-worker}"

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

has_redis() {
  railway service list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null | rg -i '^redis$' >/dev/null
}

if has_redis; then
  echo "Redis service already exists."
else
  echo "==> Adding Redis database to Railway project..."
  if ! railway add --database redis --json >/dev/null 2>&1; then
    echo "Could not add Redis via CLI (interactive prompt or network issue)." >&2
    echo "Add Redis manually: Railway dashboard → New → Database → Redis" >&2
    echo "Then re-run: ./scripts/railway-secrets.sh && ./scripts/railway-deploy.sh" >&2
    exit 1
  fi
  echo "Redis database added."
fi

echo "==> Wiring REDIS_URL to ${API_SERVICE} and ${WORKER_SERVICE}..."
railway variable set -s "$API_SERVICE" 'REDIS_URL=${{Redis.REDIS_URL}}' --skip-deploys
railway variable set -s "$WORKER_SERVICE" 'REDIS_URL=${{Redis.REDIS_URL}}' --skip-deploys

echo "Redis provisioned. Redeploy with: ./scripts/railway-deploy.sh"

#!/usr/bin/env bash
# Set Railway variables for web (API) + worker from .env.railway.
# Usage: ./scripts/railway-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.railway/bin:${PATH}"

ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/railway/env.local}"

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

API_SERVICE="${RAILWAY_API_SERVICE:-web}"
WORKER_SERVICE="${RAILWAY_WORKER_SERVICE:-worker}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${NIBRAS_ENCRYPTION_KEY:?NIBRAS_ENCRYPTION_KEY required}"
: "${AUTH_SECRET:?AUTH_SECRET required}"

WEB_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.api"
  "NODE_ENV=production"
  "HOST=0.0.0.0"
  "PORT=4848"
  "COMPETITIONS_SYNC_ENABLED=false"
  "NIBRAS_ENCRYPTION_KEY=${NIBRAS_ENCRYPTION_KEY}"
  "AUTH_SECRET=${AUTH_SECRET}"
)

WORKER_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.worker"
  "NODE_ENV=production"
  "COMPETITIONS_SYNC_ENABLED=false"
  "NIBRAS_ENCRYPTION_KEY=${NIBRAS_ENCRYPTION_KEY}"
  "WORKER_CONCURRENCY=1"
)

if [[ -n "${DATABASE_URL:-}" ]]; then
  WEB_VARS+=("DATABASE_URL=${DATABASE_URL}" "DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL:-$DATABASE_URL}")
  WORKER_VARS+=("DATABASE_URL=${DATABASE_URL}")
else
  WEB_VARS+=('DATABASE_URL=${{Postgres.DATABASE_URL}}' 'DIRECT_DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}')
  WORKER_VARS+=('DATABASE_URL=${{Postgres.DATABASE_URL}}')
fi

if [[ -n "${REDIS_URL:-}" ]]; then
  WEB_VARS+=("REDIS_URL=${REDIS_URL}")
  WORKER_VARS+=("REDIS_URL=${REDIS_URL}")
fi

echo "Setting variables on ${API_SERVICE}..."
railway variable set -s "$API_SERVICE" "${WEB_VARS[@]}" --skip-deploys

echo "Setting variables on ${WORKER_SERVICE}..."
railway variable set -s "$WORKER_SERVICE" "${WORKER_VARS[@]}" --skip-deploys

echo "Secrets configured. Deploy with: ./scripts/railway-deploy.sh"

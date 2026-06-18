#!/usr/bin/env bash
# Add Railway MongoDB (if missing) and wire MONGO_URI to backend.
# Usage: ./scripts/railway-provision-mongo.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.railway/bin:${PATH}"

BACKEND_SERVICE="${RAILWAY_BACKEND_SERVICE:-backend}"

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

has_mongo() {
  railway service list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null | rg -i '^mongo(db)?$' >/dev/null
}

if has_mongo; then
  echo "MongoDB service already exists."
else
  echo "==> Adding MongoDB database to Railway project..."
  if ! railway add --database mongo --json >/dev/null 2>&1; then
    echo "Managed MongoDB template failed (volume limit or CLI issue). Trying Docker image..."
    if ! railway add --image mongo:7 --service MongoDB --json >/dev/null 2>&1; then
      echo "Could not add MongoDB via CLI." >&2
      echo "Add MongoDB manually: Railway dashboard → New → Database → MongoDB" >&2
      echo "Or set MONGO_URI in railway/env.local for an external MongoDB (Atlas, etc.)" >&2
      exit 1
    fi
    railway variable set -s MongoDB \
      "MONGO_INITDB_ROOT_USERNAME=mongo" \
      "MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD:-HojkFpiPzZWwsoipjdCsqwbroGvUsITO}" \
      --skip-deploys
    echo "MongoDB image service added (configure MONGO_URI on backend if not using \${{MongoDB.MONGO_URL}})."
  else
    echo "MongoDB database added."
  fi
fi

if railway service list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null | rg -i "^${BACKEND_SERVICE}$" >/dev/null; then
  echo "==> Wiring MONGO_URI to ${BACKEND_SERVICE}..."
  railway variable set -s "$BACKEND_SERVICE" 'MONGO_URI=${{MongoDB.MONGO_URL}}' --skip-deploys
else
  echo "Backend service (${BACKEND_SERVICE}) not found yet — MONGO_URI will be set by ./scripts/railway-secrets.sh"
fi

echo "MongoDB provisioned. Redeploy with: ./scripts/railway-deploy.sh"

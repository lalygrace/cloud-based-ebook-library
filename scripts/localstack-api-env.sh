#!/usr/bin/env bash
set -euo pipefail

# Writes frontend/.env.local from the API ID provisioned in LocalStack.
# Requires: docker compose, and localstack container running.

STATE_FILE="./infra/localstack/state/ebook-library.env"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Missing $STATE_FILE"
  echo "Start LocalStack first: docker compose up -d"
  echo "And ensure backend artifacts exist: cd backend && pnpm install && pnpm build"
  exit 1
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "API_BASE_URL not found in $STATE_FILE"
  exit 1
fi

cat > ./frontend/.env.local <<ENV
NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL
ENV

echo "Wrote frontend/.env.local"
echo "NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL"

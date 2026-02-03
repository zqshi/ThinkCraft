#!/bin/bash
set -euo pipefail

ENV_FILE="${1:-backend/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  echo "Create it from backend/.env.production.example"
  exit 1
fi

echo "Starting production stack with env: $ENV_FILE"
docker compose --env-file "$ENV_FILE" up -d --build

echo "Done. Services:"
docker compose ps

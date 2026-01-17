#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but not installed." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-thinkcraft}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

timestamp="$(date +%Y%m%d_%H%M%S)"
mkdir -p "${BACKUP_DIR}"
backup_file="${BACKUP_DIR}/${DB_NAME}_${timestamp}.sql.gz"

if [ -n "${DB_PASSWORD}" ]; then
  export PGPASSWORD="${DB_PASSWORD}"
fi

pg_dump \
  --host "${DB_HOST}" \
  --port "${DB_PORT}" \
  --username "${DB_USER}" \
  --format plain \
  --no-owner \
  --no-privileges \
  "${DB_NAME}" | gzip > "${backup_file}"

echo "Backup created: ${backup_file}"

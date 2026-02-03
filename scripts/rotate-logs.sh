#!/bin/bash

# Simple log rotation for local dev logs.
# Usage: scripts/rotate-logs.sh [max_bytes] [keep]

set -euo pipefail

MAX_BYTES="${1:-5242880}" # 5MB default
KEEP="${2:-3}"
LOG_DIR="${LOG_DIR:-logs}"
LOGS=(backend.log frontend.log css-sync.log vite.log)

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

rotate_one() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return
  fi
  local size
  size=$(wc -c < "$file" | tr -d ' ')
  if [ "$size" -lt "$MAX_BYTES" ]; then
    return
  fi
  local ts
  ts=$(timestamp)
  local rotated="${file}.${ts}"
  mv "$file" "$rotated"
  : > "$file"

  # Keep only the newest $KEEP rotations
  local pattern="${file}."*
  local rotations
  rotations=$(ls -t $pattern 2>/dev/null || true)
  if [ -n "$rotations" ]; then
    local count=0
    for f in $rotations; do
      count=$((count + 1))
      if [ "$count" -gt "$KEEP" ]; then
        rm -f "$f"
      fi
    done
  fi
}

for log in "${LOGS[@]}"; do
  rotate_one "${LOG_DIR}/${log}"
done

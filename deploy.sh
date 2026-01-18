#!/usr/bin/env bash
set -euo pipefail

echo "[Deploy] Building backend image"
docker build -t thinkcraft-backend:latest ./backend

echo "[Deploy] Starting production stack"
docker compose -f docker-compose.prod.yml up -d

echo "[Deploy] Done"

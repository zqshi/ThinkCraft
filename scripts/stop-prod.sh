#!/bin/bash
set -euo pipefail

echo "Stopping production stack..."
docker compose down
echo "Done."

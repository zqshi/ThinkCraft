#!/usr/bin/env bash
set -euo pipefail

compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo "";
  fi
}

CMD=${1:-}
shift || true

COMPOSE=$(compose_cmd)
if [[ -z "$COMPOSE" ]]; then
  echo "[docker.sh] Error: Docker Compose not found. Install Docker Desktop or docker-compose." >&2
  exit 1
fi

case "$CMD" in
  build)
    $COMPOSE build "$@"
    ;;
  start)
    $COMPOSE up -d "$@"
    ;;
  stop)
    $COMPOSE stop "$@"
    ;;
  restart)
    $COMPOSE restart "$@"
    ;;
  down)
    $COMPOSE down "$@"
    ;;
  status)
    $COMPOSE ps "$@"
    ;;
  logs)
    $COMPOSE logs -f --tail=200 "$@"
    ;;
  pull)
    $COMPOSE pull "$@"
    ;;
  *)
    cat <<'USAGE'
Usage: ./docker.sh <command>

Commands:
  build      Build images
  start      Start services (detached)
  stop       Stop services
  restart    Restart services
  down       Stop and remove containers
  status     Show container status
  logs       Follow logs (tail 200)
  pull       Pull images
USAGE
    exit 1
    ;;
esac

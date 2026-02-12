#!/usr/bin/env bash
set -euo pipefail

# 兼容历史命令，统一转发到唯一停止入口
exec "$(cd "$(dirname "$0")" && pwd)/stop-all.sh" "$@"

#!/usr/bin/env bash
set -euo pipefail

# 兼容历史命令，统一转发到唯一启动入口
exec "$(cd "$(dirname "$0")" && pwd)/start-all.sh" "$@"

#!/bin/bash
# ThinkCraft 服务管理脚本

PORT=3000

check_status() {
    if lsof -ti:$PORT > /dev/null 2>&1; then
        PID=$(lsof -ti:$PORT)
        echo "✓ 后端服务正在运行"
        echo "  PID: $PID"
        echo "  端口: $PORT"
        echo "  URL: http://localhost:$PORT"
        return 0
    else
        echo "✗ 后端服务未运行"
        return 1
    fi
}

stop_service() {
    echo "正在停止后端服务..."
    RUN_DIR="../run"
    if lsof -ti:$PORT > /dev/null 2>&1; then
        PID=$(lsof -ti:$PORT)
        kill -15 $PID 2>/dev/null
        sleep 2
        if ! lsof -ti:$PORT > /dev/null 2>&1; then
            echo "✓ 后端服务已停止"
        else
            kill -9 $PID 2>/dev/null
            echo "✓ 后端服务已强制停止"
        fi
    else
        echo "后端服务未运行"
    fi
    if [ -f "$RUN_DIR/backend.pid" ]; then
        rm "$RUN_DIR/backend.pid"
    fi
}

start_service() {
    echo "正在启动后端服务..."
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "⚠ 后端服务已在运行"
        return 1
    fi
    LOG_DIR="../logs"
    RUN_DIR="../run"
    mkdir -p "$LOG_DIR" "$RUN_DIR"
    cd backend && nohup npm start > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$RUN_DIR/backend.pid"
    sleep 3
    cd ..
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "✓ 后端服务已启动"
        check_status
    else
        echo "✗ 后端服务启动失败"
        echo "查看日志: tail -f logs/backend.log"
    fi
}

case "$1" in
    start) start_service ;;
    stop) stop_service ;;
    restart) stop_service && sleep 2 && start_service ;;
    status) check_status ;;
    *) check_status ;;
esac

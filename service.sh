#!/bin/bash

# ThinkCraft 服务管理脚本
# 用途：启动、停止、重启、查看状态

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PORT=3000
BACKEND_DIR="backend"
LOG_FILE="backend.log"
PID_FILE="backend.pid"

# 检查服务状态
check_status() {
    if lsof -ti:$PORT > /dev/null 2>&1; then
        PID=$(lsof -ti:$PORT)
        echo -e "${GREEN}✓ 后端服务正在运行${NC}"
        echo "  PID: $PID"
        echo "  端口: $PORT"
        echo "  URL: http://localhost:$PORT"
        return 0
    else
        echo -e "${RED}✗ 后端服务未运行${NC}"
        return 1
    fi
}

# 停止服务
stop_service() {
    echo "正在停止后端服务..."

    if lsof -ti:$PORT > /dev/null 2>&1; then
        PID=$(lsof -ti:$PORT)
        kill -15 $PID 2>/dev/null

        # 等待进程结束
        for i in {1..10}; do
            if ! lsof -ti:$PORT > /dev/null 2>&1; then
                echo -e "${GREEN}✓ 后端服务已停止${NC}"
                return 0
            fi
            sleep 1
        done

        # 如果还没停止，强制杀死
        echo "正在强制停止..."
        kill -9 $PID 2>/dev/null
        sleep 1

        if ! lsof -ti:$PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 后端服务已强制停止${NC}"
            return 0
        else
            echo -e "${RED}✗ 无法停止后端服务${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
        return 0
    fi
}

# 启动服务
start_service() {
    echo "正在启动后端服务..."

    # 检查是否已经在运行
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ 后端服务已在运行${NC}"
        check_status
        return 1
    fi

    # 检查backend目录
    if [ ! -d "$BACKEND_DIR" ]; then
        echo -e "${RED}✗ backend目录不存在${NC}"
        return 1
    fi

    # 启动服务
    cd $BACKEND_DIR
    nohup npm start > ../$LOG_FILE 2>&1 &
    NEW_PID=$!
    echo $NEW_PID > ../$PID_FILE
    cd ..

    # 等待服务启动
    echo "等待服务启动..."
    for i in {1..15}; do
        sleep 1
        if lsof -ti:$PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 后端服务已启动${NC}"
            echo "  PID: $NEW_PID"
            echo "  端口: $PORT"
            echo "  日志: $LOG_FILE"

            # 测试健康检查
            sleep 2
            if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ 健康检查通过${NC}"
            else
                echo -e "${YELLOW}⚠ 健康检查失败，查看日志: tail -f $LOG_FILE${NC}"
            fi

            return 0
        fi
        echo -n "."
    done

    echo ""
    echo -e "${RED}✗ 后端服务启动失败${NC}"
    echo "查看日志: tail -f $LOG_FILE"
    return 1
}

# 重启服务
restart_service() {
    echo "正在重启后端服务..."
    echo ""
    stop_service
    echo ""
    sleep 2
    start_service
}

# 查看日志
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "查看日志 (Ctrl+C 退出):"
        echo "----------------------------------------"
        tail -f $LOG_FILE
    else
        echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    fi
}

# 测试API
test_api() {
    echo "测试后端API..."
    echo ""

    # 健康检查
    echo -n "健康检查: "
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
    else
        echo -e "${RED}✗ 失败${NC}"
    fi

    # 项目API
    echo -n "项目API: "
    RESPONSE=$(curl -s http://localhost:$PORT/api/projects 2>&1)
    if echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ 失败${NC}"
        echo "  错误: $RESPONSE"
    else
        echo -e "${GREEN}✓ 通过${NC}"
    fi

    # 对话API
    echo -n "对话API: "
    RESPONSE=$(curl -s http://localhost:$PORT/api/chats 2>&1)
    if echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ 失败${NC}"
        echo "  错误: $RESPONSE"
    else
        echo -e "${GREEN}✓ 通过${NC}"
    fi
}

# 显示帮助
show_help() {
    echo "ThinkCraft 服务管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start    - 启动后端服务"
    echo "  stop     - 停止后端服务"
    echo "  restart  - 重启后端服务"
    echo "  status   - 查看服务状态"
    echo "  logs     - 查看服务日志"
    echo "  test     - 测试API"
    echo "  help     - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start"
    echo "  $0 restart"
    echo "  $0 logs"
}

# 主函数
main() {
    case "$1" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            check_status
            ;;
        logs)
            view_logs
            ;;
        test)
            test_api
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "ThinkCraft 服务管理"
            echo ""
            check_status
            echo ""
            echo "使用 '$0 help' 查看所有命令"
            ;;
    esac
}

main "$@"

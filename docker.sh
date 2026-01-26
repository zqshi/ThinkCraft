#!/bin/bash

# ThinkCraft Docker 管理脚本
# 用法: ./docker.sh [command]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    print_success "Docker环境检查通过"
}

# 检查环境变量文件
check_env() {
    if [ ! -f "backend/.env" ]; then
        print_warning "未找到backend/.env文件"
        if [ -f "backend/.env.example" ]; then
            print_info "正在从backend/.env.example创建backend/.env"
            cp backend/.env.example backend/.env
            print_success "已创建backend/.env，请根据需要修改配置"
        else
            print_error "未找到backend/.env.example文件"
            exit 1
        fi
    fi
}

# 构建镜像
build() {
    print_info "开始构建Docker镜像..."
    docker-compose build "$@"
    print_success "镜像构建完成"
}

# 启动服务
start() {
    print_info "正在启动服务..."
    docker-compose up -d
    print_success "服务启动成功"

    print_info "等待服务健康检查..."
    sleep 5

    status
}

# 停止服务
stop() {
    print_info "正在停止服务..."
    docker-compose down
    print_success "服务已停止"
}

# 重启服务
restart() {
    print_info "正在重启服务..."
    docker-compose restart "$@"
    print_success "服务重启完成"
}

# 查看状态
status() {
    print_info "服务状态："
    docker-compose ps
}

# 查看日志
logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# 清理数据
clean() {
    print_warning "此操作将删除所有容器和数据卷，是否继续？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "正在清理..."
        docker-compose down -v
        print_success "清理完成"
    else
        print_info "已取消"
    fi
}

# 进入容器
shell() {
    if [ -z "$1" ]; then
        print_error "请指定服务名称: backend, frontend, mongodb, redis"
        exit 1
    fi

    case "$1" in
        backend|frontend)
            docker exec -it "thinkcraft-$1" sh
            ;;
        mongodb)
            docker exec -it thinkcraft-mongodb mongosh
            ;;
        redis)
            docker exec -it thinkcraft-redis redis-cli
            ;;
        *)
            print_error "未知服务: $1"
            exit 1
            ;;
    esac
}

# 备份数据
backup() {
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    print_info "正在备份MongoDB数据..."
    docker exec thinkcraft-mongodb mongodump --out /data/backup
    docker cp thinkcraft-mongodb:/data/backup "$BACKUP_DIR/mongodb"

    print_info "正在备份Redis数据..."
    docker exec thinkcraft-redis redis-cli SAVE
    docker cp thinkcraft-redis:/data/dump.rdb "$BACKUP_DIR/redis/"

    print_success "备份完成: $BACKUP_DIR"
}

# 显示帮助
help() {
    cat << EOF
ThinkCraft Docker 管理脚本

用法: ./docker.sh [command] [options]

命令:
  build       构建Docker镜像
  start       启动所有服务
  stop        停止所有服务
  restart     重启服务 (可指定服务名)
  status      查看服务状态
  logs        查看日志 (可指定服务名)
  clean       清理所有容器和数据
  shell       进入容器 (backend|frontend|mongodb|redis)
  backup      备份数据
  help        显示此帮助信息

示例:
  ./docker.sh build           # 构建镜像
  ./docker.sh start           # 启动服务
  ./docker.sh logs backend    # 查看后端日志
  ./docker.sh restart backend # 重启后端服务
  ./docker.sh shell mongodb   # 进入MongoDB容器
  ./docker.sh backup          # 备份数据

更多信息请查看 DOCKER.md 文档
EOF
}

# 主函数
main() {
    case "$1" in
        build)
            check_docker
            check_env
            build "${@:2}"
            ;;
        start)
            check_docker
            check_env
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart "${@:2}"
            ;;
        status)
            status
            ;;
        logs)
            logs "$2"
            ;;
        clean)
            clean
            ;;
        shell)
            shell "$2"
            ;;
        backup)
            backup
            ;;
        help|--help|-h)
            help
            ;;
        *)
            if [ -z "$1" ]; then
                help
            else
                print_error "未知命令: $1"
                help
                exit 1
            fi
            ;;
    esac
}

main "$@"

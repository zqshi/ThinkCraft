FROM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 复制静态文件到Nginx目录
# 从项目根目录复制
COPY index.html OS.html register.html ./
COPY css/ ./css/
COPY icons/ ./icons/
COPY manifest.json service-worker.json* ./

# 从frontend目录复制
COPY frontend/ ./frontend/

# 复制Nginx配置
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]

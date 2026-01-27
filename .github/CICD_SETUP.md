# GitHub Actions CI/CD 配置指南

本文档说明如何配置GitHub Actions所需的Secrets和环境变量。

## 📋 目录

- [必需的Secrets](#必需的secrets)
- [可选的Secrets](#可选的secrets)
- [配置步骤](#配置步骤)
- [环境配置](#环境配置)
- [验证配置](#验证配置)

---

## 必需的Secrets

### Docker Hub 凭证

用于构建和推送Docker镜像到Docker Hub。

| Secret名称        | 说明                     | 示例                      |
| ----------------- | ------------------------ | ------------------------- |
| `DOCKER_USERNAME` | Docker Hub用户名         | `your-dockerhub-username` |
| `DOCKER_PASSWORD` | Docker Hub访问令牌或密码 | `dckr_pat_xxxxx`          |

**获取方式**：

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 Account Settings → Security → New Access Token
3. 创建一个具有读写权限的访问令牌

### 服务器部署凭证

用于SSH连接到服务器并执行部署操作。

| Secret名称       | 说明                                      | 示例                                   |
| ---------------- | ----------------------------------------- | -------------------------------------- |
| `SERVER_HOST`    | 服务器IP地址或域名                        | `123.45.67.89` 或 `deploy.example.com` |
| `SERVER_USER`    | SSH登录用户名                             | `ubuntu` 或 `root`                     |
| `SERVER_SSH_KEY` | SSH私钥（完整内容）                       | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `SERVER_PORT`    | SSH端口（可选，默认22）                   | `22`                                   |
| `DEPLOY_PATH`    | 部署目录路径（可选，默认/opt/thinkcraft） | `/opt/thinkcraft`                      |

**获取SSH私钥**：

```bash
# 在本地生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "deploy@thinkcraft" -f ~/.ssh/thinkcraft_deploy

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/thinkcraft_deploy.pub user@server

# 复制私钥内容（包括BEGIN和END行）
cat ~/.ssh/thinkcraft_deploy
```

---

## 可选的Secrets

### Codecov（代码覆盖率）

| Secret名称      | 说明            | 获取方式                                         |
| --------------- | --------------- | ------------------------------------------------ |
| `CODECOV_TOKEN` | Codecov上传令牌 | 在 [Codecov](https://codecov.io/) 创建项目后获取 |

### 通知服务

| Secret名称             | 说明                      | 用途     |
| ---------------------- | ------------------------- | -------- |
| `SLACK_WEBHOOK_URL`    | Slack Webhook URL         | 部署通知 |
| `DINGTALK_WEBHOOK_URL` | 钉钉机器人Webhook URL     | 部署通知 |
| `WECHAT_WEBHOOK_URL`   | 企业微信机器人Webhook URL | 部署通知 |

---

## 配置步骤

### 1. 添加Repository Secrets

1. 打开GitHub仓库页面
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 输入Secret名称和值
5. 点击 **Add secret**

### 2. 配置Docker Hub镜像仓库

在 `build.yml` 中修改镜像名称：

```yaml
env:
  REGISTRY: docker.io
  BACKEND_IMAGE_NAME: your-dockerhub-username/thinkcraft-backend
  FRONTEND_IMAGE_NAME: your-dockerhub-username/thinkcraft-frontend
```

### 3. 准备服务器环境

在服务器上执行以下命令：

```bash
# 创建部署目录
sudo mkdir -p /opt/thinkcraft
sudo chown $USER:$USER /opt/thinkcraft
cd /opt/thinkcraft

# 克隆代码（可选，如果使用git部署）
git clone https://github.com/your-username/ThinkCraft.git .

# 创建环境变量文件
cp .env.example .env
nano .env  # 编辑环境变量

# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用docker组权限
exit
```

### 4. 配置服务器防火墙

```bash
# 开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Backend API（可选，用于调试）
sudo ufw enable
```

---

## 环境配置

### Production环境

1. 进入 **Settings** → **Environments**
2. 点击 **New environment**
3. 输入环境名称：`production`
4. 配置保护规则（可选）：
   - Required reviewers：需要审批才能部署
   - Wait timer：部署前等待时间
   - Deployment branches：限制可部署的分支

### Staging环境（可选）

重复上述步骤，创建 `staging` 环境，使用不同的服务器配置。

---

## 验证配置

### 1. 测试CI工作流

提交代码到 `main` 或 `develop` 分支，检查CI是否正常运行：

```bash
git add .
git commit -m "test: 验证CI配置"
git push origin main
```

在GitHub仓库的 **Actions** 标签页查看工作流运行状态。

### 2. 测试构建工作流

推送一个tag触发构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

检查Docker Hub是否成功推送了镜像。

### 3. 测试部署工作流

手动触发部署：

1. 进入 **Actions** 标签页
2. 选择 **Deploy** 工作流
3. 点击 **Run workflow**
4. 选择环境和分支
5. 点击 **Run workflow**

检查服务器上的容器是否正常运行：

```bash
ssh user@server
cd /opt/thinkcraft
docker-compose ps
```

---

## 故障排查

### SSH连接失败

**问题**：`Permission denied (publickey)`

**解决方案**：

1. 确认SSH私钥格式正确（包含BEGIN和END行）
2. 确认公钥已添加到服务器的 `~/.ssh/authorized_keys`
3. 检查服务器SSH配置允许密钥认证

### Docker镜像推送失败

**问题**：`unauthorized: authentication required`

**解决方案**：

1. 确认 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 正确
2. 使用访问令牌而不是密码
3. 确认Docker Hub仓库存在且有写权限

### 部署健康检查失败

**问题**：`Backend health check failed`

**解决方案**：

1. 检查服务器上的容器日志：`docker-compose logs backend`
2. 确认环境变量配置正确
3. 确认MongoDB和Redis容器正常运行
4. 检查防火墙规则

### 回滚失败

**问题**：回滚时找不到备份

**解决方案**：

1. 首次部署前手动创建备份目录
2. 确认部署脚本有写权限
3. 检查磁盘空间是否充足

---

## 安全建议

1. **定期轮换密钥**：每3-6个月更换SSH密钥和访问令牌
2. **最小权限原则**：为部署用户分配最小必要权限
3. **使用环境隔离**：生产和测试环境使用不同的凭证
4. **启用审计日志**：记录所有部署操作
5. **备份Secrets**：将Secrets安全地备份到密码管理器

---

## 相关文档

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Docker Hub文档](https://docs.docker.com/docker-hub/)
- [SSH密钥管理](https://www.ssh.com/academy/ssh/keygen)
- [项目Docker部署指南](./DOCKER.md)

---

**最后更新**: 2026-01-27

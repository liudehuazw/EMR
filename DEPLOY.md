# Docker 部署指南

## 🐳 快速部署

### 前置要求
- Docker 20.0+
- Docker Compose 2.0+
- 服务器内存至少 2GB
- 可用磁盘空间至少 10GB

### 一键部署

```bash
# 克隆项目（如果还没有）
git clone <your-repo-url>
cd Electronic-medical-record

# 给部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### 手动部署

```bash
# 1. 构建并启动所有服务
docker-compose up -d --build

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f
```

## 📋 服务说明

| 服务 | 端口 | 描述 | 数据持久化 |
|------|------|------|------------|
| frontend | 80 | Vue3前端应用 | 无 |
| backend | 8080 | Spring Boot后端 | uploads/ |
| mysql | 3306 | MySQL 8.0数据库 | mysql_data/ |
| redis | 6379 | Redis缓存 | redis_data/ |

## 🔧 配置说明

### 环境变量

在 `docker-compose.yml` 中可以修改以下配置：

```yaml
environment:
  # 数据库配置
  MYSQL_ROOT_PASSWORD: emr_root_2024
  MYSQL_DATABASE: electronic_medical_record
  MYSQL_USER: emr_user
  MYSQL_PASSWORD: emr_password_2024
  
  # JWT密钥（建议修改）
  JWT_SECRET: emr-secret-key-2024
  
  # 文件上传路径
  FILE_UPLOAD_PATH: /app/uploads
```

### 端口修改

如果需要修改端口，在 `docker-compose.yml` 中调整：

```yaml
ports:
  - "8081:8080"  # 后端端口改为8081
  - "81:80"      # 前端端口改为81
  - "3307:3306"  # MySQL端口改为3307
```

## 📁 数据持久化

所有重要数据都通过 Docker volumes 持久化：

- `mysql_data` - MySQL数据
- `uploads_data` - 上传的文件
- `redis_data` - Redis数据

### 备份数据

```bash
# 备份MySQL数据
docker exec emr-mysql mysqldump -u root -p electronic_medical_record > backup.sql

# 备份上传文件
docker cp emr-backend:/app/uploads ./uploads_backup
```

### 恢复数据

```bash
# 恢复MySQL数据
docker exec -i emr-mysql mysql -u root -p electronic_medical_record < backup.sql

# 恢复上传文件
docker cp ./uploads_backup emr-backend:/app/uploads
```

## 🔄 更新部署

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建并部署
./deploy.sh --clean
```

### 仅重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

## 🐛 故障排除

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql
```

### 进入容器调试

```bash
# 进入后端容器
docker exec -it emr-backend bash

# 进入MySQL容器
docker exec -it emr-mysql mysql -u root -p

# 进入前端容器
docker exec -it emr-frontend sh
```

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :80
lsof -i :8080

# 修改docker-compose.yml中的端口映射
```

#### 2. 内存不足
```bash
# 查看系统资源
docker stats

# 限制容器内存使用
# 在docker-compose.yml中添加：
services:
  backend:
    mem_limit: 1g
```

#### 3. 磁盘空间不足
```bash
# 清理Docker
docker system prune -a

# 查看磁盘使用
df -h
```

## 🔒 安全配置

### 1. 修改默认密码
务必修改 `docker-compose.yml` 中的默认密码：
- MySQL root密码
- MySQL用户密码
- JWT密钥

### 2. 防火墙配置
```bash
# 只开放必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. SSL证书配置
建议使用Nginx或Traefik配置HTTPS：
```bash
# 使用Let's Encrypt
certbot --nginx -d yourdomain.com
```

## 📊 监控

### 基础监控
```bash
# 查看容器状态
docker-compose ps

# 查看资源使用
docker stats
```

### 健康检查
所有服务都配置了健康检查，可以通过以下命令查看：
```bash
docker inspect emr-backend | grep -A 10 Health
```

## 🚀 性能优化

### 1. 生产环境配置
```yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      SPRING_PROFILES_ACTIVE: prod
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### 2. 数据库优化
```sql
-- MySQL配置优化
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
```

## 📞 支持

如果遇到问题，请：
1. 查看日志：`docker-compose logs`
2. 检查配置：`docker-compose config`
3. 重新部署：`./deploy.sh --clean`

## 🔄 版本回滚

```bash
# 回滚到上一个版本
git checkout HEAD~1
./deploy.sh --clean
```

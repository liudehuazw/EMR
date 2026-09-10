# 电子病历系统 — 容器化部署文档（Docker Compose）

> 适用：想用 Docker 一键跑起来试用的情况（开发机 / 测试服务器）。
> 生产服务器上的宝塔 + systemd 部署方式见 `DEPLOYMENT_GUIDE.md`。

---

## 一、前置条件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Docker | 20.10+ | 建议开启 BuildKit（Docker Desktop 默认开启） |
| Docker Compose | v2（`docker compose`） | 旧版 `docker-compose` 也可用 |
| 内存 | ≥ 4GB 建议 | 不启用 OCR 时 2GB 亦可；OCR 容器建议预留 ≥ 2GB |
| 磁盘 | ≥ 10GB | OCR 镜像较大（PaddleOCR） |

宿主机**不需要**安装 Node.js / Maven / JDK / MySQL / Redis，全部在容器内完成。

---

## 二、快速开始

```bash
# 1.（可选）配置 OSS / AI Key 等敏感项
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY、ALIYUN_OSS_* 等
# 不填也能启动，只是「文件上传」与「AI 分析/助手」不可用

# 2. 启动 MySQL + Redis + 后端 + 前端
docker compose up -d

# 3. 需要 OCR（图片/PDF 文字识别）时追加启动
docker compose --profile ocr up -d
```

首次启动会构建镜像（后端约 3~5 分钟，前端约 2 分钟；OCR 镜像约 10~20 分钟），
构建完成后访问：

```
http://localhost:8088
```

默认账号：`admin` / `admin`（演示账号 `user` / `user`，数据不落库）

> ⚠️ 首次启动时 `database/init.sql` 会自动建库建表。
> **只有 mysql 数据卷为空时才会执行**，之后修改 init.sql 不会自动生效。

---

## 三、服务与端口

| 服务 | 容器名 | 宿主端口 | 容器端口 | 说明 |
|------|--------|---------|---------|------|
| frontend | emr-frontend | 8088 | 80 | Nginx 托管前端 + 反代 `/api` 到后端 |
| backend | emr-backend | 8081 | 8080 | Spring Boot（context-path `/api`） |
| mysql | emr-mysql | 3307 | 3306 | MySQL 8.0 |
| redis | emr-redis | 6379 | 6379 | 缓存（连不上会自动降级，不影响功能） |
| ocr | emr-ocr | 8000 | 8000 | 文字识别（需 `--profile ocr`） |

后端容器内通过服务名互访：`mysql:3306`、`redis:6379`、`ocr:8000`。

端口被占用时，修改 `docker-compose.yml` 中对应服务的 `ports` 左侧端口即可
（前端反代用的是容器网络，不受宿主端口影响）。

---

## 四、环境变量

`.env`（复制自 `.env.example`，已被 gitignore）中的变量会被 compose 自动读取：

| 变量 | 必填 | 说明 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | 否 | MySQL root 密码，默认 `emr_root_2024` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | 否 | 应用使用的数据库账号，默认 `emr` / `emr_password_2024` |
| `REDIS_PASSWORD` | 否 | 默认 `emr_redis_2024` |
| `JWT_SECRET` | 建议改 | HS256 要求 ≥ 32 字节 |
| `DEEPSEEK_API_KEY` | 否 | 不填则 AI 报告分析与 AI 就诊助手不可用 |
| `ALIYUN_OSS_ENDPOINT` / `_ACCESS_KEY_ID` / `_ACCESS_KEY_SECRET` / `_BUCKET_NAME` | 否 | 不填则头像/报告/发票文件无法上传 |

> 生产环境请务必先改掉 `MYSQL_*`、`REDIS_PASSWORD`、`JWT_SECRET` 的默认值。

---

## 五、常用运维命令

```bash
# 查看状态 / 日志
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend

# 重启 / 停止 / 删除
docker compose restart backend
docker compose down            # 停止并删除容器（保留数据卷）
docker compose down -v         # ⚠️ 连同数据卷一起删除（数据全丢）

# 进入容器
docker compose exec backend sh
docker compose exec mysql mysql -uroot -p emr_db

# 重新构建（改了源码 / Dockerfile / pom / package.json 之后）
docker compose build --no-cache backend
docker compose up -d backend
```

### 数据库备份与恢复

```bash
# 备份
docker compose exec -T mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" emr_db > backup.sql

# 恢复
docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" emr_db < backup.sql
```

### 数据库结构升级（已有数据）

```bash
docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" emr_db \
  < database/V5__fix_missing_columns.sql
```

### 修改 admin 密码

```bash
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" emr_db \
  -e "UPDATE sys_user SET password='\$2a\$10\$新的BCrypt哈希' WHERE username='admin';"
```

哈希生成方式见 `DEPLOYMENT_GUIDE.md`「默认账户」章节。

---

## 六、单独构建镜像（不用 compose）

```bash
# 后端（多阶段构建，无需本机 Maven/JDK）
docker build -t emr-backend ./backend

# 前端（Node 构建 + Nginx）
docker build -t emr-frontend ./frontend-vite

# OCR（文字识别服务）
docker build -t emr-ocr ./backend/ocr-service
```

---

## 七、常见问题

| 现象 | 原因 / 解决 |
|------|------------|
| 前端能打开但接口 404 | 后端容器未就绪，`docker compose logs -f backend` 等待启动完成；或改过 `context-path` |
| 后端启动报缺环境变量 | `.env` 未创建或为空；`docker compose up -d` 前先 `cp .env.example .env` |
| 上传文件失败 | 未配置 `ALIYUN_OSS_*`，或 OSS Bucket 未配置跨域（CORS）规则 |
| AI 分析返回错误 | 未配置 `DEEPSEEK_API_KEY`，或额度/限流（前端会自动退避重试） |
| OCR 请求超时 | 未启用 OCR 容器：`docker compose --profile ocr up -d`；多页 PDF 处理较慢（最长约 10 分钟） |
| 容器反复重启 | `docker compose logs <服务>`；OCR 常见于内存不足，需给宿主机加内存或 swap |
| 改了 `init.sql` 但没生效 | 初始化只在 mysql 数据卷为空时执行，需 `docker compose down -v` 重建（会清空数据）或手动执行迁移脚本 |
| 端口冲突 | 修改 `docker-compose.yml` 中 `ports` 左侧端口 |

---

## 八、何时不要用 Compose

- 服务器内存 ≤ 2GB：OCR（PaddleOCR）容易 OOM，建议 OCR 单独部署或改用云端 OCR；
- 需要 HTTPS / 域名：用宝塔 Nginx 反代更省事，见 `DEPLOYMENT_GUIDE.md`；
- 需要开机自启与进程守护：systemd 比 `restart: unless-stopped` 更贴合运维习惯。

---

*最后更新：2026-09*

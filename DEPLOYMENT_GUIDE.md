# 电子病历系统 — 服务器部署文档

> 适用环境：Linux（Ubuntu / 阿里云 Linux 等）
> 数据库：MySQL 8.0　·　后端：Spring Boot 3 + JDK 17+　·　前端：Vue 3 + Vite
>
> **本文档只描述一套部署路径**，与仓库自带的 `deploy-update.sh` 完全一致：

| 项目 | 取值 |
|------|------|
| 代码目录 | `/opt/Electronic-medical-record/` |
| 环境变量文件 | `/opt/emr.env`（权限 600） |
| 后端服务名 | `emr-backend`（systemd） |
| systemd 单元 | `/etc/systemd/system/emr-backend.service` |
| 后端端口 | `8080`（context-path `/api`） |
| 前端目录 | `/var/www/html/` |
| Nginx 站点 | 应用层 `8088`（宝塔：`/www/server/panel/vhost/nginx/emr-8088.conf`） |
| 数据库 | MySQL `emr_db` |
| OCR 服务 | Docker 容器 `ocr-aliyun`，端口 `8000` |

> 想用 Docker 一键跑起来（不做生产部署），见 `DEPLOY.md`。

---

## 目录

1. [部署方式选择](#一部署方式选择)
2. [服务器环境准备](#二服务器环境准备)
3. [数据库初始化](#三数据库初始化)
4. [环境变量文件 /opt/emr.env](#四环境变量文件-optemrenv)
5. [后端部署（systemd）](#五后端部署systemd)
6. [前端部署](#六前端部署)
7. [Nginx 配置](#七nginx-配置)
8. [OCR 服务部署](#八ocr-服务部署)
9. [域名与 HTTPS](#九域名与-https)
10. [日常更新与运维](#十日常更新与运维)
11. [常见问题排查](#十一常见问题排查)
12. [本地开发](#十二本地开发)

---

## 一、部署方式选择

| 方式 | 适用 | 说明 |
|------|------|------|
| **A. 一键脚本 `deploy-update.sh`** | 推荐 | 自动完成：停服 → 备份 → 数据库初始化/迁移 → 编译 JAR → 更新 Nginx → 更新 systemd → 启动验证 |
| B. 手动分步 | 需要精细控制时 | 按本文第 2~7 章逐条执行，路径与脚本保持一致 |

**方式 A**（在服务器上，项目已上传到 `/opt/Electronic-medical-record/`）：

```bash
cd /opt/Electronic-medical-record
chmod +x deploy-update.sh
./deploy-update.sh
```

> ⚠️ 脚本会用模板**覆盖** `emr-8088.conf` 与 `emr-backend.service`，
> 手工改过这两个文件的话，改完请一并调整脚本，否则下次部署会被重置。
> 前端不在脚本范围内，需单独执行（见第六章）。

---

## 二、服务器环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# JDK 17+（项目 pom 使用 Java 21，需 JDK 17 及以上）
sudo apt install -y openjdk-17-jdk
java -version

# Maven
sudo apt install -y maven
mvn -version

# Node.js 18+（仅前端构建需要；也可在本地构建后上传 dist）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# MySQL 8
sudo apt install -y mysql-server
sudo systemctl enable --now mysql

# Docker（仅 OCR 服务需要）
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
```

把项目放到约定的目录（后续所有路径都基于它）：

```bash
sudo mkdir -p /opt/Electronic-medical-record
# 用 scp / git / 宝塔面板上传项目内容到该目录
```

内存建议：**≥ 2GB**。OCR（PaddleOCR）单独占用约 1GB，若机器只有 2GB，
建议参考[第八章](#八ocr-服务部署)的容器内存限制与 swap 配置。

---

## 三、数据库初始化

### 3.1 全新部署（数据库为空）

```bash
# init.sql 已自包含全部表与字段（含 patient.user_id、emr_lab_report.table_data、emr_invoice.title）
# 注意：init.sql 内部自行 CREATE DATABASE / USE，命令中不要指定库名
mysql -u root -p < /opt/Electronic-medical-record/database/init.sql
```

> ⚠️ **不需要**再执行 `V2 / V3 / V4 / V5` 与 `migrate*.sql` —— 那些是给已有旧库升级用的。

### 3.2 已有旧库升级（保留数据）

```bash
# 均为幂等脚本，可重复执行
mysql -u root -p emr_db < /opt/Electronic-medical-record/database/V5__system_and_ai_config.sql
mysql -u root -p emr_db < /opt/Electronic-medical-record/database/V6__fix_missing_columns.sql
```

### 3.3 （可选）创建专用数据库账号

默认使用 root 最省事；若想隔离权限：

```sql
CREATE USER 'emr'@'localhost' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON emr_db.* TO 'emr'@'localhost';
FLUSH PRIVILEGES;
```

对应把 `/opt/emr.env` 里的 `SPRING_DATASOURCE_USERNAME/PASSWORD` 换成该账号。

### 3.4 默认账户

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `admin` | `admin` | 系统管理员，数据持久保存 |
| `user` | `user` | 演示账户，纯前端模式，数据不落库，刷新即清空 |

> ⚠️ 部署后请立即修改 admin 密码。密码必须存 BCrypt 哈希：

```sql
UPDATE sys_user SET password='$2a$10$新的BCrypt哈希' WHERE username='admin';
```

生成哈希：

```bash
# 方式一：服务器上（需 apache2-utils，输出 $2y$ 前缀，Spring Security 同样支持）
sudo apt install -y apache2-utils
htpasswd -bnBC 10 "" '你的新密码' | cut -d: -f2

# 方式二：本地开发机（项目根目录已装 bcryptjs）
node -e "const b=require('bcryptjs');console.log(b.hashSync('你的新密码',10))"
```

---

## 四、环境变量文件 /opt/emr.env

后端所有敏感配置都通过环境变量注入，**不在代码里硬编码**。
systemd 通过 `EnvironmentFile=/opt/emr.env` 读取，`deploy-update.sh` 也会 `source` 该文件。

```bash
sudo nano /opt/emr.env
sudo chmod 600 /opt/emr.env      # 必须：里面是明文凭据
```

内容示例（替换为真实值）：

```bash
# ---------- 数据库 ----------
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/emr_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=你的数据库密码

# ---------- JWT ----------
# HS256 要求密钥 >= 32 字节，太短会导致登录直接失败
JWT_SECRET=换成一串不少于32位的随机字符串

# ---------- 文件上传（默认 local） ----------
FILE_UPLOAD_PATH=/opt/Electronic-medical-record/uploads
FILE_STORAGE_TYPE=local

# ---------- Redis 缓存（可不配，连不上会自动降级为直接查库） ----------
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=你的Redis密码

# ---------- 大模型 API（AI 报告分析 + AI 就诊助手） ----------
# 变量名固定为 DEEPSEEK_API_KEY，代码读的就是这个名字（不要写成 ZHIPU_API_KEY）
# 不配置也能启动，只是 AI 功能不可用
DEEPSEEK_API_KEY=你的APIKey

# ---------- 阿里云 OSS（可选；系统设置切 OSS 时需配置） ----------
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
ALIYUN_OSS_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_OSS_BUCKET_NAME=你的Bucket名
```

### prod profile 下的**必填**变量

`application-prod.yml` 中以下变量没有默认值，缺失会导致**后端启动失败**：

`SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`SPRING_DATASOURCE_PASSWORD`、
`JWT_SECRET`

`DEEPSEEK_API_KEY` 与 `ALIYUN_OSS_*` 为**可选**（AI / OSS 功能）；默认 local 存储时**不填 OSS 也能上传**。

> 需要 OSS 时在系统设置切换，并配置四个 `ALIYUN_OSS_*`。

### 环境变量排查经验

Spring Boot 配置优先级：**环境变量 > application-{profile}.yml > application.yml**。

systemd 的 `.service.d/*.conf`（drop-in）在主 unit **之后**加载，
其中的 `Environment=` 会**覆盖**主 unit 的 `EnvironmentFile`。
排查配置不生效时，直接看进程实际拿到的值：

```bash
cat /proc/$(systemctl show -p MainPID --value emr-backend)/environ | tr '\0' '\n' | grep -E 'JWT|REDIS|DEEPSEEK'
```

---

## 五、后端部署（systemd）

### 5.1 构建 JAR

```bash
cd /opt/Electronic-medical-record/backend
mvn clean package -DskipTests
ls -lh target/*.jar      # 产物：target/electronic-medical-record-0.0.1-SNAPSHOT.jar
```

> 项目没有 `mvnw` 包装器，请使用系统 Maven；也没有名为 `prod` 的 Maven profile，
> 生产配置由运行时的 `-Dspring.profiles.active=prod` 决定。

### 5.2 创建 systemd 服务

```bash
# 先确认 java 的真实路径（不要写死版本号，换机器/换版本就会失效）
readlink -f "$(command -v java)"
```

```bash
sudo nano /etc/systemd/system/emr-backend.service
```

```ini
[Unit]
Description=Electronic Medical Record Backend (Spring Boot)
After=network.target mysqld.service docker.service
Wants=mysqld.service
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=root
WorkingDirectory=/opt/Electronic-medical-record/backend

ExecStart=/usr/bin/java \
    -Xms128m -Xmx256m \
    -Dspring.profiles.active=prod \
    -Dserver.port=8080 \
    -jar /opt/Electronic-medical-record/backend/target/electronic-medical-record-0.0.1-SNAPSHOT.jar

ExecStop=/bin/kill -TERM $MAINPID
TimeoutStopSec=10

Restart=on-failure
RestartSec=10

StandardOutput=journal
StandardError=journal
SyslogIdentifier=emr-backend

# 所有环境变量（数据库/OSS/AI/Redis/JWT/路径）统一从 /opt/emr.env 读取
EnvironmentFile=/opt/emr.env

[Install]
WantedBy=multi-user.target
```

> `ExecStart` 里的 java 路径请替换成 5.2 开头 `readlink` 查到的真实路径。

```bash
sudo systemctl daemon-reload
sudo systemctl enable emr-backend      # 开机自启
sudo systemctl start emr-backend
sudo systemctl status emr-backend
```

### 5.3 验证

```bash
curl -s http://localhost:8080/api/health
sudo journalctl -u emr-backend -f      # 实时日志
```

---

## 六、前端部署

前端是纯静态产物，构建后放到 Nginx 的 `/var/www/html/`。

### 方式一：本地构建 + 上传（推荐）

```powershell
# Windows 开发机，在 frontend-vite 目录
cd frontend-vite
copy deploy.ps1.example deploy.ps1     # 首次：复制示例并填入服务器信息
.\deploy.ps1
```

脚本会自动：`npm run build` → 清空服务器旧 `assets` → 上传 `dist/*` 到 `/var/www/html/`。

> ⚠️ `index.html` 与 `assets/` 必须一起上传：Vite 每次构建都会给资源加新的哈希名，
> `index.html` 里记录的正是这些新文件名，缺一不可。

### 方式二：服务器上构建

```bash
cd /opt/Electronic-medical-record/frontend-vite
bash deploy.sh          # 依赖安装 + 构建 + 拷贝到 /var/www/html/
```

---

## 七、Nginx 配置

宝塔面板下，`deploy-update.sh` 会写入 `/www/server/panel/vhost/nginx/emr-8088.conf`；
非宝塔环境放到 `/etc/nginx/conf.d/emr-8088.conf` 即可。

```nginx
server
{
    listen 8088;
    server_name _;
    index index.html index.htm;
    root  /var/www/html;

    client_max_body_size 100m;

    location / {
        try_files $uri $uri/ /index.html;      # Vue Router history 模式
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 720s;
        proxy_read_timeout 720s;       # OCR 处理多页 PDF 可能需要约 10 分钟

        # AI 就诊助手使用 SSE 流式输出，必须关闭缓冲，否则回答会被积压到结束才显示
        proxy_buffering off;
        proxy_cache off;

        client_max_body_size 100m;
    }
}
```

```bash
sudo nginx -t && sudo nginx -s reload      # 宝塔：/www/server/nginx/sbin/nginx -t
```

> 🔎 **超时必须逐层对齐**：前端 fetch 超时 ≥ Nginx `proxy_read_timeout` ≥ 后端
> `ocr.service.timeout` ≥ 实际处理时间。之前 504 的根因就是多层超时不一致 +
> 前端超时重试，导致多个 OCR 任务并发叠加把容器打 OOM。

---

## 八、OCR 服务部署

基于 PaddleOCR 2.7.3 的 Python 服务，跑在 Docker 容器里。

```bash
# 上传 backend/ocr-service/ 到服务器后
cd /path/to/ocr-service
sudo docker build -t ocr-aliyun-v2:latest .
```

```bash
sudo docker run -d \
  --name ocr-aliyun \
  --restart unless-stopped \
  --memory="1.5g" \
  --memory-swap="3g" \
  -p 8000:8000 \
  -e FLAGS_use_mkldnn=0 \
  -v /opt/ocr-models:/root/.paddlex \
  ocr-aliyun-v2:latest
```

```bash
curl http://localhost:8000/health      # {"status":"ok"}
```

注意事项：

- 首次启动会下载模型（约 400MB），需要网络连通；
- 处理 7 页 PDF 约 10 分钟，因此 Nginx / 后端超时都放宽到 720s；
- 容器内存限制用于**避免 OOM 波及宿主机**，2GB 机器建议再加 2GB swap；
- 修改 `main.py` 后必须**重建镜像**，`docker exec pip install` 装的包在容器重建后会丢失。

---

## 九、域名与 HTTPS

宝塔面板：网站 → 反向代理 → 添加项目

- 域名：`你的域名`
- 目标 URL：`http://127.0.0.1:8088`

提交后务必检查生成的配置文件：

```nginx
server_name 你的域名;        # ✅ 正确
server_name 你的域名:80;     # ❌ 错误：server_name 不能带端口，会导致 404
```

若宝塔自动加了 `:80`，手动去掉后重载：

```bash
sed -i 's/server_name 你的域名:80;/server_name 你的域名;/' \
    /www/server/panel/vhost/nginx/你的域名.conf
/www/server/nginx/sbin/nginx -s reload
```

最后在站点设置 → SSL → Let's Encrypt 申请证书并开启强制 HTTPS。

---

## 十、日常更新与运维

```bash
# 后端
cd /opt/Electronic-medical-record && ./deploy-update.sh

# 只重启后端（配置/环境变量改动后）
sudo systemctl restart emr-backend

# 前端（本地开发机）
cd frontend-vite && .\deploy.ps1

# 日志
sudo journalctl -u emr-backend -f
sudo journalctl -u emr-backend --since "1 hour ago" --priority=err

# OCR 容器
docker ps | grep ocr
docker logs ocr-aliyun --tail 50
```

**数据库备份**（建议加进 crontab）：

```bash
mysqldump -u root -p emr_db > /opt/backup/emr_$(date +%F).sql
```

**一键巡检**：把下面内容存为 `/opt/Electronic-medical-record/check.sh`

```bash
#!/bin/bash
echo "===== EMR 巡检 $(date) ====="
echo "--- 内存 ---";    free -h | head -2
echo "--- 磁盘 ---";    df -h / | tail -1
echo "--- 容器 ---";    docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker 未运行"
echo "--- 端口 ---";    ss -tlnp | grep -E "8000|8080|3306"
echo "--- 后端 ---";    echo "HTTP $(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://localhost:8080/api/health)"
echo "--- OCR  ---";    echo "HTTP $(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 http://localhost:8000/health)"
echo "--- OOM  ---";    dmesg | grep -i "oom\|killed" | tail -3 || echo "无"
```

---

## 十一、常见问题排查

### 后端起不来

```bash
sudo systemctl status emr-backend
sudo journalctl -u emr-backend -n 50 --no-pager
```

| 日志关键字 | 原因 | 解决 |
|-----------|------|------|
| `Could not resolve placeholder 'XXX'` | prod 必填环境变量没设 | 在 `/opt/emr.env` 补上（见第四章） |
| `key byte array is NNN bits ... not secure enough` | `JWT_SECRET` 少于 32 字节 | 换成长随机串后重启 |
| `Unknown column 'xxx'` | 数据库结构落后于代码 | 执行 `database/V5__fix_missing_columns.sql` |
| `Unable to connect to Redis` | Redis 未启动/密码错 | 属**告警**，缓存自动降级，功能不受影响；需要缓存再修 |

### 登录失败

```bash
# 1) 后端是否正常
curl -s http://localhost:8080/api/health
# 2) 数据库连通性
mysql -u root -p emr_db -e "SELECT username FROM sys_user"
# 3) 确认 admin 密码哈希是 "admin" 对应值（默认脚本已保证）
#    如已改过密码，按 3.4 重新生成哈希更新
```

### 上传文件失败

```bash
ls -la /opt/Electronic-medical-record/uploads/     # 目录是否存在且可写
# 默认 local：检查 uploads 目录权限；若使用 OSS，检查 Bucket CORS
```

### OCR 识别超时 / 容器反复重启

```bash
docker ps -a | grep ocr
docker logs ocr-aliyun --tail 50
docker stats --no-stream
free -h
dmesg | tail -30 | grep -i "oom\|kill"
```

内存不足时：加大 swap、限制容器内存、或改为按需启动容器。

### 前端页面空白 / 接口 404

```bash
ls /var/www/html/            # index.html 与 assets/ 必须在
sudo nginx -t
# 接口 404 多为 Nginx 反代端口写错：location /api/ 应指向 127.0.0.1:8080
```

---

## 十二、本地开发

```powershell
cd backend

# 方式一：零配置启动（H2 内存数据库，无需安装 MySQL，数据重启即清空）
.\run-dev.ps1 -Profile dev

# 方式二：连本地 MySQL（先复制 local.env.example 为 local.env 并填值）
copy local.env.example local.env
.\run-dev.ps1
```

前端：

```powershell
cd frontend-vite
npm install
npm run dev            # http://localhost:5173，/api 已代理到 localhost:8080
```

> H2 模式的建表/初始数据脚本为 `backend/src/main/resources/schema-h2.sql` 与 `data-h2.sql`，
> 字段与 MySQL 版 `database/init.sql` 保持一致，仅语法不同（无 ENGINE/COMMENT、索引单独创建）。
> 改动表结构时**两处都要改**。

---

## 附：目录结构

```
Electronic-medical-record/
├── backend/
│   ├── src/main/java/com/medical/emr/   # controller / service / mapper / entity / config / security
│   ├── src/main/resources/              # application*.yml、schema-h2.sql、data-h2.sql
│   ├── ocr-service/                     # PaddleOCR Python 服务（main.py / requirements.txt / Dockerfile）
│   ├── Dockerfile                       # 后端容器镜像（多阶段构建）
│   ├── local.env.example / run-dev.ps1  # 本地开发
│   └── pom.xml
├── frontend-vite/
│   ├── src/                             # views / components / stores / api / router / utils / composables
│   ├── Dockerfile / nginx-docker.conf   # 前端容器镜像
│   └── deploy.ps1.example / deploy.sh   # 前端部署脚本
├── database/
│   ├── init.sql                         # 全新部署（已自包含全部表与字段）
│   ├── V5__fix_missing_columns.sql      # 旧库升级（幂等）
│   └── V2/V3/V4                         # 历史增量脚本
├── docs/                                # 需求文档
├── docker-compose.yml / .env.example    # 容器化一键部署
├── deploy-update.sh                     # 服务器一键部署脚本
├── DEPLOYMENT_GUIDE.md                  # 本文档
├── DEPLOY.md                            # 容器化部署文档
└── README.md
```

---

*最后更新：2026-09*

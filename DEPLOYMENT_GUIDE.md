# 电子病历系统 — 部署文档

> 版本：2026-05-17  
> 适用环境：任何linux系统  
> 服务器IP示例：`*.*.*.*`

---

## 目录

1. [系统架构](#系统架构)
2. [环境要求](#环境要求)
3. [第一次部署（全新服务器）](#第一次部署全新服务器)
4. [环境变量配置](#环境变量配置)
5. [前端部署](#前端部署)
6. [后端部署](#后端部署)
7. [OCR服务部署](#ocr服务部署)
8. [数据库初始化](#数据库初始化)
9. [Nginx配置](#nginx配置)
10. [日常更新部署](#日常更新部署)
11. [常见问题排查](#常见问题排查)

---

## 系统架构

```
浏览器
  │
  ▼
Nginx :8088（宝塔面板管理）
  ├── / → 前端静态文件 /var/www/html/
  └── /api/ → Spring Boot :8080
                  └── OCR服务 :8000（Docker容器）
                  └── MySQL :3306
                  └── 阿里云 OSS（文件存储）
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + Pinia |
| 后端 | Spring Boot 3 + MyBatis-Plus + JWT |
| 数据库 | MySQL 8.0 |
| OCR | PaddleOCR 2.7.3（Docker） |
| 文件存储 | 阿里云 OSS |
| AI分析 | 智谱 GLM-4-Flash 或 任何其他免费大模型api
| Web服务器 | Nginx（宝塔面板） |

---

## 环境要求

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Java | 17+ | 运行Spring Boot后端 |
| Maven | 3.6+ | 后端构建 |
| Node.js | 18+ | 前端构建 |
| MySQL | 8.0+ | 数据存储 |
| Docker | 20+ | 运行OCR服务 |
| Nginx | 1.18+ | 反向代理 |

---

## 第一次部署（全新服务器）

### Step 1：安装基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Java 17
sudo apt install -y openjdk-17-jdk
java -version

# 安装Maven
sudo apt install -y maven
mvn -version

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v

# 安装MySQL 8
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# 安装Docker
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2：创建MySQL数据库和用户

```sql
-- 以root登录MySQL
sudo mysql -u root

-- 创建数据库
CREATE DATABASE emr_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（替换 your_password 为实际密码）
CREATE USER 'emr_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON emr_db.* TO 'emr_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3：初始化数据库表结构

```bash
# 上传 database/init.sql 到服务器后执行
mysql -u emr_user -p emr_db < database/init.sql
# 执行版本迁移脚本
mysql -u emr_user -p emr_db < database/V2__add_avatar_url.sql
mysql -u emr_user -p emr_db < database/V3__add_emr_data_tables.sql
mysql -u emr_user -p emr_db < migrate-user-isolation.sql
mysql -u emr_user -p emr_db < migrate2.sql
```

---

## 环境变量配置

后端通过环境变量注入所有敏感配置，**不在代码中硬编码任何密钥**。

### 方式一：在服务器上创建环境变量文件（推荐）

```bash
sudo nano /etc/emr/env.conf
```

填入以下内容（替换为真实值）：

```bash
# 数据库
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/emr_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
SPRING_DATASOURCE_USERNAME=emr_user
SPRING_DATASOURCE_PASSWORD=your_mysql_password

# JWT密钥（自定义一串随机字符串）
JWT_SECRET=your-custom-jwt-secret-key-here

# 文件上传路径
FILE_UPLOAD_PATH=/opt/emr/uploads

# 智谱AI（从 https://open.bigmodel.cn 获取）
ZHIPU_API_KEY=your_zhipu_api_key

# 阿里云OSS（从阿里云控制台获取）
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_BUCKET_NAME=your_bucket_name
```

### 方式二：宝塔面板配置（图形界面）

1. 宝塔面板 → 网站 → 对应项目 → 环境变量
2. 逐个填入上述变量名和值

---

## 前端部署

### 本地构建并上传（Windows开发机）

```powershell
# 在 frontend-vite 目录下运行部署脚本（自动构建+上传）
cd frontend-vite
.\deploy.ps1
```

脚本会自动完成：
1. `npm run build` 构建
2. 清空服务器旧 assets
3. 上传 `dist/*` 到服务器 `/var/www/html/`

### 前端访问地址

```
http://服务器IP:8088
```

---

## 后端部署

### 构建 JAR 包

```bash
# 在 backend 目录下
mvn clean package -DskipTests -P prod
# 生成文件：target/emr-backend-*.jar
```

### 上传并启动

```bash
# 上传JAR到服务器
scp target/emr-backend-*.jar user@服务器IP:/opt/emr/

# 在服务器上启动（加载环境变量）
source /etc/emr/env.conf
nohup java -jar /opt/emr/emr-backend-*.jar \
  --spring.profiles.active=prod \
  > /opt/logs/emr.log 2>&1 &

# 验证启动
tail -f /opt/logs/emr.log
```

### 使用 systemd 管理（推荐，开机自动启动）

创建服务文件 `/etc/systemd/system/emr.service`：

```ini
[Unit]
Description=EMR Backend Service
After=network.target mysql.service

[Service]
User=www
WorkingDirectory=/opt/emr
EnvironmentFile=/etc/emr/env.conf
ExecStart=/usr/bin/java -jar /opt/emr/emr-backend.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable emr
sudo systemctl start emr
sudo systemctl status emr
```

---

## OCR服务部署

OCR服务运行在Docker容器中，基于PaddleOCR 2.7.3。

### 构建镜像

```bash
# 上传 backend/ocr-service/ 目录到服务器
scp -r backend/ocr-service/ user@服务器IP:/home/user/

# 在服务器上构建
cd /home/user/ocr-service
sudo docker build -t ocr-aliyun-v2:latest .
```

### 启动容器

```bash
sudo docker run -d \
  --name ocr-aliyun \
  --restart unless-stopped \
  --memory="1.8g" \
  --memory-swap="3.6g" \
  -p 8000:8000 \
  -e FLAGS_use_mkldnn=0 \
  -v /opt/ocr-models:/root/.paddlex \
  ocr-aliyun-v2:latest
```

### 验证OCR服务

```bash
curl http://localhost:8000/health
# 返回 {"status":"ok"} 表示正常
```

### OCR服务注意事项

- 服务器需要至少 **2GB内存**，建议配置 **3.6GB swap**
- 首次启动会自动下载模型文件（约400MB），需等待
- 7页PDF处理时间约 **10分钟**，前端超时设置为720秒

---

## 数据库初始化

### 默认账户

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `admin` | `admin` | 系统管理员，数据持久保存 |
| `user` | `user` | 演示账户，数据不保存 |

> ⚠️ 生产环境部署后，请立即在数据库中修改 admin 的密码

```sql
-- 修改admin密码（密码需要BCrypt加密）
UPDATE sys_user SET password='$2a$10$新密码BCrypt哈希' WHERE username='admin';
```

---

## Nginx配置

Nginx由宝塔面板管理，关键配置如下：

```nginx
server {
    listen 8088;
    
    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;  # Vue Router history模式
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 720s;      # OCR处理大文件需要较长超时
        proxy_connect_timeout 60s;
        client_max_body_size 100m;    # 支持大文件上传
    }
}
```

---

## 日常更新部署

### 只更新前端

```powershell
# Windows开发机，在 frontend-vite 目录
.\deploy.ps1
```

### 只更新后端

```bash
# 本地构建
mvn clean package -DskipTests -P prod

# 上传并重启
scp target/emr-backend-*.jar user@服务器IP:/opt/emr/
sudo systemctl restart emr
```

### 更新OCR服务

```bash
# 停止旧容器
sudo docker stop ocr-aliyun
sudo docker rm ocr-aliyun

# 重新构建并启动（参考OCR服务部署章节）
```

---

## 常见问题排查

### 登录失败

```bash
# 检查后端是否正常运行
sudo systemctl status emr
tail -100 /opt/logs/emr.log

# 检查数据库连接
mysql -u emr_user -p emr_db -e "SELECT 1"
```

### 上传文件失败

```bash
# 检查上传目录权限
ls -la /opt/emr/uploads/
# 确保服务运行用户有写权限
chown -R www:www /opt/emr/uploads/
```

### OCR识别超时

```bash
# 检查OCR容器状态
sudo docker ps | grep ocr
sudo docker logs ocr-aliyun --tail 50

# 检查内存使用
free -h
sudo docker stats ocr-aliyun
```

### 前端页面空白

```bash
# 检查Nginx
sudo nginx -t
sudo systemctl status nginx

# 检查前端文件
ls /var/www/html/
# 确保 index.html 存在且 assets/ 目录有文件
```

### 查看后端实时日志

```bash
tail -f /opt/logs/emr.log
# 或
sudo journalctl -u emr -f
```

---

## 目录结构说明

```
EMR/
├── backend/
│   ├── src/                    # Spring Boot 后端源码
│   ├── ocr-service/            # PaddleOCR Python服务
│   │   ├── main.py             # OCR服务入口
│   │   ├── requirements.txt    # Python依赖
│   │   └── Dockerfile          # OCR容器构建文件
│   ├── pom.xml                 # Maven依赖配置
│   └── Dockerfile              # 后端容器构建文件
├── frontend-vite/
│   ├── src/                    # Vue 3 前端源码
│   │   ├── views/              # 页面组件
│   │   ├── components/         # 公共组件
│   │   ├── stores/             # Pinia状态管理
│   │   ├── api/                # API请求封装
│   │   ├── router/             # Vue Router路由
│   │   └── assets/             # 静态资源和CSS
│   ├── package.json            # npm依赖
│   └── vite.config.js          # Vite构建配置
├── database/
│   ├── init.sql                # 初始建表脚本
│   ├── V2__add_avatar_url.sql  # 版本迁移：头像字段
│   └── V3__add_emr_data_tables.sql  # 版本迁移：数据表
├── deploy/                     # 云端部署相关脚本
├── docs/                       # 需求文档
├── docker-compose.yml          # Docker一键编排
├── README.md                   # 项目说明
├── DEPLOYMENT_GUIDE.md         # 本部署文档
├── DEVELOPMENT_LOG.md          # 开发日志
└── .gitignore                  # Git忽略规则
```

---

*文档生成时间：2026-05-17*  
*维护者：请自行填写*

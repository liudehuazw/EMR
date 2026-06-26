#!/bin/bash
# ================================================
#   电子病历系统 - 服务器更新部署脚本
#   服务器: YOUR_SERVER_IP
#   执行方式: chmod +x deploy-update.sh && ./deploy-update.sh
# ================================================

set -e

echo ""
echo "========================================"
echo "  电子病历系统 - 更新部署"
echo "========================================"
echo ""

# ---- 配置变量 ----
PROJECT_DIR="/opt/Electronic-medical-record"
FRONTEND_HTML="/var/www/html/index.html"
BACKEND_SERVICE="emr-backend"
NGINX_CONF="/www/server/panel/vhost/nginx/emr-8088.conf"
BACKEND_PORT=8080
DB_NAME="emr_db"
DB_USER="root"
DB_PASS="${DB_PASS:-your_db_password_here}"

# ================================================
# 步骤1: 停止后端服务
# ================================================
echo "【步骤1/7】停止后端服务..."
sudo systemctl stop ${BACKEND_SERVICE} || echo "警告: 服务停止失败，可能未运行"
echo "✅ 后端服务已停止"
echo ""

# ================================================
# 步骤2: 备份当前项目
# ================================================
echo "【步骤2/7】备份当前项目..."
BACKUP_DIR="/opt/emr-backup-$(date +%Y%m%d%H%M%S)"
if [ -d "${PROJECT_DIR}" ]; then
    sudo cp -r "${PROJECT_DIR}" "${BACKUP_DIR}"
    echo "✅ 已备份到 ${BACKUP_DIR}"
else
    echo "⚠️ 原项目目录不存在，跳过备份"
fi
echo ""

# ================================================
# 步骤3: 数据库初始化 / 迁移
# ================================================
echo "【步骤3/8】数据库初始化..."

# 检查数据库是否存在表
TABLE_COUNT=$(mysql -u${DB_USER} -p"${DB_PASS}" ${DB_NAME} -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';" 2>/dev/null)

if [ "${TABLE_COUNT}" = "0" ] || [ -z "${TABLE_COUNT}" ]; then
    echo "  数据库为空，执行完整初始化..."
    mysql -u${DB_USER} -p"${DB_PASS}" ${DB_NAME} < ${PROJECT_DIR}/database/init.sql
    if [ $? -eq 0 ]; then
        echo "✅ 数据库表创建成功"
    else
        echo "❌ 数据库初始化失败！请检查 init.sql"
        exit 1
    fi
else
    echo "  数据库已有 ${TABLE_COUNT} 个表，执行增量迁移..."
    mysql -u${DB_USER} -p"${DB_PASS}" ${DB_NAME} -e "
        ALTER TABLE patient ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) COMMENT '头像OSS URL';
    " 2>/dev/null && echo "✅ avatar_url 字段已添加" || echo "⚠️ 字段可能已存在，跳过"
fi
echo ""

# ================================================
# 步骤4: 构建后端 JAR
# ================================================
echo "【步骤4/7】构建后端 JAR（这一步需要几分钟，请耐心等待）..."
cd ${PROJECT_DIR}/backend

# 构建 JAR（跳过测试，使用系统 Maven）
mvn clean package -DskipTests -q
if [ $? -eq 0 ]; then
    echo "✅ JAR 构建成功"
    ls -lh target/*.jar
else
    echo "❌ JAR 构建失败！请检查错误信息"
    exit 1
fi
echo ""

# ================================================
# 步骤5: 更新前端文件
# ================================================
echo "【步骤5/7】更新前端文件..."
sudo cp ${PROJECT_DIR}/frontend/index.html ${FRONTEND_HTML}
sudo chown www:www ${FRONTEND_HTML}
sudo chmod 644 ${FRONTEND_HTML}
echo "✅ 前端文件已更新到 ${FRONTEND_HTML}"
echo ""

# ================================================
# 步骤6: 更新 Nginx 配置（修复 API 代理端口）
# ================================================
echo "【步骤6/7】更新 Nginx 配置..."

sudo tee ${NGINX_CONF} > /dev/null << 'NGINX_EOF'
server
    {
        listen 8088;
        server_name _;
        index index.html index.htm;
        root  /var/www/html;

        # 文件上传大小限制（支持50MB上传）
        client_max_body_size 100m;

        # 前端静态文件
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        # API代理到后端Spring Boot（端口8080）
        location /api/ {
            proxy_pass http://127.0.0.1:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 720s;
            proxy_read_timeout 720s;

            # 文件上传大小限制
            client_max_body_size 100m;

            # 跨域处理
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;

            # OPTIONS预检请求
            if ($request_method = 'OPTIONS') {
                add_header Access-Control-Allow-Origin * always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
                add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
                add_header Access-Control-Max-Age 1728000;
                add_header Content-Type 'text/plain; charset=utf-8';
                add_header Content-Length 0;
                return 204;
            }
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # 静态资源缓存
        location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$
        {
            expires 30d;
        }

        location ~ .*\.(js|css)?$
        {
            expires 12h;
        }

        location ~ /\.
        {
            deny all;
        }

        access_log  /www/wwwlogs/emr-access.log;
        error_log   /www/wwwlogs/emr-error.log;
    }
NGINX_EOF

# 测试并重载 Nginx
sudo /www/server/nginx/sbin/nginx -t
if [ $? -eq 0 ]; then
    sudo /www/server/nginx/sbin/nginx -s reload
    echo "✅ Nginx 配置已更新并重载"
else
    echo "❌ Nginx 配置有误！请检查"
    exit 1
fi
echo ""

# ================================================
# 步骤7: 更新 systemctl 服务配置
# ================================================
echo "【步骤7/8】更新 systemctl 服务配置..."

sudo tee /etc/systemd/system/emr-backend.service > /dev/null << 'SERVICE_EOF'
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

ExecStart=/usr/lib/jvm/jdk-21.0.3+9/bin/java \
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

Environment=SPRING_PROFILES_ACTIVE=prod
Environment=SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/emr_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
Environment=SPRING_DATASOURCE_USERNAME=root
Environment=SPRING_DATASOURCE_PASSWORD=your_db_password_here
Environment=JWT_SECRET=your_jwt_secret_here
Environment=FILE_UPLOAD_PATH=/opt/Electronic-medical-record/uploads
Environment=ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
Environment=ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id_here
Environment=ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret_here
Environment=ALIYUN_OSS_BUCKET_NAME=your_bucket_name_here

[Install]
WantedBy=multi-user.target
SERVICE_EOF

sudo systemctl daemon-reload
echo "✅ systemctl 服务配置已更新"
echo ""

# ================================================
# 步骤8: 启动后端服务
# ================================================
echo "【步骤8/8】启动后端服务..."
sudo systemctl start ${BACKEND_SERVICE}
sleep 5

# 检查服务状态
if sudo systemctl is-active --quiet ${BACKEND_SERVICE}; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败！查看日志："
    sudo journalctl -u ${BACKEND_SERVICE} --no-pager -n 30
    exit 1
fi
echo ""

# ================================================
# 部署验证
# ================================================
echo "========================================"
echo "  部署验证"
echo "========================================"
echo ""

echo "1. 后端健康检查:"
curl -s http://localhost:8080/api/health 2>/dev/null || echo "  ⚠️ 后端未响应（可能还在启动中，等30秒再试）"
echo ""

echo "2. 前端代理测试:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}" http://localhost:8088/ 2>/dev/null
echo ""

echo "3. API代理测试:"
curl -s -o /dev/null -w "HTTP状态码: %{http_code}" http://localhost:8088/api/health 2>/dev/null
echo ""

echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
echo ""
echo "访问地址: http://YOUR_SERVER_IP:8088"
echo ""
echo "如果后端还没响应，请等待30秒后再访问"
echo "查看后端日志: sudo journalctl -u ${BACKEND_SERVICE} -f"
echo ""

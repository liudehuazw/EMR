# 电子病历管理系统

个人医疗记录管理系统（Personal Medical Record Management System）

## 项目概述

这是一个现代化的家庭医疗记录管理网站，支持患者档案管理、病历统计、检验报告、影像报告和发票统计等功能。系统支持多种格式的文件上传，并能自动解析提取关键数据。

**本仓库为 GitHub 开源原型**，主要功能与个人私有生产项目对齐，不含生产部署脚本与敏感配置。项目即开即用，也可以自行扩展开发。

**最快试用**：`cp .env.example .env && docker compose up -d` → 打开 http://localhost:8088（默认用户名密码为admin，请注意修改密码）。详见 [DEPLOY.md](DEPLOY.md)。


## 系统架构

### 整体架构图

```
用户浏览器
    │
    ▼ https://your-domain.com (443)
┌────────────────────────────────────────┐
│  Nginx (域名层)                         │
│  - SSL 证书   (免费证书即可)             │
│  - 反向代理 → http://127.0.0.1:8088     │
└────────────┬───────────────────────────┘
             │ http://127.0.0.1:8088
             ▼
┌────────────────────────────────────────┐
│  Nginx (应用层)                         │
│  - /        → /var/www/html/index.html │
│  - /api/    → http://127.0.0.1:8080    │
└────────────┬───────────────────────────┘
             │ http://127.0.0.1:8080
             ▼
┌────────────────────────────────────────┐
│  Spring Boot 后端 (emr-backend)         │
│  - 端口 8080                            │
│  - systemctl 托管                       │
└───────┬────────────────────┬────────────┘
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  MySQL       │    │  云服务器OSS  │
│  - emr_db    │    │  - your-oss  │
│  - port 3306 │    │  - 所选地域   │
└──────────────┘    └──────┬───────┘
                           ▲
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     │
┌────────────────────────────────────────┐    │
│  OCR 服务(Docker 容器)                  │    │
│  - Python + PaddleOCR                   │   │
│  - 端口 8000                            │   │
└────────────────────────────────────────┘    │
                                              │
                                              
图片上传 → 后端 → OCR 服务 → 文字识别 → 返回结果
```

### 运行中的服务

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx (域名层) | 443 (HTTPS) | 处理域名访问、SSL 证书 |
| Nginx (应用层) | 8088 | 前端静态文件 + API 代理 |
| Spring Boot | 8080 | 后端业务逻辑 API |
| MySQL | 3306 | 数据存储 |
| OCR Docker | 8000 | 图片文字识别服务 |

## 技术栈

### 前端

| 组件 | 技术栈 |
|------|--------|
| **框架** | Vue 3.x (Composition API + `<script setup>`) |
| **构建工具** | Vite 5.x |
| **路由** | Vue Router 4.x |
| **状态管理** | Pinia |
| **UI 组件库** | Element Plus |
| **图表** | Chart.js (动态加载) |
| **数据存储** | 后端 MySQL + localStorage 缓存 |
| **文件上传** | 阿里云 OSS SDK (直传) |
| **OCR 解析** | 前端 `lab-parser.js` (ES Module) |
| **构建输出** | `frontend-vite/dist/` → 上传至 `/var/www/html/` |
| **本地开发代理** | Vite dev server 代理 `/api` → `localhost:8080` |

### 后端

| 组件 | 技术栈 |
|------|--------|
| **框架** | Spring Boot 3.x |
| **语言** | Java 17+ (JDK 21) |
| **数据库 ORM** | MyBatis Plus |
| **认证** | Spring Security + JWT |
| **文件处理** | Apache POI (Word/Excel)、PDFBox (PDF) |
| **OCR 调用** | HTTP 请求 → Python OCR 服务 |
| **文件存储** | 阿里云 OSS SDK |
| **部署方式** | JAR 包 + systemctl 服务托管 |

### 基础设施

| 组件 | 技术栈 |
|------|--------|
| **Web 服务器** | Nginx (两层代理：域名层 + 应用层) |
| **数据库** | MySQL 8.0+ (数据库名: emr_db) |
| **对象存储** | 阿里云 OSS (bucket: 自行配置, 杭州地域) |
| **OCR 服务** | Python + PaddleOCR (Docker 容器) |
| **进程管理** | systemctl (emr-backend 服务) |
| **反向代理** | 宝塔面板 Nginx (域名 HTTPS) |

## 核心功能

- 👤 **患者档案管理** - 患者信息的增删改查、头像上传裁剪
- 📊 **病历统计** - 按日期自动分类的病历管理，智能提取就诊日期
- 💰 **发票统计** - 医疗费用统计；支持商保报销勾选录入，汇总显示商保报销与实际自付
- 🔬 **检验报告** - 支持图片/PDF上传，自动提取数值和正常范围；OCR 原文可编辑保存
- 🏥 **影像报告** - 医学影像资料的管理
- 💬 **AI 智能分析** - 检验/影像报告一键解读（按用户配置的 AI 模型，非固定 DeepSeek）
- 🤖 **AI 就诊助手** - 右下角悬浮窗，SSE 流式问答；工具查库且**按登录用户隔离**患者数据
- ⚙️ **系统设置** - NavBar 入口：存储方式（admin 全站 OSS/本地切换）、AI 模型（每用户独立 API Key）
- 🖼️ **头像管理** - 支持头像上传、裁剪、缩放、拖动调整
- 👥 **演示模式** - 演示账户 user/user，数据不保存，刷新即清空
- 📱 **响应式设计** - 兼容手机浏览器访问
- 🔒 **隐私选项** - 本地存储 + 本地 Ollama 可完全本地化处理文件与 AI（见系统设置说明）

## 文件支持

- **图片格式**: JPG, PNG, GIF, BMP
- **文档格式**: PDF
- **自动解析**: 支持从检验报告中自动提取数值和正常范围
- **文件大小限制**: 最大 50MB (后端)，Nginx 支持 100MB

## 本地开发

### 环境要求

- Java 17+（项目以 Java 21 为编译目标）
- Maven 3.6+
- Node.js 18+
- MySQL 8.0+ —— 仅“连数据库模式”需要；另有 H2 内存库模式可零配置启动
- Python 3.8+ 或 Docker —— 仅 OCR 服务需要

### 最快上手：不用装 MySQL

```powershell
cd backend
.\run-dev.ps1 -Profile dev     # H2 内存数据库，自动建表并写入演示数据
```

后端启动在 http://localhost:8080 ，默认账号 `admin` / `admin`。
数据仅存在本次运行期间，进程退出即清空（初始数据见 `backend/src/main/resources/data-h2.sql`）。

### 使用 MySQL

**1）初始化数据库**

```bash
# init.sql 已自包含全部表与字段，执行这一个脚本即可
# 注意：init.sql 内部自行 CREATE DATABASE / USE，不要指定库名
mysql -u root -p < database/init.sql
```

数据库名：`emr_db`，连接信息通过 `backend/local.env` 注入（复制 `local.env.example` 后填写）。

> 已有的旧库升级，请依次执行 `database/V5__system_and_ai_config.sql` 与 `database/V6__fix_missing_columns.sql`（均幂等，可重复执行）。

**2）启动后端**

```powershell
cd backend
copy local.env.example local.env     # 填入数据库密码、OSS、AI Key 等
.\run-dev.ps1
```

后端服务将在 http://localhost:8080 启动

### 前端启动（Vue 3 + Vite）

```bash
cd frontend-vite
npm install
npm run dev
```

然后访问：http://localhost:5173

**构建并部署到服务器**（先复制示例脚本并填入服务器信息）：

```powershell
cd frontend-vite
copy deploy-local.ps1.example deploy-local.ps1
# 编辑 deploy-local.ps1 填入你的服务器地址后执行
.\deploy-local.ps1
```

### OCR 服务启动

OCR 服务代码位于 `backend/ocr-service/`（PaddleOCR，含 `main.py` / `requirements.txt` / `Dockerfile`）。

```bash
cd backend/ocr-service
docker build -t emr-ocr .
docker run -p 8000:8000 emr-ocr
```

后端通过环境变量 `OCR_SERVICE_URL` 访问该服务（默认 `http://localhost:8000`）；容器化一键部署请参见 [DEPLOY.md](DEPLOY.md)。

### 登录系统

- 管理员账户：`admin` / `admin`（数据持久化）
- 演示账户：`user` / `user`（数据不保存，刷新即清空）

## 部署说明 (如遇端口冲突请自行定义业务相关端口)

### 方式一：Docker Compose 一键部署（推荐试用）

宿主机只需安装 Docker / Docker Compose，无需 Node、Maven、MySQL：

```bash
# 1.（可选）配置 OSS / AI Key 等，不填也能启动，仅上传与 AI 功能不可用
cp .env.example .env

# 2. 启动 MySQL + Redis + 后端 + 前端
docker compose up -d

# 3. 如需 OCR（图片/PDF 文字识别，镜像较大，建议空闲内存 ≥ 2GB）
docker compose --profile ocr up -d
```

启动后访问：**http://localhost:8088**（账号 `admin` / `admin`）

| 服务 | 宿主端口 | 说明 |
|------|---------|------|
| frontend | 8088 | 前端页面（Nginx 托管 + API 反代） |
| backend | 8081 | Spring Boot API |
| mysql | 3307 | 数据库（首次启动自动执行 `database/init.sql`） |
| redis | 6379 | 缓存 |
| ocr | 8000 | 文字识别（需 `--profile ocr`） |

> 详细说明与排障见 `DEPLOY.md`

### 方式二：服务器手动部署（宝塔 / systemd）


**部署脚本**：`deploy-update.sh`

执行步骤：
```bash
chmod +x deploy-update.sh
./deploy-update.sh
```

脚本自动执行：
1. 停止后端服务
2. 备份旧项目
3. 数据库初始化/迁移
4. Maven 编译 JAR
5. 更新前端文件
6. 更新 Nginx 配置
7. 更新 systemctl 服务配置
8. 启动后端并验证

**域名配置**：通过宝塔面板配置反向代理，注意检查 `server_name` 不带端口号

**OSS 配置**：Endpoint 需要与 bucket 所在地域一致


## 项目结构

```
Electronic-medical-record/
├── backend/                    # Spring Boot 后端
│   ├── src/main/java/com/medical/emr/
│   │   ├── controller/         # 控制器
│   │   ├── service/           # 服务层
│   │   ├── mapper/            # 数据访问层
│   │   ├── entity/            # 实体类
│   │   ├── dto/               # 数据传输对象
│   │   ├── config/            # 配置类
│   │   ├── utils/             # 工具类
│   │   └── security/          # 安全相关
│   ├── src/main/resources/    # 配置文件（application*.yml、schema-h2.sql、data-h2.sql）
│   └── ocr-service/           # PaddleOCR Python 服务（main.py / requirements.txt / Dockerfile）
├── frontend-vite/             # 新版前端（Vue 3 + Vite SFC）
│   ├── src/
│   │   ├── views/             # 页面视图组件
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── components/        # 公共/业务组件（含 AI 助手、发票汇总栏等）
│   │   ├── composables/       # 组合式逻辑（日期筛选、主题调色板等）
│   │   ├── config/            # 设计令牌配置
│   │   ├── router/            # Vue Router 路由
│   │   ├── api/               # API 请求封装
│   │   └── utils/             # 工具函数 (含 lab-parser.js、invoice-parser.js)
│   ├── deploy.ps1.example     # 部署脚本示例（需复制后配置）
│   ├── deploy-local.ps1.example
│   └── vite.config.js         # Vite 构建配置
├── database/                  # 数据库脚本
│   ├── init.sql               # 初始化脚本（全新部署，已自包含全部表与字段）
│   ├── V5__system_and_ai_config.sql  # 系统配置 + 用户 AI 配置表
│   ├── V6__fix_missing_columns.sql   # 旧库升级（补齐缺失字段，幂等）
│   ├── V2__add_avatar_url.sql        # 以下为历史增量脚本，全新部署无需执行
│   ├── V3__add_emr_data_tables.sql
│   └── V4__add_commercial_insurance.sql
├── docs/                      # 文档
│   ├── PRD-patient-module.md
│   ├── ocr-module-requirements.md
│   └── commercial-insurance-requirements.md
├── backend/local.env.example  # 本地环境变量示例
├── backend/Dockerfile         # 后端容器镜像（多阶段构建）
├── frontend-vite/Dockerfile   # 前端容器镜像（Node 构建 + Nginx）
├── docker-compose.yml         # 一键容器化部署编排
├── .env.example               # compose 环境变量示例（OSS / AI Key 等）
├── deploy-update.sh           # 服务器自动部署脚本
├── README.md                  # 项目说明
├── CHANGELOG.md               # 版本变更记录
└── DEPLOY.md                  # 容器化部署文档
```

## 数据库迁移（已有库升级）

新增系统配置与用户 AI 配置表：

```bash
mysql -u root -p emr_db < database/V5__system_and_ai_config.sql
```

补齐代码引用但历史脚本遗漏的字段（`table_data`、发票 `title`、patient 字段等）：

```bash
mysql -u root -p emr_db < database/V6__fix_missing_columns.sql
```

> `V2 / V3 / V4` 为历史增量脚本，
> 全新部署无需执行（`init.sql` 已包含全部表与字段）。

## API文档

### 认证接口

- POST `/api/auth/login` - 用户登录
- POST `/api/auth/logout` - 用户登出
- GET `/api/auth/info` - 获取当前用户信息

### 患者管理

- GET `/api/patients` - 获取患者列表
- POST `/api/patients` - 创建患者
- PUT `/api/patients/{id}` - 更新患者
- DELETE `/api/patients/{id}` - 删除患者

### 文件上传

- POST `/api/files/upload` - 文件上传到 OSS 或本地（由系统存储配置决定）
- GET `/api/files/preview/{folder}/{filename}` - 文件预览（JWT 或 `?token=`）
- GET `/api/files/{filename}` - 文件下载

### 系统与用户 AI 配置

- GET/PUT `/api/system/config/storage` - 存储方式（GET 登录可读；PUT 仅 admin）
- GET/PUT `/api/user/ai-config` - 当前用户的 AI 模型配置
- POST `/api/user/ai-config/test` - 在线验证 AI 连接

### OCR 原文编辑

- PATCH `/api/lab-reports/{id}/ocr-text` - 保存检验报告 OCR 原文
- PATCH `/api/imaging-reports/{id}/ocr-text` - 保存影像报告 OCR 原文

### AI 分析与会话

- POST `/api/ai/analyze` - 单报告 AI 解读（检验/影像）
- POST `/api/ai/chat` - AI 就诊助手（SSE 流式；工具查库按用户隔离）

### OCR 服务

- POST `/api/ocr/process` - 文件自动识别（图片/PDF 均可）
- POST `/api/ocr/image` - 图片文字识别
- POST `/api/ocr/pdf` - PDF 文字识别
- GET `/api/ocr/health` - OCR 服务健康检查

## 数据库配置

```yaml
# 所有敏感配置通过环境变量注入，请勿硬编码
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}

aliyun:
  oss:
    endpoint: ${ALIYUN_OSS_ENDPOINT}
    access-key-id: ${ALIYUN_OSS_ACCESS_KEY_ID}
    access-key-secret: ${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket-name: ${ALIYUN_OSS_BUCKET_NAME}
```

## 许可证

MIT License

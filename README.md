# 电子病历管理系统

个人医疗记录管理系统（Personal Medical Record Management System）

## 项目概述

这是一个现代化的家庭医疗记录管理网站，支持患者档案管理、病历统计、检验报告、影像报告和发票统计等功能。系统支持多种格式的文件上传，并能自动解析提取关键数据。

注：目前仅为项目原型。


**当前部署地址**：https://your-domain.com

## 系统架构

### 整体架构图

```
用户浏览器
    │
    ▼ https://your-domain.com (443)
┌────────────────────────────────────────┐
│  Nginx (域名层)                         │
│  - SSL 证书                             │
│  - 反向代理 → http://127.0.0.1:8088    │
└────────────┬───────────────────────────┘
             │ http://127.0.0.1:8088
             ▼
┌────────────────────────────────────────┐
│  Nginx (应用层)                         │
│  - /        → /var/www/html/index.html  │
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
│  MySQL       │    │  阿里云 OSS   │
│  - emr_db    │    │  - your-oss  │
│  - port 3306 │    │  - 杭州地域   │
└──────────────┘    └──────┬───────┘
                           ▲
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     │
┌────────────────────────────────────────┐  │
│  OCR 服务 (Docker 容器)                 │  │
│  - Python + PaddleOCR                   │  │
│  - 端口 8000                            │  │
└────────────────────────────────────────┘  │
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
- 💰 **发票统计** - 医疗费用的统计和管理
- 🔬 **检验报告** - 支持图片/PDF上传，自动提取数值和正常范围
- 🏥 **影像报告** - 医学影像资料的管理
- �️ **头像管理** - 支持头像上传、裁剪、缩放、拖动调整
- 👥 **演示模式** - 演示账户 user/user，数据不保存，刷新即清空
- �📱 **响应式设计** - 兼容手机浏览器访问

## 文件支持

- **图片格式**: JPG, PNG, GIF, BMP
- **文档格式**: PDF
- **自动解析**: 支持从检验报告中自动提取数值和正常范围
- **文件大小限制**: 最大 50MB (后端)，Nginx 支持 100MB

## 本地开发

### 环境要求

- Java 17+
- MySQL 8.0+
- Maven 3.6+
- Python 3.8+ (OCR 服务)

### 1. 数据库初始化

```bash
mysql -u root -p < database/init.sql
```

数据库名：`emr_db`，密码通过环境变量 `SPRING_DATASOURCE_PASSWORD` 配置（详见 `DEPLOYMENT_GUIDE.md`）

### 2. 后端启动

```bash
cd backend
mvn clean package -DskipTests
mvn spring-boot:run
```

后端服务将在 http://localhost:8080 启动

### 3. 前端启动（Vue 3 + Vite）

```bash
cd frontend-vite
npm install
npm run dev
```

然后访问：http://localhost:5173

**构建并部署到服务器**：

```powershell
cd frontend-vite
.\deploy-local.ps1
```

脚本自动执行 `npm run build` 并通过 SCP 上传 `dist/` 到 `/var/www/html/`

### 4. OCR 服务启动

```bash
cd deploy
docker build -f ocr-cloud.dockerfile -t emr-ocr .
docker run -p 8000:8000 emr-ocr
```

### 5. 登录系统

- 管理员账户：`admin` / `admin`（数据持久化）
- 演示账户：`user` / `user`（数据不保存，刷新即清空）

### 以下为演示页面 ###

<img width="2560" height="1239" alt="ScreenShot_2026-05-23_1411_694" src="https://github.com/user-attachments/assets/1c55e40c-49d6-4de2-9ef1-2aaef2f1e4fb" />
<img width="2560" height="1239" alt="ScreenShot_2026-05-23_141344_472" src="https://github.com/user-attachments/assets/f44a1ece-ad32-43c8-9580-6da3fead433e" />
<img width="2560" height="1239" alt="ScreenShot_2026-05-23_141543_786" src="https://github.com/user-attachments/assets/5002927f-c1ec-416d-9331-7c3e9804720e" />
<img width="2560" height="1239" alt="ScreenShot_2026-05-23_141944_527" src="https://github.com/user-attachments/assets/102bbd52-4ccd-48e2-90b8-de4ddc0210fe" />
<img width="2560" height="1239" alt="ScreenShot_2026-05-23_142035_314" src="https://github.com/user-attachments/assets/c5ac1635-e5d8-4899-aba8-bb7ce4d5e4f3" />

## 部署说明

### 服务器部署

项目已部署到阿里云服务器（IP 通过环境变量配置）

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

详细部署过程请参考 `DEVELOPMENT_LOG.md`

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
│   └── src/main/resources/    # 配置文件
├── frontend/                  # 旧版前端（单文件 HTML，已停用）
│   └── index.html             # 旧版主页面（仅留档参考）
├── frontend-vite/             # 新版前端（Vue 3 + Vite SFC）
│   ├── src/
│   │   ├── views/             # 页面视图组件
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── components/        # 公共组件
│   │   ├── router/            # Vue Router 路由
│   │   ├── api/               # API 请求封装
│   │   └── utils/             # 工具函数 (含 lab-parser.js)
│   ├── dist/                  # 构建输出（部署到服务器）
│   ├── deploy-local.ps1       # 一键构建+部署脚本（Windows）
│   └── vite.config.js         # Vite 构建配置
├── database/                  # 数据库脚本
│   ├── init.sql               # 初始化脚本
│   └── V2__add_avatar_url.sql # 迁移脚本
├── deploy/                    # OCR 服务文件
│   ├── main.py                # OCR 服务代码
│   ├── ocr-cloud.dockerfile   # Docker 构建文件
│   └── cloud-requirements.txt # Python 依赖
├── docs/                      # 文档
│   ├── PRD-patient-module.md  # 患者模块需求
│   └── ocr-module-requirements.md # OCR 模块需求
├── deploy-update.sh           # 自动部署脚本
├── README.md                  # 项目说明
├── DEVELOPMENT_LOG.md         # 开发日志
└── DEPLOY.md                  # 部署文档
```

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

- POST `/api/files/upload` - 文件上传到 OSS
- GET `/api/files/{filename}` - 文件下载

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

# 电子病历管理系统（EMR）

**家庭医疗数据管理平台**——患者档案、病历、检验/影像报告与费用统计。**核心设计目标：医疗数据默认不出内网**；需要云存储或云端 AI 时，可在系统设置中自行开启。

> MIT 开源原型，持续迭代。本仓库**不含生产环境配置与密钥**；含 Docker 一键试用与通用部署参考脚本（`deploy-update.sh` 等）。

**最快试用**：`docker compose up -d` → http://localhost:8088（默认用户名密码admin）。详见 [DEPLOY.md](DEPLOY.md)。

---

## 为什么做这个项目

家庭健康档案分散在纸质报告、相册和各家医院小程序里，难以检索和对比趋势。本项目把**患者、病历、检验、影像、发票**集中管理，并强调：**默认本地存储 + 本地 OCR**，敏感资料不必先上传到公有云。AI 解读与就诊助手为**可选项**，可接 DeepSeek 等云端 API，也可接 **本地Ollama**。

---

## 隐私与数据边界

1. **文件默认存服务器本地磁盘**（`storage_type=local`），不配置阿里云也能上传病历/报告/发票。
2. **OCR 为自建 Docker 服务**（PaddleOCR），识别请求在内网完成，不经第三方 OCR SaaS。
3. **存储 + AI 均可离线**：本地磁盘 + 本地 Ollama 时，文件与模型推理均可不出网（需自行部署 Ollama）。
4. **用户 API Key AES-GCM 加密入库**，接口返回脱敏；文件预览需 JWT（或 `?token=`）。
5. **业务数据按登录用户隔离**（经 `patient.user_id`）；AI 就诊助手工具查库限定在当前用户患者范围内。

切换存储方式时，**仅影响新上传**；历史文件仍留在原存储位置。

---

## 系统架构（离线优先）

```
用户浏览器
    │
    ▼  http://localhost:8088  （Docker 试用）或 自建 Nginx
┌────────────────────────────────────────┐
│  前端 (Nginx / Vite)                    │
│  /api → Spring Boot                     │
└────────────┬───────────────────────────┘
             ▼
┌────────────────────────────────────────┐
│  Spring Boot 后端                       │
│  FileStorageStrategy → 默认本地磁盘      │
│  LlmClient / AiToolExecutor（可选 AI）   │
└───┬──────────────┬──────────────┬──────┘
    │              │              │
    ▼              ▼              ▼
 MySQL         本地 uploads/    OCR 容器
 emr_db        （默认路径）      :8000
    │
    ├ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐
    │  可选（虚线）：阿里云 OSS  │  云端 / 兼容 API AI  │  本地 Ollama      │
    └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘
         系统设置中切换              每用户 AI 配置
```

### Docker Compose 常用服务

| 服务 | 宿主端口 | 说明 |
|------|---------|------|
| frontend | 8088 | 页面 + API 反代 |
| backend | 8081 | Spring Boot |
| mysql | 3307 | 首次启动执行 `database/init.sql` |
| redis | 6379 | 缓存（不可用时可降级） |
| ocr | 8000 | 需 `docker compose --profile ocr up -d` |

---

## 技术栈

### 前端

| 组件 | 技术栈 |
|------|--------|
| **框架** | Vue 3 + Vite + Pinia + Element Plus |
| **文件上传** | 经后端 `/api/files/upload`；**存储策略（OSS / 本地磁盘，运行时切换）** |
| **OCR 解析** | 前端 `lab-parser.js` + 后端 OCR 服务 |

### 后端

| 组件 | 技术栈 |
|------|--------|
| **框架** | Spring Boot 3 + MyBatis Plus + Spring Security (JWT) |
| **文件存储** | **FileStorageStrategy**（`LocalFileStorageStrategy` / `OssFileStorageStrategy`） |
| **AI** | `LlmClient`、`UserAiConfigService`、`AiToolExecutor`（Function Calling + 用户隔离） |
| **安全** | `CryptoUtil`（API Key 加密）、`SystemConfigService` |

### 基础设施

| 组件 | 说明 |
|------|------|
| **数据库** | MySQL 8（`emr_db`）或开发用 H2 |
| **对象存储** | **可选**（默认本地磁盘 / 阿里云 OSS / 不启用 OSS） |
| **OCR** | Python + PaddleOCR（Docker） |
| **部署** | 推荐 `docker compose`；进阶见 `deploy-update.sh`、`DEPLOYMENT_GUIDE.md` |

---

## 核心功能

- 🔒 **隐私优先** — 默认本地存储；可选 OSS；AI 可接 Ollama 全本地（见系统设置）
- 👤 **患者档案** — 增删改查、头像裁剪
- 📊 **病历统计** — 按就诊日期管理，OCR 辅助提取日期
- 🔬 **检验 / 影像** — 上传 PDF/图片，OCR 结构化；OCR 原文可编辑
- 💰 **发票统计** — 商保报销勾选与汇总
- 💬 **AI 报告解读** — 按**用户**配置的模型
- 🤖 **AI 就诊助手** — SSE 流式；工具白名单查库，**按用户隔离**
- ⚙️ **系统设置** — admin 切换全站存储；每用户 AI 模型与在线测试
- 👥 **演示模式** — `user` / `user`，数据不落库

---

## 快速部署（Docker，推荐）

```bash
cp .env.example .env   # 可选；默认 local，无需 OSS 即可上传
docker compose up -d
docker compose --profile ocr up -d   # 需要 OCR 时
```

- **默认本地存储**，无需任何云服务即可跑通**上传**；OCR 需启用 `ocr` profile；AI 需在系统设置中配置。
- 访问：**http://localhost:8088**（`admin` / `admin`）

详情与排障：[DEPLOY.md](DEPLOY.md)

### 进阶：服务器脚本部署

`deploy-update.sh` + [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)（宝塔 / systemd）。若使用 OSS，在环境变量中配置 `ALIYUN_OSS_*`，并在系统设置中切到「阿里云 OSS」。

---

## 本地开发（摘要）

- **零 MySQL**：`cd backend && .\run-dev.ps1 -Profile dev`（H2，默认 `admin` / `admin`）
- **MySQL**：`mysql -u root -p < database/init.sql`，复制 `backend/local.env.example` → `local.env`
- **前端**：`cd frontend-vite && npm install && npm run dev` → http://localhost:5173

---

## 项目结构

```
EMR/
├── backend/src/main/java/com/medical/emr/
│   ├── service/storage/          # FileStorageStrategy、OSS/Local 实现
│   ├── service/LlmClient.java
│   ├── service/AiToolExecutor.java
│   ├── service/SystemConfigService.java
│   ├── service/UserAiConfigService.java
│   ├── utils/CryptoUtil.java
│   └── … controller / entity / mapper
├── frontend-vite/src/components/settings/SystemSettingsDialog.vue
├── database/init.sql             # 新库默认 storage_type=local
├── docker-compose.yml
├── DEPLOY.md
└── CHANGELOG.md
```

---

## Roadmap

- **近期**：默认 local、文档与代码对齐、Docker 零配置试用
- **计划**：独立 `data.encryption.key`、上传扩展名白名单、MinIO 存储适配
- 欢迎 Issue / PR（MIT）

---

## 环境变量（摘要）

敏感项均通过环境变量注入，勿写入代码库。

| 变量 | 说明 |
|------|------|
| `FILE_STORAGE_TYPE` | 默认 `local`；可选 `oss`（bootstrap；运行时以系统设置为准） |
| `FILE_UPLOAD_PATH` | 本地存储目录（如 `/app/uploads`） |
| `JWT_SECRET` | JWT 签名（≥32 字节） |
| `SPRING_DATASOURCE_*` | 数据库连接 |
| `DEEPSEEK_API_KEY` / 用户 AI 配置 | AI 功能（可选） |
| `ALIYUN_OSS_*` | **可选**；系统设置切 OSS 时需配置 |
| `OCR_SERVICE_URL` | OCR 服务地址（默认 `http://localhost:8000`） |

Docker 示例见 [`.env.example`](.env.example)。

---

## 数据库迁移（已有库）

```bash
mysql -u root -p emr_db < database/V5__system_and_ai_config.sql
mysql -u root -p emr_db < database/V6__fix_missing_columns.sql
```

全新部署只需 `database/init.sql`。

---

## API 文档（节选）

- **文件**：`POST /api/files/upload`（OSS 或本地，由 `storage_type` 决定）
- **系统**：`GET/PUT /api/system/config/storage`（admin 可改存储）
- **AI**：`GET/PUT /api/user/ai-config`，`POST /api/user/ai-config/test`
- **OCR 编辑**：`PATCH /api/lab-reports/{id}/ocr-text`，`PATCH /api/imaging-reports/{id}/ocr-text`
- **AI**：`POST /api/ai/analyze`，`POST /api/ai/chat`（SSE）

完整列表见历史 README 或源码 `controller` 包。

---

## 许可证

MIT License

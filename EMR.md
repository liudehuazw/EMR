# 电子病历系统（EMR）项目工作手册

> 本文档详细记录了电子病历系统的每个模块的作用、工作逻辑、存储逻辑、前后端技术栈及所有关键文件说明。
> 适合非技术人员阅读，用通俗易懂的语言描述系统的每一个环节。

---

## 目录

1. [项目整体介绍](#1-项目整体介绍)
2. [技术栈说明](#2-技术栈说明)
3. [系统架构图](#3-系统架构图)
4. [前端文件说明](#4-前端文件说明)
5. [后端文件说明](#5-后端文件说明)
6. [数据库表结构](#6-数据库表结构)
7. [各模块详细工作逻辑](#7-各模块详细工作逻辑)
   - [登录认证模块](#71-登录认证模块)
   - [患者管理模块](#72-患者管理模块)
   - [检验报告模块](#73-检验报告模块)
   - [影像报告模块](#74-影像报告模块)
   - [发票管理模块](#75-发票管理模块)
   - [病历记录模块](#76-病历记录模块)
   - [OCR识别模块](#77-ocr识别模块)
   - [AI分析模块](#78-ai分析模块)
8. [数据存储逻辑（核心）](#8-数据存储逻辑核心)
9. [用户数据隔离机制](#9-用户数据隔离机制)
10. [部署说明](#10-部署说明)

---

## 1. 项目整体介绍

**电子病历系统**是一个面向个人用户的健康档案管理工具，主要功能包括：

- 📋 **管理患者信息**：记录家庭成员或本人的基本健康档案
- 🔬 **检验报告管理**：上传血常规、尿常规等检验报告PDF，自动识别并结构化显示数据
- 🏥 **影像报告管理**：上传CT、X光等影像报告，AI辅助解读
- 🧾 **医疗发票管理**：上传医疗发票，自动识别金额、医院、日期等信息
- 📝 **病历记录管理**：手动记录就诊记录、诊断结果、用药情况
- 📈 **趋势图分析**：同一检验项目历史数据对比，如白细胞计数变化趋势

**部署地址**：`http://YOUR_SERVER_IP:8088`

**账户说明**：
- `admin / admin`：正式账户，数据持久化存储到数据库
- `user / user`：演示账户，数据仅在当次浏览器会话中存在，刷新即清空

---

## 2. 技术栈说明

### 前端技术

| 技术/库 | 版本 | 用途说明 |
|---------|------|---------|
| **Vue 3** | 3.4.x | 前端主框架，负责页面渲染和用户交互 |
| **Vite** | 5.2.x | 构建工具，将源码打包为浏览器可运行的文件 |
| **Pinia** | 2.1.x | 全局状态管理，相当于所有页面共享的"内存数据库" |
| **Vue Router** | 4.3.x | 页面路由，控制URL和页面的对应关系 |
| **Element Plus** | 2.7.x | UI组件库，提供按钮、表单、表格、弹窗等界面元素 |
| **TailwindCSS** | 3.4.x | CSS样式工具，快速编写响应式布局样式 |
| **Chart.js** | 4.5.x | 绘制趋势折线图 |
| **pdf-lib** | 1.17.x | PDF文件处理 |
| **jszip** | 3.10.x | ZIP文件压缩处理 |

### 后端技术

| 技术/库 | 版本 | 用途说明 |
|---------|------|---------|
| **Java** | 17 / 21 | 后端编程语言 |
| **Spring Boot** | 3.5.x | 后端主框架，快速构建REST API服务 |
| **Spring Security** | 随Spring Boot | 认证和权限控制，保护API接口安全 |
| **MyBatis Plus** | 3.5.11 | 数据库操作框架，简化SQL查询编写 |
| **JWT** | 0.11.5 | JSON Web Token，用于用户登录状态的令牌验证 |
| **MySQL** | 8.x | 正式生产环境数据库 |
| **H2** | - | 内存数据库，仅用于本地开发测试 |
| **Lombok** | - | 自动生成getter/setter等模板代码，减少代码量 |
| **Maven** | - | 后端依赖管理和构建工具 |

### 其他服务

| 服务 | 用途 |
|------|------|
| **阿里云OSS** | 存储用户上传的PDF、图片等文件 |
| **PaddleOCR（Python服务）** | 识别PDF/图片中的文字内容 |
| **GLM AI大模型** | 对检验报告、影像报告进行AI智能解读 |
| **Nginx** | 反向代理服务器，负责将前端请求分发到后端 |

---

## 3. 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                  用户浏览器                           │
│  ┌─────────────────────────────────────────────┐    │
│  │           Vue 3 前端应用                      │    │
│  │  LoginView → PatientsView → LabView ...      │    │
│  │              ↕                               │    │
│  │         Pinia Store（内存状态）               │    │
│  │              ↕                               │    │
│  │         localStorage（本地缓存）              │    │
│  └─────────────────┬───────────────────────────┘    │
└────────────────────┼────────────────────────────────┘
                     │ HTTP请求（JSON）
                     ↓
┌────────────────────────────────────────────────────┐
│              Nginx 反向代理（端口8088）              │
│         /api/* → 转发到后端8080端口                  │
│         /* → 返回前端静态文件                         │
└────────────────────┬───────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
┌─────────────────┐    ┌─────────────────┐
│  Spring Boot    │    │   OCR服务       │
│  后端（8080）   │    │  Python+Paddle  │
│  Controller层   │    │  （端口8000）   │
│  Service层      │    └─────────────────┘
│  Mapper层       │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌───────┐  ┌──────────┐
│ MySQL │  │ 阿里云   │
│数据库 │  │  OSS     │
│       │  │（文件存储）│
└───────┘  └──────────┘
```

---

## 4. 前端文件说明

前端代码位于 `frontend-vite/src/` 目录下。

### 4.1 页面文件（views/）

| 文件 | 对应页面 | 主要功能 |
|------|---------|---------|
| `LoginView.vue` | 登录页 | 用户名密码登录，支持admin正式账户和user演示账户 |
| `PatientsView.vue` | 患者列表页 | 新增/编辑/删除患者，选择患者进入详情 |
| `PatientDetailView.vue` | 患者详情页 | 展示单个患者的基本信息卡片 |
| `LabView.vue` | 检验报告页 | 上传检验报告、显示解析结果、趋势图、AI分析 |
| `ImagingView.vue` | 影像报告页 | 上传影像报告、文件预览、AI分析 |
| `InvoiceView.vue` | 发票管理页 | 上传医疗发票、OCR识别金额、统计汇总 |
| `RecordsView.vue` | 病历记录页 | 手动填写就诊记录、上传附件 |

### 4.2 状态管理文件（stores/）

> Pinia Store 相当于整个应用的"共享内存"，所有页面都可以读写这里的数据。

| 文件 | 管理的数据 | 主要职责 |
|------|----------|---------|
| `useAuth.js` | 登录状态、用户信息、Token | 登录/登出/改密码/演示模式控制 |
| `usePatients.js` | 患者列表 | 患者增删改查、从后端同步数据 |
| `useLab.js` | 检验报告列表 | 报告增删改查、与后端同步 |
| `useImaging.js` | 影像报告列表 | 报告增删改查、与后端同步 |
| `useInvoice.js` | 发票列表 | 发票增删改查、金额统计、与后端同步 |
| `useRecords.js` | 病历记录列表 | 病历增删改查、与后端同步 |

### 4.3 工具文件（utils/）

| 文件 | 用途 |
|------|------|
| `lab-parser.js` | **核心解析引擎**（约4000行）：将OCR识别出的原始文字，解析成结构化的检验项目数据（项目名、结果、单位、参考范围、异常标志等） |
| `index.js` | 通用工具函数：日期格式化、文件大小格式化、生成唯一ID、防抖函数等 |

### 4.4 API通信文件（api/）

| 文件 | 用途 |
|------|------|
| `index.js` | 封装所有HTTP请求：自动携带登录Token、处理401过期、上传文件到OSS |

### 4.5 组件文件（components/）

| 文件 | 用途 |
|------|------|
| `NavBar.vue` | 顶部导航栏，显示用户名、退出登录、页面切换 |
| `FilePreviewDialog.vue` | 文件预览弹窗，支持预览PDF和图片 |
| `AppIcon.vue` | 应用图标组件 |

### 4.6 路由文件（router/）

`router/index.js`：定义URL路径与页面的对应关系，并控制未登录用户自动跳转到登录页。

### 4.7 其他重要文件

| 文件 | 用途 |
|------|------|
| `main.js` | 应用入口，初始化Vue、注册插件（Pinia、Router、Element Plus） |
| `App.vue` | 根组件，包裹所有页面的最外层容器 |
| `package.json` | 前端依赖清单，记录所有使用的第三方库 |
| `vite.config.js` | Vite构建配置 |
| `deploy.ps1` | 一键部署脚本（Windows PowerShell），自动构建并上传到服务器 |

---

## 5. 后端文件说明

后端代码位于 `backend/src/main/java/com/medical/emr/` 目录下。

### 5.1 Controller层（接口入口）

> 相当于"前台接待"，负责接收前端发来的请求，验证参数，然后交给Service处理。

| 文件 | API路径前缀 | 提供的接口 |
|------|------------|----------|
| `AuthController.java` | `/api/auth` | 登录、退出、修改密码 |
| `PatientController.java` | `/api/patients` | 患者增删改查（含用户隔离） |
| `LabReportController.java` | `/api/lab-reports` | 检验报告增删改查、检验项目明细 |
| `ImagingReportController.java` | `/api/imaging-reports` | 影像报告增删改查 |
| `InvoiceController.java` | `/api/invoices` | 发票增删改查 |
| `MedicalRecordController.java` | `/api/medical-records` | 病历增删改查 |
| `OcrController.java` | `/api/ocr` | 接收文件，转发给OCR服务识别 |
| `FileUploadController.java` | `/api/files` | 文件上传到阿里云OSS |
| `AiController.java` | `/api/ai` | 调用GLM大模型进行AI分析 |
| `HealthController.java` | `/api/health` | 服务健康检查 |

### 5.2 Service层（业务逻辑）

> 相当于"业务处理部门"，包含真正的业务规则，如数据校验、关联操作、事务控制等。

| 文件 | 主要职责 |
|------|---------|
| `UserService.java` | 用户认证（密码验证用BCrypt加密对比）、修改密码 |
| `PatientService.java` | 患者分页查询（含userId过滤）、创建（自动生成患者编号P000001）、修改、删除 |
| `LabReportService.java` | 检验报告存储（事务：同时存报告主表+明细表）、查询、删除 |
| `ImagingReportService.java` | 影像报告增删查 |
| `InvoiceService.java` | 发票增删查 |
| `MedicalRecordService.java` | 病历增删查 |
| `OcrServiceClient.java` | 调用Python OCR服务的HTTP客户端，处理图片和PDF识别 |
| `AiService.java` | 调用GLM AI大模型API，生成报告解读建议 |
| `FileStorageService.java` | 文件上传到阿里云OSS，返回访问URL |

### 5.3 Mapper层（数据库操作）

> 相当于"数据库操作员"，直接写SQL语句从数据库存取数据。

| 文件 | 操作的数据表 |
|------|-----------|
| `UserMapper.java` | `sys_user` |
| `PatientMapper.java` | `patient`（含自定义SQL：查最大患者编号） |
| `LabReportMapper.java` | `emr_lab_report`（含按患者ID查询） |
| `LabReportItemMapper.java` | `emr_lab_report_item`（检验项目明细） |
| `ImagingReportMapper.java` | `imaging_report` |
| `InvoiceMapper.java` | `invoice` |
| `MedicalRecordMapper.java` | `medical_record` |

### 5.4 Entity层（数据表对应的Java对象）

> 每个Entity类对应数据库中的一张表，每个字段对应表中的一列。

| 文件 | 对应数据库表 |
|------|------------|
| `User.java` | `sys_user` |
| `Patient.java` | `patient`（含userId字段，用于数据隔离） |
| `LabReport.java` | `emr_lab_report` |
| `LabReportItem.java` | `emr_lab_report_item` |
| `ImagingReport.java` | `imaging_report` |
| `Invoice.java` | `invoice` |
| `MedicalRecord.java` | `medical_record` |

### 5.5 Security层（安全认证）

| 文件 | 用途 |
|------|------|
| `JwtAuthenticationFilter.java` | 每个请求进来时，自动解析Header中的JWT Token，验证用户身份 |
| `JwtAuthenticationEntryPoint.java` | 未登录用户访问受保护接口时，返回401错误响应 |

### 5.6 配置文件（resources/）

| 文件 | 用途 |
|------|------|
| `application.yml` | 主配置，指定使用哪个环境的配置 |
| `application-prod.yml` | 生产环境配置（服务器上使用）：MySQL连接、端口、OSS密钥 |
| `application-dev.yml` | 开发环境配置（本地使用）：H2内存数据库 |
| `schema-h2.sql` | 开发环境建表SQL |
| `data-h2.sql` | 开发环境初始数据SQL |

---

## 6. 数据库表结构

数据库名：`emr_db`，位于部署服务器的MySQL中。

### 表关系图

```
sys_user（用户表）
    │
    │ user_id（数据隔离）
    ↓
patient（患者表）
    │
    │ patient_id（外键关联）
    ├──→ medical_record（病历表）
    ├──→ emr_lab_report（检验报告表）
    │         │
    │         │ report_id
    │         └──→ emr_lab_report_item（检验项目明细表）
    ├──→ imaging_report（影像报告表）
    └──→ invoice（发票表）
```

### 各表字段说明

#### sys_user（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| username | VARCHAR | 用户名（唯一） |
| password | VARCHAR | BCrypt加密后的密码 |
| real_name | VARCHAR | 真实姓名 |
| status | TINYINT | 状态：1=启用，0=禁用 |
| deleted | TINYINT | 逻辑删除：0=正常，1=已删除 |

#### patient（患者表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| user_id | BIGINT | 所属用户ID（数据隔离关键字段） |
| patient_no | VARCHAR | 患者编号，如P000001 |
| name | VARCHAR | 患者姓名 |
| gender | TINYINT | 性别：1=男，2=女 |
| birth_date | DATE | 出生日期 |
| avatar_url | VARCHAR | 头像图片的OSS链接 |

#### emr_lab_report（检验报告表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| patient_id | BIGINT | 关联的患者ID |
| report_date | DATE | 报告日期 |
| test_name | VARCHAR | 检验名称，如"血常规"、"尿常规" |
| file_url | VARCHAR | PDF文件在OSS的访问地址 |
| ocr_raw_text | TEXT | OCR识别出的原始文字 |
| table_data | TEXT | 解析后的结构化数据（JSON格式） |
| ai_analysis | TEXT | AI分析结果文字 |

#### emr_lab_report_item（检验项目明细表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键，自增 |
| report_id | BIGINT | 关联的报告ID |
| item_name | VARCHAR | 项目名称，如"白细胞计数" |
| result_value | VARCHAR | 检验结果，如"5.6" |
| result_flag | VARCHAR | 异常标志：↑高、↓低 |
| unit | VARCHAR | 单位，如"×10⁹/L" |
| ref_range | VARCHAR | 参考范围，如"3.5~9.5" |

---

## 7. 各模块详细工作逻辑

### 7.1 登录认证模块

**文件**：`LoginView.vue` + `useAuth.js` + `AuthController.java`

#### 两种登录模式

**演示模式（user/user）**：
```
用户输入 user/user
    ↓
前端识别为演示账户，不请求后端
    ↓
清空所有本地缓存数据（确保演示从空白开始）
    ↓
设置 isDemoMode = true
    ↓
所有Store的save()函数都会跳过，数据不写localStorage也不写数据库
    ↓
刷新页面 → 数据全部消失
```

**正式模式（admin/admin等）**：
```
用户输入用户名密码 → 点击登录
    ↓
POST /api/auth/login → 后端AuthController
    ↓
UserService.authenticate() → 从数据库查用户 → BCrypt验证密码
    ↓
验证通过 → JwtUtil.generateToken() → 生成JWT Token（包含用户名+用户ID）
    ↓
返回Token给前端
    ↓
前端将Token存入localStorage（emr_token）
    ↓
之后每次请求都在Header中带上：Authorization: Bearer <token>
    ↓
后端JwtAuthenticationFilter自动解析Token → 识别当前用户
```

#### Token的作用
JWT Token 就像一张"通行证"，里面记录了用户的身份信息。后端每次收到请求时都会检查这张通行证是否有效，如果无效或过期，直接返回401错误，前端自动跳转到登录页。

---

### 7.2 患者管理模块

**文件**：`PatientsView.vue` + `usePatients.js` + `PatientController.java` + `PatientService.java`

#### 新增患者流程
```
用户填写患者信息表单 → 点击保存
    ↓
usePatients.addPatient(form) 被调用
    ↓
①立即添加到内存数组（页面马上显示新患者）
②写入localStorage（刷新页面不丢失）
    ↓
POST /api/patients → PatientController.createPatient()
    ↓
PatientService.createPatient(form, userId)
    - 生成患者编号（查当前最大编号+1，如P000001→P000002）
    - 设置userId = 当前登录用户的ID
    - 调用Mapper.insert() → 写入MySQL
    ↓
MySQL返回新记录的ID
    ↓
前端将后端返回的ID回写到本地记录
```

#### 登录后数据加载流程
```
登录成功
    ↓
loadFromBackend() 被调用
    ↓
GET /api/patients?page=1&size=9999
    ↓
后端自动用当前用户的userId过滤，只返回属于此用户的患者
    ↓
前端用后端数据覆盖localStorage缓存
    ↓
页面显示患者列表
```

---

### 7.3 检验报告模块

**文件**：`LabView.vue` + `useLab.js` + `lab-parser.js` + `LabReportController.java`

#### 上传检验报告完整流程

```
用户选择PDF文件
    ↓
【第一步：上传文件到OSS】
前端 → POST /api/files/upload（带PDF文件）
后端FileStorageService → 上传到阿里云OSS
返回OSS文件URL（如 https://your-bucket.oss-cn-hangzhou.aliyuncs.com/lab/xxx.pdf）
    ↓
【第二步：OCR识别】
前端 → POST /api/ocr/pdf（带PDF文件）
后端OcrController → 转发给Python OCR服务（端口8000）
PaddleOCR识别PDF每一页的文字
返回识别出的原始文字列表
    ↓
【第三步：解析文字（前端lab-parser.js）】
lab-parser.js接收OCR原始文字
自动识别报告类型（血常规/尿常规/生化等）
按行解析每个检验项目：
  - 项目名称（如"白细胞计数"）
  - 检验结果（如"3.5"）
  - 单位（如"×10⁹/L"）
  - 参考范围（如"3.5~9.5"）
  - 异常标志（↑高于正常/↓低于正常）
  - OCR错误纠正（如"土"→"±"，"·"→"+"）
返回结构化的tableData数组
    ↓
【第四步：保存到数据库】
useLab.addReport(report) 被调用
  ①写入内存 → 页面立即显示
  ②写入localStorage
  ③POST /api/lab-reports → 存入MySQL
     - emr_lab_report表：存报告基本信息+tableData（JSON）
     - 后端返回reportId
    ↓
页面展示解析后的检验项目表格
```

#### 趋势图功能
```
用户点击某个检验项目名称（如"白细胞计数"）
    ↓
LabView.renderTrendChart() 被调用
    ↓
从当前患者的所有报告中，找出包含此项目的历史数据
过滤掉文字结果（只保留数值型结果）
按日期排序
    ↓
用Chart.js绘制折线图
  - X轴：检验日期
  - Y轴：检验数值
  - 参考范围：用背景色块标注正常区间
  - 异常点：用红色↑↓标注
```

#### lab-parser.js 解析原理（简化说明）

OCR识别出的原始文字是杂乱的文本行，例如：
```
白细胞计数 3.5 ×10⁹/L 3.5~9.5
中性粒细胞百分比 65.0 % 45.0~75.0
血红蛋白 120 g/L 115~150
```

`lab-parser.js` 用了以下策略来解析：
1. **识别报告类型**：根据关键词判断是血常规、尿常规还是生化
2. **逐行解析**：用正则表达式从每行提取数字（结果）、中文（项目名）、参考范围
3. **OCR纠错**：修正常见的识别错误（如"土"→"±"）
4. **异常标志**：结果超出参考范围时自动标记↑或↓

---

### 7.4 影像报告模块

**文件**：`ImagingView.vue` + `useImaging.js` + `ImagingReportController.java`

#### 工作流程
```
用户上传CT/X光/MRI报告PDF或图片
    ↓
上传文件到OSS → 获得文件URL
    ↓
（可选）OCR识别报告文字
    ↓
保存报告记录到数据库（含文件URL、日期、医院、报告类型）
    ↓
用户可点击"AI分析"按钮
    ↓
POST /api/ai/analyze-url → 发送文件URL给GLM大模型
GLM读取报告内容，生成专业的中文解读建议
返回分析结果文字
    ↓
显示AI解读内容（有免责声明，仅供参考）
```

---

### 7.5 发票管理模块

**文件**：`InvoiceView.vue` + `useInvoice.js` + `InvoiceController.java`

#### 工作流程
```
用户上传医疗发票PDF或图片
    ↓
上传到OSS → 获得文件URL
    ↓
OCR识别发票文字
    ↓
前端从OCR文字中自动提取：
  - 医院名称
  - 发票日期
  - 总金额
  - 自费金额
  - 医保金额
  - 费用明细项
    ↓
保存到MySQL（金额、日期、医院、文件URL、明细JSON）
    ↓
统计页面：汇总历史医疗总花费、图表展示费用趋势
```

#### 特殊处理：存储容量限制
如果发票太多导致localStorage存储空间不足，系统会自动剥离文件URL（因为URL存在OSS云端，可重新获取），只保留金额、日期等文字信息。

---

### 7.6 病历记录模块

**文件**：`RecordsView.vue` + `useRecords.js` + `MedicalRecordController.java`

#### 工作流程
```
用户手动填写就诊记录：
  - 就诊日期
  - 医院
  - 科室/医生
  - 主诉/症状
  - 诊断结果
  - 治疗方案
  - 备注
    ↓
可附加上传相关文件（检查单等）→ 上传到OSS
    ↓
addRecord() 被调用
  ①写入内存
  ②写入localStorage
  ③POST /api/medical-records → 写入MySQL
```

---

### 7.7 OCR识别模块

**文件**：`OcrController.java` + `OcrServiceClient.java` + Python OCR服务（`ocr-service/main.py`）

#### OCR服务架构
```
前端上传PDF/图片
    ↓
后端OcrController接收文件
    ↓
OcrServiceClient.processPdf() / processImage()
→ 发送HTTP请求给Python OCR服务（http://localhost:8000）
    ↓
Python服务：
  PDF → 逐页转换为图片（DPI 120）
  图片 → PaddleOCR识别文字
  返回：每页识别出的文字列表 + 坐标信息
    ↓
后端将OCR结果返回给前端
```

#### 内存管理
PaddleOCR每次识别会占用大量内存（每页约200MB），因此：
- PDF逐页处理，处理完一页立即释放内存
- 容器限制1.8GB内存+3.6GB swap
- 大文件（超过7页）可能识别较慢

---

### 7.8 AI分析模块

**文件**：`AiController.java` + `AiService.java`

#### 工作流程
```
用户点击"AI分析"按钮
    ↓
前端发送：
  - 检验报告数据（文字描述）或文件URL
    ↓
POST /api/ai/analyze → AiController
    ↓
AiService → 调用GLM大模型API
  构建提示词（Prompt）：
    "以下是患者的检验报告，请用通俗易懂的语言解读..."
    ↓
GLM流式返回分析结果（边生成边返回，类似ChatGPT）
    ↓
前端实时显示AI正在输出的文字
    ↓
分析完成，保存到报告的ai_analysis字段
```

---

## 8. 数据存储逻辑（核心）

### 双写机制

本系统采用"**本地缓存 + 后端数据库**"双写机制，保证数据既快速响应又持久安全。

```
用户操作（如新增患者）
    ↓
①立即写入内存（Pinia Store）→ 页面0延迟刷新
    ↓
②立即写入localStorage（浏览器本地存储）→ 刷新页面不丢失
    ↓
③异步写入后端MySQL数据库 → 永久保存，换设备也能看到
    ↓
④后端返回数据库生成的ID → 前端记录为backendId
```

### localStorage中存储的数据

| 键名 | 内容 |
|------|------|
| `emr_token` | JWT登录令牌 |
| `emr_user_info` | 用户基本信息（用户名、真实姓名等） |
| `emr_patients` | 患者列表缓存 |
| `emr_lab_reports` | 检验报告列表缓存 |
| `emr_imaging_reports` | 影像报告列表缓存 |
| `emr_invoices` | 发票列表缓存 |
| `emr_medical_records` | 病历列表缓存 |

### 登录时数据同步顺序

```
登录成功
    ↓
1. 加载患者列表（GET /api/patients）
    ↓
2. 遍历每个患者，加载其检验报告（GET /api/lab-reports/patient/{id}）
    ↓
3. 同时加载每个患者的影像报告（GET /api/imaging-reports/patient/{id}）
    ↓
4. 同时加载每个患者的发票（GET /api/invoices/patient/{id}）
    ↓
5. 同时加载每个患者的病历（GET /api/medical-records/patient/{id}）
    ↓
用后端数据库数据覆盖本地缓存（确保数据最新）
```

### 为什么以数据库为准？

- localStorage中的数据可能是旧的（在其他设备操作后，这台设备的缓存没有更新）
- 数据库永远是最新的、最权威的数据
- 每次登录都从数据库重新拉取，确保数据一致

---

## 9. 用户数据隔离机制

### 问题背景
系统支持多用户，每个用户只应该看到自己的数据，不能看到其他用户添加的患者或报告。

### 实现方式

**数据库层面**：
- `patient`表有`user_id`字段，记录这个患者属于哪个用户
- 查询患者时，自动加上`WHERE user_id = 当前用户ID`的过滤条件

**后端层面**：
- `PatientController`的每个接口都调用`getCurrentUserId()`方法
- 从JWT Token中提取当前登录用户的ID
- 将userId传给Service层进行过滤

**连锁隔离**：
- 患者被隔离后，关联的报告（检验/影像/发票/病历）也自动被隔离
- 因为报告是通过`patient_id`关联的，用户看不到其他人的患者，自然也看不到报告

### 迁移处理
历史上admin账户在没有数据隔离时添加的数据，通过执行以下SQL进行了归属修复：
```sql
UPDATE patient SET user_id = 1 WHERE user_id IS NULL;
-- 将所有旧数据归属给ID=1的admin用户
```

---

## 10. 部署说明

### 服务器信息
- **IP地址**：`YOUR_SERVER_IP`（通过环境变量配置）
- **访问端口**：`8088`
- **访问地址**：`http://YOUR_SERVER_IP:8088`

### 服务组件

| 服务 | 运行方式 | 端口 |
|------|---------|------|
| Nginx | 宝塔面板管理 | 8088 |
| Spring Boot后端 | systemctl服务（emr-backend） | 8080 |
| Python OCR服务 | Docker容器（ocr-aliyun） | 8000 |
| MySQL数据库 | 系统服务 | 3306 |

### 前端部署流程
```
在 frontend-vite 目录下运行：
.\deploy.ps1

脚本自动执行：
1. npm run build（打包前端代码）
2. 清空服务器旧的assets文件
3. 上传 dist/index.html → /var/www/html/index.html
4. 上传 dist/assets/* → /var/www/html/assets/
```

> **重要**：必须同时上传index.html和assets，因为Vite每次构建会给文件加新的哈希（如`LabView-A3b7x.js`），index.html中记录了这些文件名的引用，缺一不可。

### 后端部署流程
```
1. 将修改的代码上传到服务器：
   scp -r backend/src your_user@YOUR_SERVER_IP:/opt/Electronic-medical-record/backend/

2. 在服务器上构建：
   sudo JAVA_HOME=/usr/lib/jvm/jdk-21.0.3+9 /opt/maven/bin/mvn clean package -DskipTests -q

3. 重启服务：
   sudo systemctl restart emr-backend

4. 查看日志：
   sudo journalctl -u emr-backend -f
```

### 数据库迁移
新增数据库字段时，通过SSH在服务器上执行SQL：
```bash
# 1. 创建SQL文件并上传
scp migration.sql your_user@YOUR_SERVER_IP:/tmp/migration.sql

# 2. 在服务器上执行
ssh your_user@YOUR_SERVER_IP "sudo mysql -uroot -p'your_db_password' emr_db < /tmp/migration.sql"
```

---

*文档最后更新：2026年5月*
*维护人：赵文*

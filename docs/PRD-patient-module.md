# 患者管理模块 - 产品需求文档（PRD）

## 一、模块概述

患者管理是电子病历系统的**核心基础模块**，所有其他模块（病历、检验、影像、发票）均依赖患者数据。本模块实现患者信息的完整生命周期管理。

## 二、功能需求

### 2.1 患者列表
- 分页展示所有患者（默认每页10条）
- 支持按姓名、手机号模糊搜索
- 支持按性别筛选
- 显示字段：患者编号、姓名、性别、出生日期、手机号、紧急联系人、操作按钮

### 2.2 新增患者
- 必填字段：姓名、性别
- 选填字段：出生日期、手机号、身份证号、地址、紧急联系人、紧急联系电话、过敏史、病史
- 患者编号由后端自动生成（格式：P + 6位递增数字，如P000001）
- 身份证号需校验格式

### 2.3 编辑患者
- 可修改除患者编号外的所有字段
- 修改后自动更新 update_time

### 2.4 删除患者
- 逻辑删除（deleted字段置1）
- 删除前需二次确认

### 2.5 查看患者详情
- 展示患者完整信息
- 后期扩展：关联展示该患者的病历、检验、影像、发票记录

## 三、API接口设计

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| GET | /api/patients | 分页查询患者列表 | page, size, keyword, gender |
| GET | /api/patients/{id} | 查询患者详情 | - |
| POST | /api/patients | 新增患者 | PatientForm JSON |
| PUT | /api/patients/{id} | 更新患者 | PatientForm JSON |
| DELETE | /api/patients/{id} | 删除患者 | - |

### 3.1 响应格式（统一）
```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 3.2 分页响应格式
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "records": [...],
    "total": 100,
    "current": 1,
    "size": 10
  }
}
```

## 四、数据库表（已设计）

对应 `database/init.sql` 中的 `patient` 表，共14个字段。

## 五、后端实现结构

```
com.medical.emr/
├── entity/Patient.java          # 实体类（对应patient表）
├── mapper/PatientMapper.java    # 数据访问层
├── service/PatientService.java  # 业务逻辑层
├── controller/PatientController.java  # 控制器
└── dto/PatientForm.java         # 请求表单DTO
```

## 六、前端实现结构

```
frontend/src/
├── api/patient.ts              # 患者API接口
└── views/Patients.vue          # 患者页面（升级：mock → 真实API）
```

## 七、技术要点

- 后端使用 MyBatis Plus 的 `IPage` 实现分页
- 患者编号自动生成，查询当前最大编号 +1
- 前端使用 Naive UI 的 NDataTable + NModal 组件
- 搜索使用防抖（300ms）避免频繁请求

## 八、部署架构适配

- 本地开发：前端 localhost:5173 → 后端 localhost:8080/api
- 云上部署：Nginx 反向代理统一入口，Spring Boot 内部调用 OCR 服务
- OCR服务独立进程运行（FastAPI :8000），不嵌入 Spring Boot

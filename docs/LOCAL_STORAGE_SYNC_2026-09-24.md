# 2026-09-24 本地存储与同步修复（摘要）

生产切 **local** 后出现的刷新空数据、预览 404、502、删除无反馈等问题的完整时间线与代码清单，见生产仓库 `DEVELOPMENT_LOG.md` 同名章节。

开源仓完整变更列表见 [CHANGELOG.md](../CHANGELOG.md)（2026-09-24）。

## 运维速查

| 现象 | 动作 |
|------|------|
| 刷新后界面空 | `V6__backfill_patient_user_id.sql` + 升级含 `backendSync.js` 的前端 |
| PDF 预览 404 | `location ^~ /api/`；勿缓存 `/api/files/` |
| 502 约 1 分钟 | 等待 Spring Boot 冷启动；`scripts/diagnose-emr-backend.sh` |
| 删除无效 | 升级含 `deleteRecord()` 的前端 |

## 脚本

- `scripts/diagnose-emr-backend.sh` — 健康检查、上传路径、日志提示  
- `scripts/patch-nginx-api-priority.sh` — 检查 Nginx API 优先级配置  

## 数据库

```bash
mysql -u root -p emr_db < database/V6__backfill_patient_user_id.sql
```

（admin 用户 id 非 1 时请先改 SQL 再执行。）

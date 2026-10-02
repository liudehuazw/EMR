-- 历史患者未设置 user_id 时，GET /api/patients 对非 admin 为空；admin 登录也看不到
-- 将孤儿数据归属 sys_user 中 id=1 的 admin（与 EMR.md 一致）
UPDATE patient SET user_id = 1 WHERE user_id IS NULL AND deleted = 0;

-- 患者表添加头像URL字段
ALTER TABLE patient ADD COLUMN avatar_url VARCHAR(500) COMMENT '头像OSS URL';

-- 创建索引（可选，如果需要按头像筛选）
-- CREATE INDEX idx_patient_avatar ON patient(avatar_url);

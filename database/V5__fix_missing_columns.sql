-- ============================================================
--  V5: 补齐代码中引用、但历史脚本遗漏的字段
-- ============================================================
--  适用场景：数据库已存在（已执行过旧版 init.sql / V2 / V3），
--            需要在不丢数据的前提下补齐缺失字段。
--
--  用法：mysql -u root -p emr_db < database/V5__fix_missing_columns.sql
--
--  背景：
--    后端实体 LabReport / Invoice 声明了下列字段，MyBatis-Plus 会将其
--    纳入 INSERT / SELECT（如 selectById），而旧脚本未创建对应列，
--    导致「上传检验报告 / 保存发票」报错 Unknown column。
--      · emr_lab_report.user_id
--      · emr_lab_report.table_data
--      · emr_invoice.title
--    本脚本亦顺带补齐老库可能缺失的 patient.user_id / patient.avatar_url。
--
--  本脚本可重复执行（幂等）。
-- ============================================================

USE emr_db;

-- ---------- emr_lab_report.user_id ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'emr_lab_report' AND COLUMN_NAME = 'user_id');
SET @sql := IF(@exist = 0,
    'ALTER TABLE emr_lab_report ADD COLUMN user_id BIGINT NULL COMMENT ''所属用户ID'' AFTER id',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- emr_lab_report.table_data ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'emr_lab_report' AND COLUMN_NAME = 'table_data');
SET @sql := IF(@exist = 0,
    'ALTER TABLE emr_lab_report ADD COLUMN table_data LONGTEXT NULL COMMENT ''解析后的结构化数据(JSON)'' AFTER ocr_raw_text',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- emr_invoice.title ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'emr_invoice' AND COLUMN_NAME = 'title');
SET @sql := IF(@exist = 0,
    'ALTER TABLE emr_invoice ADD COLUMN title VARCHAR(255) NULL COMMENT ''发票标题'' AFTER invoice_date',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- patient.user_id（老库可能缺失） ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patient' AND COLUMN_NAME = 'user_id');
SET @sql := IF(@exist = 0,
    'ALTER TABLE patient ADD COLUMN user_id BIGINT NULL COMMENT ''所属用户ID'' AFTER id',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- patient.avatar_url（老库可能缺失，见 V2） ----------
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patient' AND COLUMN_NAME = 'avatar_url');
SET @sql := IF(@exist = 0,
    'ALTER TABLE patient ADD COLUMN avatar_url VARCHAR(500) NULL COMMENT ''头像OSS URL''',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------- 结果核对 ----------
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'emr_lab_report' AND COLUMN_NAME IN ('user_id', 'table_data'))
    OR (TABLE_NAME = 'emr_invoice'    AND COLUMN_NAME = 'title')
    OR (TABLE_NAME = 'patient'        AND COLUMN_NAME IN ('user_id', 'avatar_url')))
ORDER BY TABLE_NAME, COLUMN_NAME;

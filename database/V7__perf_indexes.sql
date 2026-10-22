-- ============================================================
--  V7__perf_indexes.sql — 性能索引（患者维度批量统计）
-- ============================================================
--  背景：患者列表页需要按 patient_id 统计 病历/检验/影像/发票 数量，
--        新增批量接口 /api/patient-summary/counts 使用 GROUP BY patient_id。
--        单列索引 (patient_id) 已存在，这里补充 (patient_id, deleted) 复合索引，
--        让 "WHERE deleted=0 AND patient_id IN (...)" 走覆盖索引。
--
--  用法：mysql -u root -p emr_db < database/V7__perf_indexes.sql
--  可重复执行（先查 information_schema 再建，已存在则跳过）。
-- ============================================================

USE emr_db;

-- 通用：按 表名/索引名 判断是否存在，不存在才执行传入的 DDL
DROP PROCEDURE IF EXISTS emr_add_index_if_absent;
DELIMITER //
CREATE PROCEDURE emr_add_index_if_absent(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_ddl TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
    ) THEN
        SET @ddl = p_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL emr_add_index_if_absent('emr_medical_record', 'idx_mr_patient_deleted',
    'ALTER TABLE emr_medical_record ADD INDEX idx_mr_patient_deleted (patient_id, deleted)');

CALL emr_add_index_if_absent('emr_lab_report', 'idx_lr_patient_deleted',
    'ALTER TABLE emr_lab_report ADD INDEX idx_lr_patient_deleted (patient_id, deleted)');

CALL emr_add_index_if_absent('emr_imaging_report', 'idx_ir_patient_deleted',
    'ALTER TABLE emr_imaging_report ADD INDEX idx_ir_patient_deleted (patient_id, deleted)');

CALL emr_add_index_if_absent('emr_invoice', 'idx_inv_patient_deleted',
    'ALTER TABLE emr_invoice ADD INDEX idx_inv_patient_deleted (patient_id, deleted)');

DROP PROCEDURE IF EXISTS emr_add_index_if_absent;

SELECT 'V7 perf indexes applied' AS result;

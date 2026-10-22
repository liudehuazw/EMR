-- ============================================================
--  V8__invoice_payment_breakdown.sql — 发票支付构成明细
-- ============================================================
--  背景：医疗收费（医保）票据的支付构成为
--        总金额 = 医保统筹基金支付 + 其他支付 + 个人账户支付 + 个人现金支付
--        旧表只存 total/self_pay/insurance 三段，导致前端「自付 + 医保 < 总额」，
--        且「大病保险支付」完全无法展示。
--
--  说明：
--   - 仅新增列，不修改既有列，历史数据保持可用
--   - 可重复执行（先查 information_schema 再 ALTER）
--   - 生产库名为 zhaowen，开源仓默认 emr_db；不写死库名，由命令指定目标库
--
--  用法：mysql -u root -p zhaowen < database/V8__invoice_payment_breakdown.sql
-- ============================================================

DROP PROCEDURE IF EXISTS emr_add_column_if_absent;
DELIMITER //
CREATE PROCEDURE emr_add_column_if_absent(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = p_ddl;
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 其他支付（含大病保险等）
CALL emr_add_column_if_absent('emr_invoice', 'other_payment',
    'ALTER TABLE emr_invoice ADD COLUMN other_payment DECIMAL(12,2) NULL COMMENT ''其他支付'' AFTER insurance_amount');

-- 个人账户支付
CALL emr_add_column_if_absent('emr_invoice', 'account_payment',
    'ALTER TABLE emr_invoice ADD COLUMN account_payment DECIMAL(12,2) NULL COMMENT ''个人账户支付'' AFTER other_payment');

-- 大病保险支付（注：样本中与「其他支付」恒等，属明细拆分，仅作展示）
CALL emr_add_column_if_absent('emr_invoice', 'critical_illness_amount',
    'ALTER TABLE emr_invoice ADD COLUMN critical_illness_amount DECIMAL(12,2) NULL COMMENT ''大病保险支付'' AFTER account_payment');

-- 个人自付
CALL emr_add_column_if_absent('emr_invoice', 'personal_self_pay',
    'ALTER TABLE emr_invoice ADD COLUMN personal_self_pay DECIMAL(12,2) NULL COMMENT ''个人自付'' AFTER critical_illness_amount');

-- 个人自费
CALL emr_add_column_if_absent('emr_invoice', 'personal_self_expense',
    'ALTER TABLE emr_invoice ADD COLUMN personal_self_expense DECIMAL(12,2) NULL COMMENT ''个人自费'' AFTER personal_self_pay');

-- 其他保险支付（「其他支付」的分项）
CALL emr_add_column_if_absent('emr_invoice', 'other_insurance_amount',
    'ALTER TABLE emr_invoice ADD COLUMN other_insurance_amount DECIMAL(12,2) NULL COMMENT ''其他保险支付（其他支付分项）'' AFTER personal_self_expense');

-- 医疗救助支付（「其他支付」的分项）
CALL emr_add_column_if_absent('emr_invoice', 'medical_assistance_amount',
    'ALTER TABLE emr_invoice ADD COLUMN medical_assistance_amount DECIMAL(12,2) NULL COMMENT ''医疗救助支付（其他支付分项）'' AFTER other_insurance_amount');

DROP PROCEDURE IF EXISTS emr_add_column_if_absent;

SELECT 'V8 invoice payment breakdown applied' AS result;

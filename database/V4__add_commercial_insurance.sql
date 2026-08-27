-- V4: Add commercial insurance reimbursement fields to emr_invoice
-- Date: 2026-07-18

ALTER TABLE emr_invoice
    ADD COLUMN commercial_reimbursed TINYINT DEFAULT 0 COMMENT '是否已由商保报销(0否1是)' AFTER insurance_amount,
    ADD COLUMN commercial_amount DECIMAL(12,2) DEFAULT NULL COMMENT '商保报销金额' AFTER commercial_reimbursed;

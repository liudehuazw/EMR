-- ============================================
-- EMR 数据持久化表结构
-- 将前端 localStorage 数据迁移到 MySQL
-- ============================================

-- 病历记录表
CREATE TABLE IF NOT EXISTS emr_medical_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '病历ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    visit_date DATE NOT NULL COMMENT '就诊日期',
    hospital VARCHAR(255) COMMENT '医院名称',
    department VARCHAR(100) COMMENT '科室',
    doctor VARCHAR(100) COMMENT '医生姓名',
    diagnosis TEXT COMMENT '诊断结果',
    symptoms TEXT COMMENT '症状描述',
    treatment TEXT COMMENT '治疗方案',
    notes TEXT COMMENT '备注',
    files JSON COMMENT '附件列表 [{name, url, type}]',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志 0-未删除 1-已删除',
    INDEX idx_patient_id (patient_id),
    INDEX idx_visit_date (visit_date),
    FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='病历记录表';

-- 检验报告表
CREATE TABLE IF NOT EXISTS emr_lab_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '报告ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    report_date DATE NOT NULL COMMENT '报告日期',
    test_name VARCHAR(255) COMMENT '检验项目名称',
    hospital VARCHAR(255) COMMENT '医院名称',
    file_url VARCHAR(1024) COMMENT '文件OSS URL',
    file_name VARCHAR(255) COMMENT '原始文件名',
    file_type VARCHAR(100) COMMENT '文件类型',
    ocr_raw_text LONGTEXT COMMENT 'OCR原始文本',
    ocr_confidence INT COMMENT 'OCR置信度 0-100',
    ai_analysis TEXT COMMENT 'AI分析结果',
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_patient_id (patient_id),
    INDEX idx_report_date (report_date),
    FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='检验报告表';

-- 检验报告项目明细表（存储表格解析数据）
CREATE TABLE IF NOT EXISTS emr_lab_report_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '项目ID',
    report_id BIGINT NOT NULL COMMENT '所属报告ID',
    item_code VARCHAR(100) COMMENT '项目代码',
    item_name VARCHAR(255) NOT NULL COMMENT '项目名称',
    item_name_original VARCHAR(255) COMMENT '原始项目名称（OCR识别）',
    result_value VARCHAR(100) COMMENT '检测结果值',
    result_flag VARCHAR(20) COMMENT '结果标志 ↑↓正常异常等',
    reference_range VARCHAR(255) COMMENT '参考范围',
    unit VARCHAR(100) COMMENT '单位',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_report_id (report_id),
    FOREIGN KEY (report_id) REFERENCES emr_lab_report(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='检验报告项目明细表';

-- 影像报告表
CREATE TABLE IF NOT EXISTS emr_imaging_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '报告ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    report_date DATE NOT NULL COMMENT '报告日期',
    title VARCHAR(255) COMMENT '报告标题',
    hospital VARCHAR(255) COMMENT '医院名称',
    imaging_type VARCHAR(100) COMMENT '影像类型 CT/MRI/X光/B超等',
    file_url VARCHAR(1024) COMMENT '文件OSS URL',
    file_name VARCHAR(255) COMMENT '原始文件名',
    file_type VARCHAR(100) COMMENT '文件类型',
    ocr_raw_text LONGTEXT COMMENT 'OCR原始文本',
    ocr_confidence INT COMMENT 'OCR置信度 0-100',
    ai_analysis TEXT COMMENT 'AI分析结果',
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_patient_id (patient_id),
    INDEX idx_report_date (report_date),
    FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='影像报告表';

-- 发票表
CREATE TABLE IF NOT EXISTS emr_invoice (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '发票ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    invoice_date DATE NOT NULL COMMENT '发票日期',
    hospital VARCHAR(255) COMMENT '医院名称',
    invoice_no VARCHAR(100) COMMENT '发票号码',
    total_amount DECIMAL(12,2) COMMENT '总金额',
    self_pay_amount DECIMAL(12,2) COMMENT '自费金额',
    insurance_amount DECIMAL(12,2) COMMENT '医保金额',
    file_url VARCHAR(1024) COMMENT '文件OSS URL',
    file_name VARCHAR(255) COMMENT '原始文件名',
    file_type VARCHAR(100) COMMENT '文件类型',
    ocr_raw_text LONGTEXT COMMENT 'OCR原始文本',
    items JSON COMMENT '发票明细 [{name, amount, category}]',
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除标志',
    INDEX idx_patient_id (patient_id),
    INDEX idx_invoice_date (invoice_date),
    FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发票表';

-- 检验项目用户映射表（存储用户自定义的项目名称映射）
CREATE TABLE IF NOT EXISTS emr_lab_item_mapping (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '映射ID',
    user_id BIGINT NOT NULL COMMENT '用户ID（0表示系统默认）',
    original_name VARCHAR(255) NOT NULL COMMENT '原始名称',
    standard_name VARCHAR(255) NOT NULL COMMENT '标准名称',
    item_code VARCHAR(100) COMMENT '项目代码',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_original (user_id, original_name),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='检验项目用户映射表';

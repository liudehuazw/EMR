-- ============================================================
--  H2 开发模式建表脚本（dev profile，内存数据库，无需安装 MySQL）
-- ============================================================
--  字段与 database/init.sql（MySQL 版）保持一致，仅语法不同：
--    · 不含 ENGINE / CHARSET / COMMENT 等 MySQL 专有子句
--    · 索引使用独立的 CREATE INDEX 语句（H2 不支持建表内联 INDEX）
--    · JSON 列（files / items）以 TEXT 存储，应用侧本就按字符串处理
--    · 唯一约束使用 CONSTRAINT ... UNIQUE
--  启动方式：cd backend; .\run-dev.ps1 -Profile dev
-- ============================================================

-- ------------------------------------------------------------
-- 系统用户表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    real_name VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    status TINYINT DEFAULT 1,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_sys_user_username UNIQUE (username)
);

-- ------------------------------------------------------------
-- 患者表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    patient_no VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    gender TINYINT,
    birth_date DATE,
    phone VARCHAR(20),
    id_card VARCHAR(18),
    address TEXT,
    emergency_contact VARCHAR(50),
    emergency_phone VARCHAR(20),
    allergy_history TEXT,
    medical_history TEXT,
    avatar_url VARCHAR(500),
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_patient_no UNIQUE (patient_no)
);

-- ------------------------------------------------------------
-- 病历记录表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_medical_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    visit_date DATE NOT NULL,
    hospital VARCHAR(255),
    department VARCHAR(100),
    doctor VARCHAR(100),
    diagnosis TEXT,
    symptoms TEXT,
    treatment TEXT,
    notes TEXT,
    files TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    CONSTRAINT fk_mr_patient FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 检验报告表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_lab_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    test_name VARCHAR(255),
    hospital VARCHAR(255),
    file_url VARCHAR(1024),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    ocr_raw_text TEXT,
    table_data TEXT,
    ocr_confidence INT,
    ai_analysis TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    CONSTRAINT fk_lr_patient FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 检验报告项目明细表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_lab_report_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id BIGINT NOT NULL,
    item_code VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_name_original VARCHAR(255),
    result_value VARCHAR(100),
    result_flag VARCHAR(20),
    reference_range VARCHAR(255),
    unit VARCHAR(100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    CONSTRAINT fk_lri_report FOREIGN KEY (report_id) REFERENCES emr_lab_report(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 影像报告表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_imaging_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    title VARCHAR(255),
    hospital VARCHAR(255),
    imaging_type VARCHAR(100),
    file_url VARCHAR(1024),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    ocr_raw_text TEXT,
    ocr_confidence INT,
    ai_analysis TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    CONSTRAINT fk_ir_patient FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 发票表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_invoice (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    invoice_date DATE NOT NULL,
    title VARCHAR(255),
    hospital VARCHAR(255),
    invoice_no VARCHAR(100),
    total_amount DECIMAL(12,2),
    self_pay_amount DECIMAL(12,2),
    insurance_amount DECIMAL(12,2),
    commercial_reimbursed TINYINT DEFAULT 0,
    commercial_amount DECIMAL(12,2) DEFAULT NULL,
    file_url VARCHAR(1024),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    ocr_raw_text TEXT,
    items TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    CONSTRAINT fk_inv_patient FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 检验项目用户映射表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_lab_item_mapping (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    standard_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_original UNIQUE (user_id, original_name)
);

-- ------------------------------------------------------------
-- 索引
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_user_id     ON patient (user_id);
CREATE INDEX IF NOT EXISTS idx_patient_name        ON patient (name);
CREATE INDEX IF NOT EXISTS idx_patient_phone       ON patient (phone);

CREATE INDEX IF NOT EXISTS idx_mr_patient_id       ON emr_medical_record (patient_id);
CREATE INDEX IF NOT EXISTS idx_mr_visit_date       ON emr_medical_record (visit_date);

CREATE INDEX IF NOT EXISTS idx_lr_patient_id       ON emr_lab_report (patient_id);
CREATE INDEX IF NOT EXISTS idx_lr_report_date      ON emr_lab_report (report_date);

CREATE INDEX IF NOT EXISTS idx_lri_report_id       ON emr_lab_report_item (report_id);

CREATE INDEX IF NOT EXISTS idx_ir_patient_id       ON emr_imaging_report (patient_id);
CREATE INDEX IF NOT EXISTS idx_ir_report_date      ON emr_imaging_report (report_date);

CREATE INDEX IF NOT EXISTS idx_inv_patient_id      ON emr_invoice (patient_id);
CREATE INDEX IF NOT EXISTS idx_inv_invoice_date    ON emr_invoice (invoice_date);

CREATE INDEX IF NOT EXISTS idx_mapping_user_id     ON emr_lab_item_mapping (user_id);

-- ------------------------------------------------------------
-- 系统配置与用户 AI 配置
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emr_system_config (
    config_key VARCHAR(64) PRIMARY KEY,
    config_value VARCHAR(512) NOT NULL,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO emr_system_config (config_key, config_value) VALUES ('storage_type', 'oss');

CREATE TABLE IF NOT EXISTS emr_user_ai_config (
    user_id BIGINT PRIMARY KEY,
    provider_type VARCHAR(32) NOT NULL DEFAULT 'openai_compatible',
    preset VARCHAR(32) NOT NULL DEFAULT 'deepseek',
    api_url VARCHAR(512) NOT NULL,
    api_key VARCHAR(512),
    model_id VARCHAR(128) NOT NULL,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

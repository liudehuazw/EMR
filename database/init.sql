-- 创建数据库
CREATE DATABASE IF NOT EXISTS emr_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE emr_db;

-- 用户表
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    real_name VARCHAR(50) COMMENT '真实姓名',
    phone VARCHAR(20) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 插入默认管理员账户 admin/admin
INSERT INTO sys_user (username, password, real_name, status) 
VALUES ('admin', '$2a$10$7JB720yubVSOfvVWbfXCOOxjTOQcQjmrJF1ZM4nAVccp/.rkMlDWy', '系统管理员', 1);

-- 患者表
CREATE TABLE IF NOT EXISTS patient (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '患者ID',
    patient_no VARCHAR(50) NOT NULL UNIQUE COMMENT '患者编号',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    gender TINYINT COMMENT '性别：1-男，2-女',
    birth_date DATE COMMENT '出生日期',
    phone VARCHAR(20) COMMENT '联系电话',
    id_card VARCHAR(18) COMMENT '身份证号',
    address TEXT COMMENT '地址',
    emergency_contact VARCHAR(50) COMMENT '紧急联系人',
    emergency_phone VARCHAR(20) COMMENT '紧急联系电话',
    allergy_history TEXT COMMENT '过敏史',
    medical_history TEXT COMMENT '病史',
    avatar_url VARCHAR(500) COMMENT '头像OSS URL',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='患者信息表';

-- 病历表
CREATE TABLE IF NOT EXISTS medical_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '病历ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    record_date DATE NOT NULL COMMENT '病历日期',
    department VARCHAR(50) COMMENT '科室',
    doctor VARCHAR(50) COMMENT '医生',
    diagnosis TEXT COMMENT '诊断',
    symptoms TEXT COMMENT '症状',
    treatment TEXT COMMENT '治疗方案',
    prescription TEXT COMMENT '处方',
    notes TEXT COMMENT '备注',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (patient_id) REFERENCES patient(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='病历表';

-- 检验报告表
CREATE TABLE IF NOT EXISTS lab_report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '检验报告ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    report_date DATE NOT NULL COMMENT '报告日期',
    hospital VARCHAR(100) COMMENT '医院',
    department VARCHAR(50) COMMENT '科室',
    report_type VARCHAR(50) COMMENT '检验类型',
    file_name VARCHAR(255) COMMENT '文件名',
    file_path VARCHAR(500) COMMENT '文件路径',
    file_size BIGINT COMMENT '文件大小',
    extracted_data TEXT COMMENT '提取的数据(JSON格式)',
    normal_ranges TEXT COMMENT '正常范围(JSON格式)',
    notes TEXT COMMENT '备注',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (patient_id) REFERENCES patient(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检验报告表';

-- 影像报告表
CREATE TABLE IF NOT EXISTS imaging_report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '影像报告ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    report_date DATE NOT NULL COMMENT '报告日期',
    hospital VARCHAR(100) COMMENT '医院',
    department VARCHAR(50) COMMENT '科室',
    imaging_type VARCHAR(50) COMMENT '影像类型(X光/CT/MRI等)',
    file_name VARCHAR(255) COMMENT '文件名',
    file_path VARCHAR(500) COMMENT '文件路径',
    file_size BIGINT COMMENT '文件大小',
    findings TEXT COMMENT '影像所见',
    impression TEXT COMMENT '影像诊断',
    notes TEXT COMMENT '备注',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (patient_id) REFERENCES patient(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='影像报告表';

-- 发票表
CREATE TABLE IF NOT EXISTS invoice (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '发票ID',
    patient_id BIGINT NOT NULL COMMENT '患者ID',
    invoice_date DATE NOT NULL COMMENT '发票日期',
    invoice_no VARCHAR(100) COMMENT '发票号码',
    hospital VARCHAR(100) COMMENT '医院',
    department VARCHAR(50) COMMENT '科室',
    total_amount DECIMAL(10,2) COMMENT '总金额',
    file_name VARCHAR(255) COMMENT '文件名',
    file_path VARCHAR(500) COMMENT '文件路径',
    file_size BIGINT COMMENT '文件大小',
    items TEXT COMMENT '费用明细(JSON格式)',
    notes TEXT COMMENT '备注',
    deleted TINYINT DEFAULT 0 COMMENT '是否删除：0-未删除，1-已删除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (patient_id) REFERENCES patient(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票表';

-- 创建索引
CREATE INDEX idx_patient_name ON patient(name);
CREATE INDEX idx_patient_phone ON patient(phone);
CREATE INDEX idx_medical_record_date ON medical_record(record_date);
CREATE INDEX idx_medical_record_patient ON medical_record(patient_id);
CREATE INDEX idx_lab_report_date ON lab_report(report_date);
CREATE INDEX idx_lab_report_patient ON lab_report(patient_id);
CREATE INDEX idx_imaging_report_date ON imaging_report(report_date);
CREATE INDEX idx_imaging_report_patient ON imaging_report(patient_id);
CREATE INDEX idx_invoice_date ON invoice(invoice_date);
CREATE INDEX idx_invoice_patient ON invoice(patient_id);

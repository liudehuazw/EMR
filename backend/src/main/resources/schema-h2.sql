-- H2 compatible schema for development

-- Migration: Add user_id to patient table for data isolation
ALTER TABLE patient ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- User table
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    real_name VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    status TINYINT DEFAULT 1,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient table
CREATE TABLE IF NOT EXISTS patient (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    patient_no VARCHAR(50) NOT NULL UNIQUE,
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
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical record table
CREATE TABLE IF NOT EXISTS medical_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    department VARCHAR(50),
    doctor VARCHAR(50),
    diagnosis TEXT,
    symptoms TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lab report table
CREATE TABLE IF NOT EXISTS lab_report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    hospital VARCHAR(100),
    department VARCHAR(50),
    report_type VARCHAR(50),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    extracted_data TEXT,
    normal_ranges TEXT,
    notes TEXT,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Imaging report table
CREATE TABLE IF NOT EXISTS imaging_report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    hospital VARCHAR(100),
    department VARCHAR(50),
    imaging_type VARCHAR(50),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    findings TEXT,
    impression TEXT,
    notes TEXT,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice table
CREATE TABLE IF NOT EXISTS invoice (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_no VARCHAR(100),
    hospital VARCHAR(100),
    department VARCHAR(50),
    total_amount DECIMAL(10,2),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    items TEXT,
    notes TEXT,
    deleted TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

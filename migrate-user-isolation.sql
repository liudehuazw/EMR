-- Migration: Add user_id to patient table for data isolation
-- Run: mysql -uroot -p emr_db < migrate-user-isolation.sql

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'emr_db' AND TABLE_NAME = 'patient' AND COLUMN_NAME = 'user_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE patient ADD COLUMN user_id BIGINT COMMENT 所属用户ID AFTER id',
    'SELECT "user_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'emr_db' AND TABLE_NAME = 'patient';

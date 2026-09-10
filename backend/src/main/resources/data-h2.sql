-- ============================================================
--  H2 开发模式初始数据（dev profile）
-- ============================================================
--  内存数据库每次启动都是空的，这里仅插入演示所需的最小数据。
--  使用 WHERE NOT EXISTS 保证脚本可重复执行（即使换成文件版 H2 也不会报重复键）。
-- ============================================================

-- 默认管理员账户 admin / admin
-- 哈希为 BCrypt(cost=10) 生成，与 database/init.sql 保持一致
INSERT INTO sys_user (username, password, real_name, status)
SELECT 'admin', '$2a$10$qc0XWDusfUWHehalERruPusWQ19UbahC5G0qKsbjSSdFfhpV507T2', '系统管理员', 1
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin');

-- 演示患者（便于首次启动即可看到列表 / 测试各模块）
INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
SELECT 'P000001', '张三', 1, DATE '1990-01-01', '13800138000', '110101199001011234', '北京市朝阳区建国门外大街1号', '李四', '13900139000', '青霉素过敏', '高血压、糖尿病'
WHERE NOT EXISTS (SELECT 1 FROM patient WHERE patient_no = 'P000001');

INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
SELECT 'P000002', '李四', 2, DATE '1985-05-15', '13800138001', '110101198505151234', '北京市海淀区中关村大街2号', '王五', '13900139001', '无', '无'
WHERE NOT EXISTS (SELECT 1 FROM patient WHERE patient_no = 'P000002');

INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
SELECT 'P000003', '王五', 1, DATE '1992-08-20', '13800138002', '110101199208201234', '北京市西城区金融街3号', '赵六', '13900139002', '海鲜过敏', '哮喘'
WHERE NOT EXISTS (SELECT 1 FROM patient WHERE patient_no = 'P000003');

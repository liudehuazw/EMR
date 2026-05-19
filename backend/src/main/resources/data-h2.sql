-- Initial data for H2 development database

-- Default admin user (password: admin, BCrypt encoded)
INSERT INTO sys_user (username, password, real_name, status) 
VALUES ('admin', '$2a$10$7JB720yubVSOfvVWbfXCOOxjTOQcQjmrJF1ZM4nAVccp/.rkMlDWy', '系统管理员', 1);

-- Sample patient data for testing
INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
VALUES ('P000001', '张三', 1, '1990-01-01', '13800138000', '110101199001011234', '北京市朝阳区建国门外大街1号', '李四', '13900139000', '青霉素过敏', '高血压、糖尿病');

INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
VALUES ('P000002', '李四', 2, '1985-05-15', '13800138001', '110101198505151234', '北京市海淀区中关村大街2号', '王五', '13900139001', '无', '无');

INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, address, emergency_contact, emergency_phone, allergy_history, medical_history)
VALUES ('P000003', '王五', 1, '1992-08-20', '13800138002', '110101199208201234', '北京市西城区金融街3号', '赵六', '13900139002', '海鲜过敏', '哮喘');

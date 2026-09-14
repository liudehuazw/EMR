-- 系统配置表（存储方式等）
CREATE TABLE IF NOT EXISTS emr_system_config (
    config_key VARCHAR(64) PRIMARY KEY COMMENT '配置键',
    config_value VARCHAR(512) NOT NULL COMMENT '配置值',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置';

INSERT INTO emr_system_config (config_key, config_value)
VALUES ('storage_type', 'local')
ON DUPLICATE KEY UPDATE config_value = config_value;

-- 用户 AI 模型配置
CREATE TABLE IF NOT EXISTS emr_user_ai_config (
    user_id BIGINT PRIMARY KEY COMMENT '用户ID',
    provider_type VARCHAR(32) NOT NULL DEFAULT 'openai_compatible' COMMENT 'ollama | openai_compatible',
    preset VARCHAR(32) NOT NULL DEFAULT 'deepseek' COMMENT 'deepseek|qwen|zhipu|kimi|ollama|custom',
    api_url VARCHAR(512) NOT NULL COMMENT 'API URL',
    api_key VARCHAR(512) COMMENT '加密存储的 API Key',
    model_id VARCHAR(128) NOT NULL COMMENT '模型ID',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (user_id) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户AI配置';

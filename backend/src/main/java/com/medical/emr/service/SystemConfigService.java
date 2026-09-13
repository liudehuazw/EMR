package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.SystemConfig;
import com.medical.emr.mapper.SystemConfigMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class SystemConfigService extends ServiceImpl<SystemConfigMapper, SystemConfig> {

    public static final String KEY_STORAGE_TYPE = "storage_type";

    @Value("${file.storage-type:oss}")
    private String defaultStorageType;

    @PostConstruct
    public void initDefaults() {
        SystemConfig existing = getById(KEY_STORAGE_TYPE);
        if (existing == null) {
            SystemConfig config = new SystemConfig();
            config.setConfigKey(KEY_STORAGE_TYPE);
            config.setConfigValue(defaultStorageType);
            config.setUpdateTime(LocalDateTime.now());
            save(config);
        }
    }

    public String getStorageType() {
        SystemConfig config = getById(KEY_STORAGE_TYPE);
        if (config == null || config.getConfigValue() == null || config.getConfigValue().isBlank()) {
            return defaultStorageType;
        }
        return config.getConfigValue();
    }

    public void setStorageType(String storageType) {
        if (!"oss".equals(storageType) && !"local".equals(storageType)) {
            throw new IllegalArgumentException("storage_type 仅支持 oss 或 local");
        }
        SystemConfig config = getById(KEY_STORAGE_TYPE);
        if (config == null) {
            config = new SystemConfig();
            config.setConfigKey(KEY_STORAGE_TYPE);
        }
        config.setConfigValue(storageType);
        config.setUpdateTime(LocalDateTime.now());
        saveOrUpdate(config);
    }
}

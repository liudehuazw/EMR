package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("emr_system_config")
public class SystemConfig {

    @TableId("config_key")
    private String configKey;

    @TableField("config_value")
    private String configValue;

    @TableField("update_time")
    private LocalDateTime updateTime;
}

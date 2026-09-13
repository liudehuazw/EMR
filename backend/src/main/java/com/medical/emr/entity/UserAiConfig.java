package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("emr_user_ai_config")
public class UserAiConfig {

    @TableId("user_id")
    private Long userId;

    @TableField("provider_type")
    private String providerType;

    @TableField("preset")
    private String preset;

    @TableField("api_url")
    private String apiUrl;

    @TableField("api_key")
    private String apiKey;

    @TableField("model_id")
    private String modelId;

    @TableField("update_time")
    private LocalDateTime updateTime;
}

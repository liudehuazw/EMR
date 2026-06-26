package com.medical.emr.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 阿里云OSS配置
 * 需在application.yml中配置以下属性：
 * aliyun.oss.endpoint=oss-cn-hangzhou.aliyuncs.com
 * aliyun.oss.access-key-id=your-access-key
 * aliyun.oss.access-key-secret=your-secret
 * aliyun.oss.bucket-name=your-bucket
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "aliyun.oss")
public class OssConfig {
    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;
}

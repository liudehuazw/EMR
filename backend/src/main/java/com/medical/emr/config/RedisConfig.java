package com.medical.emr.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis 缓存配置
 * <p>
 * 直接创建 LettuceConnectionFactory（绕过自动配置），
 * 配置 RedisTemplate 序列化方式（使用JSON）、
 * 以及不同缓存区域（patients, lab-reports等）的TTL过期时间
 */
@Configuration
@EnableCaching
@SuppressWarnings("null")
public class RedisConfig {

    @Value("${spring.redis.host:127.0.0.1}")
    private String redisHost;

    @Value("${spring.redis.port:26739}")
    private int redisPort;

    @Value("${spring.redis.password:}")
    private String redisPassword;

    @Value("${cache.ttl.patients:300}")
    private long patientsTtl;

    @Value("${cache.ttl.lab-reports:300}")
    private long labReportsTtl;

    @Value("${cache.ttl.imaging-reports:300}")
    private long imagingReportsTtl;

    @Value("${cache.ttl.invoices:300}")
    private long invoicesTtl;

    @Value("${cache.ttl.medical-records:300}")
    private long medicalRecordsTtl;

    @Value("${cache.ttl.users:1800}")
    private long usersTtl;

    /**
     * 手动创建 Redis 连接工厂（直接使用配置值，不依赖自动配置）
     */
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        if (redisPassword != null && !redisPassword.isEmpty()) {
            config.setPassword(redisPassword);
        }
        LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
        factory.afterPropertiesSet();
        return factory;
    }

    /**
     * 自定义 RedisTemplate，使用 JSON 序列化
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(LettuceConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // 使用 Jackson2JsonRedisSerializer 序列化 value
        Jackson2JsonRedisSerializer<Object> jacksonSerializer = createJacksonSerializer();

        // key 使用 String 序列化
        StringRedisSerializer stringSerializer = new StringRedisSerializer();

        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jacksonSerializer);
        template.setHashValueSerializer(jacksonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * 自定义 CacheManager，为不同的缓存区域设置不同的 TTL
     */
    @Bean
    public CacheManager cacheManager(LettuceConnectionFactory factory) {
        // 默认配置：5分钟过期
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(300))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(createJacksonSerializer()))
                .disableCachingNullValues();

        // 各缓存区域的 TTL 配置
        Map<String, RedisCacheConfiguration> configMap = new HashMap<>();

        configMap.put("patients", defaultConfig.entryTtl(Duration.ofSeconds(patientsTtl)));
        configMap.put("patient", defaultConfig.entryTtl(Duration.ofSeconds(patientsTtl)));

        configMap.put("labReports", defaultConfig.entryTtl(Duration.ofSeconds(labReportsTtl)));
        configMap.put("labReport", defaultConfig.entryTtl(Duration.ofSeconds(labReportsTtl)));

        configMap.put("imagingReports", defaultConfig.entryTtl(Duration.ofSeconds(imagingReportsTtl)));
        configMap.put("imagingReport", defaultConfig.entryTtl(Duration.ofSeconds(imagingReportsTtl)));

        configMap.put("invoices", defaultConfig.entryTtl(Duration.ofSeconds(invoicesTtl)));
        configMap.put("invoice", defaultConfig.entryTtl(Duration.ofSeconds(invoicesTtl)));

        configMap.put("medicalRecords", defaultConfig.entryTtl(Duration.ofSeconds(medicalRecordsTtl)));
        configMap.put("medicalRecord", defaultConfig.entryTtl(Duration.ofSeconds(medicalRecordsTtl)));

        configMap.put("users", defaultConfig.entryTtl(Duration.ofSeconds(usersTtl)));
        configMap.put("user", defaultConfig.entryTtl(Duration.ofSeconds(usersTtl)));

        // OCR/AI 结果缓存时间较长（1小时）
        configMap.put("ocrResults", defaultConfig.entryTtl(Duration.ofSeconds(3600)));
        configMap.put("aiAnalysis", defaultConfig.entryTtl(Duration.ofSeconds(3600)));

        return RedisCacheManager.builder(RedisCacheWriter.nonLockingRedisCacheWriter(factory))
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(configMap)
                .build();
    }

    /**
     * 创建 Jackson2JsonRedisSerializer，支持 LocalDateTime 序列化
     */
    private Jackson2JsonRedisSerializer<Object> createJacksonSerializer() {
        ObjectMapper objectMapper = new ObjectMapper();

        // 支持 LocalDateTime 序列化/反序列化
        JavaTimeModule timeModule = new JavaTimeModule();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        timeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(formatter));
        timeModule.addDeserializer(LocalDateTime.class, new LocalDateTimeDeserializer(formatter));
        objectMapper.registerModule(timeModule);

        // 设置序列化可见性
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);

        // 启用类型信息（便于反序列化时还原对象类型）
        objectMapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        Jackson2JsonRedisSerializer<Object> serializer = new Jackson2JsonRedisSerializer<>(objectMapper, Object.class);
        return serializer;
    }
}

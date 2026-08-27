package com.medical.emr.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Redis 缓存操作服务
 * <p>
 * 提供通用的缓存读写、过期、清除操作。
 * 当 Redis 不可用时自动降级（静默失败，不影响业务）。
 */
@Service
@SuppressWarnings("null")
public class CacheService {

    private static final Logger log = LoggerFactory.getLogger(CacheService.class);

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 启动时测试 Redis 连接，打印详细错误
     */
    @PostConstruct
    public void init() {
        if (redisTemplate == null) {
            log.warn("[Cache] RedisTemplate 未注入，缓存功能不可用");
            return;
        }
        try {
            var factory = redisTemplate.getConnectionFactory();
            if (factory == null) {
                log.warn("[Cache] Redis ConnectionFactory 为 null");
                return;
            }
            String result = factory.getConnection().ping();
            log.info("[Cache] Redis 连接成功! PING response: {}", result);
        } catch (Exception e) {
            log.error("[Cache] Redis 连接失败! 错误类型: {}, 错误消息: {}", e.getClass().getName(), e.getMessage());
            // 打印完整堆栈以定位问题
            for (StackTraceElement ste : e.getStackTrace()) {
                if (ste.getClassName().contains("redis") || ste.getClassName().contains("lettuce")) {
                    log.error("[Cache]   at {}.{}({}:{})", ste.getClassName(), ste.getMethodName(), ste.getFileName(), ste.getLineNumber());
                    break;
                }
            }
        }
    }

    /**
     * 写入缓存（带过期时间）
     *
     * @param key   缓存键
     * @param value 缓存值
     * @param ttl   过期时间（秒），null 则使用默认 TTL
     */
    public void set(String key, Object value, Long ttl) {
        if (redisTemplate == null) {
            return; // Redis 未配置，降级
        }
        try {
            if (ttl != null && ttl > 0) {
                redisTemplate.opsForValue().set(key, value, ttl, TimeUnit.SECONDS);
            } else {
                redisTemplate.opsForValue().set(key, value);
            }
        } catch (Exception e) {
            log.warn("Redis set 失败 (key={}, error={}): {}", key, e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /**
     * 写入缓存（默认 TTL）
     */
    public void set(String key, Object value) {
        set(key, value, null);
    }

    /**
     * 读取缓存
     *
     * @param key 缓存键
     * @param <T> 期望返回的类型
     * @return 缓存值，不存在或异常返回 null
     */
    @SuppressWarnings("unchecked")
    public <T> T get(String key) {
        if (redisTemplate == null) {
            return null;
        }
        try {
            return (T) redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("Redis get 失败 (key={}, error={}): {}", key, e.getClass().getSimpleName(), e.getMessage());
            return null;
        }
    }

    /**
     * 删除缓存
     */
    public void delete(String key) {
        if (redisTemplate == null) {
            return;
        }
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Redis delete 失败 (key={}): {}", key, e.getMessage());
        }
    }

    /**
     * 按通配符模式批量删除缓存键
     * <p>
     * 例如：deleteByPattern("patients:user:*") 会删除所有属于 user 的 patients 缓存
     *
     * @param pattern 匹配模式，如 "patients:*"
     */
    public void deleteByPattern(String pattern) {
        if (redisTemplate == null) {
            return;
        }
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.debug("Redis 批量删除缓存: pattern={}, count={}", pattern, keys.size());
            }
        } catch (Exception e) {
            log.warn("Redis deleteByPattern 失败 (pattern={}): {}", pattern, e.getMessage());
        }
    }

    /**
     * 判断缓存键是否存在
     */
    public boolean hasKey(String key) {
        if (redisTemplate == null) {
            return false;
        }
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.warn("Redis hasKey 失败 (key={}): {}", key, e.getMessage());
            return false;
        }
    }

    /**
     * 获取缓存剩余过期时间
     *
     * @param key 缓存键
     * @return 剩余秒数，-1 表示永不过期，-2 表示不存在
     */
    public long getTTL(String key) {
        if (redisTemplate == null) {
            return -2;
        }
        try {
            return redisTemplate.getExpire(key, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis getTTL 失败 (key={}): {}", key, e.getMessage());
            return -2;
        }
    }

    /**
     * 构建标准化的缓存键
     * <p>
     * 格式：{业务前缀}:{用户ID}:{查询条件}
     *
     * @param prefix  业务前缀，如 "patients"
     * @param userId  用户ID
     * @param suffix  查询条件后缀
     * @return 标准化缓存键
     */
    public static String buildKey(String prefix, Long userId, String suffix) {
        if (suffix == null || suffix.isEmpty()) {
            return prefix + ":user:" + userId;
        }
        return prefix + ":user:" + userId + ":" + suffix;
    }

    /**
     * 构建实体缓存键
     * <p>
     * 格式：{业务前缀}:{实体ID}
     *
     * @param prefix   业务前缀
     * @param entityId 实体ID
     * @return 缓存键
     */
    public static String buildEntityKey(String prefix, Long entityId) {
        return prefix + ":" + entityId;
    }
}

package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.dto.LlmConfigDto;
import com.medical.emr.dto.UserAiConfigRequest;
import com.medical.emr.dto.UserAiConfigResponse;
import com.medical.emr.entity.User;
import com.medical.emr.entity.UserAiConfig;
import com.medical.emr.mapper.UserAiConfigMapper;
import com.medical.emr.utils.CryptoUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserAiConfigService extends ServiceImpl<UserAiConfigMapper, UserAiConfig> {

    private final UserService userService;
    private final CryptoUtil cryptoUtil;
    private final LlmClient llmClient;
    private final Map<Long, LlmConfigDto> cache = new ConcurrentHashMap<>();

    @Value("${zhipu.ai.api-key:${DEEPSEEK_API_KEY:}}")
    private String defaultApiKey;

    @Value("${zhipu.ai.api-url:https://api.deepseek.com/v1/chat/completions}")
    private String defaultApiUrl;

    @Value("${zhipu.ai.model:deepseek-chat}")
    private String defaultModel;

    @Value("${zhipu.ai.timeout:300000}")
    private int defaultTimeout;

    public UserAiConfigService(UserService userService, CryptoUtil cryptoUtil, LlmClient llmClient) {
        this.userService = userService;
        this.cryptoUtil = cryptoUtil;
        this.llmClient = llmClient;
    }
    public UserAiConfigResponse getConfigForUser(String username) {
        User user = userService.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        UserAiConfig config = getById(user.getId());
        UserAiConfigResponse response = new UserAiConfigResponse();
        if (config == null) {
            response.setProviderType("openai_compatible");
            response.setPreset("deepseek");
            response.setApiUrl(defaultApiUrl);
            response.setApiKeyMasked(cryptoUtil.maskApiKey(defaultApiKey));
            response.setModelId(defaultModel);
            response.setUsingDefault(true);
            return response;
        }
        response.setProviderType(config.getProviderType());
        response.setPreset(config.getPreset());
        response.setApiUrl(config.getApiUrl());
        response.setModelId(config.getModelId());
        response.setUsingDefault(false);
        String plainKey = decryptKey(config.getApiKey());
        response.setApiKeyMasked(cryptoUtil.maskApiKey(plainKey));
        return response;
    }

    public void saveConfig(String username, UserAiConfigRequest request) {
        User user = userService.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        validateRequest(request);

        UserAiConfig existing = getById(user.getId());
        UserAiConfig config = existing != null ? existing : new UserAiConfig();
        config.setUserId(user.getId());
        config.setProviderType(request.getProviderType());
        config.setPreset(request.getPreset());
        config.setApiUrl(request.getApiUrl().trim());
        config.setModelId(request.getModelId().trim());
        if (request.getApiKey() != null && !request.getApiKey().isBlank()
                && !request.getApiKey().contains("****")) {
            config.setApiKey(cryptoUtil.encrypt(request.getApiKey().trim()));
        } else if (existing != null) {
            config.setApiKey(existing.getApiKey());
        } else if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            config.setApiKey(cryptoUtil.encrypt(request.getApiKey().trim()));
        }
        config.setUpdateTime(LocalDateTime.now());
        saveOrUpdate(config);
        cache.remove(user.getId());
    }

    public LlmConfigDto getEffectiveConfig(String username) {
        User user = userService.findByUsername(username);
        if (user == null) {
            return defaultConfig();
        }
        return cache.computeIfAbsent(user.getId(), id -> loadEffectiveConfig(user));
    }

    public LlmConfigDto getEffectiveConfigByUserId(Long userId) {
        if (userId == null) {
            return defaultConfig();
        }
        return cache.computeIfAbsent(userId, id -> {
            User user = userService.getById(userId);
            if (user == null) {
                return defaultConfig();
            }
            return loadEffectiveConfig(user);
        });
    }

    public Map<String, Object> testConfig(String username, UserAiConfigRequest request) {
        LlmConfigDto config = buildTestConfig(username, request);
        long start = System.currentTimeMillis();
        String reply = llmClient.chatCompletion(config,
                "你是一个助手，请简短回复。",
                "请只回复 OK 两个字母");
        long latency = System.currentTimeMillis() - start;
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("latencyMs", latency);
        result.put("model", config.getModelId());
        result.put("replyPreview", reply.length() > 120 ? reply.substring(0, 120) + "..." : reply);
        return result;
    }

    private LlmConfigDto loadEffectiveConfig(User user) {
        UserAiConfig config = getById(user.getId());
        if (config == null) {
            return defaultConfig();
        }
        LlmConfigDto dto = new LlmConfigDto();
        dto.setProviderType(config.getProviderType());
        dto.setPreset(config.getPreset());
        dto.setApiUrl(config.getApiUrl());
        dto.setApiKey(decryptKey(config.getApiKey()));
        dto.setModelId(config.getModelId());
        dto.setTimeout(defaultTimeout);
        return dto;
    }

    private LlmConfigDto buildTestConfig(String username, UserAiConfigRequest request) {
        validateRequest(request);
        LlmConfigDto dto = new LlmConfigDto();
        dto.setProviderType(request.getProviderType());
        dto.setPreset(request.getPreset());
        dto.setApiUrl(request.getApiUrl().trim());
        dto.setModelId(request.getModelId().trim());
        dto.setTimeout(defaultTimeout);
        if (request.getApiKey() != null && !request.getApiKey().isBlank()
                && !request.getApiKey().contains("****")) {
            dto.setApiKey(request.getApiKey().trim());
        } else {
            User user = userService.findByUsername(username);
            if (user != null) {
                UserAiConfig existing = getById(user.getId());
                if (existing != null) {
                    dto.setApiKey(decryptKey(existing.getApiKey()));
                }
            }
            if (dto.getApiKey() == null || dto.getApiKey().isBlank()) {
                dto.setApiKey(defaultApiKey);
            }
        }
        return dto;
    }

    private LlmConfigDto defaultConfig() {
        LlmConfigDto dto = new LlmConfigDto();
        dto.setProviderType("openai_compatible");
        dto.setPreset("deepseek");
        dto.setApiUrl(defaultApiUrl);
        dto.setApiKey(defaultApiKey);
        dto.setModelId(defaultModel);
        dto.setTimeout(defaultTimeout);
        return dto;
    }

    private void validateRequest(UserAiConfigRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("配置不能为空");
        }
        if (request.getApiUrl() == null || request.getApiUrl().isBlank()) {
            throw new IllegalArgumentException("API URL 不能为空");
        }
        if (request.getModelId() == null || request.getModelId().isBlank()) {
            throw new IllegalArgumentException("模型 ID 不能为空");
        }
        if (request.getProviderType() == null || request.getProviderType().isBlank()) {
            request.setProviderType("openai_compatible");
        }
    }

    private String decryptKey(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) {
            return defaultApiKey;
        }
        try {
            return cryptoUtil.decrypt(encrypted);
        } catch (Exception e) {
            return encrypted;
        }
    }
}

package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.dto.UserAiConfigRequest;
import com.medical.emr.dto.UserAiConfigResponse;
import com.medical.emr.service.UserAiConfigService;
import com.medical.emr.utils.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/user/ai-config")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserAiConfigController {

    private final UserAiConfigService userAiConfigService;

    public UserAiConfigController(UserAiConfigService userAiConfigService) {
        this.userAiConfigService = userAiConfigService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserAiConfigResponse>> getConfig() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "未登录"));
        }
        return ResponseEntity.ok(ApiResponse.success("获取成功", userAiConfigService.getConfigForUser(username)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserAiConfigResponse>> saveConfig(@RequestBody UserAiConfigRequest request) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "未登录"));
        }
        try {
            userAiConfigService.saveConfig(username, request);
            return ResponseEntity.ok(ApiResponse.success("配置已保存", userAiConfigService.getConfigForUser(username)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testConfig(@RequestBody UserAiConfigRequest request) {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "未登录"));
        }
        try {
            Map<String, Object> result = userAiConfigService.testConfig(username, request);
            return ResponseEntity.ok(ApiResponse.success("验证成功", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("验证失败: " + e.getMessage()));
        }
    }
}

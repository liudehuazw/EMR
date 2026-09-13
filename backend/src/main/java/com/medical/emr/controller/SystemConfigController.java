package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.dto.StorageTypeRequest;
import com.medical.emr.service.SystemConfigService;
import com.medical.emr.utils.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/system/config")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    public SystemConfigController(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    @GetMapping("/storage")
    public ResponseEntity<ApiResponse<Map<String, String>>> getStorageType() {
        return ResponseEntity.ok(ApiResponse.success("获取成功",
                Map.of("storageType", systemConfigService.getStorageType())));
    }

    @PutMapping("/storage")
    public ResponseEntity<ApiResponse<Map<String, String>>> setStorageType(@RequestBody StorageTypeRequest request) {
        if (!SecurityUtils.isAdmin()) {
            return ResponseEntity.status(403).body(ApiResponse.error(403, "仅管理员可修改存储方式"));
        }
        try {
            systemConfigService.setStorageType(request.getStorageType());
            return ResponseEntity.ok(ApiResponse.success("存储方式已更新",
                    Map.of("storageType", systemConfigService.getStorageType())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}

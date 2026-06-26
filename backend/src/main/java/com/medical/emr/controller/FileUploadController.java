package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.service.FileStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 文件上传Controller - 处理所有文件上传到OSS
 */
@Slf4j
@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileUploadController {

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * 通用文件上传接口
     * POST /api/files/upload?folder=avatars
     * @param file 文件
     * @param folder 目标文件夹（avatars, lab-reports, imaging-reports, invoices）
     * @return 文件URL
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "uploads") String folder) {

        try {
            // 验证文件
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(400, "文件不能为空"));
            }

            // 文件大小限制（50MB）
            if (file.getSize() > 50 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(400, "文件大小不能超过50MB"));
            }

            // 验证文件夹名称（只允许白名单）
            if (!isValidFolder(folder)) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(400, "无效的文件夹名称"));
            }

            // 上传文件
            String fileUrl = fileStorageService.uploadFile(file, folder);

            Map<String, String> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());

            return ResponseEntity.ok(ApiResponse.success("上传成功", data));

        } catch (Exception e) {
            log.error("文件上传失败", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("上传失败: " + e.getMessage()));
        }
    }

    /**
     * 批量删除文件
     * POST /api/files/delete
     */
    @PostMapping("/delete")
    public ResponseEntity<ApiResponse<String>> deleteFile(@RequestBody Map<String, String> request) {
        String fileUrl = request.get("url");
        if (fileUrl == null || fileUrl.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "文件URL不能为空"));
        }

        try {
            fileStorageService.deleteFile(fileUrl);
            return ResponseEntity.ok(ApiResponse.success("删除成功"));
        } catch (Exception e) {
            log.error("文件删除失败", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("删除失败: " + e.getMessage()));
        }
    }

    /**
     * 验证文件夹名称
     */
    private boolean isValidFolder(String folder) {
        String[] validFolders = {"avatars", "lab-reports", "imaging-reports", "invoices", "uploads", "medical-records"};
        for (String valid : validFolders) {
            if (valid.equals(folder)) {
                return true;
            }
        }
        return false;
    }
}

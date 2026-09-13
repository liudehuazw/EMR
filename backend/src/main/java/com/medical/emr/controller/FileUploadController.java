package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.service.FileStorageService;
import com.medical.emr.service.storage.FileStorageSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileUploadController {

    private final FileStorageService fileStorageService;

    public FileUploadController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "uploads") String folder) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error(400, "文件不能为空"));
            }
            if (file.getSize() > 50 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(ApiResponse.error(400, "文件大小不能超过50MB"));
            }
            if (!FileStorageSupport.isValidFolder(folder)) {
                return ResponseEntity.badRequest().body(ApiResponse.error(400, "无效的文件夹名称"));
            }
            String fileUrl = fileStorageService.uploadFile(file, folder);
            Map<String, String> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("originalName", file.getOriginalFilename());
            return ResponseEntity.ok(ApiResponse.success("上传成功", data));
        } catch (Exception e) {
            log.error("文件上传失败", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("上传失败: " + e.getMessage()));
        }
    }

    @GetMapping("/preview/{folder}/{filename:.+}")
    public ResponseEntity<Resource> previewFile(@PathVariable String folder, @PathVariable String filename) {
        try {
            if (!FileStorageSupport.isValidFolder(folder)) {
                return ResponseEntity.badRequest().build();
            }
            Path path = fileStorageService.resolveLocalPreviewPath(folder, filename);
            if (!fileStorageService.localFileExists(path)) {
                return ResponseEntity.notFound().build();
            }
            Resource resource = new FileSystemResource(path);
            String contentType = fileStorageService.guessContentType(filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<ApiResponse<String>> deleteFile(@RequestBody Map<String, String> request) {
        String fileUrl = request.get("url");
        if (fileUrl == null || fileUrl.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "文件URL不能为空"));
        }
        try {
            fileStorageService.deleteFile(fileUrl);
            return ResponseEntity.ok(ApiResponse.success("删除成功"));
        } catch (Exception e) {
            log.error("文件删除失败", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("删除失败: " + e.getMessage()));
        }
    }
}

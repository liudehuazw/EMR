package com.medical.emr.service;

import com.medical.emr.service.storage.FileStorageStrategy;
import com.medical.emr.service.storage.FileStorageSupport;
import com.medical.emr.service.storage.LocalFileStorageStrategy;
import com.medical.emr.service.storage.OssFileStorageStrategy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * 文件存储门面：按系统配置选择 OSS / 本地，删除时按 URL 自动路由
 */
@Slf4j
@Service
public class FileStorageService {

    private final SystemConfigService systemConfigService;
    private final OssFileStorageStrategy ossStrategy;
    private final LocalFileStorageStrategy localStrategy;

    public FileStorageService(SystemConfigService systemConfigService,
                              OssFileStorageStrategy ossStrategy,
                              LocalFileStorageStrategy localStrategy) {
        this.systemConfigService = systemConfigService;
        this.ossStrategy = ossStrategy;
        this.localStrategy = localStrategy;
    }

    public String uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        if (!FileStorageSupport.isValidFolder(folder)) {
            throw new IllegalArgumentException("无效的文件夹名称");
        }
        return strategyForUpload().upload(file, folder);
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return;
        }
        FileStorageStrategy strategy = strategyForUrl(fileUrl);
        if (strategy != null) {
            strategy.delete(fileUrl);
        } else {
            log.warn("未识别的文件 URL，跳过删除: {}", fileUrl);
        }
    }

    public Path resolveLocalPreviewPath(String folder, String filename) {
        return localStrategy.resolveLocalPath(folder, filename);
    }

    public boolean localFileExists(Path path) {
        return Files.exists(path) && Files.isRegularFile(path);
    }

    public String guessContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".bmp")) {
            return "image/bmp";
        }
        return "image/jpeg";
    }

    private FileStorageStrategy strategyForUpload() {
        String type = systemConfigService.getStorageType();
        if ("local".equals(type)) {
            return localStrategy;
        }
        return ossStrategy;
    }

    private FileStorageStrategy strategyForUrl(String fileUrl) {
        List<FileStorageStrategy> strategies = List.of(localStrategy, ossStrategy);
        for (FileStorageStrategy strategy : strategies) {
            if (strategy.supports(fileUrl)) {
                return strategy;
            }
        }
        return null;
    }
}

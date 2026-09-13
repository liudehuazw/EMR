package com.medical.emr.service.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Slf4j
@Component
public class LocalFileStorageStrategy implements FileStorageStrategy {

    private final Path uploadRoot;

    public LocalFileStorageStrategy(@Value("${file.upload-path:./uploads/}") String uploadPath) {
        this.uploadRoot = Paths.get(uploadPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadRoot);
        } catch (IOException e) {
            throw new IllegalStateException("无法创建本地上传目录: " + this.uploadRoot, e);
        }
    }

    @Override
    public String getType() {
        return "local";
    }

    @Override
    public String upload(MultipartFile file, String folder) {
        String originalFilename = file.getOriginalFilename();
        String extension = FileStorageSupport.getFileExtension(originalFilename);
        String newFilename = FileStorageSupport.generateUniqueFilename(extension);
        Path targetDir = uploadRoot.resolve(folder).normalize();
        if (!targetDir.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("非法文件夹路径");
        }
        try {
            Files.createDirectories(targetDir);
            Path targetFile = targetDir.resolve(newFilename);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
            String fileUrl = FileStorageSupport.LOCAL_PREVIEW_PREFIX + folder + "/" + newFilename;
            log.info("本地文件上传成功: {} -> {}", originalFilename, fileUrl);
            return fileUrl;
        } catch (IOException e) {
            log.error("本地文件上传失败: {}", originalFilename, e);
            throw new RuntimeException("文件上传失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String fileUrl) {
        Path path = resolveLocalPathFromUrl(fileUrl);
        if (path == null) {
            log.warn("无法解析本地文件 URL: {}", fileUrl);
            return;
        }
        try {
            Files.deleteIfExists(path);
            log.info("本地文件删除成功: {}", path);
        } catch (IOException e) {
            log.error("本地文件删除失败: {}", path, e);
        }
    }

    @Override
    public boolean supports(String fileUrl) {
        return fileUrl != null && fileUrl.startsWith(FileStorageSupport.LOCAL_PREVIEW_PREFIX);
    }

    @Override
    public Path resolveLocalPath(String folder, String filename) {
        FileStorageSupport.validatePathSegment(folder);
        FileStorageSupport.validatePathSegment(filename);
        Path path = uploadRoot.resolve(folder).resolve(filename).normalize();
        if (!path.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("非法文件路径");
        }
        return path;
    }

    public Path resolveLocalPathFromUrl(String fileUrl) {
        if (!supports(fileUrl)) {
            return null;
        }
        String relative = fileUrl.substring(FileStorageSupport.LOCAL_PREVIEW_PREFIX.length());
        int slash = relative.indexOf('/');
        if (slash <= 0 || slash >= relative.length() - 1) {
            return null;
        }
        String folder = relative.substring(0, slash);
        String filename = relative.substring(slash + 1);
        return resolveLocalPath(folder, filename);
    }
}

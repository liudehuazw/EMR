package com.medical.emr.service.storage;

import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * 文件存储策略：OSS 或本地磁盘
 */
public interface FileStorageStrategy {

    String getType();

    String upload(MultipartFile file, String folder);

    void delete(String fileUrl);

    boolean supports(String fileUrl);

    Path resolveLocalPath(String folder, String filename);
}

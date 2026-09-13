package com.medical.emr.service.storage;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.medical.emr.config.OssConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

@Slf4j
@Component
public class OssFileStorageStrategy implements FileStorageStrategy {

    private final OssConfig ossConfig;

    public OssFileStorageStrategy(OssConfig ossConfig) {
        this.ossConfig = ossConfig;
    }

    @Override
    public String getType() {
        return "oss";
    }

    @Override
    public String upload(MultipartFile file, String folder) {
        String originalFilename = file.getOriginalFilename();
        String extension = FileStorageSupport.getFileExtension(originalFilename);
        String newFilename = FileStorageSupport.generateUniqueFilename(extension);
        String objectKey = folder + "/" + newFilename;

        OSS ossClient = null;
        try (InputStream inputStream = file.getInputStream()) {
            ossClient = createOssClient();
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType(file.getContentType());
            metadata.setContentLength(file.getSize());
            ossClient.putObject(ossConfig.getBucketName(), objectKey, inputStream, metadata);
            String fileUrl = generateFileUrl(objectKey);
            log.info("OSS 上传成功: {} -> {}", originalFilename, fileUrl);
            return fileUrl;
        } catch (IOException e) {
            log.error("OSS 上传失败: {}", originalFilename, e);
            throw new RuntimeException("文件上传失败: " + e.getMessage(), e);
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }
    }

    @Override
    public void delete(String fileUrl) {
        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null) {
            log.warn("无法解析 OSS URL: {}", fileUrl);
            return;
        }
        OSS ossClient = null;
        try {
            ossClient = createOssClient();
            ossClient.deleteObject(ossConfig.getBucketName(), objectKey);
            log.info("OSS 文件删除成功: {}", objectKey);
        } catch (Exception e) {
            log.error("OSS 文件删除失败: {}", objectKey, e);
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }
    }

    @Override
    public boolean supports(String fileUrl) {
        return fileUrl != null && fileUrl.startsWith("https://");
    }

    @Override
    public Path resolveLocalPath(String folder, String filename) {
        throw new UnsupportedOperationException("OSS 存储不支持本地路径解析");
    }

    private OSS createOssClient() {
        return new OSSClientBuilder().build(
                ossConfig.getEndpoint(),
                ossConfig.getAccessKeyId(),
                ossConfig.getAccessKeySecret()
        );
    }

    private String generateFileUrl(String objectKey) {
        return "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/" + objectKey;
    }

    private String extractObjectKey(String fileUrl) {
        String prefix = ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/";
        int index = fileUrl.indexOf(prefix);
        if (index == -1) {
            return null;
        }
        return fileUrl.substring(index + prefix.length());
    }
}

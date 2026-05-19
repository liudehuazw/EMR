package com.medical.emr.service;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.ObjectMetadata;
import com.medical.emr.config.OssConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 文件存储服务 - 上传到阿里云OSS
 */
@Slf4j
@Service
public class FileStorageService {

    @Autowired
    private OssConfig ossConfig;

    /**
     * 上传文件到OSS
     * @param file 文件
     * @param folder 文件夹路径（如 avatars, lab-reports, imaging-reports）
     * @return 文件访问URL
     */
    public String uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String newFilename = generateUniqueFilename(extension);
        String objectKey = folder + "/" + newFilename;

        OSS ossClient = null;
        try (InputStream inputStream = file.getInputStream()) {
            ossClient = createOssClient();

            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentType(file.getContentType());
            metadata.setContentLength(file.getSize());

            ossClient.putObject(ossConfig.getBucketName(), objectKey, inputStream, metadata);

            // 生成访问URL
            String fileUrl = generateFileUrl(objectKey);
            log.info("文件上传成功: {} -> {}", originalFilename, fileUrl);
            return fileUrl;

        } catch (IOException e) {
            log.error("文件上传失败: {}", originalFilename, e);
            throw new RuntimeException("文件上传失败: " + e.getMessage(), e);
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }
    }

    /**
     * 删除OSS文件
     * @param fileUrl 文件URL
     */
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        String objectKey = extractObjectKey(fileUrl);
        if (objectKey == null) {
            return;
        }

        OSS ossClient = null;
        try {
            ossClient = createOssClient();
            ossClient.deleteObject(ossConfig.getBucketName(), objectKey);
            log.info("文件删除成功: {}", objectKey);
        } catch (Exception e) {
            log.error("文件删除失败: {}", objectKey, e);
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }
    }

    /**
     * 创建OSS客户端
     */
    private OSS createOssClient() {
        return new OSSClientBuilder().build(
                ossConfig.getEndpoint(),
                ossConfig.getAccessKeyId(),
                ossConfig.getAccessKeySecret()
        );
    }

    /**
     * 生成唯一文件名
     */
    private String generateUniqueFilename(String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return timestamp + "-" + uuid + "." + extension;
    }

    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * 生成文件访问URL
     */
    private String generateFileUrl(String objectKey) {
        return "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/" + objectKey;
    }

    /**
     * 从URL中提取ObjectKey
     */
    private String extractObjectKey(String fileUrl) {
        String prefix = ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/";
        int index = fileUrl.indexOf(prefix);
        if (index == -1) {
            return null;
        }
        return fileUrl.substring(index + prefix.length());
    }
}

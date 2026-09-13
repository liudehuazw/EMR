package com.medical.emr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class FileCleanupHelper {

    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public FileCleanupHelper(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    public void deleteIfPresent(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return;
        }
        try {
            fileStorageService.deleteFile(fileUrl);
        } catch (Exception e) {
            log.warn("删除文件失败（继续删除记录）: {}", fileUrl, e);
        }
    }

    public void deleteMedicalRecordFiles(String filesJson) {
        if (filesJson == null || filesJson.isBlank()) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(filesJson);
            if (!root.isArray()) {
                return;
            }
            for (JsonNode node : root) {
                JsonNode urlNode = node.get("url");
                if (urlNode != null && urlNode.isTextual()) {
                    deleteIfPresent(urlNode.asText());
                }
            }
        } catch (Exception e) {
            log.warn("解析病历 files JSON 失败: {}", e.getMessage());
        }
    }
}

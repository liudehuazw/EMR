package com.medical.emr.service.storage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

public final class FileStorageSupport {

    public static final Set<String> VALID_FOLDERS = Set.of(
            "avatars", "lab-reports", "imaging-reports", "invoices", "uploads", "medical-records"
    );

    public static final String LOCAL_PREVIEW_PREFIX = "/files/preview/";

    private FileStorageSupport() {
    }

    public static boolean isValidFolder(String folder) {
        return folder != null && VALID_FOLDERS.contains(folder);
    }

    public static String generateUniqueFilename(String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return timestamp + "-" + uuid + "." + extension;
    }

    public static String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf('.') == -1) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    public static void validatePathSegment(String segment) {
        if (segment == null || segment.isBlank() || segment.contains("..")
                || segment.contains("/") || segment.contains("\\")) {
            throw new IllegalArgumentException("非法路径参数");
        }
    }
}

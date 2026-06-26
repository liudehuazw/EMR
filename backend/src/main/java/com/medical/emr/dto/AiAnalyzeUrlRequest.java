package com.medical.emr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for AI analysis by file URL request
 */
@Data
public class AiAnalyzeUrlRequest {

    /** Report type: "lab_image" or "imaging_image" */
    @NotBlank(message = "Report type is required")
    private String type;

    /** File URL to download and analyze */
    @NotBlank(message = "File URL is required")
    private String fileUrl;

    /** Report title for context */
    private String title;

    /** Patient name for context */
    private String patientName;

    /** Report date for context */
    private String reportDate;
}

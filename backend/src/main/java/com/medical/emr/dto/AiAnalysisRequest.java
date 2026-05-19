package com.medical.emr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for AI analysis request
 */
@Data
public class AiAnalysisRequest {

    /** Report type: "lab" or "imaging" */
    @NotBlank(message = "Report type is required")
    private String type;

    /** Report data text for analysis (structured data or OCR text) */
    @NotBlank(message = "Report data is required")
    private String data;

    /** Report title for context */
    private String title;

    /** Patient name for context */
    private String patientName;
}

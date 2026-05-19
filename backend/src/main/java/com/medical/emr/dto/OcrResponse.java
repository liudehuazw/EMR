package com.medical.emr.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * OCR response DTO for handling OCR service results
 */
public class OcrResponse {
    
    @JsonProperty("success")
    private boolean success;
    
    @JsonProperty("filename")
    private String filename;
    
    @JsonProperty("text")
    private String text;
    
    @JsonProperty("processing_time")
    private double processingTime;
    
    @JsonProperty("line_count")
    private int lineCount;
    
    @JsonProperty("page_count")
    private Integer pageCount;
    
    @JsonProperty("timestamp")
    private long timestamp;
    
    @JsonProperty("confidence")
    private double confidence;
    
    // Default constructor
    public OcrResponse() {}
    
    // Constructor with all fields
    public OcrResponse(boolean success, String filename, String text, 
                      double processingTime, int lineCount, Integer pageCount, long timestamp) {
        this.success = success;
        this.filename = filename;
        this.text = text;
        this.processingTime = processingTime;
        this.lineCount = lineCount;
        this.pageCount = pageCount;
        this.timestamp = timestamp;
    }
    
    // Getters and setters
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getFilename() {
        return filename;
    }
    
    public void setFilename(String filename) {
        this.filename = filename;
    }
    
    public String getText() {
        return text;
    }
    
    public void setText(String text) {
        this.text = text;
    }
    
    public double getProcessingTime() {
        return processingTime;
    }
    
    public void setProcessingTime(double processingTime) {
        this.processingTime = processingTime;
    }
    
    public int getLineCount() {
        return lineCount;
    }
    
    public void setLineCount(int lineCount) {
        this.lineCount = lineCount;
    }
    
    public Integer getPageCount() {
        return pageCount;
    }
    
    public void setPageCount(Integer pageCount) {
        this.pageCount = pageCount;
    }
    
    public long getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
    
    public double getConfidence() {
        return confidence;
    }
    
    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }
    
    @Override
    public String toString() {
        return "OcrResponse{" +
                "success=" + success +
                ", filename='" + filename + '\'' +
                ", text='" + text + '\'' +
                ", processingTime=" + processingTime +
                ", lineCount=" + lineCount +
                ", pageCount=" + pageCount +
                ", timestamp=" + timestamp +
                ", confidence=" + confidence +
                '}';
    }
}

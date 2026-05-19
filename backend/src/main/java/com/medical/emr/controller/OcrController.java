package com.medical.emr.controller;

import com.medical.emr.dto.OcrResponse;
import com.medical.emr.service.OcrServiceClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * OCR Controller for handling OCR processing requests
 */
@RestController
@RequestMapping("/ocr")
@CrossOrigin(origins = "*")
public class OcrController {
    
    private final OcrServiceClient ocrServiceClient;
    
    public OcrController(OcrServiceClient ocrServiceClient) {
        this.ocrServiceClient = ocrServiceClient;
    }
    
    /**
     * Health check endpoint for OCR service
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        boolean isHealthy = ocrServiceClient.checkHealth();
        
        response.put("status", isHealthy ? "healthy" : "unhealthy");
        response.put("service", "Spring Boot OCR Controller");
        response.put("ocr_service_status", isHealthy ? "connected" : "disconnected");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get OCR service information
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getServiceInfo() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String serviceInfo = ocrServiceClient.getServiceInfo();
            response.put("success", true);
            response.put("service_info", serviceInfo);
            response.put("controller_status", "active");
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("controller_status", "active");
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Process image file with OCR
     */
    @PostMapping("/image")
    public ResponseEntity<Map<String, Object>> processImage(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("success", false);
                response.put("error", "Invalid file type. Only image files are allowed");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file size (10MB limit)
            if (file.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("error", "File size exceeds 10MB limit");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Process with OCR service
            OcrResponse ocrResult = ocrServiceClient.processImage(file);
            
            response.put("success", true);
            response.put("data", ocrResult);
            response.put("message", "Image processed successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to process image: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Process PDF file with OCR
     */
    @PostMapping("/pdf")
    public ResponseEntity<Map<String, Object>> processPdf(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file type
            String contentType = file.getContentType();
            if (!"application/pdf".equals(contentType)) {
                response.put("success", false);
                response.put("error", "Invalid file type. Only PDF files are allowed");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file size (10MB limit)
            if (file.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("error", "File size exceeds 10MB limit");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Process with OCR service
            OcrResponse ocrResult = ocrServiceClient.processPdf(file);
            
            response.put("success", true);
            response.put("data", ocrResult);
            response.put("message", "PDF processed successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to process PDF: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Generic OCR processing endpoint (auto-detect file type)
     */
    @PostMapping("/process")
    public ResponseEntity<Map<String, Object>> processFile(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate file size (10MB limit)
            if (file.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("error", "File size exceeds 10MB limit");
                return ResponseEntity.badRequest().body(response);
            }
            
            String contentType = file.getContentType();
            OcrResponse ocrResult;
            
            // Auto-detect file type and process accordingly
            if (contentType != null && contentType.equals("application/pdf")) {
                ocrResult = ocrServiceClient.processPdf(file);
                response.put("file_type", "PDF");
            } else if (contentType != null && contentType.startsWith("image/")) {
                ocrResult = ocrServiceClient.processImage(file);
                response.put("file_type", "Image");
            } else {
                response.put("success", false);
                response.put("error", "Unsupported file type: " + contentType + ". Only images and PDF files are allowed");
                return ResponseEntity.badRequest().body(response);
            }
            
            response.put("success", true);
            response.put("data", ocrResult);
            response.put("message", "File processed successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to process file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}

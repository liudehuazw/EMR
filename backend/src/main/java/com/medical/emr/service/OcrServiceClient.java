package com.medical.emr.service;

import com.medical.emr.dto.OcrResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Scanner;


/**
 * Simplified OCR Service Client using HttpURLConnection
 */
@Service
public class OcrServiceClient {
    
    @Value("${ocr.service.url:http://localhost:8000}")
    private String ocrServiceUrl;
    
    @Value("${ocr.service.timeout:300000}")  // 默认5分钟
    private int ocrTimeout;
    
    /**
     * Process image file with OCR
     * 
     * @param file Image file to process
     * @return OCR response
     */
    public OcrResponse processImage(MultipartFile file) {
        try {
            // Create temporary file
            Path tempFile = Files.createTempFile("ocr_", "_" + file.getOriginalFilename());
            Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
            
            try {
                String boundary = "----OCRFormBoundary" + System.currentTimeMillis();
                URL url = new URL(ocrServiceUrl + "/ocr/image");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                
                // Setup timeouts (5 minutes for large PDFs)
                connection.setConnectTimeout(10000);  // 10秒连接超时
                connection.setReadTimeout(ocrTimeout); // 读取超时从配置读取
                
                // Setup request
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                connection.setDoOutput(true);
                
                // Write multipart data
                try (OutputStream out = connection.getOutputStream()) {
                    writeMultipartData(out, tempFile.toFile(), file.getOriginalFilename(), boundary);
                }
                
                // Read response
                int responseCode = connection.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    String response = readResponse(connection.getInputStream());
                    return parseResponse(response, file.getOriginalFilename());
                } else {
                    throw new RuntimeException("OCR service returned error: " + responseCode);
                }
                
            } finally {
                // Clean up temporary file
                Files.deleteIfExists(tempFile);
            }
            
        } catch (IOException e) {
            throw new RuntimeException("Failed to process image file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Process PDF file with OCR service
     * 
     * @param file PDF file to process
     * @return OCR response
     */
    public OcrResponse processPdf(MultipartFile file) {
        try {
            // Create temporary file
            Path tempFile = Files.createTempFile("ocr_", "_" + file.getOriginalFilename());
            Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
            
            try {
                // Process entire PDF directly
                return processSinglePdf(tempFile.toFile(), file.getOriginalFilename());
            } finally {
                // Clean up temporary file
                Files.deleteIfExists(tempFile);
            }
            
        } catch (IOException e) {
            throw new RuntimeException("Failed to process PDF file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Process a single PDF file with OCR service
     */
    private OcrResponse processSinglePdf(File pdfFile, String filename) {
        try {
            String boundary = "----OCRFormBoundary" + System.currentTimeMillis();
            URL url = new URL(ocrServiceUrl + "/ocr/pdf");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Setup timeouts (5 minutes for large PDFs)
            connection.setConnectTimeout(10000);  // 10秒连接超时
            connection.setReadTimeout(ocrTimeout); // 读取超时从配置读取
            
            // Setup request
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            connection.setDoOutput(true);
            
            // Write multipart data
            try (OutputStream out = connection.getOutputStream()) {
                writeMultipartData(out, pdfFile, filename, boundary);
            }
            
            // Read response
            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String response = readResponse(connection.getInputStream());
                return parseResponse(response, filename);
            } else {
                throw new RuntimeException("OCR service returned error: " + responseCode);
            }
            
        } catch (IOException e) {
            throw new RuntimeException("Failed to process PDF: " + e.getMessage(), e);
        }
    }
    
    /**
     * Check OCR service health
     * 
     * @return Health check response
     */
    public boolean checkHealth() {
        try {
            URL url = new URL(ocrServiceUrl + "/health");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            
            int responseCode = connection.getResponseCode();
            return responseCode == HttpURLConnection.HTTP_OK;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Get OCR service information
     * 
     * @return Service information
     */
    public String getServiceInfo() {
        try {
            URL url = new URL(ocrServiceUrl + "/info");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            
            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                return readResponse(connection.getInputStream());
            } else {
                throw new RuntimeException("Failed to get service info: " + responseCode);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to get service info: " + e.getMessage(), e);
        }
    }
    
    private void writeMultipartData(OutputStream out, File file, String filename, String boundary) throws IOException {
        String lineEnd = "\r\n";
        String twoHyphens = "--";
        
        // Determine content type based on file extension
        String contentType = getContentType(filename);
        
        // Write file field
        out.write((twoHyphens + boundary + lineEnd).getBytes());
        out.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"" + lineEnd).getBytes());
        out.write(("Content-Type: " + contentType + lineEnd).getBytes());
        out.write(lineEnd.getBytes());
        
        // Write file content
        try (FileInputStream fileInputStream = new FileInputStream(file)) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = fileInputStream.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
        
        // End of multipart data
        out.write((lineEnd + twoHyphens + boundary + twoHyphens + lineEnd).getBytes());
    }
    
    private String readResponse(InputStream inputStream) throws IOException {
        try (Scanner scanner = new Scanner(inputStream, "UTF-8")) {
            scanner.useDelimiter("\\A");
            return scanner.hasNext() ? scanner.next() : "";
        }
    }
    
    private OcrResponse parseResponse(String jsonResponse, String filename) {
        // Simple JSON parsing - in production, use proper JSON library
        OcrResponse response = new OcrResponse();
        response.setSuccess(true);
        response.setFilename(filename);
        
        // Extract text from JSON (simplified)
        if (jsonResponse.contains("\"text\":")) {
            int start = jsonResponse.indexOf("\"text\":\"") + 8;
            int end = jsonResponse.indexOf("\"", start);
            if (end > start) {
                String text = jsonResponse.substring(start, end).replace("\\n", "\n");
                response.setText(text);
            }
        }
        
        // Extract processing time
        if (jsonResponse.contains("\"processing_time\":")) {
            int start = jsonResponse.indexOf("\"processing_time\":") + 18;
            int end = jsonResponse.indexOf(",", start);
            if (end == -1) end = jsonResponse.indexOf("}", start);
            if (end > start) {
                try {
                    double time = Double.parseDouble(jsonResponse.substring(start, end));
                    response.setProcessingTime(time);
                } catch (NumberFormatException e) {
                    response.setProcessingTime(0.0);
                }
            }
        }
        
        // Extract line count
        if (jsonResponse.contains("\"line_count\":")) {
            int start = jsonResponse.indexOf("\"line_count\":") + 14;
            int end = jsonResponse.indexOf(",", start);
            if (end == -1) end = jsonResponse.indexOf("}", start);
            if (end > start) {
                try {
                    int count = Integer.parseInt(jsonResponse.substring(start, end));
                    response.setLineCount(count);
                } catch (NumberFormatException e) {
                    response.setLineCount(0);
                }
            }
        }
        
        return response;
    }
    
    /**
     * Get content type based on file extension
     */
    private String getContentType(String filename) {
        if (filename == null) {
            return "application/octet-stream";
        }
        
        String lowerFilename = filename.toLowerCase();
        
        if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (lowerFilename.endsWith(".png")) {
            return "image/png";
        } else if (lowerFilename.endsWith(".bmp")) {
            return "image/bmp";
        } else if (lowerFilename.endsWith(".pdf")) {
            return "application/pdf";
        } else {
            return "application/octet-stream";
        }
    }
}

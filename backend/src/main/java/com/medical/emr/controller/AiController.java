package com.medical.emr.controller;

import com.medical.emr.dto.AiAnalysisRequest;
import com.medical.emr.dto.AiAnalyzeUrlRequest;
import com.medical.emr.dto.ApiResponse;
import com.medical.emr.exception.RateLimitException;
import com.medical.emr.service.AiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * AI analysis controller - provides endpoints for medical report AI analysis
 */
@RestController
@RequestMapping("/ai")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AiController {

    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    @Autowired
    private AiService aiService;

    /**
     * POST /api/ai/analyze
     * Analyze a medical report using AI
     */
    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<String>> analyze(@Valid @RequestBody AiAnalysisRequest request) {
        try {
            log.info("[AI] Analyze request: type={}, dataLength={}", request.getType(), request.getData().length());

            String result;
            if ("lab".equalsIgnoreCase(request.getType())) {
                result = aiService.analyzeLabReport(request.getData());
            } else if ("imaging".equalsIgnoreCase(request.getType())) {
                result = aiService.analyzeImagingReport(request.getData());
            } else {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Unsupported report type: " + request.getType()));
            }

            return ResponseEntity.ok(ApiResponse.success("分析完成", result));

        } catch (RateLimitException e) {
            log.warn("[AI] Rate limit hit: {}", e.getMessage());
            return ResponseEntity.status(429)
                    .body(ApiResponse.error("AI服务繁忙，请求频率过高，请 " + e.getRetryAfterSeconds() + " 秒后再试"));
        } catch (RuntimeException e) {
            log.error("[AI] Analysis failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("AI分析失败: " + e.getMessage()));
        } catch (Exception e) {
            log.error("[AI] Unexpected error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("AI分析服务异常"));
        }
    }

    /**
     * POST /api/ai/analyze/url
     * Analyze a medical report by downloading file from URL
     */
    @PostMapping("/analyze/url")
    public ResponseEntity<ApiResponse<String>> analyzeByUrl(@Valid @RequestBody AiAnalyzeUrlRequest request) {
        try {
            log.info("[AI] Analyze by URL request: type={}, url={}, patient={}",
                    request.getType(), request.getFileUrl(), request.getPatientName());

            String result = aiService.analyzeByUrl(request);
            return ResponseEntity.ok(ApiResponse.success("分析完成", result));

        } catch (RateLimitException e) {
            log.warn("[AI] Rate limit hit for URL analysis: {}", e.getMessage());
            return ResponseEntity.status(429)
                    .body(ApiResponse.error("AI服务繁忙，请求频率过高，请 " + e.getRetryAfterSeconds() + " 秒后再试"));
        } catch (RuntimeException e) {
            log.error("[AI] Analysis by URL failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("AI分析失败: " + e.getMessage()));
        } catch (Exception e) {
            log.error("[AI] Unexpected error in URL analysis: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("AI分析服务异常"));
        }
    }
}

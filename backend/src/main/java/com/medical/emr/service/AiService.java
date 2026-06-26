package com.medical.emr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.AiAnalyzeUrlRequest;
import com.medical.emr.exception.RateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Zhipu AI service - calls GLM model for medical report analysis
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    @Value("${zhipu.ai.api-key}")
    private String apiKey;

    @Value("${zhipu.ai.api-url}")
    private String apiUrl;

    @Value("${zhipu.ai.model}")
    private String model;

    @Value("${zhipu.ai.timeout:60000}")
    private int timeout;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Analyze lab report using AI
     * 分析检验报告
     * <p>
     * 调用智谱AI API对检验报告数据进行专业解读，包括异常指标识别、临床意义分析和后续建议。
     * 系统提示词已预设严格的判断规则，确保仅对明确标注为异常的指标进行解读。
     *
     * @param reportData 结构化检验报告数据，包含检验项目、结果值、单位、状态及参考范围
     * @return AI分析结果文本，包含异常指标解读、临床意义、后续建议及免责声明
     */
    public String analyzeLabReport(String reportData) {
        String systemPrompt = "你是一名经验丰富的临床检验医师，擅长解读各类检验报告。"
                + "请根据以下检验报告数据进行专业分析，包括：\n"
                + "1. 对每项指标，根据报告中给出的参考范围，自行判断是否正常、偏高或偏低\n"
                + "2. 列出所有异常指标并解读其可能的临床意义\n"
                + "3. 建议的后续检查或注意事项\n"
                + "请用通俗易懂的中文回答，便于患者理解。\n"
                + "数据格式为：- 项目名: 结果值 单位 (参考范围: 最小值-最大值)\n"
                + "判断规则：以每行括号内给出的参考范围作为判断依据；若未提供参考范围，可结合临床常识判断。\n"
                + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";

        String userPrompt = "请分析以下检验报告数据，根据参考范围自行判断各指标是否正常：\n\n" + reportData;

        return callZhipuApi(systemPrompt, userPrompt);
    }

    /**
     * Analyze imaging report using AI
     * @param reportText OCR text from imaging report
     * @return AI analysis text
     */
    public String analyzeImagingReport(String reportText) {
        String systemPrompt = "你是一名经验丰富的影像科医师，擅长解读各类影像检查报告（CT、MRI、X光、超声等）。"
                + "请根据以下影像报告OCR识别文本进行专业分析，包括：\n"
                + "1. 报告中的关键发现\n"
                + "2. 异常征象的临床意义\n"
                + "3. 建议的后续检查或随访\n"
                + "请用通俗易懂的中文回答，便于患者理解。"
                + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";

        String userPrompt = "请分析以下影像报告内容：\n\n" + reportText;

        return callZhipuApi(systemPrompt, userPrompt);
    }

    /**
     * Call Zhipu AI chat completions API
     */
    private String callZhipuApi(String systemPrompt, String userPrompt) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    ),
                    "max_tokens", 4096,
                    "temperature", 0.7
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("[AI] Calling Zhipu API, model={}, prompt length={}", model, userPrompt.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofMillis(timeout))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[AI] Zhipu API returned status {}: {}", response.statusCode(), response.body());
                // Check for rate limiting (429) or Zhipu error code 1302
                String responseBody = response.body();
                if (response.statusCode() == 429 || 
                    (responseBody != null && responseBody.contains("1302") && responseBody.contains("速率限制"))) {
                    throw new RateLimitException("AI服务请求频率过高，请稍后再试", 60);
                }
                throw new RuntimeException("AI服务返回错误: HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");

            if (content.isEmpty()) {
                log.warn("[AI] Empty response from Zhipu API: {}", response.body());
                throw new RuntimeException("AI服务返回空结果");
            }

            log.info("[AI] Analysis completed, result length={}", content.length());
            return content;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AI] Failed to call Zhipu API: {}", e.getMessage(), e);
            throw new RuntimeException("AI分析服务调用失败: " + e.getMessage());
        }
    }

    /**
     * Analyze medical report by downloading file from URL
     * @param request URL analysis request containing fileUrl and metadata
     * @return AI analysis text
     */
    public String analyzeByUrl(AiAnalyzeUrlRequest request) {
        String fileUrl = request.getFileUrl();
        String type = request.getType();

        log.info("[AI] Downloading file from URL: {}", fileUrl);

        try {
            // Download file from URL
            HttpRequest downloadRequest = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();

            HttpResponse<byte[]> downloadResponse = httpClient.send(downloadRequest, HttpResponse.BodyHandlers.ofByteArray());

            if (downloadResponse.statusCode() != 200) {
                throw new RuntimeException("下载文件失败: HTTP " + downloadResponse.statusCode());
            }

            byte[] fileBytes = downloadResponse.body();
            log.info("[AI] File downloaded, size={} bytes", fileBytes.length);

            // Convert to base64
            String base64Content = Base64.getEncoder().encodeToString(fileBytes);

            // Build prompt based on report type
            String systemPrompt;
            String userPromptPrefix;

            if ("lab_image".equalsIgnoreCase(type)) {
                systemPrompt = "你是一名经验丰富的临床检验医师，擅长解读各类检验报告。"
                        + "请根据用户上传的检验报告图片进行专业分析，包括：\n"
                        + "1. 报告中各项指标的含义和正常范围\n"
                        + "2. 异常指标的识别和可能原因\n"
                        + "3. 对患者的健康建议\n"
                        + "请用通俗易懂的中文回答，便于患者理解。"
                        + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
                userPromptPrefix = "请分析以下检验报告：\n"
                        + "患者: " + (request.getPatientName() != null ? request.getPatientName() : "未知") + "\n"
                        + "检验项目: " + (request.getTitle() != null ? request.getTitle() : "未知") + "\n"
                        + "报告日期: " + (request.getReportDate() != null ? request.getReportDate() : "未知") + "\n\n";
            } else {
                systemPrompt = "你是一名经验丰富的影像科医师，擅长解读各类影像检查报告（CT、MRI、X光、超声等）。"
                        + "请根据用户上传的影像报告图片进行专业分析，包括：\n"
                        + "1. 报告中的影像描述和所见\n"
                        + "2. 诊断意见的专业解读\n"
                        + "3. 建议的后续检查或随访\n"
                        + "请用通俗易懂的中文回答，便于患者理解。"
                        + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
                userPromptPrefix = "请分析以下影像报告：\n"
                        + "患者: " + (request.getPatientName() != null ? request.getPatientName() : "未知") + "\n"
                        + "报告标题: " + (request.getTitle() != null ? request.getTitle() : "未知") + "\n"
                        + "报告日期: " + (request.getReportDate() != null ? request.getReportDate() : "未知") + "\n\n";
            }

            return callZhipuVisionApi(systemPrompt, userPromptPrefix, base64Content);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AI] Failed to download or analyze file: {}", e.getMessage(), e);
            throw new RuntimeException("文件下载或分析失败: " + e.getMessage());
        }
    }

    /**
     * Call Zhipu AI vision API with image content
     */
    private String callZhipuVisionApi(String systemPrompt, String userPromptPrefix, String base64Image) {
        try {
            // Build multimodal request with text + image
            Map<String, Object> textContent = Map.of("type", "text", "text", userPromptPrefix + "请分析这张报告图片。");
            Map<String, Object> imageContent = Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image)
            );

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", List.of(textContent, imageContent))
                    ),
                    "max_tokens", 4096,
                    "temperature", 0.7
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("[AI] Calling Zhipu Vision API, model={}, image size={} bytes base64",
                    model, base64Image.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofMillis(timeout))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("[AI] Zhipu Vision API returned status {}: {}", response.statusCode(), response.body());
                // Check for rate limiting (429) or Zhipu error code 1302
                String responseBody = response.body();
                if (response.statusCode() == 429 || 
                    (responseBody != null && responseBody.contains("1302") && responseBody.contains("速率限制"))) {
                    throw new RateLimitException("AI服务请求频率过高，请稍后再试", 60);
                }
                throw new RuntimeException("AI视觉服务返回错误: HTTP " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");

            if (content.isEmpty()) {
                log.warn("[AI] Empty response from Zhipu Vision API: {}", response.body());
                throw new RuntimeException("AI视觉服务返回空结果");
            }

            log.info("[AI] Vision analysis completed, result length={}", content.length());
            return content;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AI] Failed to call Zhipu Vision API: {}", e.getMessage(), e);
            throw new RuntimeException("AI视觉分析服务调用失败: " + e.getMessage());
        }
    }
}

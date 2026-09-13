package com.medical.emr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.LlmConfigDto;
import com.medical.emr.exception.RateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public LlmClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String chatCompletion(LlmConfigDto config, String systemPrompt, String userPrompt) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "model", config.getModelId(),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    ),
                    "max_tokens", 4096,
                    "temperature", 0.7
            );
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = buildRequest(config, jsonBody);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw buildApiException(response.statusCode(), response.body());
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            if (content.isEmpty()) {
                throw new RuntimeException("AI服务返回空结果");
            }
            return content;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI分析服务调用失败: " + e.getMessage(), e);
        }
    }

    public String visionCompletion(LlmConfigDto config, String systemPrompt, String userPromptPrefix, String base64Image) {
        try {
            Map<String, Object> textContent = Map.of("type", "text", "text", userPromptPrefix + "请分析这张报告图片。");
            Map<String, Object> imageContent = Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image)
            );
            Map<String, Object> requestBody = Map.of(
                    "model", config.getModelId(),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", List.of(textContent, imageContent))
                    ),
                    "max_tokens", 4096,
                    "temperature", 0.7
            );
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = buildRequest(config, jsonBody);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw buildApiException(response.statusCode(), response.body());
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            if (content.isEmpty()) {
                throw new RuntimeException("AI视觉服务返回空结果");
            }
            return content;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI视觉分析服务调用失败: " + e.getMessage(), e);
        }
    }

    public void chatCompletionStream(LlmConfigDto config, Map<String, Object> body, Consumer<String> onDelta) throws Exception {
        body.put("model", config.getModelId());
        body.put("stream", true);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = buildRequest(config, jsonBody);
        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw buildApiException(response.statusCode(), errBody);
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) continue;
                String data = line.substring(5).trim();
                if (data.isEmpty() || "[DONE]".equals(data)) continue;
                JsonNode node = objectMapper.readTree(data);
                JsonNode delta = node.path("choices").path(0).path("delta");
                if (delta.hasNonNull("content")) {
                    String c = delta.path("content").asText();
                    if (!c.isEmpty()) {
                        onDelta.accept(c);
                    }
                }
            }
        }
    }

    public HttpResponse<InputStream> rawStreamRequest(LlmConfigDto config, Map<String, Object> body) throws Exception {
        body.put("model", config.getModelId());
        body.put("stream", true);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = buildRequest(config, jsonBody);
        return httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
    }

    private HttpRequest buildRequest(LlmConfigDto config, String jsonBody) {
        String apiKey = config.getApiKey() == null || config.getApiKey().isBlank() ? "ollama" : config.getApiKey();
        return HttpRequest.newBuilder()
                .uri(URI.create(config.getApiUrl()))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofMillis(config.getTimeout() > 0 ? config.getTimeout() : 300000))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
    }

    public RuntimeException buildApiException(int status, String body) {
        log.error("[AI] LLM returned status {}: {}", status, body);
        if (status == 429 || (body != null && body.contains("1302") && body.contains("速率限制"))) {
            return new RateLimitException("AI服务请求频率过高，请稍后再试", 60);
        }
        String detail = body == null ? "" : body.trim();
        if (detail.length() > 300) detail = detail.substring(0, 300);
        return new RuntimeException("AI服务返回错误: HTTP " + status
                + (detail.isEmpty() ? "" : " —— " + detail));
    }
}

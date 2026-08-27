package com.medical.emr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.AiToolSource;
import com.medical.emr.dto.ChatMessage;
import com.medical.emr.dto.ChatRequest;
import com.medical.emr.exception.RateLimitException;
import com.medical.emr.service.AiToolExecutor.ExecResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * AI assistant chat orchestration.
 * <p>
 * Uses DeepSeek function calling: the model picks a tool, we execute it against
 * the database (read-only, via {@link AiToolExecutor}), feed the result back,
 * and stream the final answer to the client over SSE.
 */
@Service
public class AiAssistantService {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);

    private static final int MAX_ROUNDS = 5;

    @Value("${DEEPSEEK_API_KEY:}")
    private String apiKey;

    @Value("${zhipu.ai.api-url}")
    private String apiUrl;

    @Value("${zhipu.ai.model}")
    private String model;

    @Value("${zhipu.ai.timeout:300000}")
    private int timeout;

    private final AiToolExecutor toolExecutor;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public AiAssistantService(AiToolExecutor toolExecutor) {
        this.toolExecutor = toolExecutor;
    }

    /**
     * Handle one user message: tool-calling loop, then stream the final answer.
     */
    public void chat(ChatRequest req, ChatEventSink sink) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(systemMessage(buildSystemPrompt(req)));
        if (req.getHistory() != null) {
            for (ChatMessage m : req.getHistory()) {
                if (m.getRole() == null || m.getContent() == null) continue;
                Map<String, Object> mm = new LinkedHashMap<>();
                mm.put("role", m.getRole());
                mm.put("content", m.getContent());
                messages.add(mm);
            }
        }
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("role", "user");
        user.put("content", req.getMessage());
        messages.add(user);

        List<AiToolSource> sources = new ArrayList<>();
        try {
            for (int round = 0; round < MAX_ROUNDS; round++) {
                ChatTurn turn = callDeepSeekStream(messages, sink::delta);

                if (turn.toolCalls.isEmpty()) {
                    sink.sources(sources);
                    sink.done();
                    return;
                }

                // execute all tools requested in this turn
                for (ToolCall tc : turn.toolCalls) {
                    sink.toolStart(tc.name);
                }
                messages.add(assistantToolMessage(turn.toolCalls));
                for (ToolCall tc : turn.toolCalls) {
                    try {
                        Map<String, Object> argMap = parseArguments(tc.arguments);
                        ExecResult res = toolExecutor.execute(tc.name, argMap, req.getContextPatientId());
                        if (res.sources != null) sources.addAll(res.sources);
                        String toolContent = res.ok
                                ? objectMapper.writeValueAsString(res.data)
                                : objectMapper.writeValueAsString(Map.of("error", res.error));
                        messages.add(toolResultMessage(tc.id, toolContent));
                    } catch (Exception e) {
                        log.error("[AI] Tool {} error", tc.name, e);
                        messages.add(toolResultMessage(tc.id,
                                objectMapper.writeValueAsString(Map.of("error", "工具执行异常: " + e.getMessage()))));
                    }
                    sink.toolDone(tc.name);
                }
            }
            sink.error("处理轮次过多，请换个更具体的问法");
        } catch (RateLimitException e) {
            log.warn("[AI] Rate limit hit: {}", e.getMessage());
            sink.error("AI服务繁忙，请求频率过高，请 " + e.getRetryAfterSeconds() + " 秒后再试");
        } catch (Exception e) {
            log.error("[AI] Chat failed", e);
            sink.error("AI助手出错了：" + e.getMessage());
        }
    }

    // ==================== DeepSeek streaming call ====================

    private ChatTurn callDeepSeekStream(List<Map<String, Object>> messages, java.util.function.Consumer<String> onDelta)
            throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", true);
        body.put("temperature", 0.2);
        body.put("max_tokens", 4096);
        body.put("tools", objectMapper.readTree(toolExecutor.toolsJson()));

        String jsonBody = objectMapper.writeValueAsString(body);
        log.info("[AI] Chat round, messages={}, model={}", messages.size(), model);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofMillis(timeout))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() != 200) {
            String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw buildApiException(response.statusCode(), errBody);
        }

        StringBuilder content = new StringBuilder();
        Map<Integer, MutableToolCall> toolCalls = new TreeMap<>();
        String finishReason = null;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) continue;
                String data = line.substring(5).trim();
                if (data.isEmpty()) continue;
                if ("[DONE]".equals(data)) break;

                JsonNode node = objectMapper.readTree(data);
                JsonNode choices = node.path("choices");
                if (!choices.isArray() || choices.isEmpty()) continue;

                JsonNode ch = choices.get(0);
                if (ch.hasNonNull("finish_reason")) {
                    finishReason = ch.path("finish_reason").asText();
                }
                JsonNode delta = ch.path("delta");
                if (delta.hasNonNull("content")) {
                    String c = delta.path("content").asText();
                    if (!c.isEmpty()) {
                        content.append(c);
                        onDelta.accept(c);
                    }
                }
                JsonNode tcs = delta.path("tool_calls");
                if (tcs.isArray()) {
                    for (JsonNode tc : tcs) {
                        int idx = tc.path("index").asInt();
                        MutableToolCall m = toolCalls.computeIfAbsent(idx, k -> new MutableToolCall());
                        if (tc.hasNonNull("id")) m.id = tc.path("id").asText();
                        JsonNode fn = tc.path("function");
                        if (fn.hasNonNull("name")) m.name = fn.path("name").asText();
                        if (fn.hasNonNull("arguments")) m.arguments.append(fn.path("arguments").asText());
                    }
                }
            }
        }

        if (finishReason != null && finishReason.contains("tool_calls") && !toolCalls.isEmpty()) {
            List<ToolCall> calls = new ArrayList<>();
            for (MutableToolCall m : toolCalls.values()) {
                calls.add(new ToolCall(m.id, m.name, m.arguments.toString()));
            }
            return new ChatTurn(content.toString(), calls);
        }
        return new ChatTurn(content.toString(), List.of());
    }

    private RuntimeException buildApiException(int status, String body) {
        log.error("[AI] DeepSeek returned status {}: {}", status, body);
        if (status == 429 || (body != null && body.contains("1302") && body.contains("速率限制"))) {
            return new RateLimitException("AI服务请求频率过高，请稍后再试", 60);
        }
        // 透传 DeepSeek 原始错误信息，便于定位（个人工具，可接受）
        String detail = body == null ? "" : body.trim();
        if (detail.length() > 300) detail = detail.substring(0, 300);
        return new RuntimeException("AI服务返回错误: HTTP " + status
                + (detail.isEmpty() ? "" : " —— " + detail));
    }

    // ==================== message builders ====================

    private Map<String, Object> systemMessage(String content) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", "system");
        m.put("content", content);
        return m;
    }

    private Map<String, Object> assistantToolMessage(List<ToolCall> calls) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", "assistant");
        m.put("content", null);
        List<Map<String, Object>> tcs = new ArrayList<>();
        for (ToolCall tc : calls) {
            Map<String, Object> fn = new LinkedHashMap<>();
            fn.put("name", tc.name);
            fn.put("arguments", tc.arguments);
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("id", tc.id);
            t.put("type", "function");
            t.put("function", fn);
            tcs.add(t);
        }
        m.put("tool_calls", tcs);
        return m;
    }

    private Map<String, Object> toolResultMessage(String toolCallId, String content) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("role", "tool");
        m.put("tool_call_id", toolCallId);
        m.put("content", content);
        return m;
    }

    private Map<String, Object> parseArguments(String arguments) {
        try {
            if (arguments == null || arguments.isBlank()) return Map.of();
            JsonNode node = objectMapper.readTree(arguments);
            return node.isObject() ? objectMapper.convertValue(node, Map.class) : Map.of();
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String buildSystemPrompt(ChatRequest req) {
        String scope = req.getContextPatientId() != null
                ? "当前会话已锁定一位患者（患者 id = " + req.getContextPatientId() + "）。"
                        + "所有患者相关的查询只能针对这位患者，不要搜索或返回其他患者的数据。"
                : "当前在患者列表页，允许查询所有患者的数据。当用户用名字提到某位患者时，"
                        + "先调用 search_patients 找到其 id，再用其它工具查询。";
        return "你是“电子病历数据助手”，帮助用户查询和分析其电子病历系统中的数据。"
                + "可查询的数据：患者档案、病历/就诊记录、检验报告（含指标历史趋势、异常指标）、影像报告、发票花费。\n"
                + "规则：\n"
                + "1. 必须基于工具返回的真实数据作答，不得编造任何数字或信息；查询不到时明确说“未查询到相关数据”。\n"
                + "2. 回答用中文，简洁、条理清晰；金额单位用“元”并保留两位小数；日期用 YYYY-MM-DD。\n"
                + "3. 涉及费用时说明口径（总金额/自付/医保/商保）。\n"
                + "4. 涉及医疗内容仅作信息整理与参考，不构成医疗诊断建议。\n"
                + "5. 一次提问尽量用最少的工具调用完成。\n"
                + scope;
    }

    // ==================== nested types ====================

    /** SSE event sink implemented by the controller. */
    public interface ChatEventSink {
        void delta(String content);

        void toolStart(String toolName);

        void toolDone(String toolName);

        void sources(List<AiToolSource> sources);

        void done();

        void error(String message);
    }

    private static class ChatTurn {
        final String content;
        final List<ToolCall> toolCalls;

        ChatTurn(String content, List<ToolCall> toolCalls) {
            this.content = content;
            this.toolCalls = toolCalls;
        }
    }

    private static class ToolCall {
        final String id;
        final String name;
        final String arguments;

        ToolCall(String id, String name, String arguments) {
            this.id = (id == null || id.isBlank()) ? "call_" + System.nanoTime() : id;
            this.name = name;
            this.arguments = arguments;
        }
    }

    private static class MutableToolCall {
        String id;
        String name;
        final StringBuilder arguments = new StringBuilder();
    }
}

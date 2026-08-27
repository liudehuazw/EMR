package com.medical.emr.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.AiToolSource;
import com.medical.emr.dto.ChatRequest;
import com.medical.emr.service.AiAssistantService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AI assistant chat endpoint - streaming (SSE) Q&A over the patient's own data.
 * Protected by Spring Security (JWT), like all other /ai/** endpoints.
 */
@RestController
@RequestMapping("/ai")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AiAssistantController {

    private static final Logger log = LoggerFactory.getLogger(AiAssistantController.class);

    private final AiAssistantService aiAssistantService;
    private final ObjectMapper objectMapper;

    public AiAssistantController(AiAssistantService aiAssistantService, ObjectMapper objectMapper) {
        this.aiAssistantService = aiAssistantService;
        this.objectMapper = objectMapper;
    }

    /**
     * POST /api/ai/chat — SSE streaming chat.
     * Events: delta / tool / sources / done / error
     */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void chat(@Valid @RequestBody ChatRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("text/event-stream;charset=UTF-8");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no"); // disable nginx proxy buffering for SSE

        PrintWriter writer = response.getWriter();
        log.info("[AI] Chat start, contextPatientId={}, msgLen={}",
                request.getContextPatientId(), request.getMessage().length());

        AiAssistantService.ChatEventSink sink = new AiAssistantService.ChatEventSink() {
            @Override
            public void delta(String content) {
                write(Map.of("type", "delta", "content", content));
            }

            @Override
            public void toolStart(String toolName) {
                write(Map.of("type", "tool", "name", toolName, "status", "start"));
            }

            @Override
            public void toolDone(String toolName) {
                write(Map.of("type", "tool", "name", toolName, "status", "done"));
            }

            @Override
            public void sources(List<AiToolSource> sources) {
                write(Map.of("type", "sources", "sources", sources));
            }

            @Override
            public void done() {
                write(Map.of("type", "done"));
            }

            @Override
            public void error(String message) {
                write(Map.of("type", "error", "message", message));
            }

            private void write(Map<String, Object> payload) {
                try {
                    writer.write("data: " + objectMapper.writeValueAsString(payload) + "\n\n");
                    writer.flush();
                } catch (IOException e) {
                    // client disconnected — stop writing, swallow
                    log.debug("[AI] SSE write failed (client disconnected): {}", e.getMessage());
                }
            }
        };

        try {
            aiAssistantService.chat(request, sink);
        } finally {
            writer.flush();
        }
    }
}

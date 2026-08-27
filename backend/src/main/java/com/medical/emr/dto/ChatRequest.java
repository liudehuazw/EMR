package com.medical.emr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * AI assistant chat request
 */
@Data
public class ChatRequest {

    /** user's current message */
    @NotBlank(message = "消息不能为空")
    private String message;

    /** conversation history (user/assistant turns, oldest first) */
    private List<ChatMessage> history;

    /**
     * Scope: current selected patient id, or null to query all patients.
     * When set, the assistant MUST only query this patient's data.
     */
    private Long contextPatientId;
}

package com.medical.emr.dto;

import lombok.Data;

/**
 * Chat message for AI assistant (OpenAI-compatible roles)
 */
@Data
public class ChatMessage {

    /** role: system | user | assistant */
    private String role;

    /** message text content */
    private String content;
}

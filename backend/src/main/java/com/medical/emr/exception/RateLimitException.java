package com.medical.emr.exception;

/**
 * Custom exception for AI rate limiting (HTTP 429)
 * Thrown when the AI service returns rate limit error (e.g., Zhipu code 1302)
 */
public class RateLimitException extends RuntimeException {

    private final int retryAfterSeconds;

    public RateLimitException(String message) {
        super(message);
        this.retryAfterSeconds = 60; // Default 60 seconds
    }

    public RateLimitException(String message, int retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

package com.medical.emr.dto;

import lombok.Data;

@Data
public class LlmConfigDto {
    private String providerType;
    private String preset;
    private String apiUrl;
    private String apiKey;
    private String modelId;
    private int timeout;
}

package com.medical.emr.dto;

import lombok.Data;

@Data
public class UserAiConfigRequest {
    private String providerType;
    private String preset;
    private String apiUrl;
    private String apiKey;
    private String modelId;
}

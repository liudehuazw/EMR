package com.medical.emr.dto;

import lombok.Data;

@Data
public class UserAiConfigResponse {
    private String providerType;
    private String preset;
    private String apiUrl;
    private String apiKeyMasked;
    private String modelId;
    private boolean usingDefault;
}

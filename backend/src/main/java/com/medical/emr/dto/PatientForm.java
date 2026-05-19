package com.medical.emr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Patient form DTO for create/update requests
 */
@Data
public class PatientForm {

    @NotBlank(message = "Patient name is required")
    private String name;

    @NotNull(message = "Gender is required")
    private Integer gender;

    private String birthDate;

    private String phone;

    private String idCard;

    private String address;

    private String emergencyContact;

    private String emergencyPhone;

    private String allergyHistory;

    private String medicalHistory;

    private String avatarUrl;
}

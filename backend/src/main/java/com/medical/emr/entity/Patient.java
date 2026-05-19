package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Patient entity - maps to 'patient' table
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("patient")
public class Patient {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("patient_no")
    private String patientNo;

    @TableField("name")
    private String name;

    @TableField("gender")
    private Integer gender;

    @TableField("birth_date")
    private LocalDate birthDate;

    @TableField("phone")
    private String phone;

    @TableField("id_card")
    private String idCard;

    @TableField("address")
    private String address;

    @TableField("emergency_contact")
    private String emergencyContact;

    @TableField("emergency_phone")
    private String emergencyPhone;

    @TableField("allergy_history")
    private String allergyHistory;

    @TableField("medical_history")
    private String medicalHistory;

    @TableField("avatar_url")
    private String avatarUrl;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Medical Record entity - maps to 'emr_medical_record' table
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("emr_medical_record")
public class MedicalRecord {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("patient_id")
    private Long patientId;

    @TableField("visit_date")
    private LocalDate visitDate;

    @TableField("hospital")
    private String hospital;

    @TableField("department")
    private String department;

    @TableField("doctor")
    private String doctor;

    @TableField("diagnosis")
    private String diagnosis;

    @TableField("symptoms")
    private String symptoms;

    @TableField("treatment")
    private String treatment;

    @TableField("notes")
    private String notes;

    @TableField("files")
    private String files; // JSON string

    @TableLogic
    @TableField("deleted")
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

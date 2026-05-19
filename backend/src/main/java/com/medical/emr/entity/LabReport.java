package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lab Report entity - maps to 'emr_lab_report' table
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("emr_lab_report")
public class LabReport {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("patient_id")
    private Long patientId;

    @TableField("report_date")
    private LocalDate reportDate;

    @TableField("test_name")
    private String testName;

    @TableField("hospital")
    private String hospital;

    @TableField("file_url")
    private String fileUrl;

    @TableField("file_name")
    private String fileName;

    @TableField("file_type")
    private String fileType;

    @TableField("ocr_raw_text")
    private String ocrRawText;

    @TableField("table_data")
    private String tableData;

    @TableField("ocr_confidence")
    private Integer ocrConfidence;

    @TableField("ai_analysis")
    private String aiAnalysis;

    @TableField("upload_time")
    private LocalDateTime uploadTime;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

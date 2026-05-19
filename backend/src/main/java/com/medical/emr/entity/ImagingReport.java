package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Imaging Report entity - maps to 'emr_imaging_report' table
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("emr_imaging_report")
public class ImagingReport {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("patient_id")
    private Long patientId;

    @TableField("report_date")
    private LocalDate reportDate;

    @TableField("title")
    private String title;

    @TableField("hospital")
    private String hospital;

    @TableField("imaging_type")
    private String imagingType; // CT/MRI/X光/B超等

    @TableField("file_url")
    private String fileUrl;

    @TableField("file_name")
    private String fileName;

    @TableField("file_type")
    private String fileType;

    @TableField("ocr_raw_text")
    private String ocrRawText;

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

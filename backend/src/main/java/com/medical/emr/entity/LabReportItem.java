package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * Lab Report Item entity - maps to 'emr_lab_report_item' table
 * Stores parsed table data from lab reports
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("emr_lab_report_item")
public class LabReportItem {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("report_id")
    private Long reportId;

    @TableField("item_code")
    private String itemCode;

    @TableField("item_name")
    private String itemName;

    @TableField("item_name_original")
    private String itemNameOriginal;

    @TableField("result_value")
    private String resultValue;

    @TableField("result_flag")
    private String resultFlag; // ↑↓ or normal/abnormal

    @TableField("reference_range")
    private String referenceRange;

    @TableField("unit")
    private String unit;

    @TableLogic
    @TableField("deleted")
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}

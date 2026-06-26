package com.medical.emr.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Invoice entity - maps to 'emr_invoice' table
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("emr_invoice")
public class Invoice {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("patient_id")
    private Long patientId;

    @TableField("invoice_date")
    private LocalDate invoiceDate;

    @TableField("title")
    private String title;

    @TableField("hospital")
    private String hospital;

    @TableField("invoice_no")
    private String invoiceNo;

    @TableField("total_amount")
    private BigDecimal totalAmount;

    @TableField("self_pay_amount")
    private BigDecimal selfPayAmount;

    @TableField("insurance_amount")
    private BigDecimal insuranceAmount;

    @TableField("file_url")
    private String fileUrl;

    @TableField("file_name")
    private String fileName;

    @TableField("file_type")
    private String fileType;

    @TableField("ocr_raw_text")
    private String ocrRawText;

    @TableField("items")
    private String items; // JSON string

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

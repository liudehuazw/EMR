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

    /** 其他支付（含大病保险等），医保票据支付构成之一 */
    @TableField("other_payment")
    private BigDecimal otherPayment;

    /** 个人账户支付 */
    @TableField("account_payment")
    private BigDecimal accountPayment;

    /** 大病保险支付（样本中与 otherPayment 恒等，属明细拆分，仅作展示） */
    @TableField("critical_illness_amount")
    private BigDecimal criticalIllnessAmount;

    /** 个人自付 */
    @TableField("personal_self_pay")
    private BigDecimal personalSelfPay;

    /** 个人自费 */
    @TableField("personal_self_expense")
    private BigDecimal personalSelfExpense;

    /** 其他保险支付（「其他支付」的分项） */
    @TableField("other_insurance_amount")
    private BigDecimal otherInsuranceAmount;

    /** 医疗救助支付（「其他支付」的分项） */
    @TableField("medical_assistance_amount")
    private BigDecimal medicalAssistanceAmount;

    /** Whether reimbursed by commercial insurance (0/1) */
    @TableField("commercial_reimbursed")
    private Integer commercialReimbursed;

    /** Commercial insurance reimbursement amount */
    @TableField("commercial_amount")
    private BigDecimal commercialAmount;

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

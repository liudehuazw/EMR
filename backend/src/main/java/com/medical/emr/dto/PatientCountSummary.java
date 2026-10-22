package com.medical.emr.dto;

import lombok.Data;

/**
 * 患者维度各模块记录数汇总（用于患者列表页一次性展示统计，替代按患者逐个请求）。
 */
@Data
public class PatientCountSummary {
    private Long patientId;
    private long records;
    private long lab;
    private long imaging;
    private long invoice;

    public PatientCountSummary() {
    }

    public PatientCountSummary(Long patientId) {
        this.patientId = patientId;
    }
}

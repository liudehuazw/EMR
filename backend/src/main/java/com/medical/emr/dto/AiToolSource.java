package com.medical.emr.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A clickable source link attached to an AI answer.
 * Frontend maps module -> route (invoice/lab/records/imaging/patient).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiToolSource {

    /** module key: invoice | lab | records | imaging | patient */
    private String module;

    private Long patientId;

    private String patientName;

    /** human-readable link label, e.g. "查看发票统计" */
    private String label;
}

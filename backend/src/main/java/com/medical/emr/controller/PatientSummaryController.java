package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.dto.PatientCountSummary;
import com.medical.emr.service.ImagingReportService;
import com.medical.emr.service.InvoiceService;
import com.medical.emr.service.LabReportService;
import com.medical.emr.service.MedicalRecordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 患者维度统计接口。
 * <p>
 * 患者列表页原本需要 4 × 患者数 次请求才能拿到各模块数量（N+1），
 * 这里合并为一次请求、四条 GROUP BY 查询返回。
 */
@RestController
@RequestMapping("/patient-summary")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PatientSummaryController {

    private final MedicalRecordService medicalRecordService;
    private final LabReportService labReportService;
    private final ImagingReportService imagingReportService;
    private final InvoiceService invoiceService;

    public PatientSummaryController(MedicalRecordService medicalRecordService,
                                    LabReportService labReportService,
                                    ImagingReportService imagingReportService,
                                    InvoiceService invoiceService) {
        this.medicalRecordService = medicalRecordService;
        this.labReportService = labReportService;
        this.imagingReportService = imagingReportService;
        this.invoiceService = invoiceService;
    }

    /**
     * GET /api/patient-summary/counts?patientIds=1,2,3
     * 一次返回多个患者的 病历/检验/影像/发票 数量。
     */
    @GetMapping("/counts")
    public ResponseEntity<ApiResponse<List<PatientCountSummary>>> counts(
            @RequestParam("patientIds") List<Long> patientIds) {
        try {
            if (patientIds == null || patientIds.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success("获取成功", List.of()));
            }

            Map<Long, Long> records = toCountMap(medicalRecordService.countByPatientIds(patientIds));
            Map<Long, Long> lab = toCountMap(labReportService.countByPatientIds(patientIds));
            Map<Long, Long> imaging = toCountMap(imagingReportService.countByPatientIds(patientIds));
            Map<Long, Long> invoice = toCountMap(invoiceService.countByPatientIds(patientIds));

            List<PatientCountSummary> result = new ArrayList<>(patientIds.size());
            for (Long id : patientIds) {
                PatientCountSummary s = new PatientCountSummary(id);
                s.setRecords(records.getOrDefault(id, 0L));
                s.setLab(lab.getOrDefault(id, 0L));
                s.setImaging(imaging.getOrDefault(id, 0L));
                s.setInvoice(invoice.getOrDefault(id, 0L));
                result.add(s);
            }
            return ResponseEntity.ok(ApiResponse.success("获取成功", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }

    /** 将 [{patientId, cnt}] 转为 Map，兼容不同驱动返回的键名大小写 */
    private Map<Long, Long> toCountMap(List<Map<String, Object>> rows) {
        Map<Long, Long> map = new LinkedHashMap<>();
        if (rows == null) {
            return map;
        }
        for (Map<String, Object> row : rows) {
            Object pid = firstNonNull(row, "patientId", "patientid", "PATIENTID");
            Object cnt = firstNonNull(row, "cnt", "CNT");
            if (pid == null) {
                continue;
            }
            Long id = pid instanceof Number n ? n.longValue() : Long.valueOf(pid.toString());
            Long c = cnt instanceof Number n ? n.longValue() : (cnt == null ? 0L : Long.valueOf(cnt.toString()));
            map.put(id, c);
        }
        return map;
    }

    private Object firstNonNull(Map<String, Object> row, String... keys) {
        for (String k : keys) {
            Object v = row.get(k);
            if (v != null) {
                return v;
            }
        }
        return null;
    }
}

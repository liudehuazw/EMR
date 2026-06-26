package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.entity.LabReport;
import com.medical.emr.entity.LabReportItem;
import com.medical.emr.service.LabReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lab Report REST controller - handles CRUD for lab reports
 */
@RestController
@RequestMapping("/lab-reports")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LabReportController {

    @Autowired
    private LabReportService labReportService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<LabReport>>> getReportsByPatient(@PathVariable Long patientId) {
        try {
            List<LabReport> reports = labReportService.getReportsByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", reports));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取检验报告失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabReport>> getReport(@PathVariable Long id) {
        try {
            LabReport report = labReportService.getById(id);
            if (report == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(ApiResponse.success("获取成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取检验报告失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<ApiResponse<List<LabReportItem>>> getReportItems(@PathVariable Long id) {
        try {
            List<LabReportItem> items = labReportService.getReportItems(id);
            return ResponseEntity.ok(ApiResponse.success("获取成功", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取检验项目失败: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<ApiResponse<LabReportItem>> addReportItem(@PathVariable Long id, @RequestBody LabReportItem item) {
        try {
            item.setReportId(id);
            labReportService.saveReportItem(item);
            return ResponseEntity.ok(ApiResponse.success("检验项目添加成功", item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("添加检验项目失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/items")
    public ResponseEntity<ApiResponse<Void>> deleteReportItems(@PathVariable Long id) {
        try {
            labReportService.deleteReportItems(id);
            return ResponseEntity.ok(ApiResponse.success("检验项目已清除"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("删除检验项目失败: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LabReport>> createReport(@RequestBody LabReport report) {
        try {
            labReportService.save(report);
            return ResponseEntity.ok(ApiResponse.success("检验报告创建成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("创建检验报告失败: " + e.getMessage()));
        }
    }

    @PostMapping("/with-items")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createReportWithItems(
            @RequestBody Map<String, Object> request) {
        try {
            LabReport report = (LabReport) request.get("report");
            @SuppressWarnings("unchecked")
            List<LabReportItem> items = (List<LabReportItem>) request.get("items");
            labReportService.saveReportWithItems(report, items);
            
            Map<String, Object> result = new HashMap<>();
            result.put("report", report);
            result.put("itemCount", items != null ? items.size() : 0);
            return ResponseEntity.ok(ApiResponse.success("检验报告创建成功", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("创建检验报告失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LabReport>> updateReport(@PathVariable Long id, @RequestBody LabReport report) {
        try {
            report.setId(id);
            labReportService.updateById(report);
            return ResponseEntity.ok(ApiResponse.success("检验报告更新成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新检验报告失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReport(@PathVariable Long id) {
        try {
            labReportService.deleteReport(id);
            return ResponseEntity.ok(ApiResponse.success("检验报告删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("删除检验报告失败: " + e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}/count")
    public ResponseEntity<ApiResponse<Long>> countByPatient(@PathVariable Long patientId) {
        try {
            Long count = labReportService.countByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }
}

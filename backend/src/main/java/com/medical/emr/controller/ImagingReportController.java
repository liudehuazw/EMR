package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.entity.ImagingReport;
import com.medical.emr.service.ImagingReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Imaging Report REST controller - handles CRUD for imaging reports
 */
@RestController
@RequestMapping("/imaging-reports")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ImagingReportController {

    @Autowired
    private ImagingReportService imagingReportService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<ImagingReport>>> getReportsByPatient(@PathVariable Long patientId) {
        try {
            List<ImagingReport> reports = imagingReportService.getReportsByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", reports));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取影像报告失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ImagingReport>> getReport(@PathVariable Long id) {
        try {
            ImagingReport report = imagingReportService.getById(id);
            if (report == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(ApiResponse.success("获取成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取影像报告失败: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ImagingReport>> createReport(@RequestBody ImagingReport report) {
        try {
            imagingReportService.save(report);
            return ResponseEntity.ok(ApiResponse.success("影像报告创建成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("创建影像报告失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ImagingReport>> updateReport(@PathVariable Long id, @RequestBody ImagingReport report) {
        try {
            report.setId(id);
            imagingReportService.updateById(report);
            return ResponseEntity.ok(ApiResponse.success("影像报告更新成功", report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新影像报告失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReport(@PathVariable Long id) {
        try {
            imagingReportService.removeById(id);
            return ResponseEntity.ok(ApiResponse.success("影像报告删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("删除影像报告失败: " + e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}/count")
    public ResponseEntity<ApiResponse<Long>> countByPatient(@PathVariable Long patientId) {
        try {
            Long count = imagingReportService.countByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }
}

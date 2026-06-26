package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.entity.MedicalRecord;
import com.medical.emr.service.MedicalRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Medical Record REST controller - handles CRUD for medical records
 */
@RestController
@RequestMapping("/medical-records")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MedicalRecordController {

    @Autowired
    private MedicalRecordService medicalRecordService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<MedicalRecord>>> getRecordsByPatient(@PathVariable Long patientId) {
        try {
            List<MedicalRecord> records = medicalRecordService.getRecordsByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", records));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取病历失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicalRecord>> getRecord(@PathVariable Long id) {
        try {
            MedicalRecord record = medicalRecordService.getById(id);
            if (record == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(ApiResponse.success("获取成功", record));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取病历失败: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MedicalRecord>> createRecord(@RequestBody MedicalRecord record) {
        try {
            medicalRecordService.save(record);
            return ResponseEntity.ok(ApiResponse.success("病历创建成功", record));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("创建病历失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicalRecord>> updateRecord(@PathVariable Long id, @RequestBody MedicalRecord record) {
        try {
            record.setId(id);
            medicalRecordService.updateById(record);
            return ResponseEntity.ok(ApiResponse.success("病历更新成功", record));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新病历失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecord(@PathVariable Long id) {
        try {
            medicalRecordService.removeById(id);
            return ResponseEntity.ok(ApiResponse.success("病历删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("删除病历失败: " + e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}/count")
    public ResponseEntity<ApiResponse<Long>> countByPatient(@PathVariable Long patientId) {
        try {
            Long count = medicalRecordService.countByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }
}

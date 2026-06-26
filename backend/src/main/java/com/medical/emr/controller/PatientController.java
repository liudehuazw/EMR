package com.medical.emr.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.medical.emr.dto.ApiResponse;
import com.medical.emr.dto.PatientForm;
import com.medical.emr.entity.Patient;
import com.medical.emr.entity.User;
import com.medical.emr.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Patient REST controller - handles CRUD operations for patient management
 *
 * API Endpoints:
 *   GET    /api/patients        - paginated list with search & filter
 *   GET    /api/patients/{id}   - get patient by id
 *   POST   /api/patients        - create new patient
 *   PUT    /api/patients/{id}   - update patient
 *   DELETE /api/patients/{id}   - delete patient (logical)
 */
@RestController
@RequestMapping("/patients")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PatientController {

    @Autowired
    private PatientService patientService;

    /**
     * Helper method to get current logged-in user ID from SecurityContext
     */
    private Long getCurrentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof User) {
                return ((User) principal).getId();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * GET /api/patients?page=1&size=10&keyword=xxx&gender=1
     * Paginated patient list with optional search and filter
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> listPatients(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer gender) {
        try {
            Long currentUserId = getCurrentUserId();
            IPage<Patient> result = patientService.getPatientPage(page, size, keyword, gender, currentUserId);

            Map<String, Object> pageData = new HashMap<>();
            pageData.put("records", result.getRecords());
            pageData.put("total", result.getTotal());
            pageData.put("current", result.getCurrent());
            pageData.put("size", result.getSize());

            return ResponseEntity.ok(ApiResponse.success("Query successful", pageData));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Query failed: " + e.getMessage()));
        }
    }

    /**
     * GET /api/patients/{id}
     * Get patient detail by id
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Patient>> getPatient(@PathVariable Long id) {
        try {
            Long currentUserId = getCurrentUserId();
            Patient patient = patientService.getPatientById(id, currentUserId);
            if (patient == null) {
                return ResponseEntity.ok(ApiResponse.error(404, "Patient not found"));
            }
            return ResponseEntity.ok(ApiResponse.success("Query successful", patient));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Query failed: " + e.getMessage()));
        }
    }

    /**
     * POST /api/patients
     * Create a new patient
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Patient>> createPatient(@Valid @RequestBody PatientForm form) {
        try {
            Long currentUserId = getCurrentUserId();
            Patient patient = patientService.createPatient(form, currentUserId);
            return ResponseEntity.ok(ApiResponse.success("Patient created successfully", patient));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Create failed: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/patients/{id}
     * Update an existing patient
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Patient>> updatePatient(
            @PathVariable Long id,
            @Valid @RequestBody PatientForm form) {
        try {
            Long currentUserId = getCurrentUserId();
            Patient patient = patientService.updatePatient(id, form, currentUserId);
            if (patient == null) {
                return ResponseEntity.ok(ApiResponse.error(404, "Patient not found"));
            }
            return ResponseEntity.ok(ApiResponse.success("Patient updated successfully", patient));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Update failed: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/patients/{id}
     * Logically delete a patient
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deletePatient(@PathVariable Long id) {
        try {
            Long currentUserId = getCurrentUserId();
            Patient patient = patientService.getPatientById(id, currentUserId);
            if (patient == null) {
                return ResponseEntity.ok(ApiResponse.error(404, "Patient not found"));
            }
            patientService.removeById(id);
            return ResponseEntity.ok(ApiResponse.success("Patient deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Delete failed: " + e.getMessage()));
        }
    }
}

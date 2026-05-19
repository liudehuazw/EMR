package com.medical.emr.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.dto.PatientForm;
import com.medical.emr.entity.Patient;
import com.medical.emr.mapper.PatientMapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Patient service layer - handles business logic for patient CRUD operations
 */
@Service
public class PatientService extends ServiceImpl<PatientMapper, Patient> {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Paginated query with optional keyword search and gender filter
     * @param page current page number (1-based)
     * @param size page size
     * @param keyword search keyword (name or phone)
     * @param gender gender filter (1=male, 2=female, null=all)
     * @param userId user ID for data isolation
     * @return paginated patient list
     */
    public IPage<Patient> getPatientPage(int page, int size, String keyword, Integer gender, Long userId) {
        LambdaQueryWrapper<Patient> wrapper = new LambdaQueryWrapper<>();

        // 【安全修复】用户数据隔离：只查询当前用户的患者数据
        if (userId != null) {
            wrapper.eq(Patient::getUserId, userId);
        }

        // Keyword search: match name or phone
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w
                    .like(Patient::getName, keyword)
                    .or()
                    .like(Patient::getPhone, keyword)
            );
        }

        // Gender filter
        if (gender != null) {
            wrapper.eq(Patient::getGender, gender);
        }

        // Order by create_time descending (newest first)
        wrapper.orderByDesc(Patient::getCreateTime);

        return page(new Page<>(page, size), wrapper);
    }

    /**
     * Create a new patient with auto-generated patient number
     * @param form patient form data
     * @param userId user ID for data isolation
     * @return created patient entity
     */
    public Patient createPatient(PatientForm form, Long userId) {
        Patient patient = new Patient();
        copyFormToEntity(form, patient);
        patient.setPatientNo(generatePatientNo());
        patient.setUserId(userId);
        save(patient);
        return patient;
    }

    /**
     * Update an existing patient
     * @param id patient id
     * @param form patient form data
     * @param userId user ID for data isolation
     * @return updated patient entity, or null if not found
     */
    public Patient updatePatient(Long id, PatientForm form, Long userId) {
        Patient patient = getById(id);
        if (patient == null) {
            return null;
        }
        // 【安全修复】用户数据隔离：只能修改自己的患者数据
        if (userId != null && !patient.getUserId().equals(userId)) {
            return null;
        }
        copyFormToEntity(form, patient);
        updateById(patient);
        return patient;
    }

    /**
     * Get patient by ID with user isolation
     * @param id patient id
     * @param userId user ID for data isolation
     * @return patient entity, or null if not found
     */
    public Patient getPatientById(Long id, Long userId) {
        Patient patient = getById(id);
        if (patient == null) {
            return null;
        }
        // 【安全修复】用户数据隔离：只能查看自己的患者数据
        if (userId != null && !patient.getUserId().equals(userId)) {
            return null;
        }
        return patient;
    }

    /**
     * Auto-generate patient number in format P000001, P000002, ...
     * @return next available patient number
     */
    private String generatePatientNo() {
        String maxNo = baseMapper.selectMaxPatientNo();
        if (maxNo == null || maxNo.isEmpty()) {
            return "P000001";
        }
        try {
            int currentNum = Integer.parseInt(maxNo.substring(1));
            return String.format("P%06d", currentNum + 1);
        } catch (NumberFormatException e) {
            return "P000001";
        }
    }

    /**
     * Copy form fields to entity
     */
    private void copyFormToEntity(PatientForm form, Patient patient) {
        patient.setName(form.getName());
        patient.setGender(form.getGender());
        patient.setPhone(form.getPhone());
        patient.setIdCard(form.getIdCard());
        patient.setAddress(form.getAddress());
        patient.setEmergencyContact(form.getEmergencyContact());
        patient.setEmergencyPhone(form.getEmergencyPhone());
        patient.setAllergyHistory(form.getAllergyHistory());
        patient.setMedicalHistory(form.getMedicalHistory());
        patient.setAvatarUrl(form.getAvatarUrl());

        // Parse birth date string to LocalDate
        if (StringUtils.hasText(form.getBirthDate())) {
            try {
                patient.setBirthDate(LocalDate.parse(form.getBirthDate(), DATE_FORMATTER));
            } catch (Exception e) {
                // Log warning but don't fail - birthDate is optional
                patient.setBirthDate(null);
            }
        } else {
            patient.setBirthDate(null);
        }
    }
}

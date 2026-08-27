package com.medical.emr.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.dto.PatientForm;
import com.medical.emr.entity.Patient;
import com.medical.emr.mapper.PatientMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Patient service layer - handles business logic for patient CRUD operations
 * 缓存使用 CacheService 编程式管理，Redis 不可用时自动降级
 */
@Service
public class PatientService extends ServiceImpl<PatientMapper, Patient> {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final String CACHE_PATIENTS = "patients";
    private static final String CACHE_PATIENT = "patient";

    @Autowired(required = false)
    private CacheService cacheService;

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
        String cacheKey = CACHE_PATIENTS + ":" + page + ":" + size + ":" + (keyword != null ? keyword : "") + ":" + (gender != null ? gender : "") + ":" + userId;
        // 尝试从缓存读取
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            IPage<Patient> cached = (IPage<Patient>) cacheService.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        // 缓存未命中，查数据库
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

        IPage<Patient> result = page(new Page<>(page, size), wrapper);
        // 写入缓存（5分钟过期）
        if (cacheService != null) {
            cacheService.set(cacheKey, result, 300L);
        }
        return result;
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
        // 清除患者列表缓存
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
        }
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
        // 清除患者相关缓存
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
            cacheService.delete(CACHE_PATIENT + ":" + id);
        }
        return patient;
    }

    /**
     * Get patient by ID with user isolation
     * @param id patient id
     * @param userId user ID for data isolation
     * @return patient entity, or null if not found
     */
    public Patient getPatientById(Long id, Long userId) {
        // 尝试从缓存读取
        String cacheKey = CACHE_PATIENT + ":" + id;
        if (cacheService != null) {
            Patient cached = cacheService.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        // 缓存未命中，查数据库
        Patient patient = getById(id);
        if (patient == null) {
            return null;
        }
        // 【安全修复】用户数据隔离：只能查看自己的患者数据
        if (userId != null && !patient.getUserId().equals(userId)) {
            return null;
        }
        // 写入缓存（5分钟过期）
        if (cacheService != null) {
            cacheService.set(cacheKey, patient, 300L);
        }
        return patient;
    }

    /**
     * Delete patient by ID (with cache eviction)
     * @param id patient id
     * @param userId current user ID
     * @return true if deleted
     */
    public boolean deletePatient(Long id, Long userId) {
        Patient patient = getPatientById(id, userId);
        if (patient == null) {
            return false;
        }
        boolean deleted = removeById(id);
        // 清除患者相关缓存
        if (deleted && cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
            cacheService.delete(CACHE_PATIENT + ":" + id);
        }
        return deleted;
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

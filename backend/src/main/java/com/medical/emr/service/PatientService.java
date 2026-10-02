package com.medical.emr.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.dto.PatientForm;
import com.medical.emr.entity.Patient;
import com.medical.emr.mapper.PatientMapper;
import com.medical.emr.utils.SecurityUtils;
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

    public IPage<Patient> getPatientPage(int page, int size, String keyword, Integer gender, Long userId) {
        String cacheKey = CACHE_PATIENTS + ":" + page + ":" + size + ":" + (keyword != null ? keyword : "") + ":" + (gender != null ? gender : "") + ":" + userId;
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            IPage<Patient> cached = (IPage<Patient>) cacheService.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        LambdaQueryWrapper<Patient> wrapper = new LambdaQueryWrapper<>();
        applyUserScopeToQuery(wrapper, userId);

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w
                    .like(Patient::getName, keyword)
                    .or()
                    .like(Patient::getPhone, keyword)
            );
        }

        if (gender != null) {
            wrapper.eq(Patient::getGender, gender);
        }

        wrapper.orderByDesc(Patient::getCreateTime);

        IPage<Patient> result = page(new Page<>(page, size), wrapper);
        claimOrphanPatientsForAdmin(result.getRecords(), userId);
        if (cacheService != null) {
            cacheService.set(cacheKey, result, 300L);
        }
        return result;
    }

    public Patient createPatient(PatientForm form, Long userId) {
        Patient patient = new Patient();
        copyFormToEntity(form, patient);
        patient.setPatientNo(generatePatientNo());
        patient.setUserId(userId);
        save(patient);
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
        }
        return patient;
    }

    public Patient updatePatient(Long id, PatientForm form, Long userId) {
        Patient patient = getById(id);
        if (patient == null) {
            return null;
        }
        if (!canAccessPatient(patient, userId)) {
            return null;
        }
        if (patient.getUserId() == null && userId != null) {
            patient.setUserId(userId);
        }
        copyFormToEntity(form, patient);
        updateById(patient);
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
            cacheService.delete(CACHE_PATIENT + ":" + id);
        }
        return patient;
    }

    public Patient getPatientById(Long id, Long userId) {
        String cacheKey = CACHE_PATIENT + ":" + id;
        if (cacheService != null) {
            Patient cached = cacheService.get(cacheKey);
            if (cached != null) {
                return cached;
            }
        }
        Patient patient = getById(id);
        if (patient == null) {
            return null;
        }
        if (!canAccessPatient(patient, userId)) {
            return null;
        }
        if (cacheService != null) {
            cacheService.set(cacheKey, patient, 300L);
        }
        return patient;
    }

    public boolean deletePatient(Long id, Long userId) {
        Patient patient = getPatientById(id, userId);
        if (patient == null) {
            return false;
        }
        boolean deleted = removeById(id);
        if (deleted && cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
            cacheService.delete(CACHE_PATIENT + ":" + id);
        }
        return deleted;
    }

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

    private void applyUserScopeToQuery(LambdaQueryWrapper<Patient> wrapper, Long userId) {
        if (userId == null) {
            return;
        }
        if (SecurityUtils.isAdmin()) {
            wrapper.and(w -> w.eq(Patient::getUserId, userId).or().isNull(Patient::getUserId));
        } else {
            wrapper.eq(Patient::getUserId, userId);
        }
    }

    private boolean canAccessPatient(Patient patient, Long userId) {
        if (patient == null || userId == null) {
            return false;
        }
        Long ownerId = patient.getUserId();
        if (ownerId == null) {
            return SecurityUtils.isAdmin();
        }
        if (ownerId.equals(userId)) {
            return true;
        }
        return SecurityUtils.isAdmin();
    }

    private void claimOrphanPatientsForAdmin(java.util.List<Patient> records, Long userId) {
        if (userId == null || !SecurityUtils.isAdmin() || records == null || records.isEmpty()) {
            return;
        }
        boolean changed = false;
        for (Patient p : records) {
            if (p.getUserId() == null) {
                p.setUserId(userId);
                updateById(p);
                changed = true;
            }
        }
        if (changed && cacheService != null) {
            cacheService.deleteByPattern(CACHE_PATIENTS + ":*");
        }
    }

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

        if (StringUtils.hasText(form.getBirthDate())) {
            try {
                patient.setBirthDate(LocalDate.parse(form.getBirthDate(), DATE_FORMATTER));
            } catch (Exception e) {
                patient.setBirthDate(null);
            }
        } else {
            patient.setBirthDate(null);
        }
    }
}

package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.MedicalRecord;
import com.medical.emr.mapper.MedicalRecordMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Medical Record service layer
 */
@Service
public class MedicalRecordService extends ServiceImpl<MedicalRecordMapper, MedicalRecord> {

    private static final String CACHE_PREFIX = "medicalRecords";

    @Autowired(required = false)
    private CacheService cacheService;

    @Autowired
    private FileCleanupHelper fileCleanupHelper;

    public List<MedicalRecord> getRecordsByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":" + patientId;
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            List<MedicalRecord> cached = (List<MedicalRecord>) cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        List<MedicalRecord> records = baseMapper.selectByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, records, 300L);
        }
        return records;
    }

    public Long countByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":count:" + patientId;
        if (cacheService != null) {
            Long cached = cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        Long count = baseMapper.countByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, count, 300L);
        }
        return count;
    }

    private void evictCache(Long patientId) {
        if (cacheService == null || patientId == null) {
            return;
        }
        cacheService.delete(CACHE_PREFIX + ":" + patientId);
        cacheService.delete(CACHE_PREFIX + ":count:" + patientId);
    }

    /**
     * 批量统计多个患者的病历数（一次 GROUP BY 查询，避免 N+1）。
     * 不缓存：用于患者列表页实时统计。
     */
    public java.util.List<java.util.Map<String, Object>> countByPatientIds(java.util.List<Long> patientIds) {
        if (patientIds == null || patientIds.isEmpty()) {
            return java.util.List.of();
        }
        return baseMapper.countByPatientIds(patientIds);
    }

    public boolean save(MedicalRecord record) {
        boolean result = super.save(record);
        evictCache(record.getPatientId());
        return result;
    }

    public boolean updateById(MedicalRecord record) {
        boolean result = super.updateById(record);
        evictCache(record.getPatientId());
        return result;
    }

    public boolean removeById(Long id) {
        MedicalRecord record = getById(id);
        if (record != null) {
            fileCleanupHelper.deleteMedicalRecordFiles(record.getFiles());
        }
        boolean result = super.removeById(id);
        if (record != null) {
            evictCache(record.getPatientId());
        }
        return result;
    }
}

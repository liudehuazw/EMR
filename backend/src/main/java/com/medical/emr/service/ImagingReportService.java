package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.ImagingReport;
import com.medical.emr.mapper.ImagingReportMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Imaging Report service layer
 */
@Service
public class ImagingReportService extends ServiceImpl<ImagingReportMapper, ImagingReport> {

    private static final String CACHE_PREFIX = "imagingReports";

    @Autowired(required = false)
    private CacheService cacheService;

    public List<ImagingReport> getReportsByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":" + patientId;
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            List<ImagingReport> cached = (List<ImagingReport>) cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        List<ImagingReport> reports = baseMapper.selectByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, reports, 300L);
        }
        return reports;
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

    private void evictCache() {
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PREFIX + ":*");
        }
    }

    public boolean save(ImagingReport report) {
        boolean result = super.save(report);
        evictCache();
        return result;
    }

    public boolean updateById(ImagingReport report) {
        boolean result = super.updateById(report);
        evictCache();
        return result;
    }

    public boolean removeById(Long id) {
        boolean result = super.removeById(id);
        evictCache();
        return result;
    }
}

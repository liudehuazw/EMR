package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.ImagingReport;
import com.medical.emr.mapper.ImagingReportMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Imaging Report service layer
 */
@Service
public class ImagingReportService extends ServiceImpl<ImagingReportMapper, ImagingReport> {

    private static final String CACHE_PREFIX = "imagingReports";

    @Autowired(required = false)
    private CacheService cacheService;

    @Autowired
    private FileCleanupHelper fileCleanupHelper;

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

    /**
     * 批量统计多个患者的影像报告数（一次 GROUP BY 查询，避免 N+1）。
     */
    public List<Map<String, Object>> countByPatientIds(List<Long> patientIds) {
        if (patientIds == null || patientIds.isEmpty()) {
            return List.of();
        }
        return baseMapper.countByPatientIds(patientIds);
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
        ImagingReport report = getById(id);
        if (report != null) {
            fileCleanupHelper.deleteIfPresent(report.getFileUrl());
        }
        boolean result = super.removeById(id);
        evictCache();
        return result;
    }

    public void updateOcrText(Long id, String ocrRawText) {
        ImagingReport report = getById(id);
        if (report == null) {
            throw new IllegalArgumentException("影像报告不存在");
        }
        report.setOcrRawText(ocrRawText);
        updateById(report);
    }
}

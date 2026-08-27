package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.LabReport;
import com.medical.emr.entity.LabReportItem;
import com.medical.emr.mapper.LabReportMapper;
import com.medical.emr.mapper.LabReportItemMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lab Report service layer
 */
@Service
public class LabReportService extends ServiceImpl<LabReportMapper, LabReport> {

    private static final String CACHE_PREFIX = "labReports";

    @Autowired(required = false)
    private CacheService cacheService;

    @Autowired
    private LabReportItemMapper labReportItemMapper;

    public List<LabReport> getReportsByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":" + patientId;
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            List<LabReport> cached = (List<LabReport>) cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        List<LabReport> reports = baseMapper.selectByPatientId(patientId);
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

    @Transactional
    public void saveReportWithItems(LabReport report, List<LabReportItem> items) {
        // Save report
        save(report);
        
        // Save items
        if (items != null && !items.isEmpty()) {
            for (LabReportItem item : items) {
                item.setReportId(report.getId());
                labReportItemMapper.insert(item);
            }
        }
        // 清除缓存
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PREFIX + ":*");
        }
    }

    public List<LabReportItem> getReportItems(Long reportId) {
        return labReportItemMapper.selectByReportId(reportId);
    }

    public void saveReportItem(LabReportItem item) {
        labReportItemMapper.insert(item);
    }

    public void deleteReportItems(Long reportId) {
        labReportItemMapper.deleteByReportId(reportId);
    }

    @Transactional
    public void deleteReport(Long reportId) {
        // Delete items first
        labReportItemMapper.deleteByReportId(reportId);
        // Delete report
        removeById(reportId);
        // 清除缓存
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PREFIX + ":*");
        }
    }
}

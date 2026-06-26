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

    @Autowired
    private LabReportItemMapper labReportItemMapper;

    public List<LabReport> getReportsByPatientId(Long patientId) {
        return baseMapper.selectByPatientId(patientId);
    }

    public Long countByPatientId(Long patientId) {
        return baseMapper.countByPatientId(patientId);
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
    }
}

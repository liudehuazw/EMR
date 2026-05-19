package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.ImagingReport;
import com.medical.emr.mapper.ImagingReportMapper;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Imaging Report service layer
 */
@Service
public class ImagingReportService extends ServiceImpl<ImagingReportMapper, ImagingReport> {

    public List<ImagingReport> getReportsByPatientId(Long patientId) {
        return baseMapper.selectByPatientId(patientId);
    }

    public Long countByPatientId(Long patientId) {
        return baseMapper.countByPatientId(patientId);
    }
}

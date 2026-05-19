package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.MedicalRecord;
import com.medical.emr.mapper.MedicalRecordMapper;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Medical Record service layer
 */
@Service
public class MedicalRecordService extends ServiceImpl<MedicalRecordMapper, MedicalRecord> {

    public List<MedicalRecord> getRecordsByPatientId(Long patientId) {
        return baseMapper.selectByPatientId(patientId);
    }

    public Long countByPatientId(Long patientId) {
        return baseMapper.countByPatientId(patientId);
    }
}

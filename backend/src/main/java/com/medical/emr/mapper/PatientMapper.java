package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.Patient;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * Patient data access layer - extends MyBatis Plus BaseMapper
 */
@Mapper
public interface PatientMapper extends BaseMapper<Patient> {

    /**
     * Get the max patient number for auto-generation
     * @return max patient_no string like "P000003", or null if no records
     */
    @Select("SELECT MAX(patient_no) FROM patient WHERE deleted = 0")
    String selectMaxPatientNo();
}

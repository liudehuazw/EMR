package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.Patient;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

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

    /**
     * Search patients by name or patient_no (fuzzy)
     */
    @Select("SELECT * FROM patient WHERE deleted = 0 "
            + "AND (name LIKE CONCAT('%', #{keyword}, '%') OR patient_no LIKE CONCAT('%', #{keyword}, '%')) "
            + "ORDER BY name")
    List<Patient> searchByNameOrNo(@Param("keyword") String keyword);
}

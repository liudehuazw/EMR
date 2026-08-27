package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.MedicalRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface MedicalRecordMapper extends BaseMapper<MedicalRecord> {

    @Select("SELECT * FROM emr_medical_record WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY visit_date DESC")
    List<MedicalRecord> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_medical_record WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);

    /**
     * Medical records within a date range
     */
    @Select("SELECT visit_date AS visitDate, hospital AS hospital, "
            + "department AS department, doctor AS doctor, "
            + "diagnosis AS diagnosis, symptoms AS symptoms, "
            + "treatment AS treatment, notes AS notes "
            + "FROM emr_medical_record "
            + "WHERE patient_id = #{patientId} AND deleted = 0 "
            + "AND visit_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "ORDER BY visit_date DESC")
    List<Map<String, Object>> selectByPatientIdAndDateRange(@Param("patientId") Long patientId,
                                                            @Param("dateFrom") LocalDate dateFrom,
                                                            @Param("dateTo") LocalDate dateTo);
}

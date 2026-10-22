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
     * 批量统计：一次查询返回多个患者的病历数，避免前端按患者逐个请求（N+1）。
     * 返回列：patientId, cnt
     */
    @Select("<script>"
            + "SELECT patient_id AS patientId, COUNT(*) AS cnt FROM emr_medical_record "
            + "WHERE deleted = 0 AND patient_id IN "
            + "<foreach collection='patientIds' item='id' open='(' separator=',' close=')'>#{id}</foreach> "
            + "GROUP BY patient_id"
            + "</script>")
    List<Map<String, Object>> countByPatientIds(@Param("patientIds") List<Long> patientIds);

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

package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.LabReport;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface LabReportMapper extends BaseMapper<LabReport> {

    @Select("SELECT * FROM emr_lab_report WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY report_date DESC")
    List<LabReport> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_lab_report WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);

    /**
     * Lab reports within a date range, with abnormal item count per report
     */
    @Select("SELECT r.id AS id, r.report_date AS reportDate, r.test_name AS testName, "
            + "r.hospital AS hospital, r.ocr_confidence AS ocrConfidence, "
            + "(SELECT COUNT(*) FROM emr_lab_report_item i "
            + " WHERE i.report_id = r.id AND i.deleted = 0 "
            + " AND i.result_flag IS NOT NULL AND i.result_flag <> '') AS abnormalCount "
            + "FROM emr_lab_report r "
            + "WHERE r.patient_id = #{patientId} AND r.deleted = 0 "
            + "AND r.report_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "ORDER BY r.report_date DESC")
    List<Map<String, Object>> selectByPatientIdAndDateRange(@Param("patientId") Long patientId,
                                                            @Param("dateFrom") LocalDate dateFrom,
                                                            @Param("dateTo") LocalDate dateTo);
}

package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.ImagingReport;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface ImagingReportMapper extends BaseMapper<ImagingReport> {

    @Select("SELECT * FROM emr_imaging_report WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY report_date DESC")
    List<ImagingReport> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_imaging_report WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);

    /**
     * Imaging reports within a date range
     */
    @Select("SELECT report_date AS reportDate, title AS title, "
            + "hospital AS hospital, imaging_type AS imagingType, "
            + "ai_analysis AS aiAnalysis "
            + "FROM emr_imaging_report "
            + "WHERE patient_id = #{patientId} AND deleted = 0 "
            + "AND report_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "ORDER BY report_date DESC")
    List<Map<String, Object>> selectByPatientIdAndDateRange(@Param("patientId") Long patientId,
                                                            @Param("dateFrom") LocalDate dateFrom,
                                                            @Param("dateTo") LocalDate dateTo);
}

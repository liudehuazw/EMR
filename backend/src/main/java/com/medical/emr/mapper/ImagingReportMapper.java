package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.ImagingReport;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ImagingReportMapper extends BaseMapper<ImagingReport> {

    @Select("SELECT * FROM emr_imaging_report WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY report_date DESC")
    List<ImagingReport> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_imaging_report WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);
}

package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.LabReportItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface LabReportItemMapper extends BaseMapper<LabReportItem> {

    @Select("SELECT * FROM emr_lab_report_item WHERE report_id = #{reportId} AND deleted = 0")
    List<LabReportItem> selectByReportId(@Param("reportId") Long reportId);

    @Delete("DELETE FROM emr_lab_report_item WHERE report_id = #{reportId}")
    void deleteByReportId(@Param("reportId") Long reportId);
}

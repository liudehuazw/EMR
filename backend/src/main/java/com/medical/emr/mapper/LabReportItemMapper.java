package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.LabReportItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface LabReportItemMapper extends BaseMapper<LabReportItem> {

    @Select("SELECT * FROM emr_lab_report_item WHERE report_id = #{reportId} AND deleted = 0")
    List<LabReportItem> selectByReportId(@Param("reportId") Long reportId);

    @Delete("DELETE FROM emr_lab_report_item WHERE report_id = #{reportId}")
    void deleteByReportId(@Param("reportId") Long reportId);

    /**
     * Historical trend of one lab item for a patient (joined with report date)
     */
    @Select("SELECT r.report_date AS date, i.item_code AS itemCode, "
            + "i.item_name AS itemName, i.item_name_original AS itemNameOriginal, "
            + "i.result_value AS resultValue, i.unit AS unit, "
            + "i.reference_range AS referenceRange, i.result_flag AS resultFlag "
            + "FROM emr_lab_report_item i "
            + "INNER JOIN emr_lab_report r ON r.id = i.report_id "
            + "WHERE r.patient_id = #{patientId} AND r.deleted = 0 AND i.deleted = 0 "
            + "AND (i.item_name LIKE CONCAT('%', #{itemName}, '%') "
            + "     OR i.item_name_original LIKE CONCAT('%', #{itemName}, '%')) "
            + "AND r.report_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "ORDER BY r.report_date ASC")
    List<Map<String, Object>> selectTrend(@Param("patientId") Long patientId,
                                          @Param("itemName") String itemName,
                                          @Param("dateFrom") LocalDate dateFrom,
                                          @Param("dateTo") LocalDate dateTo);

    /**
     * Abnormal lab items (non-empty result_flag) for a patient within a date range
     */
    @Select("SELECT r.report_date AS date, i.item_code AS itemCode, "
            + "i.item_name AS itemName, i.item_name_original AS itemNameOriginal, "
            + "i.result_value AS resultValue, i.unit AS unit, "
            + "i.reference_range AS referenceRange, i.result_flag AS resultFlag "
            + "FROM emr_lab_report_item i "
            + "INNER JOIN emr_lab_report r ON r.id = i.report_id "
            + "WHERE r.patient_id = #{patientId} AND r.deleted = 0 AND i.deleted = 0 "
            + "AND i.result_flag IS NOT NULL AND i.result_flag <> '' "
            + "AND r.report_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "ORDER BY r.report_date DESC")
    List<Map<String, Object>> selectAbnormalByPatient(@Param("patientId") Long patientId,
                                                      @Param("dateFrom") LocalDate dateFrom,
                                                      @Param("dateTo") LocalDate dateTo);
}

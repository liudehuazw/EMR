package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.Invoice;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface InvoiceMapper extends BaseMapper<Invoice> {

    @Select("SELECT * FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY invoice_date DESC")
    List<Invoice> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT SUM(total_amount) FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0")
    BigDecimal sumTotalAmountByPatientId(@Param("patientId") Long patientId);

    /**
     * Spending summary grouped by hospital within a date range
     */
    @Select("SELECT hospital AS hospital, COUNT(*) AS cnt, "
            + "COALESCE(SUM(total_amount), 0) AS totalAmount, "
            + "COALESCE(SUM(self_pay_amount), 0) AS selfPayAmount, "
            + "COALESCE(SUM(insurance_amount), 0) AS insuranceAmount, "
            + "COALESCE(SUM(commercial_amount), 0) AS commercialAmount "
            + "FROM emr_invoice "
            + "WHERE patient_id = #{patientId} AND deleted = 0 "
            + "AND invoice_date BETWEEN #{dateFrom} AND #{dateTo} "
            + "GROUP BY hospital ORDER BY totalAmount DESC")
    List<Map<String, Object>> summarizeByHospital(@Param("patientId") Long patientId,
                                                  @Param("dateFrom") LocalDate dateFrom,
                                                  @Param("dateTo") LocalDate dateTo);

    /**
     * Total spending summary within a date range
     */
    @Select("SELECT COUNT(*) AS cnt, "
            + "COALESCE(SUM(total_amount), 0) AS totalAmount, "
            + "COALESCE(SUM(self_pay_amount), 0) AS selfPayAmount, "
            + "COALESCE(SUM(insurance_amount), 0) AS insuranceAmount, "
            + "COALESCE(SUM(commercial_amount), 0) AS commercialAmount "
            + "FROM emr_invoice "
            + "WHERE patient_id = #{patientId} AND deleted = 0 "
            + "AND invoice_date BETWEEN #{dateFrom} AND #{dateTo}")
    Map<String, Object> summarizeTotal(@Param("patientId") Long patientId,
                                       @Param("dateFrom") LocalDate dateFrom,
                                       @Param("dateTo") LocalDate dateTo);
}

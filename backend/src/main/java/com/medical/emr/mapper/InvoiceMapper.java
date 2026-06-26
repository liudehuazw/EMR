package com.medical.emr.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.medical.emr.entity.Invoice;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface InvoiceMapper extends BaseMapper<Invoice> {

    @Select("SELECT * FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0 ORDER BY invoice_date DESC")
    List<Invoice> selectByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT COUNT(*) FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0")
    Long countByPatientId(@Param("patientId") Long patientId);

    @Select("SELECT SUM(total_amount) FROM emr_invoice WHERE patient_id = #{patientId} AND deleted = 0")
    java.math.BigDecimal sumTotalAmountByPatientId(@Param("patientId") Long patientId);
}

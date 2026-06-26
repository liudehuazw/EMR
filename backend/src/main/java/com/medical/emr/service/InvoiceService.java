package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.Invoice;
import com.medical.emr.mapper.InvoiceMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Invoice service layer
 */
@Service
public class InvoiceService extends ServiceImpl<InvoiceMapper, Invoice> {

    public List<Invoice> getInvoicesByPatientId(Long patientId) {
        return baseMapper.selectByPatientId(patientId);
    }

    public Long countByPatientId(Long patientId) {
        return baseMapper.countByPatientId(patientId);
    }

    public BigDecimal getTotalAmountByPatientId(Long patientId) {
        return baseMapper.sumTotalAmountByPatientId(patientId);
    }
}

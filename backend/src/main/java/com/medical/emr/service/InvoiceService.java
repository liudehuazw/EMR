package com.medical.emr.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.Invoice;
import com.medical.emr.mapper.InvoiceMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Invoice service layer
 */
@Service
public class InvoiceService extends ServiceImpl<InvoiceMapper, Invoice> {

    private static final String CACHE_PREFIX = "invoices";

    @Autowired(required = false)
    private CacheService cacheService;

    public List<Invoice> getInvoicesByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":" + patientId;
        if (cacheService != null) {
            @SuppressWarnings("unchecked")
            List<Invoice> cached = (List<Invoice>) cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        List<Invoice> invoices = baseMapper.selectByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, invoices, 300L);
        }
        return invoices;
    }

    public Long countByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":count:" + patientId;
        if (cacheService != null) {
            Long cached = cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        Long count = baseMapper.countByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, count, 300L);
        }
        return count;
    }

    public BigDecimal getTotalAmountByPatientId(Long patientId) {
        String cacheKey = CACHE_PREFIX + ":totalAmount:" + patientId;
        if (cacheService != null) {
            BigDecimal cached = cacheService.get(cacheKey);
            if (cached != null) return cached;
        }
        BigDecimal total = baseMapper.sumTotalAmountByPatientId(patientId);
        if (cacheService != null) {
            cacheService.set(cacheKey, total, 300L);
        }
        return total;
    }

    private void evictCache() {
        if (cacheService != null) {
            cacheService.deleteByPattern(CACHE_PREFIX + ":*");
        }
    }

    public boolean save(Invoice invoice) {
        boolean result = super.save(invoice);
        evictCache();
        return result;
    }

    public boolean updateById(Invoice invoice) {
        boolean result = super.updateById(invoice);
        evictCache();
        return result;
    }

    public boolean removeById(Long id) {
        boolean result = super.removeById(id);
        evictCache();
        return result;
    }
}

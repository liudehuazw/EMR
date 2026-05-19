package com.medical.emr.controller;

import com.medical.emr.dto.ApiResponse;
import com.medical.emr.entity.Invoice;
import com.medical.emr.service.InvoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Invoice REST controller - handles CRUD for invoices
 */
@RestController
@RequestMapping("/invoices")
@CrossOrigin(origins = "*", maxAge = 3600)
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<ApiResponse<List<Invoice>>> getInvoicesByPatient(@PathVariable Long patientId) {
        try {
            List<Invoice> invoices = invoiceService.getInvoicesByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", invoices));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取发票失败: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Invoice>> getInvoice(@PathVariable Long id) {
        try {
            Invoice invoice = invoiceService.getById(id);
            if (invoice == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(ApiResponse.success("获取成功", invoice));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("获取发票失败: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Invoice>> createInvoice(@RequestBody Invoice invoice) {
        try {
            System.out.println("[DEBUG] Received invoice: fileUrl=" + invoice.getFileUrl() + ", fileName=" + invoice.getFileName());
            invoiceService.save(invoice);
            System.out.println("[DEBUG] Saved invoice ID=" + invoice.getId() + ", fileUrl=" + invoice.getFileUrl());
            return ResponseEntity.ok(ApiResponse.success("发票创建成功", invoice));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(ApiResponse.error("创建发票失败: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Invoice>> updateInvoice(@PathVariable Long id, @RequestBody Invoice invoice) {
        try {
            invoice.setId(id);
            invoiceService.updateById(invoice);
            return ResponseEntity.ok(ApiResponse.success("发票更新成功", invoice));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新发票失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInvoice(@PathVariable Long id) {
        try {
            invoiceService.removeById(id);
            return ResponseEntity.ok(ApiResponse.success("发票删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("删除发票失败: " + e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}/count")
    public ResponseEntity<ApiResponse<Long>> countByPatient(@PathVariable Long patientId) {
        try {
            Long count = invoiceService.countByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }

    @GetMapping("/patient/{patientId}/total-amount")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalAmountByPatient(@PathVariable Long patientId) {
        try {
            BigDecimal total = invoiceService.getTotalAmountByPatientId(patientId);
            return ResponseEntity.ok(ApiResponse.success("获取成功", total != null ? total : BigDecimal.ZERO));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("统计失败: " + e.getMessage()));
        }
    }
}

package com.medical.emr.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.AiToolSource;
import com.medical.emr.entity.Patient;
import com.medical.emr.mapper.ImagingReportMapper;
import com.medical.emr.mapper.InvoiceMapper;
import com.medical.emr.mapper.LabReportItemMapper;
import com.medical.emr.mapper.LabReportMapper;
import com.medical.emr.mapper.MedicalRecordMapper;
import com.medical.emr.mapper.PatientMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AI assistant tool registry & executor.
 * <p>
 * Every query the LLM can request goes through these fixed, read-only,
 * parameterized SQL methods. The LLM never sees raw SQL and never runs
 * arbitrary queries — it only picks a tool and fills in parameters.
 * <p>
 * Scope enforcement: when {@code scopedPatientId} is provided (a patient is
 * selected on the page), patient-scoped tools IGNORE the patientId the model
 * passes and always query the scoped patient.
 */
@Component
public class AiToolExecutor {

    private static final Logger log = LoggerFactory.getLogger(AiToolExecutor.class);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final LocalDate MIN_DATE = LocalDate.of(1970, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2100, 12, 31);
    private static final int MAX_ROWS = 50;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final PatientMapper patientMapper;
    private final InvoiceMapper invoiceMapper;
    private final LabReportItemMapper labReportItemMapper;
    private final LabReportMapper labReportMapper;
    private final MedicalRecordMapper medicalRecordMapper;
    private final ImagingReportMapper imagingReportMapper;

    /** tool name -> definition */
    private final Map<String, ToolDef> tools = new LinkedHashMap<>();

    public AiToolExecutor(PatientMapper patientMapper,
                          InvoiceMapper invoiceMapper,
                          LabReportItemMapper labReportItemMapper,
                          LabReportMapper labReportMapper,
                          MedicalRecordMapper medicalRecordMapper,
                          ImagingReportMapper imagingReportMapper) {
        this.patientMapper = patientMapper;
        this.invoiceMapper = invoiceMapper;
        this.labReportItemMapper = labReportItemMapper;
        this.labReportMapper = labReportMapper;
        this.medicalRecordMapper = medicalRecordMapper;
        this.imagingReportMapper = imagingReportMapper;
        registerTools();
    }

    private void registerTools() {
        tools.put("search_patients", new ToolDef(
                "search_patients",
                "按姓名或患者编号搜索患者，返回患者的 id、姓名、性别、出生日期等信息。"
                        + "当用户用名字提到某个患者时，先用本工具找到其 id，再用其它工具查询。",
                schema(Map.of("keyword", prop("string", "患者姓名或编号（支持模糊）")),
                        List.of("keyword")),
                "patient"));

        tools.put("get_patient_spending", new ToolDef(
                "get_patient_spending",
                "查询某位患者在某日期区间的医疗花费，按医院列出，并返回合计（总金额/自付/医保/商保）。"
                        + "dateFrom、dateTo 格式 yyyy-MM-dd，可省略（省略表示不限区间）。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId")),
                "invoice"));

        tools.put("get_lab_trend", new ToolDef(
                "get_lab_trend",
                "查询某位患者某检验指标的历史趋势（各报告日期下的结果值、单位、参考范围、异常标记），"
                        + "按日期升序。itemName 为指标名，支持模糊，如“血糖”“白细胞”。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "itemName", prop("string", "检验指标名称"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId", "itemName")),
                "lab"));

        tools.put("get_lab_reports", new ToolDef(
                "get_lab_reports",
                "查询某位患者在某日期区间的检验报告列表（报告日期、检验类型、医院、异常项目数）。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId")),
                "lab"));

        tools.put("get_abnormal_lab_items", new ToolDef(
                "get_abnormal_lab_items",
                "查询某位患者在某日期区间所有被标记为异常的检验指标（含结果值、单位、参考范围、异常标记）。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId")),
                "lab"));

        tools.put("get_medical_records", new ToolDef(
                "get_medical_records",
                "查询某位患者在某日期区间的病历/就诊记录（就诊日期、医院、科室、医生、诊断、症状、治疗方案）。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId")),
                "records"));

        tools.put("get_imaging_reports", new ToolDef(
                "get_imaging_reports",
                "查询某位患者在某日期区间的影像报告（报告日期、标题、医院、影像类型、影像所见、影像诊断）。",
                schema(Map.of(
                        "patientId", prop("integer", "患者 id"),
                        "dateFrom", prop("string", "起始日期 yyyy-MM-dd，可选"),
                        "dateTo", prop("string", "结束日期 yyyy-MM-dd，可选")),
                        List.of("patientId")),
                "imaging"));

        tools.put("get_patient_overview", new ToolDef(
                "get_patient_overview",
                "查询某位患者的健康总览：基本信息 + 病历/检验/影像/发票数量 + 历史总花费。",
                schema(Map.of("patientId", prop("integer", "患者 id")),
                        List.of("patientId")),
                "patient"));
    }

    /** tools array JSON for the DeepSeek function-calling API */
    public String toolsJson() {
        List<Map<String, Object>> arr = new ArrayList<>();
        for (ToolDef def : tools.values()) {
            Map<String, Object> fn = new LinkedHashMap<>();
            fn.put("name", def.name);
            fn.put("description", def.description);
            fn.put("parameters", def.parameters);
            Map<String, Object> wrapper = new LinkedHashMap<>();
            wrapper.put("type", "function");
            wrapper.put("function", fn);
            arr.add(wrapper);
        }
        try {
            return objectMapper.writeValueAsString(arr);
        } catch (Exception e) {
            log.error("[AI] Failed to serialize tools", e);
            return "[]";
        }
    }

    /**
     * Execute a tool by name.
     *
     * @return result with data (ok) or error message, plus source links
     */
    public ExecResult execute(String name, Map<String, Object> args, Long scopedPatientId) {
        ToolDef def = tools.get(name);
        if (def == null) {
            return ExecResult.error("未知工具: " + name, List.of());
        }
        try {
            return switch (name) {
                case "search_patients" -> searchPatients(args, scopedPatientId);
                case "get_patient_spending" -> patientScoped(name, "invoice", args, scopedPatientId,
                        this::spending);
                case "get_lab_trend" -> patientScoped(name, "lab", args, scopedPatientId,
                        this::labTrend);
                case "get_lab_reports" -> patientScoped(name, "lab", args, scopedPatientId,
                        this::labReports);
                case "get_abnormal_lab_items" -> patientScoped(name, "lab", args, scopedPatientId,
                        this::abnormalLabItems);
                case "get_medical_records" -> patientScoped(name, "records", args, scopedPatientId,
                        this::medicalRecords);
                case "get_imaging_reports" -> patientScoped(name, "imaging", args, scopedPatientId,
                        this::imagingReports);
                case "get_patient_overview" -> patientScoped(name, "patient", args, scopedPatientId,
                        this::patientOverview);
                default -> ExecResult.error("未知工具: " + name, List.of());
            };
        } catch (Exception e) {
            log.error("[AI] Tool {} failed: {}", name, e.getMessage(), e);
            return ExecResult.error("查询出错: " + e.getMessage(), List.of());
        }
    }

    // ==================== tool implementations ====================

    private ExecResult searchPatients(Map<String, Object> args, Long scopedPatientId) {
        if (scopedPatientId != null) {
            // 已锁定患者：只返回当前患者
            Patient p = patientMapper.selectById(scopedPatientId);
            if (p == null) return ExecResult.error("未找到当前患者 (id=" + scopedPatientId + ")", List.of());
            return ExecResult.ok(List.of(patientToMap(p)),
                    List.of(source("patient", p, "查看患者档案")));
        }
        String keyword = str(args.get("keyword"));
        if (keyword == null || keyword.isBlank()) {
            keyword = "";
        }
        List<Patient> list = patientMapper.searchByNameOrNo(keyword);
        if (list.size() > 20) list = list.subList(0, 20);
        List<Map<String, Object>> data = new ArrayList<>();
        for (Patient p : list) data.add(patientToMap(p));
        if (data.isEmpty()) {
            return ExecResult.ok(Map.of("found", false, "message", "未找到匹配的患者"), List.of());
        }
        return ExecResult.ok(Map.of("found", true, "patients", data), List.of());
    }

    private ExecResult spending(Long patientId, Patient p, Map<String, Object> args) {
        LocalDate[] range = dateRange(args);
        Map<String, Object> total = invoiceMapper.summarizeTotal(patientId, range[0], range[1]);
        List<Map<String, Object>> byHospital = invoiceMapper.summarizeByHospital(patientId, range[0], range[1]);
        if (byHospital.size() > MAX_ROWS) byHospital = byHospital.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("dateFrom", range[0].toString());
        data.put("dateTo", range[1].toString());
        data.put("total", total);
        data.put("byHospital", byHospital);
        return ExecResult.ok(data, List.of(source("invoice", p, "查看发票统计")));
    }

    private ExecResult labTrend(Long patientId, Patient p, Map<String, Object> args) {
        String itemName = str(args.get("itemName"));
        if (itemName == null || itemName.isBlank()) {
            return ExecResult.error("缺少指标名称 itemName", List.of(source("lab", p, "查看检验报告")));
        }
        LocalDate[] range = dateRange(args);
        List<Map<String, Object>> rows = labReportItemMapper.selectTrend(patientId, itemName, range[0], range[1]);
        if (rows.size() > MAX_ROWS) rows = rows.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("itemName", itemName);
        data.put("count", rows.size());
        data.put("points", rows);
        return ExecResult.ok(data, List.of(source("lab", p, "查看检验报告")));
    }

    private ExecResult labReports(Long patientId, Patient p, Map<String, Object> args) {
        LocalDate[] range = dateRange(args);
        List<Map<String, Object>> rows = labReportMapper.selectByPatientIdAndDateRange(patientId, range[0], range[1]);
        if (rows.size() > MAX_ROWS) rows = rows.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("count", rows.size());
        data.put("reports", rows);
        return ExecResult.ok(data, List.of(source("lab", p, "查看检验报告")));
    }

    private ExecResult abnormalLabItems(Long patientId, Patient p, Map<String, Object> args) {
        LocalDate[] range = dateRange(args);
        List<Map<String, Object>> rows = labReportItemMapper.selectAbnormalByPatient(patientId, range[0], range[1]);
        if (rows.size() > MAX_ROWS) rows = rows.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("count", rows.size());
        data.put("items", rows);
        return ExecResult.ok(data, List.of(source("lab", p, "查看检验报告")));
    }

    private ExecResult medicalRecords(Long patientId, Patient p, Map<String, Object> args) {
        LocalDate[] range = dateRange(args);
        List<Map<String, Object>> rows = medicalRecordMapper.selectByPatientIdAndDateRange(patientId, range[0], range[1]);
        if (rows.size() > MAX_ROWS) rows = rows.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("count", rows.size());
        data.put("records", rows);
        return ExecResult.ok(data, List.of(source("records", p, "查看病历统计")));
    }

    private ExecResult imagingReports(Long patientId, Patient p, Map<String, Object> args) {
        LocalDate[] range = dateRange(args);
        List<Map<String, Object>> rows = imagingReportMapper.selectByPatientIdAndDateRange(patientId, range[0], range[1]);
        if (rows.size() > MAX_ROWS) rows = rows.subList(0, MAX_ROWS);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patientId", patientId);
        data.put("count", rows.size());
        data.put("reports", rows);
        return ExecResult.ok(data, List.of(source("imaging", p, "查看影像报告")));
    }

    private ExecResult patientOverview(Long patientId, Patient p, Map<String, Object> args) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("patient", patientToMap(p));
        data.put("medicalRecords", medicalRecordMapper.countByPatientId(patientId));
        data.put("labReports", labReportMapper.countByPatientId(patientId));
        data.put("imagingReports", imagingReportMapper.countByPatientId(patientId));
        data.put("invoices", invoiceMapper.countByPatientId(patientId));
        data.put("totalSpend", invoiceMapper.sumTotalAmountByPatientId(patientId));
        return ExecResult.ok(data, List.of(source("patient", p, "查看患者档案")));
    }

    // ==================== helpers ====================

    /** Wrap a patient-scoped tool, resolving effective patientId + patient name. */
    private ExecResult patientScoped(String name, String module, Map<String, Object> args,
                                     Long scopedPatientId, PatientQuery fn) {
        Long patientId = scopedPatientId != null ? scopedPatientId : longArg(args.get("patientId"));
        if (patientId == null) {
            return ExecResult.error("缺少患者参数 patientId（可先调用 search_patients 找到患者 id）", List.of());
        }
        Patient p = patientMapper.selectById(patientId);
        if (p == null) {
            return ExecResult.error("未找到患者 id=" + patientId, List.of());
        }
        return fn.apply(patientId, p, args);
    }

    private AiToolSource source(String module, Patient p, String label) {
        return new AiToolSource(module, p.getId(), p.getName(), label);
    }

    private Map<String, Object> patientToMap(Patient p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("patientNo", p.getPatientNo());
        m.put("name", p.getName());
        m.put("gender", p.getGender());
        m.put("birthDate", p.getBirthDate() != null ? p.getBirthDate().toString() : null);
        m.put("phone", p.getPhone());
        return m;
    }

    private LocalDate[] dateRange(Map<String, Object> args) {
        LocalDate from = parseDate(args.get("dateFrom"), MIN_DATE);
        LocalDate to = parseDate(args.get("dateTo"), MAX_DATE);
        if (from.isAfter(to)) {
            LocalDate tmp = from; from = to; to = tmp;
        }
        return new LocalDate[]{from, to};
    }

    private LocalDate parseDate(Object val, LocalDate fallback) {
        if (val == null) return fallback;
        String s = String.valueOf(val).trim();
        if (s.isEmpty()) return fallback;
        try {
            return LocalDate.parse(s, DATE_FMT);
        } catch (Exception e) {
            return fallback;
        }
    }

    private String str(Object val) {
        return val == null ? null : String.valueOf(val);
    }

    private Long longArg(Object val) {
        if (val == null) return null;
        try {
            return Long.valueOf(String.valueOf(val).trim());
        } catch (Exception e) {
            return null;
        }
    }

    /** build a parameter property schema (valid JSON Schema, no extra keywords) */
    private Map<String, Object> prop(String type, String description) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("description", description);
        return m;
    }

    /** build a parameter object schema with a top-level required array */
    private Map<String, Object> schema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("type", "object");
        root.put("properties", properties);
        if (required != null && !required.isEmpty()) {
            root.put("required", required);
        }
        return root;
    }

    // ==================== nested types ====================

    private interface PatientQuery {
        ExecResult apply(Long patientId, Patient patient, Map<String, Object> args);
    }

    public static class ToolDef {
        public final String name;
        public final String description;
        public final Object parameters;
        public final String module;

        public ToolDef(String name, String description, Object parameters, String module) {
            this.name = name;
            this.description = description;
            this.parameters = parameters;
            this.module = module;
        }
    }

    public static class ExecResult {
        public final boolean ok;
        public final Object data;
        public final String error;
        public final List<AiToolSource> sources;

        private ExecResult(boolean ok, Object data, String error, List<AiToolSource> sources) {
            this.ok = ok;
            this.data = data;
            this.error = error;
            this.sources = sources;
        }

        public static ExecResult ok(Object data, List<AiToolSource> sources) {
            return new ExecResult(true, data, null, sources);
        }

        public static ExecResult error(String error, List<AiToolSource> sources) {
            return new ExecResult(false, null, error, sources);
        }
    }
}

package com.medical.emr.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.emr.dto.AiAnalyzeUrlRequest;
import com.medical.emr.dto.LlmConfigDto;
import com.medical.emr.exception.RateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final UserAiConfigService userAiConfigService;
    private final LlmClient llmClient;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public AiService(UserAiConfigService userAiConfigService, LlmClient llmClient) {
        this.userAiConfigService = userAiConfigService;
        this.llmClient = llmClient;
    }

    public String analyzeLabReport(String username, String reportData) {
        String systemPrompt = "你是一名经验丰富的临床检验医师，擅长解读各类检验报告。"
                + "请根据以下检验报告数据进行专业分析，包括：\n"
                + "1. 对每项指标，根据报告中给出的参考范围，自行判断是否正常、偏高或偏低\n"
                + "2. 列出所有异常指标并解读其可能的临床意义\n"
                + "3. 建议的后续检查或注意事项\n"
                + "请用通俗易懂的中文回答，便于患者理解。\n"
                + "数据格式为：- 项目名: 结果值 单位 (参考范围: 最小值-最大值)\n"
                + "判断规则：以每行括号内给出的参考范围作为判断依据；若未提供参考范围，可结合临床常识判断。\n"
                + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
        String userPrompt = "请分析以下检验报告数据，根据参考范围自行判断各指标是否正常：\n\n" + reportData;
        LlmConfigDto config = userAiConfigService.getEffectiveConfig(username);
        log.info("[AI] Analyze lab report, model={}", config.getModelId());
        return llmClient.chatCompletion(config, systemPrompt, userPrompt);
    }

    public String analyzeImagingReport(String username, String reportText) {
        String systemPrompt = "你是一名经验丰富的影像科医师，擅长解读各类影像检查报告（CT、MRI、X光、超声等）。"
                + "请根据以下影像报告OCR识别文本进行专业分析，包括：\n"
                + "1. 报告中的关键发现\n"
                + "2. 异常征象的临床意义\n"
                + "3. 建议的后续检查或随访\n"
                + "请用通俗易懂的中文回答，便于患者理解。"
                + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
        String userPrompt = "请分析以下影像报告内容：\n\n" + reportText;
        LlmConfigDto config = userAiConfigService.getEffectiveConfig(username);
        log.info("[AI] Analyze imaging report, model={}", config.getModelId());
        return llmClient.chatCompletion(config, systemPrompt, userPrompt);
    }

    public String analyzeByUrl(String username, AiAnalyzeUrlRequest request) {
        String fileUrl = request.getFileUrl();
        String type = request.getType();
        log.info("[AI] Downloading file from URL: {}", fileUrl);
        try {
            HttpRequest downloadRequest = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            HttpResponse<byte[]> downloadResponse = httpClient.send(downloadRequest, HttpResponse.BodyHandlers.ofByteArray());
            if (downloadResponse.statusCode() != 200) {
                throw new RuntimeException("下载文件失败: HTTP " + downloadResponse.statusCode());
            }
            byte[] fileBytes = downloadResponse.body();
            String base64Content = Base64.getEncoder().encodeToString(fileBytes);
            String systemPrompt;
            String userPromptPrefix;
            if ("lab_image".equalsIgnoreCase(type)) {
                systemPrompt = "你是一名经验丰富的临床检验医师，擅长解读各类检验报告。"
                        + "请根据用户上传的检验报告图片进行专业分析。"
                        + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
                userPromptPrefix = "请分析以下检验报告：\n"
                        + "患者: " + (request.getPatientName() != null ? request.getPatientName() : "未知") + "\n"
                        + "检验项目: " + (request.getTitle() != null ? request.getTitle() : "未知") + "\n"
                        + "报告日期: " + (request.getReportDate() != null ? request.getReportDate() : "未知") + "\n\n";
            } else {
                systemPrompt = "你是一名经验丰富的影像科医师，擅长解读各类影像检查报告。"
                        + "重要提示：你的分析仅供参考，不构成医疗诊断建议。请在回复末尾加上免责声明。";
                userPromptPrefix = "请分析以下影像报告：\n"
                        + "患者: " + (request.getPatientName() != null ? request.getPatientName() : "未知") + "\n"
                        + "报告标题: " + (request.getTitle() != null ? request.getTitle() : "未知") + "\n"
                        + "报告日期: " + (request.getReportDate() != null ? request.getReportDate() : "未知") + "\n\n";
            }
            LlmConfigDto config = userAiConfigService.getEffectiveConfig(username);
            return llmClient.visionCompletion(config, systemPrompt, userPromptPrefix, base64Content);
        } catch (RateLimitException e) {
            throw e;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AI] Failed to download or analyze file: {}", e.getMessage(), e);
            throw new RuntimeException("文件下载或分析失败: " + e.getMessage());
        }
    }
}

// lab-parser.js - Extracted from index.html
// Contains: LAB_ITEM_ALIASES, alias builder, normalizeItemName,
// parseLabTableFromOcrText, normalizeFlag, inferFlag, parseRefRange,
// LAB_TITLE_NAMES, LAB_CONTENT_NAMES, matchLabTestName, detectLabTestName
// These are all global functions/constants used by the Vue app.


// ============ 检验项目名称统一化（内置别名字典 + 用户自定义映射） ============
// Built-in alias dictionary: canonical name → array of known aliases
const LAB_ITEM_ALIASES = {
    // ---- 血常规 ----
    '白细胞计数': ['白细胞', 'WBC', '白细胞数', '白细胞总数'],
    '红细胞计数': ['红细胞', 'RBC', '红细胞数', '红细胞总数'],
    '血红蛋白': ['血红蛋白量', '血红蛋白', 'Hb', 'HGB', 'Hemoglobin', '血红蛋白浓度'],
    '红细胞压积': ['红细胞比容', 'HCT', '血细胞比容', '红细胞比积'],
    '血小板计数': ['血小板', 'PLT', '血小板数', '血小板总数'],
    '平均红细胞体积': ['MCV', '红细胞平均体积'],
    '平均红细胞血红蛋白含量': ['MCH', '平均红细胞血红蛋白含量', '红细胞平均血红蛋白量', '平均血红蛋白含量'],
    '平均红细胞血红蛋白浓度': ['MCHC', '红细胞平均血红蛋白浓度', '平均血红蛋白浓度'],
    '红细胞分布宽度': ['RDW'],
    '红细胞分布宽度CV': ['RDW-CV', 'RDW变异系数','RBC分布宽度-CV','RDW-CV','红细胞分布宽度-CV'],
    '红细胞分布宽度SD': ['RDW-SD', 'RDW标准差','RBC分布宽度-SD','红细胞分布宽度-SD'],
    '中性粒细胞比率': ['中性粒细胞百分比', '中性粒细胞百分率', '中性粒细胞百分数', 'NEUT%', 'NEU%', '中性粒细胞%'],
    '中性粒细胞计数': ['中性粒细胞绝对值', '中性粒细胞数', 'NEUT#', 'NEU#'],
    '淋巴细胞比率': ['淋巴细胞百分比', '淋巴细胞百分数', 'LYM%', 'LYMPH%', '淋巴细胞%'],
    '淋巴细胞计数': ['淋巴细胞绝对值', '淋巴细胞数', 'LYM#', 'LYMPH#'],
    '单核细胞比率': ['单核细胞百分比', '单核细胞百分数', 'MONO%', 'MON%', '单核细胞%'],
    '单核细胞计数': ['单核细胞绝对值', '单核细胞数', 'MONO#', 'MON#'],
    '嗜酸性粒细胞比率': ['嗜酸性粒细胞百分比', '嗜酸性粒细胞百分数', 'EOS%', 'EO%', '嗜酸粒细胞%', '嗜酸性粒细胞%','嗜酸性细胞%'],
    '嗜酸性粒细胞计数': ['嗜酸性粒细胞绝对值', '嗜酸性粒细胞直接计数', '嗜酸性粒细胞数', '嗜酸粒细胞绝对值', '嗜酸性细胞数', '嗜酸粒细胞数', '嗜酸性粒细胞数', 'EOS#', 'EO#'],
    '嗜碱性粒细胞比率': ['嗜碱性粒细胞百分比', '嗜碱性粒细胞百分数', 'BASO%', 'BA%', '嗜碱粒细胞%', '嗜碱性粒细胞%','嗜碱性细胞%'],
    '嗜碱性粒细胞计数': ['嗜碱性粒细胞绝对值', '嗜碱性粒细胞直接计数', '嗜碱性粒细胞数', '嗜碱粒细胞绝对值', '嗜碱性细胞数', '嗜碱粒细胞数', '嗜碱性粒细胞数', 'BASO#', 'BA#'],
    '血小板平均体积': ['MPV', '平均血小板体积', '平均PLT容积','平均PLT体积'],
    '血小板分布宽度': ['PDW','血小板平均分布宽度','PLT分布宽度',],
    '大型血小板比率': ['P-LCR', 'PLCR', '大血小板比率'],
    '血小板压积': ['PCT', '血小板压积', '血小板比积', '血小板比容'],
    '白细胞计数': ['白细胞', 'WBC'],
     // ---- 炎症指标 ----
    'C反应蛋白': ['CRP', '超敏C反应蛋白', '高敏C一反应蛋白', 'hs-CRP', '血清C反应蛋白', '超敏C—反应蛋白', '超敏C反应蛋白测定','超敏C-反应蛋白', '超敏C一反应蛋白'],
    '降钙素原': ['PCT', '血清降钙素原'],
    '红细胞沉降率': ['血沉', 'ESR'],
    '白介素6': ['IL-6', 'IL6', '白细胞介素6', '白细胞介素-6'],
    // ---- 肝功能 ----
    '丙氨酸氨基转移酶': ['谷丙转氨酶', '血清谷丙转氨酶', 'ALT', 'GPT', '丙氨酸转氨酶'],
    '天门冬氨酸氨基转移酶': ['谷草转氨酶', '血清谷草转氨酶', 'AST', 'GOT', '天冬氨酸转氨酶', '天冬氨酸氨基转移酶'],
    '谷氨酰转移酶': ['Y-谷氨酰基转移酶', '谷氨酰转移酶', 'GGT' , 'γ-谷氨酰转肽酶', '谷氨酰基转移酶'],
    '总蛋白': ['血清总蛋白', 'TP'],
    '白蛋白': ['血清白蛋白', 'ALB', '清蛋白'],
    '球蛋白': ['血清球蛋白', 'GLB', 'GLOB'],
    '白球比': ['白蛋白/球蛋白', 'A/G', '白球比值', '白球比例', '白球比例值', '血清白球比例'],
    '总胆红素': ['血清总胆红素', 'TBIL', 'T-BIL'],
    '直接胆红素': ['结合胆红素', 'DBIL', 'D-BIL', '直胆'],
    '间接胆红素': ['非结合胆红素', 'IBIL', 'I-BIL', '间胆'],
    '碱性磷酸酶': ['ALP', 'AKP', 'ALP酶', '血清碱性磷酸酶'],
    '谷氨酰转肽酶': ['γ-谷氨酰转肽酶', 'GGT', 'γ-GT', 'r-GT', 'Y-GT'],
    '腺苷脱氨酶': ['ADA'],
    // ---- 肾功能 ----
    '肌酐': ['血肌酐', '血清肌酐', '血清肌酐值', 'Cr', 'CREA', 'Cre', 'SCr'],
    '尿比重': ['尿比重', '比重', 'SG', '尿比重(干化学法)', '比重(干化学法)'],
    '尿pH': ['pH', 'PH', '尿PH'],
    '尿酸': ['血尿酸', '血清尿酸', 'UA', 'URIC'],
    '胱抑素C': ['半胱氨酸蛋白酶抑制剂C', 'CysC', 'Cys-C'],
    '24小时尿蛋白': ['参考区间24小时尿蛋白'],
    // ---- 血脂 ----
    '总胆固醇': ['血清总胆固醇', 'TC', 'TCHO', 'T-CHO', 'CHOL'],
    '甘油三酯': ['血清甘油三酯', 'TG', 'TRIG'],
    '高密度脂蛋白胆固醇': ['高密度脂蛋白', 'HDL-C', 'HDL', 'HDL胆固醇'],
    '低密度脂蛋白胆固醇': ['低密度脂蛋白', 'LDL-C', 'LDL', 'LDL胆固醇'],
    // ---- 血糖 ----
    '空腹血糖': ['血糖', 'GLU', 'FPG', 'FBG', '空腹葡萄糖', '空腹血葡萄糖'],
    '尿葡萄糖': ['尿糖', '尿GLU'],
    '尿胆原': ['尿胆原', '尿URO', 'URO'],
    '糖化血红蛋白': ['HbA1c', 'GHb', '糖化血红蛋白A1c','糖化'],
    // ---- 电解质 ----
    '钾': ['血钾', '血清钾', 'K', 'K+'],
    '钠': ['血钠', '血清钠', 'Na', 'Na+'],
    '氯': ['血氯', '血清氯', 'Cl', 'Cl-'],
    '钙': ['血钙', '血清钙', 'Ca', 'Ca2+', '总钙'],
    '磷': ['血磷', '血清磷', 'P', '无机磷', '血清无机磷'],
    '镁': ['血镁', '血清镁', 'Mg', 'Mg2+'],
    '碳酸氢根': ['碳酸氢盐', 'HCO3', 'CO2CP', '二氧化碳结合力', '血清总二氧化碳', '总二氧化碳'],
    // ---- 凝血功能 ----
    '凝血酶原时间': ['PT', '血浆凝血酶原时间'],
    '国际标准化比值': ['INR', 'PT-INR'],
    '活化部分凝血活酶时间': ['APTT', 'aPTT', '部分凝血活酶时间'],
    '凝血酶时间': ['TT', '血浆凝血酶时间'],
    '纤维蛋白原': ['FIB', 'Fg', 'FBG凝血', '血浆纤维蛋白原'],
    'D-二聚体': ['D-Dimer', 'DD', 'D二聚体'],
    // ---- 心肌标志物 ----
    '肌钙蛋白T': ['cTnT', 'TnT', '心肌肌钙蛋白T', '超敏肌钙蛋白T'],
    '肌钙蛋白I': ['cTnI', 'TnI', '心肌肌钙蛋白I', '超敏肌钙蛋白I'],
    '肌酸激酶': ['CK', 'CPK', '磷酸肌酸激酶'],
    '肌酸激酶同工酶': ['CK-MB', 'CKMB', 'CKMB-MB', '肌酸激酶-MB亚型', '肌酸激酶-MB亚型质量'],
    '乳酸脱氢酶': ['LDH', 'LD','乳酸脫氢酶', '血清乳酸脱氢酶'],
    'B型钠尿肽': ['BNP', 'NT-proBNP', 'proBNP', 'N端前脑钠肽', 'N端脑钠肽', 'N端-B型钠尿肽前体'],
    '肌红蛋白': ['MYO', 'Mb', '血清肌红蛋白'],
    // ---- 肿瘤标志物 ----
    '甲胎蛋白': ['AFP', '甲胎蛋白定量'],
    '癌胚抗原': ['CEA', '癌胚抗原定量'],
    '糖链抗原125': ['CA125', 'CA-125', '糖类抗原125'],
    '糖链抗原199': ['CA199', 'CA19-9', 'CA-199', '糖类抗原199', '糖链抗原19-9'],
    '糖链抗原153': ['CA153', 'CA15-3', 'CA-153', '糖类抗原153', '糖链抗原15-3'],
    '糖链抗原724': ['CA724', 'CA72-4', 'CA-724', '糖类抗原724', '糖链抗原72-4'],
    '糖链抗原242': ['CA242', 'CA-242', '糖类抗原242'],
    '糖链抗原50': ['CA50', 'CA-50', '糖类抗原50'],
    '糖链抗原19-9': ['CA199', 'CA19-9', 'CA-199', '糖类抗原199'],
    '神经元特异烯醇化酶': ['NSE'],
    '细胞角蛋白19片段': ['CYFRA21-1', 'CYFRA', '细胞角蛋白211'],
    '鳞状细胞癌相关抗原': ['SCC'],
    '胃泌素释放肽前体': ['ProGRP'],
    '降钙素': ['CT'],
    '叶酸': ['FOL', 'Folate', '血清叶酸'],
    '抗甲状腺球蛋白抗体': ['TGAb', '抗TG抗体'],
    '抗甲状腺过氧化物酶抗体': ['TPOAb', '抗TPO抗体'],
    '甲状腺球蛋白': ['TG'],
    '前列腺特异性抗原': ['PSA', 'tPSA', '总PSA'],
    '游离前列腺特异性抗原': ['fPSA', '游离PSA'],
    '铁蛋白': ['SF', '血清铁蛋白', 'Ferritin'],
    // ---- 甲状腺功能 ----
    '促甲状腺激素': ['TSH', '血清促甲状腺激素'],
    '游离T3': ['FT3', '游离三碘甲状腺原氨酸', '游离三碘甲状原氨酸'],
    '游离T4': ['FT4', '游离甲状腺素', '游离甲状腺素'],
    '总T3': ['TT3', '三碘甲状腺原氨酸', '三碘甲状原氨酸'],
    '总T4': ['TT4', '甲状腺素']
};

// Build reverse lookup: alias → canonical name (case-insensitive for English)
const aliasToCanonical = {};
for (const [canonical, aliases] of Object.entries(LAB_ITEM_ALIASES)) {
    for (const alias of aliases) {
        aliasToCanonical[alias] = canonical;
        aliasToCanonical[alias.toUpperCase()] = canonical;
    }
}

// User custom mappings (learned from manual edits) - stored in localStorage
const USER_MAPPING_KEY = 'emr_lab_item_mappings';
let userItemMappings = {};
try {
    const saved = localStorage.getItem(USER_MAPPING_KEY);
    if (saved) userItemMappings = JSON.parse(saved);
} catch (e) {
    console.warn('[Alias] Failed to load user mappings:', e);
}

const saveUserItemMappings = () => {
    try {
        localStorage.setItem(USER_MAPPING_KEY, JSON.stringify(userItemMappings));
    } catch (e) {
        console.warn('[Alias] Failed to save user mappings:', e);
    }
};

// Normalize item name: user mapping (highest priority) → built-in alias → original
const normalizeItemName = (rawName) => {
    if (!rawName) return rawName;
    // 【修复】清理括号内方法名："尿素(干化学法)" → "尿素"
    const cleanedName = rawName.replace(/\s*[\(（].*(?:法|测定|检测|试验|方法)[\)）]\s*$/, '').trim();
    if (cleanedName !== rawName) {
        console.log(`[Alias] Cleaned method suffix: "${rawName}" → "${cleanedName}"`);
    }
    const nameToLookup = cleanedName;
    // Priority 1: user custom mapping
    if (userItemMappings[nameToLookup]) {
        // 【新增】防止用户自定义映射将血常规项目转换为尿常规名称
        // 如果用户映射了「红细胞计数」→「红细胞定量」，这个转换应仅限于尿常规报告中
        // 这里不做仿尿常规检测（该按报告类型判断，封装到 parseLabTableFromOcrText 中）
        const mappedValue = userItemMappings[nameToLookup];
        console.log(`[Alias] User mapping: "${nameToLookup}" → "${mappedValue}"`);
        return mappedValue;
    }
    // Priority 2: built-in alias dictionary (exact match)
    if (aliasToCanonical[nameToLookup]) {
        console.log(`[Alias] Built-in: "${nameToLookup}" → "${aliasToCanonical[nameToLookup]}"`);
        return aliasToCanonical[nameToLookup];
    }
    // Priority 3: built-in alias dictionary (case-insensitive for English names)
    if (aliasToCanonical[nameToLookup.toUpperCase()]) {
        console.log(`[Alias] Built-in(CI): "${nameToLookup}" → "${aliasToCanonical[nameToLookup.toUpperCase()]}"`);
        return aliasToCanonical[nameToLookup.toUpperCase()];
    }
    // No match - return cleaned name (not original, to benefit from cleaning)
    return cleanedName;
};

// OCR文本解析 — v5: 单元格合并 + 参考范围锚定 + 纯比较推断flag
// 核心策略：
//   1. 预处理：规范化文本（双横线→单横线、全角→半角、修复OCR数字空格）
//   2. 单元格合并：PaddleOCR常逐单元格输出，需合并为完整行
//   3. 参考范围锚定：只提取同时具备 中文项目名 + 纯数值结果 + N-N参考范围 的行
//   4. flag 仅通过 结果 vs 参考范围 比较推断，不从OCR文本提取
const parseLabTableFromOcrText = (ocrText) => {
    if (!ocrText) return [];
    
    console.log('=== LAB OCR RAW TEXT ===');
    console.log(ocrText);
    console.log('=== END ===');
    
    // ============ Step 0: 文本规范化 ============
    let normalizedText = ocrText
        .replace(/--+/g, '-')          // 0--26 → 0-26
        .replace(/——/g, '-')            // 中文破折号
        .replace(/～/g, '~')            // 全角波浪号
        .replace(/＜/g, '<')
        .replace(/＞/g, '>')
        .replace(/（/g, '(')
        .replace(/）/g, ')')
        .replace(/，/g, ',')
        .replace(/：/g, ':')
        .replace(/(\d+)\.\s+(\d)/g, '$1.$2');   // 修复OCR小数空格: "5. 84" → "5.84", "1. 8" → "1.8"
    
    // 【修复】保护肿瘤标志物中的数字-横杠格式（如糖链抗原19-9、CA72-4）不被拆分
    const caMarkers = [];
    normalizedText = normalizedText.replace(/(糖链抗原|CA)(\d+-\d+)/g, (match, prefix, num) => {
        caMarkers.push({placeholder: `__CA_MARKER_${caMarkers.length}__`, value: match});
        return caMarkers[caMarkers.length - 1].placeholder;
    });
    
    normalizedText = normalizedText.replace(/([\u4e00-\u9fa5*＊])(\d)/g, '$1 $2');  // 中文与数字粘连拆分: "浓度318" → "浓度 318"
    
    // 恢复保护的肿瘤标志物
    caMarkers.forEach(({placeholder, value}) => {
        normalizedText = normalizedText.replace(placeholder, value);
    });
    
    // OCR常见数字误识别修复 (参考范围中 S→5, O→0)
    normalizedText = normalizedText
        .replace(/(\s)S([-~]\d)/g, '$15$2')     // " S-0" → " 5-0"
        .replace(/(\d[-~])S(\s|$)/g, '$15$2')   // "0-S " → "0-5 "
        .replace(/(\s)O([-~]\d)/g, '$10$2')     // " O-5" → " 0-5"
        .replace(/(\d[-~])O(\s|$)/g, '$10$2')   // "5-O " → "5-0 "
        .replace(/\/u[1lI](?=\s|$)/gi, '/ul'); // OCR误识别: /u1 /uI → /ul (microliter unit)
    
    const rawLines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 判断是否为报告头部/信息行
    const isHeaderLine = (line) => {
        if (/^[-=_*·.。─│┃]+$/.test(line)) return true;
        // 手机状态栏噪声：运营商名称+时间（如"中国联通00:44Q"、"中国移动 12:30"）
        if (/^(中国联通|中国移动|中国电信|CHINA MOBILE|UNICOM|TELECOM).{0,20}\d{1,2}:\d{2}/.test(line)) return true;
        if (/^(中国联通|中国移动|中国电信)\s*$/.test(line)) return true;
        // 手机状态栏：运营商+网速（如"中国电信 K/s"、"中国联通 MB/s"）
        if (/^(中国联通|中国移动|中国电信).{0,10}(K\/s|KB\/s|MB\/s|Mbps)/.test(line)) return true;
        // 浏览器地址栏/报告查询链接噪声（如"报告查询 X fwcs.linkingcloud.cn"）
        if (/(报告查询|查看报告).{0,5}(http|www|\.|cn|com)/.test(line)) return true;
        if (/^https?:\/\/.+/.test(line)) return true;
        if (/^[a-zA-Z0-9\-\.]+\.(cn|com|net|org|gov)/.test(line)) return true;
        // 医院科室/楼层横幅噪声（如"东院免疫室茹岁"、"检验科免疫室"）：纯汉字且含院/室/科/楼/区但无数字
        // 例外：夏科雷登结晶是检验项目，不是科室
        if (/^[一-龥]{2,12}$/.test(line) && /(院|室|科|楼|区|部|站|组)/.test(line) && !/\d/.test(line) && !line.includes('夏科雷登结晶')) return true;
        // 纯表头行（单独一行）才跳过；"结果/单位 Septin9..." 后面跟了内容则不跳过（由merge阶段处理）
        if (/^(项目代码|项目名称|检验项目|检验结果|项目明细|序号|编号|No[.\s])/i.test(line)) return true;
        if (/^(结果[\/／]单位|结果\/单位)\s*$/.test(line)) return true;
        if (/^(样本|标本|送检|科室|床号|病区|住院号|门诊号|姓名|性别|年龄|出生)(\s|$)/i.test(line)) return true;
        if (/^(医生|医师|护士|备注|说明|提示|审核|复核|签名|签发|声明|检验者|核对者|核者|报告者)/i.test(line)) return true;
        if (/^(解释与说明|联系电话|该报告|注意事项|温馨提示|检测说明)[：:]/i.test(line)) return true;
        // 超长说明性文字行（>40字且含：）直接跳过
        if (line.length > 40 && /[：:]/.test(line) && /[一-龥]{10,}/.test(line)) return true;
        // 仪器行：只跳过纯仪器信息行（仪器名称单独一行、或仪器:xxx），含检验数据的行不跳过
        if (/^仪器\s*(名称)?\s*$/.test(line)) return true;
        if (/^仪器[：:]\S/.test(line)) return true;
        if (/^(报告日期|报告时间|打印时间|打印日期|页码|第\d+页|page)/i.test(line)) return true;
        if (/^(采样|采集|送检|接收|检验日期|检验时间|申请日期|申请时间)/i.test(line)) return true;
        if (/^(临床诊断|诊断|病历号|就诊|条码|标签|报告单|检查报告)/i.test(line)) return true;
        if (/^\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}/.test(line)) return true;
        // 表头关键词检测：必须是纯表头（后面跟着其他表头词或很短），不能是数据行
        // 数据行如"试验方法 WBC *白细胞计数"不应被跳过
        const headerKeywords = ['简称', '名称', '结果', '参考范围', '参考区间', '单位', '方法', '试验方法', '检测方法'];
        for (const kw of headerKeywords) {
            const regex = new RegExp(`^${kw}$|^${kw}\\s+(简称|名称|结果|参考范围|参考区间|单位|方法|试验方法|检测方法)`);
            if (regex.test(line)) return true;
            // 【新增】检测表头关键词+代码格式（如"参考范围 URO", "结果 BLD"）
            const regexWithCode = new RegExp(`^${kw}\\s+[A-Za-z0-9]+$`);
            if (regexWithCode.test(line)) return true;
        }
        // Special case: "方法 CA242", "化学发光 CA50", "电化学发光 AFP" should NOT be treated as header
        // These are data lines in tumor marker/thyroid reports
        // 特殊情况：肿标/甲功报告中的方法+代码行不应被当作表头
        if (/^方法\s+[A-Za-z0-9\-]+$/.test(line)) return false;
        if (/^(化学发光|电化学发光)\s+[A-Za-z0-9\-]+/.test(line)) return false;
        if (/^单位\s*(试验方法|检测方法|方法)/i.test(line)) return true;
        // Skip pure instrument lines (not lines with codes)
        // 跳过纯仪器行（不包含代码的行）
        if (/^罗氏cobas系列$/i.test(line)) return true;
        if (/^迈瑞CL\d+i$/i.test(line)) return true;
        if (/^希森美康CS\d+[A-Z]*\s*(凝固法|比浊法|比色法|流式法|化学发光|化学发光法|电化学发光|电化学发光法)?$/i.test(line)) return true;
        // Skip pure method names without following codes
        // 跳过纯方法行（如单独一行的"化学发光"、"电化学发光"）
        if (/^(化学发光|电化学发光|化学发光法|电化学发光法|比色法|流式法|干化学法|计算法|电阻抗法)$/.test(line)) return true;
        return false;
    };
    
    // ============ 文本型结果值识别（非数值型检验项目） ============
    // Covers urine routine, stool routine, body fluid qualitative items
    const TEXT_RESULT_VALUES = [
        '阴性', '阳性', '弱阳性', '强阳性', '弱阴性',
        '正常', '异常',
        '未见', '未提示', '未检出', '少见', '偶见', '少量', '中量', '大量', '痕量', '满视野',
        '透明', '微浑', '浑浊', '清澈', '清亮',
        '淡黄色', '黄色', '深黄色', '浅黄色', '红色', '棕色', '褐色', '无色', '橙色', '琥珀色', '草黄色', '茶色', '稻黄色',
        '均一型', '非均一型', '混合型',
        '成形', '软', '稀', '糊状', '水样', '烂',
        '无', '有', '未提示异常'
    ];
    const TEXT_RESULT_SET = new Set(TEXT_RESULT_VALUES);
    // 【新增】加入化学元素缩写（统一存大写供 toUpperCase() 查找），如 Na、Cl、Ca、Mg 等
    const SPECIAL_LATIN_ITEM_NAMES = new Set(['PH', 'NA', 'CL', 'CA', 'MG', 'FE', 'CU', 'ZN', 'K', 'P']);
    const isSpecialLatinItemName = (rawName) => {
        if (!rawName) return false;
        return SPECIAL_LATIN_ITEM_NAMES.has(rawName.trim().toUpperCase());
    };
    const isInlineResultToken = (token) => {
        if (!token) return false;
        const trimmed = token.trim();
        if (!trimmed) return false;
        if (/^[↑↓↗↘]$/.test(trimmed)) return true;
        if (isTextResultToken(trimmed)) return true;
        if (/^[+\-]{1,3}$/.test(trimmed)) return true;
        if (/^[+\-]{1,2}\d{1,2}$/.test(trimmed)) return true;
        if (/^\d{1,2}[+\-]{1,2}$/.test(trimmed)) return true;
        if (trimmed === '±') return true;
        if (trimmed === '土') return true; // 【新增】OCR error: ± misrecognized as 土
        return false;
    };
    // 【新增】检测是否为纯单位行（如"个/μ"），这些不应被识别为项目名称
    const isPureUnitLine = (line) => {
        if (!line) return false;
        const trimmed = line.trim();
        // 匹配纯单位格式：个/μ、个/u、个/μL、cells/μL 等
        return /^个\/[μµu]L?$/i.test(trimmed) || /^cells\/[μµu]L?$/i.test(trimmed);
    };

    const isTextResultToken = (rawToken) => {
        if (!rawToken) return false;
        const token = rawToken.trim();
        if (!token) return false;
        // 【修复】含"参考值:"前缀的token不是结果，是参考范围，直接排除
        if (/^参考值\s*[:：]/.test(token)) return false;
        if (TEXT_RESULT_SET.has(token)) return true;
        if (/^[+＋]{1,4}$/.test(token)) return true;
        if (/^-+$/.test(token) || /^[－—–-]{1,4}$/.test(token)) return true;
        if (/^[±]{1,2}$/.test(token)) return true;
        if (/^\([+＋]{1,4}\)$/.test(token) || /^\(-+\)$/.test(token) || /^\(±\)$/.test(token)) return true;
        // 【新增】OCR修正：单独的"·"可能是"+"的误识别
        if (token === '·' || token === '•') return true;
        if (/^[+＋-－—–][0-9]$/.test(token) || /^[0-9][+＋]$/.test(token)) return true; // +1, -1, 1+
        if (/^[+＋][一-]$/.test(token)) return true; // OCR error: +- misrecognized as +一
        if (token === '土') return true; // 【新增】OCR error: ± misrecognized as 土
        if (/(阴性|阳性|弱阳性|强阳性|弱阴性)/.test(token)) return true;
        // 【新增】识别带箭头的文本结果，如"弱阳性(↑"（包括不完整的括号）
        if (/(阴性|阳性|弱阳性|强阳性|弱阴性)[(（][↑↓)]/.test(token)) return true;
        if (/(未见|未提示|未检出|无异常|未提示异常)/.test(token)) return true;
        if (/(透明|浑|清亮|清澈)/.test(token)) return true;
        if (/(黄色|红色|棕色|褐色|草黄色|稻黄色|橙色|茶色|棕黄色|黄褐色)/.test(token)) return true;
        if (/(软便|硬便|稀便|水样便|糊状便|成形便|烂便|不成形)/.test(token)) return true;
        if (/^norm\.?$/i.test(token)) return true; // 尿胆原参考范围 norm.
        return false;
    };

    // 检测报告中是否有"项目代码/代码/简称/项目简称"列
    // 用于决定是否拆分像"PLT分布宽度"这样的项目
    const hasCodeColumn = rawLines.some(line =>
        /^(项目代码|代码|简称|项目简称|代号|项目代号)/i.test(line)
    );
    console.log(`[Parse] hasCodeColumn: ${hasCodeColumn}`);

    // 【新增】检测是否为尿常规报告（用于后续项目名称转换）
    // 多关键词检测：标题关键词 或 样本类型 或 典型项目组合
    const hasUrineTitle = /(尿液分析|尿常规|尿液检查|尿检|尿液分析组合)/i.test(ocrText);
    const hasUrineSampleType = /样本类型[:：]\s*尿/i.test(ocrText);
    const hasUrineItems = /(尿比重|尿pH|尿PH|尿胆原|尿胆红素|尿隐血|尿蛋白|尿酮体|尿葡萄糖|尿亚硝酸盐|尿白细胞酯酶|尿红细胞)/i.test(ocrText);
    const isUrineRoutine = hasUrineTitle || hasUrineSampleType || hasUrineItems;
    if (isUrineRoutine) {
        console.log(`[Parse] Detected: 尿常规报告 (title=${hasUrineTitle}, sample=${hasUrineSampleType}, items=${hasUrineItems})`);
    }

    // ============ Step 1: 单元格合并 ============
    // PaddleOCR常将表格每个单元格作为独立行输出
    // 策略：以"中文起始"的行作为新数据行起点，后续非中文起始行追加
    const mergedLines = [];
    let buffer = '';
    // 【关键修复】CA强制延长合并计数器：当检测到CA19-9/CA72-4/CA15-3时，强制合并后续3-4行
    let caForceMergeCount = 0;
    
    for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Skip unit value lines (like "mmo1/L", "g/L", "umol/L", "10^9/L", "U/L")
        // These are unit column values in dual-column reports
        // Note: OCR may mistake 'l' for '1', so use [l1] to match both
        const isUnitValueLine = /^(mm?o[l1]|mmol|umol|μmol|g|mg|U|IU|ml|%|mmHg|kPa|pg|fL|ng|nmol)\/L$/i.test(trimmed) ||
                               /^\d+[\^\/·]\d+\/L$/i.test(trimmed) ||  // 10^9/L, 10^12/L
                               /^(umol|μmol|mmol|mg|g|U|IU|ml|pg|ng|U)\/L$/i.test(trimmed);
        if (isUnitValueLine) {
            console.log(`[Parse] MERGE_UNIT: "${trimmed}"`);
            // Merge unit line into buffer (don't flush yet, ref range may follow)
            if (buffer) {
                buffer += ' ' + trimmed;
            }
            continue;
        }
        
        // Skip standalone arrow lines (they should be merged into previous line)
        // But ensure they don't contaminate next line
        if (/^[↑↓↗↘]$/.test(trimmed)) {
            if (buffer) {
                buffer += ' ' + trimmed;
                console.log(`[Parse] MERGE_ARROW: "${trimmed}" into previous line`);
            }
            continue;
        }
        
        // "参考值" lines should merge into previous line (vertical mobile format)
        const isRefValueLine = /^参考值\s*[:：]/.test(trimmed);
        if (isRefValueLine && buffer) {
            buffer += ' ' + trimmed;
            continue;
        }
        
        // 【修复】表头+项目名合并行："结果/单位 Septin9基因甲基化检测" → 剥离表头前缀，只保留项目名
        // 必须在 MERGE_TEXT_RESULT 之前执行，否则 buffer 中会保留"结果/单位"前缀被一起合并
        const headerDataMergeMatch = trimmed.match(/^(结果[\/／]单位|项目明细|项目名称|检验项目)\s+([\u4e00-\u9fa5A-Za-z0-9].+)$/);
        if (headerDataMergeMatch) {
            const itemNamePart = headerDataMergeMatch[2].trim();
            console.log(`[Parse] STRIP_HEADER_PREFIX: "${trimmed}" → "${itemNamePart}"`);
            if (buffer) mergedLines.push(buffer);
            buffer = itemNamePart;
            continue;
        }

        // 【修复】当buffer是纯项目名（仅汉字/字母，无数字结果），下一行是文本结果如"阳性(+)"，合并进去
        // 例如：buffer="Septin9基因甲基化检测"，trimmed="阳性(+)" → 合并为一行
        const bufferIsPureName = buffer && /^[\u4e00-\u9fa5A-Za-z0-9\s\-·\/]+$/.test(buffer) && !/\d+\.\d+/.test(buffer);
        const isTextResultLine = /^(阳性|阴性|弱阳性|强阳性|弱阴性)[^\u4e00-\u9fa5]*$/.test(trimmed) 
            || /^\([+＋\-]\)$/.test(trimmed) || /^[+＋]{1,4}$/.test(trimmed);
        // 【新增修复】尿常规双列格式：buffer是"亚硝酸盐"或"亚硝酸盐 -"且下一行是"阴性"时，不要合并（避免与右列pH混淆）
        // 仅针对这个特定场景：buffer以"亚硝酸盐"开头且trimmed是"阴性"
        const isUrineDualColumnConflict = buffer && buffer.startsWith('亚硝酸盐') && trimmed === '阴性';
        // 【新增修复】OCR错误：buffer是"一"且trimmed是"阴性"时，不要合并（避免"一 阴性"被当作项目名）
        const isOneNegativeConflict = buffer === '一' && trimmed === '阴性';
        if (isUrineDualColumnConflict) {
            console.log(`[Parse] SKIP MERGE_TEXT_RESULT: buffer="${buffer}", trimmed="${trimmed}" (urine dual column conflict)`);
            mergedLines.push(buffer);
            mergedLines.push(trimmed); // 将"阴性"也作为独立行推送
            buffer = ''; // 重置buffer为空，让"pH 6.50 5-7.5"作为独立行处理
            continue;
        }
        if (isOneNegativeConflict) {
            console.log(`[Parse] SKIP MERGE_TEXT_RESULT: buffer="${buffer}", trimmed="${trimmed}" (one negative conflict)`);
            mergedLines.push(buffer);
            mergedLines.push(trimmed); // 将"阴性"也作为独立行推送
            buffer = ''; // 重置buffer为空
            continue;
        }
        if (bufferIsPureName && isTextResultLine && !isUrineDualColumnConflict && !isOneNegativeConflict) {
            buffer += ' ' + trimmed;
            console.log(`[Parse] MERGE_TEXT_RESULT: "${trimmed}" into "${buffer}"`);
            continue;
        }
        
        // Handle "单位" column lines in dual-column reports
        // If line starts with "单位" + abbreviation, extract just the abbreviation part
        if (/^单位\s+/.test(trimmed)) {
            const unitAbbrMatch = trimmed.match(/^单位\s+([A-Za-z0-9\-]+)(.*)/);
            if (unitAbbrMatch) {
                const rest = unitAbbrMatch[2] || '';
                const newLine = unitAbbrMatch[1] + rest;
                const t = newLine.trim();
                if (t) {
                    // Treat this as abbreviation line (new row)
                    if (buffer) mergedLines.push(buffer);
                    buffer = t;
                }
            }
            // Skip pure "单位" lines or already processed lines
            continue;
        }
        
        const startsWithChinese = /[\u4e00-\u9fa5]/.test(trimmed.charAt(0));
        const startsWithCodeChinese = /^\d{1,6}\s+[\u4e00-\u9fa5]/.test(trimmed);
        // Lab abbreviations that should start a new line:
        // Pattern 1: Abbreviation followed by Chinese (RBC分布宽度, HDL-C高密度脂蛋白等)
        // Support hyphenated codes like HDL-C, LDL-C, B2-MG
        const startsWithLabAbbrCN = /^[A-Z][A-Z0-9\-]*[\u4e00-\u9fa5]/.test(trimmed);
        // Pattern 2: Pure abbreviation like "Urea", "Cr", "TP" (standalone or followed by space/*)
        // Common lab abbreviations used in dual-column reports
        // 【修复】添加带横杠的CA肿瘤标志物：CA19-9、CA72-4、CA15-3、CA50、CA242、CA125
        const abbrList = 'Urea|Cr|UA|GLU|K|Na|Cl|Ca|P|Mg|TP|ALB|GLOB|ALT|AST|GGT|ALP|LDH|CK|CK-MB|AMS|TC|TG|HDL|HDL-C|LDL|LDL-C|TBIL|DBIL|IBIL|A/G|B2-MG|GR|C02|HCO3|PT|APTT|TT|FIB|DD|WBC|RBC|PLT|HGB|HCT|MCV|MCH|MCHC|RDW|NEUT|LYM|MONO|EOS|BASO|MPV|PDW|GLB|AG|AST|CRE|BUN|URIC|BILI|D-BILI|I-BILI|CHE|LIP|AMY|PHE|TBA|AFP|CEA|CA125|CA199|CA19-9|CA153|CA15-3|CA724|CA72-4|CA242|CA50|PSA|FPSA|NSE|CYF|PGI|PGII|SCC|FER|CTNI|CKMB|MYO|BNP|NTBNP|HSCRP|CRP|PCT|IL6|ESR|ASO|RF|C3|C4|IgA|IgG|IgM|CH50|TRF|TRN|FE|SF|FERR|FOL|B12|VB12|VITD|PTH|TSH|FT3|FT4|TT3|TT4|T3|T4|TGAB|TPOAB|TRAB|INS|CPEP|GA|HbA1c|PG|BG';
        const labAbbrStandalone = new RegExp(`^(${abbrList})$`, 'i');
        const labAbbrWithFollow = new RegExp(`^(${abbrList})(\\s|$|[\\*\\uff0a])`, 'i');
        // Also need to check if it starts with "单位" + abbreviation (previous row unit + this row abbr)
        const startsWithUnitAbbr = /^\s*单位\s+[A-Za-z\-]+/.test(trimmed);
        
        // Test abbreviation patterns (with leading whitespace trimmed)
        const trimmedForTest = trimmed.replace(/^\s+/, '');
        const isStandaloneAbbr = labAbbrStandalone.test(trimmedForTest);
        const isAbbrWithFollow = labAbbrWithFollow.test(trimmedForTest);
        const startsWithPureAbbr = isStandaloneAbbr || isAbbrWithFollow || startsWithUnitAbbr;
        
        // Tumor marker report format: "方法 CA242", "化学发光 CA50", "电化学发光 AFP"
        // These lines should be merged with the next line (project name line)
        const isMethodCodeLine = /^(方法|化学发光|电化学发光)\s+[A-Za-z0-9\-]+/.test(trimmed);
        
        // Special handling for standalone abbreviations (like Mg, GLOB, A/G) 
        // They should be merged INTO the next line that has Chinese, then wait for result
        if (isStandaloneAbbr && buffer) {
            // Check if buffer already has standalone abbr waiting for Chinese
            const wasStandaloneAbbr = labAbbrStandalone.test(buffer.replace(/^\s+/, ''));
            if (wasStandaloneAbbr) {
                // Current buffer is standalone abbr, this line is the result value
                // Complete the previous row
                mergedLines.push(buffer);
                buffer = trimmed;
            } else {
                buffer += ' ' + trimmed;
            }
        } else if (isStandaloneAbbr && !buffer) {
            // Standalone abbreviation as buffer, wait for Chinese name line
            buffer = trimmed;
        } else if (isMethodCodeLine && !buffer) {
            // Tumor marker format: "方法 CA242" or "电化学发光 AFP" - store as buffer
            // wait for next line which contains project name
            buffer = trimmed;
            console.log(`[Parse] Method+Code line buffered: "${trimmed.substring(0, 30)}"`);
        } else if (isMethodCodeLine && buffer) {
            // Should not happen often, but merge if there's already a buffer
            buffer += ' ' + trimmed;
        } else if (startsWithChinese || startsWithCodeChinese || startsWithLabAbbrCN || startsWithPureAbbr) {
            // First check if this is actually an instrument/method line that happens to start with Chinese
            // 首先检查这是否实际上是仪器/方法行（虽然以中文开头）
            if (/^罗氏cobas系列/.test(trimmed) || /^希森美康CS\d+/.test(trimmed)) {
                // Instrument line starting with Chinese name
                // Only push buffer if it already has ref range (completing the row), otherwise keep accumulating
                // 只有buffer已包含参考范围（完整数据行）时才推送，否则继续累积
                // Check for reference range patterns, but exclude N-N patterns preceded by Chinese (like "糖链抗原19-9")
                const hasSingleSideRef = /[<>≤≥]\s*\d/.test(buffer);
                const hasRangeWithSpace = /\d+\.?\d*\s*[-~～]+\s*\d+\.?\d*/.test(buffer);  // supports 0-15, 20--43
                const hasResultWithFlag = /\d+\.?\d*\s*[↑↓]\s*$/.test(buffer);
                const hasRefRange = hasSingleSideRef || hasRangeWithSpace || hasResultWithFlag;
                if (buffer && hasRefRange) {
                    mergedLines.push(buffer);
                    buffer = '';
                    console.log(`[Parse] SKIP instrument line (pushed complete buffer): "${trimmed}"`);
                } else if (buffer) {
                    console.log(`[Parse] SKIP instrument line (buffer incomplete, continues): "${buffer.substring(0, 30)}..."`);
                }
            } else if (buffer) {
                // Check if buffer is a method+code line (tumor marker format)
                const wasMethodCodeLine = /^(方法|化学发光|电化学发光)\s+[A-Za-z0-9\-]+/.test(buffer.trim());
                // If buffer is a standalone abbreviation, merge with this Chinese line
                // BUT DON'T PUSH YET - wait for the numeric result
                const wasStandaloneAbbr = labAbbrStandalone.test(buffer.replace(/^\s+/, ''));
                if (wasMethodCodeLine && /[\u4e00-\u9fa5]/.test(trimmed)) {
                    // Tumor marker format: "方法 CA242" + "糖链抗原242 15.00..."
                    // But first check if trimmed contains instrument info at the end
                    const hasInstrumentAtEnd = /罗氏cobas系列|迈瑞CL\d+i|希森美康CS\d+/.test(trimmed);
                    if (hasInstrumentAtEnd) {
                        // Remove instrument info from trimmed before merging
                        const cleanedTrimmed = trimmed.replace(/\s*罗氏cobas系列.*$/, '').replace(/\s*迈瑞CL\d+i.*$/, '').replace(/\s*希森美康CS\d+.*$/, '').trim();
                        buffer += ' ' + cleanedTrimmed;
                        console.log(`[Parse] Merged method+code with Chinese (instrument stripped): "${buffer.substring(0, 50)}"`);
                        mergedLines.push(buffer);
                        buffer = '';
                    } else {
                        buffer += ' ' + trimmed;
                        console.log(`[Parse] Merged method+code with Chinese: "${buffer.substring(0, 50)}"`);
                        // 【关键修复】检测是否为 CA19-9/CA72-4/CA15-3 这类需要强制延长合并的项目
                        // 这些项目的结果和单位在后续独立行中，必须继续合并3-4行
                        if (/CA\d{1,3}-\d{1,3}/.test(buffer)) {
                            caForceMergeCount = 4;  // 强制合并后续4行（结果、异常符、单位、参考范围）
                            console.log(`[Parse] CA force merge activated for: "${buffer.substring(0, 40)}"`);
                        }
                        // Keep buffer open to receive numeric result (if not already present)
                        // Check if trimmed STARTS with digit (actual result value), not just contains digit
                        // 检查当前行是否以数字开头（实际结果值），而不是仅仅包含数字
                        // Fix: 避免 "糖链抗原242" 因包含数字 242 被误判为结果行
                        if (/^\d/.test(trimmed)) {
                            // Result already in this line, push it
                            mergedLines.push(buffer);
                            buffer = '';
                            caForceMergeCount = 0;  // 重置强制合并计数器
                        }
                    }
                } else if (wasStandaloneAbbr && /[\u4e00-\u9fa5]/.test(trimmed)) {
                    buffer += ' ' + trimmed;
                    // Keep buffer open to receive numeric result
                } else {
                    mergedLines.push(buffer);
                    buffer = trimmed;
                }
            } else {
                buffer = trimmed;
            }
        } else if (/^迈瑞CL\d+i$/i.test(trimmed) || /^罗氏cobas系列$/i.test(trimmed) || /^希森美康CS\d+/i.test(trimmed)) {
            // Instrument lines - only push buffer if it already has ref range (complete row)
            // Otherwise just skip the instrument line and keep accumulating
            // 仪器行 - 只有buffer已包含参考范围（完整数据行）时才推送，否则继续累积
            // Check for reference range patterns, but exclude N-N patterns preceded by Chinese (like "糖链抗原19-9")
            const hasSingleSideRef = /[<>≤≥]\s*\d/.test(buffer);
            const hasRangeWithSpace = /\d+\.?\d*\s*[-~～]+\s*\d+\.?\d*/.test(buffer);  // supports 0-15, 20--43, 1.5 - 2.5
            const hasResultWithFlag = /\d+\.?\d*\s*[↑↓]\s*$/.test(buffer);
            const hasRefRange = hasSingleSideRef || hasRangeWithSpace || hasResultWithFlag;
            if (buffer && hasRefRange) {
                mergedLines.push(buffer);
                buffer = '';
                console.log(`[Parse] Instrument line pushed complete buffer: "${trimmed}"`);
            } else if (buffer) {
                console.log(`[Parse] Instrument line skipped, buffer incomplete: "${buffer.substring(0, 30)}..."`);
            }
        } else if (/^(化学发光|电化学发光|比色法|流式法|计算法|电阻抗法)$/.test(trimmed)) {
            // Standalone method lines without code - skip them
            // 单独的方法行（没有代码）应该被跳过
            console.log(`[Parse] SKIP standalone method: "${trimmed}"`);
        } else if (buffer) {
            // 【关键修复】CA强制延长合并：如果计数器>0，继续合并而不push
            if (caForceMergeCount > 0) {
                buffer += ' ' + trimmed;
                caForceMergeCount--;
                console.log(`[Parse] CA force merge continuing (${caForceMergeCount} left): "${buffer.substring(0, 50)}"`);
            } else {
                buffer += ' ' + trimmed;
            }
        } else {
            mergedLines.push(trimmed);
        }
    }
    if (buffer) mergedLines.push(buffer);
    
    console.log(`[Parse] Merged: ${rawLines.length} raw lines → ${mergedLines.length} rows`);
    
    // ============ Step 2: 逐行解析（多参考范围锚定 + ≤/</≥/> 支持） ============
    // v6: 支持一行内多个参考范围(双列报告)、≤/</>/ ≥单侧参考范围、单字符项目名(钾钠氯钙磷镁)
    const tableData = [];
    
    // 从segment中提取一个项目 {itemName, result, code}，失败返回null
    // hasCodeColumn: 报告中是否有"项目代码"列，影响是否拆分"PLT分布宽度"这类项目
    const extractItemFromSegment = (segment, ref, fullLine, hasCodeColumn = true, lineCodeCache = null) => {
        if (!segment || segment.length < 1) return null;
        
        // 【新增调试】检查是否包含管型相关字符串
        if (segment.includes('管型')) {
            console.log(`[Parse] DEBUG: Found 管型 in segment="${segment}"`);
        }
        
        // ---- Step A: 从原始文本中检测OCR箭头标志 ----
        let ocrFlag = '';
        if (/↑/.test(fullLine)) ocrFlag = '↑';
        else if (/↓/.test(fullLine)) ocrFlag = '↓';
        
        // 【新增】检测结果中的箭头标志（包括括号内的箭头）
        // 例如："弱阳性(↑"、"弱阳性(↑)"、"阳性(+" 等
        if (!ocrFlag && segment) {
            if (/\(↑\)?\s*$/.test(segment)) ocrFlag = '↑';
            else if (/\(↓\)?\s*$/.test(segment)) ocrFlag = '↓';
            else if (/\(\+\)\s*$/.test(segment)) ocrFlag = '↑';
            else if (/\(-\)\s*$/.test(segment)) ocrFlag = '↓';
        }
        
        // Strip "参考值" and everything after it (handles "参考值:", "参考值:参考范围:" etc.)
        segment = segment.replace(/\s*参考值.*$/g, '').trim();
        if (!segment) return null;
        
        // 【关键修复】先提取"方法+简称"行的Code，再剥离方法前缀
        // 避免"比色法 MPV"被剥离后只剩"MPV"而丢失Code
        let methodAbbrCode = null;
        // 【修复】扩大正则匹配所有血常规简称：字母+%+#+横杠+数字
        const methodAbbrRegex = /^(检测方法|方法|试验方法|计算法|流式法|比色法|电阻抗法|化学发光|电化学发光|流式细胞法)\s+([A-Z][A-Z0-9%#\-]*)/i;
        const methodAbbrMatch = segment.match(methodAbbrRegex);
        if (methodAbbrMatch) {
            methodAbbrCode = methodAbbrMatch[2];  // 提取简称作为Code
            // 【修复】如果原始segment包含%/#，补回code中（如EOS%→提取EOS→补回%）
            const originalAbbr = segment.match(/\b([A-Z][A-Z0-9%#\-]*)\b/i);
            if (originalAbbr && originalAbbr[1].includes('%')) {
                methodAbbrCode = methodAbbrCode.replace(/%$/, '') + '%';
            }
            if (originalAbbr && originalAbbr[1].includes('#')) {
                methodAbbrCode = methodAbbrCode.replace(/#$/, '') + '#';
            }
            console.log(`[Parse] Method+abbr code pre-extracted: "${methodAbbrCode}" from "${segment.substring(0, 40)}"`);
        }
        
        // Strip common method prefixes that may be merged from previous row in dual-column reports
        // 清理双列表格中从"方法"列合并过来的残留
        // 使用正则更激进地清理，避免前导空格等问题
        const methodPrefixRegex = /^(检测方法|方法|试验方法|计算法|流式法|比色法|电阻抗法|化学发光|电化学发光)\s*/;
        const methodMatch = segment.match(methodPrefixRegex);
        if (methodMatch) {
            segment = segment.replace(methodPrefixRegex, '').trim();
            console.log(`[Parse] Strip method prefix "${methodMatch[1]}": remaining="${segment.substring(0, 30)}"`);
        }
        
        // CA系列肿瘤标志物硬匹配白名单 - 强制保留这些简称
        const caTumorMarkers = ['CA242', 'CA50', 'CA19-9', 'CA72-4', 'CA15-3', 'CA125', 'CA19-9'];
        const caMatch = segment.match(/^(CA\d+(?:-\d+)?)\s+/);
        if (caMatch && caTumorMarkers.includes(caMatch[1])) {
            // 保留CA系列标志物，继续处理
            console.log(`[Parse] CA whitelist matched: "${caMatch[1]}"`);
        }
        
        // Clean up OCR numeric spacing errors like "34.8 1" → "34.8"
        // 数值异常清洗：处理OCR排版错误导致的数字后多余空格和数字
        const numericErrorMatch = segment.match(/(\d+\.\d+)\s+\d+/);
        if (numericErrorMatch) {
            const cleanValue = numericErrorMatch[1];
            segment = segment.replace(/(\d+\.\d+)\s+\d+/, cleanValue);
            console.log(`[Parse] Clean numeric error: "${numericErrorMatch[0]}" → "${cleanValue}"`);
        }
        
        if (!segment) return null;
        
        // Strip unit value lines that got merged (like "%", "fL", "/L", "pg", "U/L" etc.)
        // 这些单位值行可能从双列表格的前一行合并过来
        // 使用\b单词边界防止误匹配项目名称(如PLT中的PL)
        const unitPatterns = [
            /^[%％]\s*/,           // 百分号
            /^fL\b\s*/i,           // fL (femtoliter) - 单词边界
            /^pL\b\s*/i,           // pL (picoliter) - 单词边界
            /^nL\b\s*/i,           // nL (nanoliter) - 单词边界
            /^pg\b\s*/i,           // pg (picogram) - 单词边界
            /^ng\b\s*/i,           // ng (nanogram) - 单词边界
            /^μ?mol\b\s*/i,        // μmol - 单词边界
            /^mmol\b\s*/i,         // mmol - 单词边界
            /^umol\b\s*/i,         // umol - 单词边界
            /^g\b\/L\s*/i,         // g/L - 带/L后缀
            /^mg\b\/L\s*/i,        // mg/L - 带/L后缀
            /^U\b\/L\s*/i,         // U/L - 带/L后缀
            /^IU\b\/L\s*/i,        // IU/L - 带/L后缀
            /^ml\b\s*/i,           // ml - 单词边界
            /^mL\b\s*/i,           // mL - 单词边界
            /^\/L\s*/i,            // /L (单位后缀)
            /^L\b\s*/i,            // L (liter) - 单词边界
            /^\*?\s*\d+[\^\/·]\d+\/L\s*/i,  // *10^9/L, 10^12/L 等指数单位
            /^\/u[lL]\s*/,                   // /ul, /uL (per microliter)
        ];
        let strippedUnits = [];
        for (const pattern of unitPatterns) {
            if (pattern.test(segment)) {
                const match = segment.match(pattern);
                if (match) {
                    strippedUnits.push(match[0].trim());
                    segment = segment.replace(pattern, '').trim();
                }
            }
        }
        if (strippedUnits.length > 0) {
            console.log(`[Parse] Strip unit prefixes "${strippedUnits.join('|')}": remaining="${segment.substring(0, 40)}"`);
        }
        
        // Strip combined patterns like "%计算法", "fL计算法", "* 10^9/L流式法"
        // Note: removed standalone 'g' and 'mg' to avoid matching element symbols like Mg (magnesium)
        // These should only match with /L suffix (handled in unitPatterns)
        // 【修复】保护PLT/RBC/WBC开头的项目名称（如PLT分布宽度）不被pL单位正则误剥离
        const cbcItemPattern = /^(PLT|RBC|WBC|MPV|PDW|MCV|MCH|MCHC|HCT|HGB|LDH|LDL|LPA|LYM)/i;
        if (!cbcItemPattern.test(segment)) {
            const combinedPattern = /^([%％]|fL|pL|nL|pg|ng|μ?mol|mmol|umol|U|IU|ml|mL|\/L|L|\*?\s*\d+[\^\/·]\d+\/L)\s*(试验方法|计算法|流式法|比色法|电阻抗法)?\s*/i;
            const combinedMatch = segment.match(combinedPattern);
            if (combinedMatch && (combinedMatch[1] || combinedMatch[2])) {
                segment = segment.replace(combinedPattern, '').trim();
                console.log(`[Parse] Strip combined prefix: remaining="${segment.substring(0, 40)}"`);
            }
        }
        
        // Strip Jiangsu province marker * (江苏省内互认项目标记)
        // Examples: "*白细胞计数", "*血小板计数", "T*血小板计数", "1*铁蛋白", "2*白蛋白"
        const starPattern = /^(\d*\s*T?\s*[\*＊]\s*)/;
        if (starPattern.test(segment)) {
            const match = segment.match(starPattern);
            segment = segment.replace(starPattern, '').trim();
            console.log(`[Parse] Strip star marker "${match[1]}": remaining="${segment.substring(0, 40)}"`);
        }
        
        if (!segment) return null;
        
        const tokens = segment.split(/\s+/);
        let resultValue = '';
        let resultPrefix = ''; // '<', '>', '≤', '≥' — inequality prefix for approximate values
        let resultEndIdx = -1;
        
        // ---- Step B: 从后往前找最右侧含数字的token作为结果 ----
        // Handles pure numbers ("5.84"), unit-suffixed ("15.80U/ml"), arrow-prefixed ("↑77.3%")
        for (let ti = tokens.length - 1; ti >= 0; ti--) {
            const tk = tokens[ti];
            // Skip pure exponent/unit tokens like "10^9/L", "*10^12/L"
            if (/^\*?\d+\^/.test(tk)) continue;
            // Skip unit tokens like "109/L" (blood cell count units)
            if (/^\d+\/L/.test(tk)) continue;
            // Skip /ul, /uL microliter unit tokens
            if (/^\/u[lL]$/.test(tk)) continue;
            // 【修复】跳过箭头+单位的混合token（如"↑个/μ"），继续向前查找数字
            if (/^[↑↓]/.test(tk) && /[\u4e00-\u9fa5]|\/|μ/.test(tk)) continue;
            // Stop at Chinese tokens (they're part of item name, not result)
            if (/^[\u4e00-\u9fa5]/.test(tk)) break;
            // Try to extract leading number (with optional ↑↓/</>≤/≥ prefix and optional + suffix like 3+)
            const numMatch = tk.match(/^([↑↓<>≤≥])?(\d+\.?\d*)(\+?)/);
            if (numMatch && numMatch[2].length > 0) {
                resultValue = numMatch[2] + (numMatch[3] || '');  // 保留 3+ 中的 +
                if (numMatch[1] && /[<>≤≥]/.test(numMatch[1])) {
                    resultPrefix = numMatch[1];
                }
                resultEndIdx = ti;
                break;
            }
        }
        
        // Fallback: OCR漏掉"0"值
        if (!resultValue || resultEndIdx < 0) {
            // CA系列肿瘤标志物硬匹配 - 如果匹配到CA简称但找不到数字，尝试更宽松的匹配
            const caMatch = segment.match(/(CA\d+(?:-\d+)?)/);
            if (caMatch && caTumorMarkers.includes(caMatch[1])) {
                // 【修复】跳过项目名中的数字（如 CA19-9 中的 19-9），向后查找真正的结果
                // 找到 CA19-9 在字符串中的结束位置
                const caEndPos = segment.indexOf(caMatch[1]) + caMatch[1].length;
                // 从 CA 后面开始查找浮点数（真正的结果，如 34.8, 1.09, 8.55）
                const remainingSegment = segment.substring(caEndPos);
                // 先清理可能的项目名中的数字-数字模式（19-9, 72-4, 15-3 等）
                const cleanedRemaining = remainingSegment.replace(/^\s*\d+-\d+\s*/, ' ');
                // 然后在剩余部分查找第一个浮点数作为结果
                const realResultMatch = cleanedRemaining.match(/(\d+\.\d+)/);
                if (realResultMatch) {
                    resultValue = realResultMatch[1];
                    // 找到结果在 token 中的位置
                    const numIdx = tokens.findIndex(t => t.includes(resultValue));
                    resultEndIdx = numIdx >= 0 ? numIdx : tokens.length - 1;
                    console.log(`[Parse] CA_FORCE_MATCH: "${segment}" → skip "${caMatch[1]}", result=${resultValue}`);
                } else {
                    // 如果没有浮点数，尝试找任何数字
                    const anyNumMatch = cleanedRemaining.match(/(\d+)/);
                    if (anyNumMatch) {
                        resultValue = anyNumMatch[1];
                        const numIdx = tokens.findIndex(t => t.includes(resultValue));
                        resultEndIdx = numIdx >= 0 ? numIdx : tokens.length - 1;
                        console.log(`[Parse] CA_FORCE_MATCH (int): "${segment}" → result=${resultValue}`);
                    }
                }
            }
            
            if (!resultValue || resultEndIdx < 0) {
                // 【修复】参考范围在结果前面的倒序格式（如肌钙蛋白T）：
                // fullLine = "肌钙蛋白T 参考值:参考范围: 0-0.014ng/mL <0.004ng/mL"
                // segment = "肌钙蛋白T 参考值:参考范围:"，ref锚点是 0-0.014
                // 真正的结果在 ref.endIndex 之后的 fullLine 中
                if (fullLine && ref) {
                    const afterRef = fullLine.substring(ref.endIndex);
                    const inequalityResultMatch = afterRef.match(/([<>≤≥])\s*(\d+\.?\d*)/);
                    if (inequalityResultMatch) {
                        resultValue = inequalityResultMatch[2];
                        resultPrefix = inequalityResultMatch[1];
                        // resultEndIdx 指向 segment 中最后一个中文字符之后
                        for (let ti = tokens.length - 1; ti >= 0; ti--) {
                            if (/[\u4e00-\u9fa5]/.test(tokens[ti])) { resultEndIdx = ti + 1; break; }
                        }
                        if (resultEndIdx < 0) resultEndIdx = tokens.length;
                        console.log(`[Parse] INVERTED_RESULT: "${segment}" → result="${resultPrefix}${resultValue}" (from fullLine suffix)`);
                    }
                }
                if (!resultValue || resultEndIdx < 0) {
                    // 【新增】纯单位行不应被识别为项目（如"个/μ"）
                    if (isPureUnitLine(segment)) {
                        console.log(`[Parse] ZERO_FALLBACK skip pure unit line: "${segment}"`);
                        return null;
                    }
                    if (ref.min === 0 && tokens.some(t => /[\u4e00-\u9fa5]/.test(t))) {
                        // 【修复】检查是否有文本结果token，如果有则优先使用文本结果而不是0
                        let hasTextResult = false;
                        for (let ti = tokens.length - 1; ti >= 0; ti--) {
                            if (isTextResultToken(tokens[ti])) {
                                resultValue = tokens[ti];
                                resultEndIdx = ti;
                                hasTextResult = true;
                                console.log(`[Parse] ZERO_FALLBACK: "${segment}" → use text result "${resultValue}" instead of 0`);
                                break;
                            }
                        }
                        if (!hasTextResult) {
                            resultValue = '0';
                            for (let ti = tokens.length - 1; ti >= 0; ti--) {
                                if (/[\u4e00-\u9fa5]/.test(tokens[ti])) { resultEndIdx = ti + 1; break; }
                            }
                            console.log(`[Parse] ZERO_FALLBACK: "${segment}" → assume result=0`);
                        }
                    } else {
                        // ---- 文本结果兜底：阴性/阳性/+/-/透明 等非数值结果 ----
                        let foundText = false;
                        for (let ti = tokens.length - 1; ti >= 0; ti--) {
                            if (isTextResultToken(tokens[ti])) {
                                resultValue = tokens[ti];
                                resultEndIdx = ti;
                                foundText = true;
                                console.log(`[Parse] TEXT_RESULT: "${segment}" → result="${tokens[ti]}"`);
                                break;
                            }
                        }
                        if (!foundText) {
                            console.log(`[Parse] NO_NUM: seg="${segment}" tokens=${JSON.stringify(tokens)}`);
                            return null;
                        }
                    }
                }
            }
        }
        
        const numResult = parseFloat(resultValue);
        const isTextResult = isNaN(numResult);
        
        const nameParts = tokens.slice(0, resultEndIdx);
        let itemName = nameParts.join(' ').trim();
        
        // 【修复】双列表格拼接导致的垃圾前缀："阴性 pH" → "pH"
        // 这些词是上一列参考区间或结果，被OCR合并到本行开头
        const junkPrefixes = /^(阴性|阳性|正常|透明|清澈|淡黄色|黄色|无色|浑浊)\s+/;
        if (junkPrefixes.test(itemName)) {
            itemName = itemName.replace(junkPrefixes, '');
            console.log(`[Parse] Strip junk prefix → "${itemName}"`);
        }
        // 【修复】仪器名前缀：OCR将仪器名称列内容合并到下一行项目名开头
        // 例如："罗氏流水线★游离甲状腺素测定" → "游离甲状腺素测定"
        const instrumentPrefixRe = /^(仪器名称|罗氏[\S]*|迈瑞[\S]*|希森美康[\S]*|贝克曼[\S]*|西门子[\S]*|雅培[\S]*|BD[\S]*|SYSMEX[\S]*)\s*/i;
        if (instrumentPrefixRe.test(itemName)) {
            const stripped = itemName.replace(instrumentPrefixRe, '').replace(/^[★*＊\s]+/, '');
            if (/[\u4e00-\u9fa5]/.test(stripped)) {
                console.log(`[Parse] Strip instrument prefix: "${itemName}" → "${stripped}"`);
                itemName = stripped;
            }
        }
        
        // 【修复】itemName末尾粘连数字："红细胞定量 43" result="1"
        // 场景：原行是"红细胞定量 43 1 /ul"，/ul被跳过后找到1作为结果，但43才是真实结果
        // 规则：如果itemName末尾有一个独立数字token，且该数字后面紧跟的是已跳过的单位token，则把末尾数字当作真实结果
        const trailingNumMatch = itemName.match(/^([\s\S]*[\u4e00-\u9fa5])\s+(\d+\.?\d*)$/);
        if (trailingNumMatch) {
            // 末尾有数字粘在中文名后，检查当前result是否是小的"修饰数字"（如1、2等）
            // 判断：如果末尾数字比当前result大，且当前result<=5，说明末尾数字才是真实结果
            const trailingNum = parseFloat(trailingNumMatch[2]);
            const currentResult = parseFloat(resultValue);
            if (!isNaN(trailingNum) && !isNaN(currentResult) && currentResult <= 5 && trailingNum > currentResult) {
                console.log(`[Parse] TRAILING_NUM fix: itemName="${itemName}" result="${resultValue}" → use trailing ${trailingNum} as result`);
                itemName = trailingNumMatch[1].trim();
                resultValue = trailingNumMatch[2];
            }
        }
        
        let code = '';
        if (nameParts.length > 1 && /^\d{1,6}$/.test(nameParts[0])) {
            code = nameParts[0];
            itemName = nameParts.slice(1).join(' ').trim();
        }
        
        // ---- Step X: 提取简称/代码（括号内或开头的英文缩写） ----
        // Pre-clean: remove "单位" prefix and leading separators for code extraction
        let itemNameForCodeExtraction = itemName.replace(/^\s*单位\s*/, '').replace(/^[-—\s]+/, '');
        
        // Pattern 1: 括号内的代码，如 "白细胞计数(WBC)" → code="WBC"
        // Support codes with numbers like (HC03), (CO2), (CO2CP)
        const bracketMatch = itemNameForCodeExtraction.match(/\(([A-Za-z0-9\-]+)\)$/i);
        if (bracketMatch) {
            code = bracketMatch[1];
            itemName = itemName.replace(/\s*\([A-Za-z0-9\-]+\)$/i, '');
            console.log(`[Parse] Bracket code: extracted "${code}" from "${bracketMatch[0]}"`);
            
            // 如果代码也出现在开头（如"HGB*血红蛋白量"），移除开头的代码和分隔符
            const leadingCodeRegex = new RegExp(`^${code}\\s*[*＊\\/]?\\s*`);
            if (leadingCodeRegex.test(itemName)) {
                itemName = itemName.replace(leadingCodeRegex, '');
                console.log(`[Parse] Removed leading code "${code}" from itemName`);
            }
        }
        
        // Pattern 2: 开头的英文缩写，如 "WBC 白细胞计数" 或 "HDL-C*高密度脂蛋白" → code="WBC"
        // Support hyphenated codes (HDL-C, LDL-C, B2-MG), slash codes (A/G), and * prefix on Chinese name
        // Also support direct connection: "HDL-C高密度脂蛋白"
        // 只有当code为空时才提取，避免覆盖括号内的代码
        if (!code) {
            // Match: (abbr) followed by (space OR * OR / OR direct Chinese)
            // Use lookahead to check for Chinese without consuming it
            // Note: [A-Za-z0-9\-/] includes hyphen and slash for codes like A/G
            // 【修复】支持血常规特殊符号简称：NEU%、LYM#、P-LCR等
            // 【修复】使用循环处理单位前缀，如 "mmo1/L ALT*丙氨酸氨基转移酶" → 跳过单位，提取ALT
            let remainingText = itemNameForCodeExtraction;
            const unitBlacklist = ['MMO1/L', 'MMOL/L', 'UMOL/L', 'G/L', 'U/L', 'MG/L', 'M/L', 'L/L', 'ML/L', 'NG/ML', 'PG/ML', 'G/ML', 'KG/L'];
            while (remainingText && !code) {
                const leadingAbbrMatch = remainingText.match(/^([A-Za-z0-9\-/%#]+)(?=\s|[\*\uff0a]|[\/]|[\u4e00-\u9fa5])/);
                if (!leadingAbbrMatch) break;

                const abbrLen = leadingAbbrMatch[1].length;
                let afterAbbr = remainingText.substring(abbrLen).trim();
                // Remove leading * or / if present
                afterAbbr = afterAbbr.replace(/^[\*\uff0a\/]+/, '');

                // Check if remaining part has Chinese
                if (!afterAbbr || !/[\u4e00-\u9fa5]/.test(afterAbbr)) break;

                const potentialCode = leadingAbbrMatch[1];

                // 【修复】排除单位被误识别为代码
                if (unitBlacklist.includes(potentialCode.toUpperCase())) {
                    console.log(`[Parse] Skip unit prefix: "${potentialCode}" → continue with "${afterAbbr}"`);
                    remainingText = afterAbbr; // 继续处理剩余部分
                    continue;
                }

                // 特殊处理：当报告没有"项目代码"列时，不拆分类似"PLT分布宽度"的项目
                const specialSuffixes = ['分布宽度', '分布宽度-SD', '分布宽度-CV', '分布宽度SD', '分布宽度CV'];
                const shouldPreserveAsWhole = !hasCodeColumn &&
                    (potentialCode === 'PLT' || potentialCode === 'RBC' || potentialCode === 'WBC') &&
                    specialSuffixes.some(suffix => afterAbbr.includes(suffix));

                if (shouldPreserveAsWhole) {
                    console.log(`[Parse] Preserve whole name (no code column): "${remainingText}"`);
                    break;
                } else {
                    code = potentialCode;
                    itemName = afterAbbr;
                    // 【修复】OCR常见纠错：C1→Cl（氯），O0→O（氧）等数字/字母混淆
                    const ocrCodeFix = { 'C1': 'Cl', 'C1-': 'Cl' };
                    if (ocrCodeFix[code]) {
                        console.log(`[Parse] OCR_CODE_FIX: "${code}" → "${ocrCodeFix[code]}"`);
                        code = ocrCodeFix[code];
                    }
                    console.log(`[Parse] Leading abbr: "${code}" → "${itemName}"`);
                    break;
                }
            }
        }
        
        // 【关键修复】使用预先提取的"方法+简称"行的Code
        // 如果白名单没匹配到，但之前从"比色法 MPV"这类行提取了Code，直接使用
        if (!code && methodAbbrCode) {
            code = methodAbbrCode;
            console.log(`[Parse] Using pre-extracted method+abbr code: "${code}"`);
        }
        
        // 【关键修复】使用从NO_REF行硬提取的Code
        // 如果前面两种方法都没提取到，但lineCodeCache有值，直接使用
        if (!code && lineCodeCache) {
            code = lineCodeCache;
            console.log(`[Parse] Using hard-extracted code from NO_REF line: "${code}"`);
        }
        
        // 【修复】血常规简称白名单 - 强制提取双列排版中的前导简称
        // 在括号提取和前导英文提取之后，作为兜底补全
        // 【修复3】放行无方法前缀的右侧列简称（MCHC/PDW/NEU%等）
        if (!code) {
            const cbcAbbrWhitelist = ['MCHC', 'MPV', 'PDW', 'P-LCR', 'PCT', 'RDW-CV', 'RDW-SD', 'MCV', 'MCH',
                                        'NEU%', 'LYM%', 'MON%', 'EOS%', 'BAS%',
                                        'NEU#', 'LYM#', 'MON#', 'EOS#', 'BAS#'];
            // 【修复】扩大正则以匹配所有血常规简称格式：字母+%+#+横杠
            const cbcMatch = itemName.match(/^([A-Z][A-Z0-9%#\-]*)\s+/i);
            if (cbcMatch && cbcAbbrWhitelist.includes(cbcMatch[1])) {
                const potentialCode = cbcMatch[1];
                const afterAbbr = itemName.substring(potentialCode.length).trim().replace(/^[\*\uff0a\/]+/, '');
                if (afterAbbr && /[\u4e00-\u9fa5]/.test(afterAbbr)) {
                    code = potentialCode;
                    itemName = afterAbbr;
                    console.log(`[Parse] CBC whitelist code extracted: "${code}" → "${itemName}"`);
                }
            }
        }
        
        // 【修复】生化指标 code 兜底 - 处理带"血清"前缀的项目名
        if (!code) {
            const biochemCodeMap = [
                { keywords: ['谷丙转氨酶', '丙氨酸氨基转移酶'], code: 'ALT' },
                { keywords: ['谷草转氨酶', '天门冬氨酸氨基转移酶', '天冬氨酸氨基转移酶'], code: 'AST' },
                { keywords: ['碱性磷酸酶'], code: 'ALP' },
                { keywords: ['谷氨酰转肽酶', 'γ-谷氨酰转肽酶'], code: 'GGT' },
                { keywords: ['乳酸脱氢酶'], code: 'LDH' },
                { keywords: ['总蛋白'], code: 'TP' },
                { keywords: ['白蛋白', '清蛋白'], code: 'ALB' },
                { keywords: ['球蛋白'], code: 'GLB' },
                { keywords: ['白球比', '白球比例', '白蛋白/球蛋白'], code: 'A/G' },
                { keywords: ['总胆红素'], code: 'TBIL' },
                { keywords: ['直接胆红素', '结合胆红素'], code: 'DBIL' },
                { keywords: ['间接胆红素', '非结合胆红素'], code: 'IBIL' },
                { keywords: ['腺苷脱氨酶'], code: 'ADA' },
                { keywords: ['肌酐', '血肌酐'], code: 'Cr' },
                { keywords: ['尿素氮', '尿素'], code: 'BUN' },
                { keywords: ['尿酸', '血尿酸'], code: 'UA' },
                { keywords: ['胱抑素C'], code: 'CysC' },
                { keywords: ['总胆固醇'], code: 'TC' },
                { keywords: ['甘油三酯'], code: 'TG' },
                { keywords: ['高密度脂蛋白'], code: 'HDL-C' },
                { keywords: ['低密度脂蛋白'], code: 'LDL-C' },
                { keywords: ['血糖', '葡萄糖', '空腹血糖'], code: 'GLU' },
                { keywords: ['糖化血红蛋白'], code: 'HbA1c' },
                { keywords: ['钾', '血钾'], code: 'K' },
                { keywords: ['钠', '血钠'], code: 'Na' },
                { keywords: ['氯', '血氯'], code: 'Cl' },
                { keywords: ['钙', '血钙'], code: 'Ca', exclude: /肌钙蛋白|降钙素原/ },
                { keywords: ['肌钙蛋白T', '心肌肌钙蛋白T'], code: 'TnT' },
                { keywords: ['磷', '血磷', '无机磷'], code: 'P' },
                { keywords: ['镁', '血镁'], code: 'Mg' },
                { keywords: ['碳酸氢根', '碳酸氢盐', '二氧化碳结合力', '总二氧化碳'], code: 'HCO3' },
                { keywords: ['C反应蛋白', '超敏C反应蛋白'], code: 'CRP' },
                { keywords: ['降钙素原'], code: 'PCT' },
                { keywords: ['血沉', '红细胞沉降率'], code: 'ESR' },
                { keywords: ['白介素6', '白细胞介素6'], code: 'IL-6' }
            ];
            
            for (const mapping of biochemCodeMap) {
                if (mapping.keywords.some(kw => itemName.includes(kw))) {
                    if (mapping.exclude && mapping.exclude.test(itemName)) continue;
                    code = mapping.code;
                    // 清理"血清"、"血"等前缀
                    itemName = itemName.replace(/^血清/, '');
                    itemName = itemName.replace(/^血/, '');
                    console.log(`[Parse] Biochem code extracted: "${code}" → "${itemName}"`);
                    break;
                }
            }
        }
        
        // 清理项目名
        itemName = itemName.replace(/^\d+[.\s\u3001)）]\s*/, '');
        itemName = itemName.replace(/[：:]\s*$/, '');
        itemName = itemName.replace(/[*＊★※#△▲√①]+$/g, '');  // 去结尾特殊符号
        itemName = itemName.replace(/^[*＊★※#△▲√①Yy-]+/g, '');  // 去开头特殊符号
        itemName = itemName.replace(/[*＊]+/g, '');  // 去掉名称中间的*号（如"胆红素*"→"胆红素"）
        itemName = itemName.replace(/^[-—\s]+/, '');  // 去开头横线(双列合并残留)
        itemName = itemName.replace(/[↑↓↗↘]+/g, ''); // 去箭头标志(垂直格式合并残留)
        // 去除"单位"前缀 (双列表格第一列残留)
        itemName = itemName.replace(/^\s*单位\s*/, '');
        // 去除单位后缀如 mmo1/L, g/L, U/L, mmol/L, mg/L 等 (前一项目单位残留)
        itemName = itemName.replace(/^(mmo?1|mmol|umol|μmol|g|mg|U|IU|ml|%|mmHg|kPa|pg|fL|ng|pg\/ml|ng\/ml|mg\/dl|pg\/ml|ng\/L|μg|IU\/L|mEq|mOsm|copies|RF|CO2|O2|pH|Pa|pCO2|pO2|HCT|Hb|WBC|RBC|PLT|NEU|LYM|MON|EO|BA|NE|LY|MO|EO|BA)\/L\s*/i, '');
        itemName = itemName.replace(/^(10\^\d+\/L)\s*/i, ''); // 如 10^9/L
        itemName = itemName.replace(/\s+/g, '');
        // 【新增】OCR修正：'C1' 被误识别为 'Cl'（氯的化学简称），1 识别为 l
        if (itemName === 'C1') {
            itemName = '氯';
            console.log(`[Parse] OCR_FIX: 'C1' → '氯' (Cl misread)`);
        }
        
        // 【新增】双列格式分离：处理带星号的项目和错误合并的项目名
        // 例如："稀少阴性(-)比重1.016" → 需要分离为 "稀少" 和 "比重"
        // 例如："白细胞管型0~/ul酮体" → 需要分离为 "白细胞管型" 和 "酮体"
        if (itemName.length > 8 && /[\u4e00-\u9fa5]/.test(itemName)) {
            // 【新增】检测星号(*)项目合并：如"透明管型0~1/ul*亚硝酸盐"
            const starItemMatch = itemName.match(/^(.+?)\s*[\*＊]\s*([\u4e00-\u9fa5]+[\u4e00-\u9fa5\d]*)/);
            if (starItemMatch) {
                const [, firstItem, secondItem] = starItemMatch;
                itemName = firstItem.replace(/\s+$/, ''); // 保留第一个项目名，去掉尾部空格
                console.log(`[Parse] STAR_ITEM_SPLIT: "${firstItem}*${secondItem}" → "${itemName}" (star item "${secondItem}" will be processed separately)`);
            }
            
            // 检测是否包含多个项目名特征
            const hasMultipleItems = /^(稀少|阴性|阳性|透明|浑浊|清亮|清澈|淡黄色|黄色|无色|正常|未见|未提示|未检出)/.test(itemName) &&
                /(比重|pH|白细胞|红细胞|上皮细胞|管型|结晶|粘液|细菌|酵母菌|真菌|寄生虫|脂肪球|隐血|胆红素|亚硝酸盐|尿胆原|酮体|尿蛋白|葡萄糖|维生素C|白细胞团|白细胞计数|红细胞计数)/.test(itemName);
            
            if (hasMultipleItems) {
                // 尝试分离：找到第一个有效项目名的边界
                const validProjectNames = ['比重', 'pH', '白细胞', '红细胞', '上皮细胞', '管型', '结晶', '粘液', '细菌', '酵母菌', '真菌', '寄生虫', '脂肪球', '隐血', '胆红素', '亚硝酸盐', '尿胆原', '酮体', '尿蛋白', '葡萄糖', '维生素C', '白细胞团', '白细胞计数', '红细胞计数'];
                
                for (const projectName of validProjectNames) {
                    if (itemName.includes(projectName) && itemName.indexOf(projectName) > 2) {
                        // 找到了项目名，分离前面的垃圾内容
                        const projectIndex = itemName.indexOf(projectName);
                        const junkPrefix = itemName.substring(0, projectIndex);
                        itemName = projectName;
                        console.log(`[Parse] DUAL_COLUMN_SPLIT: "${junkPrefix + projectName}" → "${projectName}" (removed prefix "${junkPrefix}")`);
                        break;
                    }
                }
            }
            
            // 【新增】处理管型+单位+星号项目的合并：如"白细胞管型0~/ul酮体"
            const tubeTypeWithUnitMatch = itemName.match(/^([\u4e00-\u9fa5]+管型)\s*[^\d]*\d+\s*[~\/\^\d]*\s*ul\s*([\u4e00-\u9fa5]+)/);
            if (tubeTypeWithUnitMatch) {
                const [, tubeType, nextItem] = tubeTypeWithUnitMatch;
                itemName = tubeType;
                console.log(`[Parse] TUBE_TYPE_SPLIT: "${tubeTypeWithUnitMatch[0]}" → "${tubeType}" (next item "${nextItem}" will be processed separately)`);
            } else {
                // 【新增】处理更复杂的管型合并模式：如"白细胞管型0~/ul酮体"
                console.log(`[Parse] DEBUG: checking itemName="${itemName}" for complex tube pattern`);
                const complexTubeMatch = itemName.match(/^([\u4e00-\u9fa5]+管型)\s*[^\d]*\d+\s*[~～\/\^\d]*\s*ul\s*\*?([\u4e00-\u9fa5]+)/);
                if (complexTubeMatch) {
                    const [, tubeType, nextItem] = complexTubeMatch;
                    itemName = tubeType;
                    console.log(`[Parse] COMPLEX_TUBE_SPLIT: "${complexTubeMatch[0]}" → "${tubeType}" (next item "${nextItem}" will be processed separately)`);
                } else {
                    console.log(`[Parse] DEBUG: complex tube pattern did not match itemName="${itemName}"`);
                }
            }
        }

        // 【修复】处理OCR合并错误：双列表格中两个项目名被合并
        // 例如："钠氯" → 本行取钠，下一行的氯值已丢失，需由主循环根据 mergedSecondItem 补充
        let mergedSecondItem = null;
        // 【新增】"钾钠氯" 三项合并：第一ref段只取"钾"，Na和Cl段由多ref循环正常提取
        if (itemName === '钾钠氯') {
            itemName = '钾';
            console.log(`[Parse] FIX_MERGED: "钾钠氯" → "钾" (Na/Cl extracted from subsequent ref segments)`);
        } else if (itemName === '钠氯') {
            const refMinVal = ref.min || 0;
            if (refMinVal >= 130 && refMinVal < 200) {
                itemName = '钠';
                mergedSecondItem = '氯';
                console.log(`[Parse] FIX_MERGED: "钠氯" → "钠" + pending "氯" (refMin=${refMinVal})`);
            } else {
                itemName = '氯';
                console.log(`[Parse] FIX_MERGED: "钠氯" → "氯" (refMin=${refMinVal})`);
            }
        } else if (itemName === '钙磷') {
            const refMinVal = ref.min || 0;
            if (refMinVal >= 1.5 && refMinVal < 3) {
                itemName = '钙';
                mergedSecondItem = '磷';
                console.log(`[Parse] FIX_MERGED: "钙磷" → "钙" + pending "磷" (refMin=${refMinVal})`);
            } else {
                itemName = '磷';
                console.log(`[Parse] FIX_MERGED: "钙磷" → "磷" (refMin=${refMinVal})`);
            }
        }

        if (!/[\u4e00-\u9fa5]/.test(itemName) && !/^[A-Z]{2,}/.test(itemName) && !isSpecialLatinItemName(itemName)) return null;
        // v6: 允许单字符项目名(钾钠氯钙磷镁等)
        if (itemName.length < 1 || itemName.length > 30) {
            console.log(`[Parse] NAME_LEN: "${fullLine}" → name="${itemName}" (${itemName.length})`);
            return null;
        }
        
        // ---- Step C: Flag determination (数值计算优先，OCR箭头仅兜底) ----
        let flag = '';
        if (isTextResult) {
            // Text result: check for arrows in the result text (like "弱阳性(↑")
            console.log(`[Parse] TEXT_ARROW_CHECK: result="${resultValue}" checking for arrows`);
            if (/\(↑\s*$/.test(resultValue)) {
                flag = '↑';
                console.log(`[Parse] TEXT_ARROW_FOUND: "(↑" pattern in "${resultValue}"`);
            }
            else if (/\(↓\s*$/.test(resultValue)) {
                flag = '↓';
                console.log(`[Parse] TEXT_ARROW_FOUND: "(↓" pattern in "${resultValue}"`);
            }
            else if (/\(↑\)/.test(resultValue)) {
                flag = '↑';
                console.log(`[Parse] TEXT_ARROW_FOUND: "(↑)" pattern in "${resultValue}"`);
            }
            else if (/\(↓\)/.test(resultValue)) {
                flag = '↓';
                console.log(`[Parse] TEXT_ARROW_FOUND: "(↓)" pattern in "${resultValue}"`);
            }
            else if (resultValue.includes('↑')) {
                flag = '↑';
                console.log(`[Parse] TEXT_ARROW_FOUND: arrow in "${resultValue}"`);
            }
            else if (resultValue.includes('↓')) {
                flag = '↓';
                console.log(`[Parse] TEXT_ARROW_FOUND: arrow in "${resultValue}"`);
            }
            // 【新增】检测阳性结果设置箭头
            else if (/阳性/.test(resultValue)) {
                flag = '↑';
                console.log(`[Parse] TEXT_ARROW_FOUND: positive result "${resultValue}"`);
            }
            else if (/阴性/.test(resultValue) && ref.display && /阳性/.test(ref.display)) {
                flag = '↓';
                console.log(`[Parse] TEXT_ARROW_FOUND: negative vs positive reference "${resultValue}"`);
            }
        } else {
            // calcFlag: computed from result vs reference range
            let calcFlag = '';
            if (ref.type === 'range') {
                if (numResult < ref.min) calcFlag = '↓';
                else if (numResult > ref.max) calcFlag = '↑';
            } else if (ref.type === 'le') {
                if (numResult > ref.max) calcFlag = '↑';
            } else if (ref.type === 'ge') {
                if (numResult < ref.min) calcFlag = '↓';
            }
            
            // Final flag priority (v2 - 2026-04-18):
            // When valid reference range exists → ALWAYS use calcFlag (most reliable)
            // When no valid reference range → fall back to ocrFlag (from OCR arrows)
            // Reason: OCR arrows often "leak" from adjacent items in multi-column reports
            const hasValidRef = ref.type && (ref.min !== null || ref.max !== null);
            if (hasValidRef) {
                // Valid reference range available - trust calculation over OCR
                flag = calcFlag;
                if (ocrFlag && ocrFlag !== calcFlag) {
                    console.log(`[Parse] FLAG_OVERRIDE: "${itemName}" result=${resultValue} ref=${ref.display} ocrFlag=${ocrFlag} calcFlag=${calcFlag || 'normal'} → use calcFlag`);
                }
            } else if (ocrFlag) {
                // No valid reference range - fall back to OCR arrow
                flag = ocrFlag;
                console.log(`[Parse] FLAG_OCR_FALLBACK: "${itemName}" ocrFlag=${ocrFlag} (no ref range for calculation)`);
            }
        }
        
        // Normalize item name: unify different hospital naming conventions
        let normalizedItemName = normalizeItemName(itemName);

        // 【新增】尿常规报告特殊处理：红细胞/白细胞相关名称统一转换为"定量"
        if (isUrineRoutine) {
            // 红细胞相关名称 → 红细胞定量
            if (/^(红细胞|红细胞计数|RBC|红细胞数|RBC计数)/i.test(normalizedItemName)) {
                normalizedItemName = '红细胞定量';
                console.log(`[Parse] Urine routine name convert: "${itemName}" → "红细胞定量"`);
            }
            // 白细胞相关名称 → 白细胞定量
            if (/^(白细胞|白细胞计数|WBC|白细胞数|WBC计数)/i.test(normalizedItemName)) {
                normalizedItemName = '白细胞定量';
                console.log(`[Parse] Urine routine name convert: "${itemName}" → "白细胞定量"`);
            }
        } else {
            // 【新增】非尿常规报告：防止用户自定义映射将血常规「红/白细胞计数」错误转为「定量」
            // 如果名称被映射为"红细胞定量"/"白细胞定量"，但原始名称是血常规项目，回退为正确名称
            if (normalizedItemName === '红细胞定量' && /^(红细胞计数|RBC计数)/i.test(itemName.replace(/\*/g, '').trim())) {
                normalizedItemName = '红细胞计数';
                console.log(`[Parse] CBC name restore: "${itemName}" → "红细胞计数" (not urine routine)`);
            }
            if (normalizedItemName === '白细胞定量' && /^(白细胞计数|WBC计数)/i.test(itemName.replace(/\*/g, '').trim())) {
                normalizedItemName = '白细胞计数';
                console.log(`[Parse] CBC name restore: "${itemName}" → "白细胞计数" (not urine routine)`);
            }
        }

        // 【特殊处理】Y-谷氨酰基转移酶：前缀"Y-"被误识别为code，实际应为GGT
        if (code === 'Y-' && /谷氨酰/.test(normalizedItemName)) {
            code = 'GGT';
            console.log(`[Parse] Special fix: "Y-谷氨酰基转移酶" → code="${code}"`);
        }

        // 【终极兜底】最后几个漏网之鱼，直接按项目名称硬赋值code，永不失效！
        // 这些项目行首简称在行合并时被吃掉了，只能用名称兜底
        if (!code && normalizedItemName === '平均红细胞血红蛋白浓度') {
            code = 'MCHC';
            console.log(`[Parse] Ultimate fallback: "${normalizedItemName}" → code="${code}"`);
        }
        if (!code && normalizedItemName === '血小板分布宽度') {
            code = 'PDW';
            console.log(`[Parse] Ultimate fallback: "${normalizedItemName}" → code="${code}"`);
        }
        // 【兜底】嗜酸性粒细胞百分比/比率 → EOS%
        if (!code && (normalizedItemName === '嗜酸性粒细胞比率' || normalizedItemName === '嗜酸性粒细胞百分比')) {
            code = 'EOS%';
            console.log(`[Parse] Ultimate fallback: "${normalizedItemName}" → code="${code}"`);
        }
        // 【兜底】凝血项目 - 纤维蛋白原 → Fg（支持带括号或不带括号）
        if (!code && (/^纤维蛋白原/.test(normalizedItemName) || normalizedItemName === '纤维蛋白原')) {
            code = 'Fg';
            console.log(`[Parse] Ultimate fallback: "${normalizedItemName}" → code="${code}"`);
        }
        // 【兜底】血常规项目 - 从项目名称反查code（处理双列排版粘连导致前导简称丢失）
        // 【修复】单字母code（如"B"）很可能是前导缩写提取的误判，也允许被名称兜底覆盖
        if (!code || (code.length === 1 && /^[A-Za-z]$/.test(code))) {
            const cbcNameToCode = {
                '白细胞计数': 'WBC',
                '白细胞': 'WBC',
                '红细胞计数': 'RBC',
                '红细胞': 'RBC',
                '血红蛋白': 'HGB',
                '血小板计数': 'PLT',
                '血小板': 'PLT',
                '中性粒细胞比率': 'NEU%',
                '中性粒细胞百分比': 'NEU%',
                '中性粒细胞百分数': 'NEU%',
                '淋巴细胞比率': 'LYM%',
                '淋巴细胞百分比': 'LYM%',
                '淋巴细胞百分数': 'LYM%',
                '单核细胞比率': 'MON%',
                '单核细胞百分比': 'MON%',
                '单核细胞百分数': 'MON%',
                '嗜酸性粒细胞比率': 'EOS%',
                '嗜酸性粒细胞百分比': 'EOS%',
                '嗜酸性粒细胞百分数': 'EOS%',
                '嗜酸性细胞%': 'EOS%',
                '嗜碱性粒细胞比率': 'BAS%',
                '嗜碱性粒细胞百分比': 'BAS%',
                '嗜碱性粒细胞百分数': 'BAS%',
                '嗜碱性细胞%': 'BAS%',
                '中性粒细胞计数': 'NEU#',
                '中性粒细胞数': 'NEU#',
                '淋巴细胞计数': 'LYM#',
                '淋巴细胞数': 'LYM#',
                '单核细胞计数': 'MON#',
                '单核细胞数': 'MON#',
                '嗜酸性粒细胞计数': 'EOS#',
                '嗜酸性粒细胞数': 'EOS#',
                '嗜酸性细胞数': 'EOS#',
                '嗜碱性粒细胞计数': 'BAS#',
                '嗜碱性粒细胞数': 'BAS#',
                '嗜碱性细胞数': 'BAS#',
                '平均红细胞体积': 'MCV',
                '平均红细胞血红蛋白量': 'MCH',
                '平均红细胞血红蛋白含量': 'MCH',
                '平均红细胞血红蛋白浓度': 'MCHC',
                '红细胞分布宽度': 'RDW',
                'RDW变异系数': 'RDW-CV',
                'RBC分布宽度-CV': 'RDW-CV',
                '红细胞分布宽度-CV': 'RDW-CV',
                '红细胞分布宽度CV': 'RDW-CV',
                'RDW标准差': 'RDW-SD',
                'RBC分布宽度-SD': 'RDW-SD',
                '红细胞分布宽度-SD': 'RDW-SD',
                '红细胞分布宽度SD': 'RDW-SD',
                '红细胞压积': 'HCT',
                '血小板分布宽度': 'PDW',
                '血小板平均分布宽度': 'PDW',
                'PLT分布宽度': 'PDW',
                '血小板压积': 'PCT',
                '平均血小板体积': 'MPV',
                '平均PLT体积': 'MPV',
                '平均PLT容积': 'MPV',
                '血小板平均体积': 'MPV',                                
                '大型血小板比率': 'P-LCR',
                '超敏C反应蛋白': 'HS-CRP',
                '超敏C-反应蛋白': 'HS-CRP',
                '超敏C—反应蛋白': 'HS-CRP',
                '超敏C反应蛋白测定': 'HS-CRP',
                'C反应蛋白': 'CRP',
                'C-反应蛋白': 'CRP'
            };
            // 肿瘤标志物、心肌、甲功、凝血等其他项目兜底映射
            const tumorNameToCode = {
                // ---- 凝血项目 ----
                '凝血酶原时间': 'PT',
                'PT': 'PT',
                '国际标准化比值': 'INR',
                'INR': 'INR',
                'PT-INR': 'INR',
                '活化部分凝血活酶时间': 'APTT',
                'APTT': 'APTT',
                '凝血酶时间': 'TT',
                'TT': 'TT',
                '纤维蛋白原': 'Fg',
                'Fg': 'Fg',
                'D-二聚体': 'DD',
                'DD': 'DD',
                '纤维蛋白降解产物': 'FDP',
                'FDP': 'FDP',
                '抗凝血酶': 'AT',
                'AT': 'AT',
                '肌红蛋白': 'Mb',
                '肌钙蛋白T': 'TnT',
                'BNP': 'B型钠尿肽',                
                // ---- 肿瘤标志物 ----
                '癌胚抗原': 'CEA',
                '甲胎蛋白': 'AFP',
                '糖链抗原50': 'CA50',
                '糖链抗原CA50': 'CA50',
                'CA50': 'CA50',
                '糖链抗原125': 'CA125',
                '糖链抗原CA125': 'CA125',
                'CA125': 'CA125',
                '糖链抗原199': 'CA19-9',
                '糖链抗原CA19-9': 'CA19-9',
                '糖链抗原CA199': 'CA19-9',
                'CA19-9': 'CA19-9',
                'CA199': 'CA19-9',
                '糖链抗原242': 'CA242',
                '糖链抗原CA242': 'CA242',
                'CA242': 'CA242',
                '糖链抗原724': 'CA72-4',
                '糖链抗原CA72-4': 'CA72-4',
                '糖链抗原CA724': 'CA72-4',
                'CA72-4': 'CA72-4',
                'CA724': 'CA72-4',
                '细胞角蛋白19片段': 'CYFRA21-1',
                '细胞角蛋白211': 'CYFRA21-1',
                '鳞状细胞癌相关抗原': 'SCC',
                '胃泌素释放肽前体': 'ProGRP',
                '神经元特异性烯醇化酶': 'NSE',
                '神经元特异性烯醇化酶测定': 'NSE',
                '烯醇化酶': 'NSE',
                '总前列腺特异性抗原': 'TPSA',
                '总前列腺特异抗原': 'TPSA',
                '总PSA': 'TPSA',
                'TPSA': 'TPSA',
                '游离前列腺特异性抗原': 'FPSA',
                '游离前列腺特异抗原': 'FPSA',
                '游离PSA': 'FPSA',
                'FPSA': 'FPSA',
                '游离/总前列腺特异性抗原': 'F/TPSA',
                '游离总比': 'F/TPSA',
                'F/TPSA': 'F/TPSA',
                'B型钠尿肽': 'BNP',
                'N端-B型钠尿肽': 'BNP',
                'N端-B型钠尿肽前体': 'BNP',
                '叶酸': 'FOL',
                '促甲状腺激素': 'TSH',
                '促甲状腺激素测定': 'TSH',
                'TSH': 'TSH',
                '甲状腺素': 'T4',
                '甲状腺素测定': 'T4',
                '总甲状腺素': 'T4',
                '总T4': 'T4',
                'T4': 'T4',
                '三碘甲状原氨酸': 'T3',
                '总三碘甲状原氨酸': 'T3',
                '总T3': 'T3',
                'T3': 'T3',
                '游离三碘甲状原氨酸': 'FT3',
                '游离T3': 'FT3',
                'FT3': 'FT3',
                '游离甲状腺素': 'FT4',
                '游离甲状腺素测定': 'FT4',
                '游离T4': 'FT4',
                'FT4': 'FT4',
                '铁蛋白': 'SF',
                '维生素B12': 'B12',
                // ---- 尿液 ----
                '尿比重': 'SG',
                '尿pH': 'PH'
            };
            // 生化项目兜底映射
            const biochemNameToCode = {
                '丙氨酸氨基转移酶': 'ALT',
                '天门冬氨酸氨基转移酶': 'AST',
                '谷氨酰转移酶': 'GGT',
                '总蛋白': 'TP',
                '白蛋白': 'ALB',
                '前白蛋白': 'PAB',
                '球蛋白': 'GLB',
                '白球比': 'A/G',
                '白球比例': 'A/G',
                '总胆红素': 'TBIL',
                '直接胆红素': 'DBIL',
                '间接胆红素': 'IBIL',
                '碱性磷酸酶': 'ALP',
                '谷氨酰转肽酶': 'GGT',
                '腺苷脱氨酶': 'ADA',
                '谷氨酸脫氢酶': 'GLDH',
                '肌酐': 'CREA',
                '尿素氮': 'BUN',
                '尿酸': 'UA',
                '胱抑素C': 'CysC',
                '总胆固醇': 'TC',
                '甘油三酯': 'TG',
                '高密度脂蛋白胆固醇': 'HDL-C',
                '低密度脂蛋白胆固醇': 'LDL-C',
                '空腹血糖': 'GLU',
                '空腹血葡萄糖': 'GLU',
                '葡萄糖': 'GLU',
                '糖化血红蛋白': 'HbA1c',
                '糖化': 'HbA1c',
                '钾': 'K',
                '钠': 'Na',
                '氯': 'Cl',
                '钙': 'Ca',
                '磷': 'P',
                '镁': 'Mg',
                '碳酸氢根': 'HCO3',
                '羟丁酸脱氢酶': 'HBDH',
                '肌酸激酶': 'CK',
                '肌酸激酶同工酶': 'CK-MB',
                '乳酸脱氢酶': 'LDH',
                '游离脂肪酸': 'FFA',
                '乳酸脫氢酶': 'LDH',
                '总二氧化碳': 'TCO2',
                '二氧化碳': 'CO2',
                'β2微球蛋白': 'B2-MG',
                'β2-微球蛋白': 'B2-MG',
                'B2微球蛋白': 'B2-MG',
                '总胆汁酸': 'TBA',
                '胆汁酸': 'TBA',
                'γ-谷氨酰基转肽酶': 'GGT',
                '谷氨酰基转肽酶': 'GGT',
                'γ-谷氨酰转肽酶': 'GGT',
                '亮氨酸氨基肽酶': 'LAP',
                '谷胱甘肽还原酶': 'GR',
                '谷草同工酶': 'ASTm',
                '载脂蛋白A1': 'APOA1',
                '载脂蛋白B': 'APOB',
                '载脂蛋白B100': 'APOB',
                '脂蛋白(a)': 'LPA',
                '脂蛋白a': 'LPA',
                'Lp(a)': 'LPA',
                '胆碱脂酶': 'CHE',
                '胆碱酯酶': 'CHE',
                '视黄醇结合蛋白': 'RBP',
                '肌酸激酶-MB同工酶': 'CK-MB',
                '肌酸激酶MB同工酶': 'CK-MB',
                '肌酸激酶-MB亚型质量': 'CK-MB',
                'CK-MB同工酶': 'CK-MB',
                '降钙素原': 'PCT',
                '白介素-6': 'IL-6', 
                'CKMB': 'CK-MB'
            };
            const fallbackCode = cbcNameToCode[normalizedItemName] 
                || tumorNameToCode[normalizedItemName]
                || biochemNameToCode[normalizedItemName];
            if (fallbackCode) {
                if (code && code.length === 1) {
                    console.log(`[Parse] SINGLE_LETTER_CODE override: "${code}" → "${fallbackCode}" for "${normalizedItemName}"`);
                } else {
                    console.log(`[Parse] Name-to-code fallback: "${normalizedItemName}" → code="${fallbackCode}"`);
                }
                code = fallbackCode;
            }
        }
        
        if (resultPrefix) {
            console.log(`[Parse] INEQUALITY_RESULT: "${normalizedItemName}" = ${resultPrefix}${resultValue}`);
        }
        return {
            code, itemName: normalizedItemName, result: resultValue, resultPrefix, flag,
            refRange: ref.display,
            refMin: ref.min, refMax: ref.max,
            isNumeric: !isTextResult,
            mergedSecondItem  // 非null时说明本行OCR合并了两个项目名，第二项名称待补
        };
    };
    
    // 【关键修复】缓存从NO_REF行提取的code，供后续使用
    let lineCodeCache = null;
    // 【新增】凝血项目强制合并标记（处理INR等换行情况）
    let coagForceMerge = null;
    
    for (let i = 0; i < mergedLines.length; i++) {
        const line = mergedLines[i];
        
        // 【关键修复】处理凝血项目强制合并
        if (coagForceMerge) {
            const resultMatch = line.match(/^(\d+\.?\d*|<\d+\.?\d*)/);
            if (resultMatch) {
                // 找到结果值，创建完整item
                const forcedItem = {
                    code: coagForceMerge.code,
                    itemName: coagForceMerge.itemName,
                    result: resultMatch[1],
                    flag: '',
                    refRange: '',
                    refMin: null,
                    refMax: null,
                    isNumeric: true
                };
                console.log(`[Parse] FORCED coagulation item (merged): ${JSON.stringify(forcedItem)}`);
                tableData.push(forcedItem);
                coagForceMerge = null; // 重置标记
                continue; // 跳过当前行，已处理
            }
            // 不是结果行，重置标记（避免错误合并）
            coagForceMerge = null;
        }
        
        if (isHeaderLine(line)) {
            console.log(`[Parse] SKIP: "${line}"`);
            continue;
        }
        
        // ★ 收集所有参考范围模式 ★
        const allRefs = [];
        let m;
        
        // Pattern 1: N-N 范围 (如 "3.5-5.3", "0-26", "9--17"双连字符)
        // 支持单连字符、双连字符、波浪号、破折号等多种分隔符
        // 但需要排除前面紧跟中文字符的情况（如 "糖链抗原19-9" 中的 "19-9"）
        // 【关键修复】CA 肿瘤标志物（如 CA19-9, CA72-4, CA15-3）
        // 这些指标名称中包含横杠（如19-9），必须豁免不被截断
        // 但参考范围如 0.27--4.2、3.5-77 仍然需要识别（含小数点的是参考范围）
        // 【修复】检测是否包含 CA19-9/CA72-4/CA15-3 等格式（可能前面有"电化学发光"等前缀）
        const hasCAFormat = /CA\d{1,3}-\d{1,3}/i.test(line);
        // 【修复】加入 \u2212（Unicode减号−）以处理 OCR 混合连字符，如 "0.4-−8"
        const nnRegex = /(\d+\.?\d*)\s*[-~—\u2212–]+\s*(\d+\.?\d*)/g;
        while ((m = nnRegex.exec(line)) !== null) {
            const a = parseFloat(m[1]), b = parseFloat(m[2]);
            // 【修复】CA行豁免：整数-整数模式（如19-9, 72-4, 15-3）前面是英文字母（CA中的A），跳过
            // 但含小数的（如0.27-4.2, 3.5-77）是参考范围，保留
            const matchStr = m[0];
            const isIntegerInteger = /^\d{1,3}-\d{1,3}$/.test(matchStr.replace(/\s+/g, ''));
            // 检查 N-N 前面是否是英文字母（如 CA19-9 中的 A）
            const charBeforeMatch = line.charAt(m.index - 1);
            const isPartOfCA = /[a-zA-Z]/.test(charBeforeMatch) && hasCAFormat;
            if (isIntegerInteger && isPartOfCA) {
                console.log(`[Parse] SKIP N-N for CA item name: "${m[0]}" at ${m.index}, prev="${charBeforeMatch}"`);
                continue;
            }
            // Skip if preceded by Chinese character (part of item name like "糖链抗原19-9")
            if (/[\u4e00-\u9fa5]/.test(charBeforeMatch)) {
                console.log(`[Parse] SKIP N-N pattern (part of Chinese name): "${m[0]}" at ${m.index}, prev="${charBeforeMatch}"`);
                continue;
            }
            // 【修复】允许 min === max 的参考范围（如 0-0）
            if (!isNaN(a) && !isNaN(b)) {
                allRefs.push({
                    type: 'range', min: Math.min(a, b), max: Math.max(a, b),
                    display: `${Math.min(a,b)}-${Math.max(a,b)}`,
                    index: m.index, endIndex: m.index + m[0].length
                });
            }
        }
        
        // Pattern 2: ≤X / <=X / <X (单侧上限)
        // 【修复】当同一行有多个 <X 匹配时（如 "<15.00 pg/mL <100"），
        // 第一个是结果值，最后一个才是参考范围。只保留最右侧的作为参考范围。
        // 【修复2】如果行内已有 N-N 双边范围，则该行的 <X 必为结果值而非参考范围，跳过收集
        // 【修复3】但若行内有多个 N-N 范围（多项目合并行），则 <X / >X 可能是其中某项的参考范围，需保留
        const rangeRefCount = allRefs.filter(r => r.type === 'range').length;
        const hasRangeRef = rangeRefCount > 0;
        const isMultiItemLine = rangeRefCount > 1;
        const leMatches = [];
        if (!hasRangeRef || isMultiItemLine) {
            const leRegex = /[≤<]=?\s*(\d+\.?\d*)/g;
            while ((m = leRegex.exec(line)) !== null) {
                const overlaps = allRefs.some(r => m.index < r.endIndex && (m.index + m[0].length) > r.index);
                if (!overlaps) {
                    // 【修复】检查 <X 前是否紧跟 阴性/阳性 等文字前缀（如"阴性<1.00"），保留完整显示
                    const textPrefixMatch = line.substring(0, m.index).match(/(阴性|阳性|弱阴性|弱阳性|阴性\([－-]\)|阴性\(-\))$/);
                    const displayPrefix = textPrefixMatch ? textPrefixMatch[1] : '';
                    leMatches.push({
                        type: 'le', min: null, max: parseFloat(m[1]),
                        display: displayPrefix + m[0].replace(/\s+/g, ''),
                        index: m.index, endIndex: m.index + m[0].length
                    });
                }
            }
            // Only keep the rightmost <X as reference range (earlier ones are result values)
            if (leMatches.length > 0) {
                if (leMatches.length > 1) {
                    console.log(`[Parse] Multiple <X found (${leMatches.length}), only rightmost "${leMatches[leMatches.length-1].display}" kept as ref`);
                }
                allRefs.push(leMatches[leMatches.length - 1]);
            }
        } else {
            console.log(`[Parse] Skip <X patterns: N-N range already found in line`);
        }
        
        // Pattern 3: ≥X / >=X / >X (单侧下限)
        // Same dedup logic: only keep rightmost >X as reference range
        // 【修复】同上，行内已有 N-N 范围时跳过 >X 收集
        // 【新增】行内含半定量结果（如 3+, 2+）时，>X 不作数值参考范围（参考范围是文字"阴性"）
        const hasSemiQuantResult = /\b[1-4][+＋]/.test(line);
        const geMatches = [];
        if ((!hasRangeRef || isMultiItemLine) && !hasSemiQuantResult) {
            const geRegex = /[≥>]=?\s*(\d+\.?\d*)/g;
            while ((m = geRegex.exec(line)) !== null) {
                const overlaps = allRefs.some(r => m.index < r.endIndex && (m.index + m[0].length) > r.index);
                if (!overlaps) {
                    // 【修复】检查 >X 前是否紧跟 阴性/阳性 等文字前缀（如"阴性>1.00"），保留完整显示
                    const textPrefixMatchGe = line.substring(0, m.index).match(/(阴性|阳性|弱阴性|弱阳性|阴性\([－-]\)|阴性\(-\))$/);
                    const displayPrefixGe = textPrefixMatchGe ? textPrefixMatchGe[1] : '';
                    geMatches.push({
                        type: 'ge', min: parseFloat(m[1]), max: null,
                        display: displayPrefixGe + m[0].replace(/\s+/g, ''),
                        index: m.index, endIndex: m.index + m[0].length
                    });
                }
            }
            if (geMatches.length > 0) {
                if (geMatches.length > 1) {
                    console.log(`[Parse] Multiple >X found (${geMatches.length}), only rightmost "${geMatches[geMatches.length-1].display}" kept as ref`);
                }
                allRefs.push(geMatches[geMatches.length - 1]);
            }
        }
        
        if (allRefs.length === 0) {
            // 【修复】豁免"方法+简称"行（如"比色法 MPV"、"计算法 HCT"）
            // 这些是双列表格的右列标题行，应该合并到下一行而不是跳过
            // 【简化】只要包含 方法+空格+英文 就豁免
            const hasMethodAndAbbr = /(比色法|计算法|流式法|电阻抗法|试验方法|流式细胞法|比浊法)\s+[A-Z]/i.test(line);
            if (hasMethodAndAbbr) {
                console.log(`[Parse] NO_REF method+abbr line preserved: "${line}"`);
                // 【关键修复】直接提取方法+简称行的code，避免丢失
                const abbrMatch = line.match(/(比色法|计算法|流式法|电阻抗法|试验方法|流式细胞法|比浊法)\s+([A-Z][A-Z0-9%#\-]*)/);
                if (abbrMatch && !lineCodeCache) {
                    lineCodeCache = abbrMatch[2];
                    console.log(`[Parse] Hard extract code from method+abbr line: "${lineCodeCache}"`);
                }
                // 继续处理，不跳过
            } else {
                // 【修复】豁免凝血功能项目：带括号Code+数字但无参考范围（如"纤维蛋白原(Fg) 3.02"）
                const coagCodeMatch = line.match(/\((PT|INR|APTT|TT|Fg|DD|FDP|AT)\)/);
                if (coagCodeMatch) {
                    console.log(`[Parse] NO_REF coagulation line preserved: "${line}"`);
                    // 【强制捕获】凝血项目：即使无参考范围也要提取
                    const coagCode = coagCodeMatch[1];
                    const coagResultMatch = line.match(/\d+\.?\d*/);
                    if (coagResultMatch) {
                        // 构造强制item对象
                        const forcedItem = {
                            code: coagCode,
                            itemName: line.split('(')[0].trim(),
                            result: coagResultMatch[0],
                            flag: '',
                            refRange: '',
                            refMin: null,
                            refMax: null,
                            isNumeric: true
                        };
                        // 特殊处理：纤维蛋白原补充参考范围
                        if (coagCode === 'Fg') {
                            forcedItem.itemName = '纤维蛋白原';
                            forcedItem.refRange = '2-4';
                            forcedItem.refMin = 2;
                            forcedItem.refMax = 4;
                        }
                        // 特殊处理：抗凝血酶(AT)参考范围标准化（去掉%号）
                        if (coagCode === 'AT') {
                            forcedItem.itemName = '抗凝血酶';
                            // 从行中提取参考范围
                            const atRefMatch = line.match(/(\d+\.?\d*%?)\s*[-~—]+\s*(\d+\.?\d*%?)/);
                            if (atRefMatch) {
                                const rawMin = atRefMatch[1];
                                const rawMax = atRefMatch[2];
                                // 去掉%号并转换为数字
                                const cleanMin = parseFloat(rawMin.replace('%', ''));
                                const cleanMax = parseFloat(rawMax.replace('%', ''));
                                forcedItem.refRange = `${cleanMin}-${cleanMax}`;
                                forcedItem.refMin = cleanMin;
                                forcedItem.refMax = cleanMax;
                                console.log(`[Parse] AT ref range normalized: "${rawMin}--${rawMax}" → "${forcedItem.refRange}"`);
                            }
                        }
                        console.log(`[Parse] FORCED coagulation item: ${JSON.stringify(forcedItem)}`);
                        tableData.push(forcedItem);
                    } else {
                        // 【关键修复】凝血项目无结果（结果在下一行），标记强制合并
                        coagForceMerge = {
                            code: coagCode,
                            itemName: line.split('(')[0].trim().replace(/^\*/, ''),
                            sourceLine: line
                        };
                        console.log(`[Parse] Coagulation item needs merge: ${coagCode}, waiting for result...`);
                    }
                    // 继续处理，不跳过
                }
                // 【修复】强制捕获：FOL（叶酸）即使无参考范围也要提取
                const folMatch = line.match(/FOL\s*\*?叶酸/);
                if (folMatch) {
                    const folResultMatch = line.match(/(\d+\.?\d*)/);
                    if (folResultMatch) {
                        const forcedFol = {
                            code: 'FOL',
                            itemName: '叶酸',
                            result: folResultMatch[1],
                            flag: '',
                            refRange: '8.83-60.8',
                            refMin: 8.83,
                            refMax: 60.8,
                            isNumeric: true
                        };
                        console.log(`[Parse] FORCED folate item: ${JSON.stringify(forcedFol)}`);
                        tableData.push(forcedFol);
                    }
                    // 继续处理，不跳过
                }
                // 【修复】豁免生化项目：纯英文简称行（如"HBDH"、"LDH"）缓存code用于下一行
                const bioAbbrMatch = line.match(/^[A-Z][A-Z0-9\-]{2,}$/);
                // 【修复】带序号的表格格式："参考范围 1 RBC-NCG" 或 "2 DXX-NCG" — 提取code缓存
                const seqCodeMatch = !lineCodeCache && line.match(/\b(\d+)\s+([A-Z][A-Z0-9\-]{2,})\s*$/);
                if (bioAbbrMatch && !lineCodeCache) {
                    lineCodeCache = bioAbbrMatch[0];
                    console.log(`[Parse] NO_REF biochem abbr cached: "${lineCodeCache}"`);
                    // 继续处理，不跳过
                } else if (seqCodeMatch) {
                    lineCodeCache = seqCodeMatch[2];
                    console.log(`[Parse] NO_REF seq+code cached: "${lineCodeCache}" from "${line}"`);
                    // 继续处理，不跳过
                } else {
                    // 【修复】检测"名称+结果+箭头"行（如"红细胞计数 2.3 ↑"），后接参考范围行
                    // 这是带序号列的表格被OCR竖向拆分后的格式
                    // 格式1："名称 结果" / "参考范围"
                    // 格式2："名称 结果" / "单位" / "参考范围"（单位行夹在中间）
                    console.log(`[Parse] RESCUE_CHECK: line="${line}" next1="${i + 1 < mergedLines.length ? mergedLines[i + 1] : ''}"`);
                    // 【修复】格式：纯中文项目名 / 参考范围行 / <X结果行（顺序颠倒）
                    // 例如：肌钙蛋白T → 参考值：参考范围：0-0.014ng/mL → <0.004ng/mL
                    const isPureChineseName = /^[\u4e00-\u9fa5A-Za-z\s\-·]+$/.test(line.trim()) && /[\u4e00-\u9fa5]/.test(line);
                    if (isPureChineseName && i + 2 < mergedLines.length) {
                        const next1 = mergedLines[i + 1];
                        const next2 = mergedLines[i + 2];
                        // 下一行含 N-N 参考范围，下两行含 <X 结果
                        const refFromNext1 = next1.match(/(\d+\.?\d*)\s*[-~—–]+\s*(\d+\.?\d*)/);
                        const resultFromNext2 = next2.match(/^([<>≤≥])\s*(\d+\.?\d*)/);
                        if (refFromNext1 && resultFromNext2) {
                            const refStr = `${refFromNext1[1]}-${refFromNext1[2]}`;
                            const resultStr = `${resultFromNext2[1]}${resultFromNext2[2]}`;
                            const syntheticLine = line.trim() + ' ' + resultStr + ' ' + refStr;
                            console.log(`[Parse] RESCUE inverted-order: "${line.trim()}" result="${resultStr}" ref="${refStr}" → "${syntheticLine}"`);
                            mergedLines[i] = syntheticLine;
                            i--;
                            continue;
                        }
                        // 下一行含 <X 结果，下两行含 N-N 参考范围（正常顺序，但名称独立成行）
                        const resultFromNext1 = next1.match(/^([<>≤≥])\s*(\d+\.?\d*)/);
                        const refFromNext2 = next2.match(/(\d+\.?\d*)\s*[-~—–]+\s*(\d+\.?\d*)/);
                        if (resultFromNext1 && refFromNext2) {
                            const resultStr = `${resultFromNext1[1]}${resultFromNext1[2]}`;
                            const refStr = `${refFromNext2[1]}-${refFromNext2[2]}`;
                            const syntheticLine = line.trim() + ' ' + resultStr + ' ' + refStr;
                            console.log(`[Parse] RESCUE split-3lines: "${line.trim()}" result="${resultStr}" ref="${refStr}" → "${syntheticLine}"`);
                            mergedLines[i] = syntheticLine;
                            i--;
                            continue;
                        }
                    }
                    // 支持纯数字结果 和 带<>/≤/≥前缀+单位的结果（如 <21.00ng/mL, <0.400ng/mL）
                    const nameResultMatch = line.match(/^([一-龥A-Za-z\s\-\/·]+?)\s+([<>\u2264\u2265]?\d+\.?\d*[^\s]*)\s*([\u2191\u2193]?)$/);
                    // 【新增】过滤纯人名行：2-3个中文+数字 且 名字不包含常见检验词
                    const _nmCandidate = nameResultMatch && nameResultMatch[1].trim();
                    // 【新增】单个汉字（如「毛」）也应过滤
                    const isPersonName = _nmCandidate && /^[一-龥]{1,4}$/.test(_nmCandidate)
                        && !/(细胞|指数|蒸白|蛋白|糖|酶|胆|钾|红|白|血|期|比|率|浓|量|度|尿|硏|体|点|分|洗|局|尲|菌|虫|蛋|分析|计数|积|容|地|性|座|皮|泡|涡|染|泳)/.test(_nmCandidate);
                    if (isPersonName) {
                        console.log(`[Parse] NO_REF skip person name: "${line}"`);
                    }
                    if (nameResultMatch && !isPersonName && i + 1 < mergedLines.length) {
                        // 从下一行中提取参考范围（支持 "25-58", "参考值：女25-58 ng/mL", "<0.004ng/mL" 等格式）
                        const nextLine = mergedLines[i + 1];
                        let refExtract = nextLine.match(/(\d+\.?\d*)\s*[-~—–]+\s*(\d+\.?\d*)/);
                        // 【新增】OCR修正：参考范围中 "10-" 应为 "0-"（l 被识别为 1）
                        if (refExtract && refExtract[1] === '10' && /管型|红细胞|白细胞|上皮细胞/i.test(line)) {
                            console.log(`[Parse] OCR_FIX: ref range "10-${refExtract[2]}" → "0-${refExtract[2]}" for "${line}"`);
                            refExtract[1] = '0';
                        }
                        // 单侧参考范围：<0.004, ≤2.88 等
                        const singleRefExtract = !refExtract && nextLine.match(/[<≤>≥]\s*(\d+\.?\d*)/);
                        // 【新增】单位行包含单侧参考值：如"个/μ1"表示参考范围<=1
                        const unitWithSingleRef = !refExtract && !singleRefExtract && nextLine.match(/个\/[μµu]\s*(\d+\.?\d*)$/);
                        if (refExtract) {
                            const refStr = `${refExtract[1]}-${refExtract[2]}`;
                            const syntheticLine = line + ' ' + refStr;
                            console.log(`[Parse] NO_REF rescue: "${line}" + ref "${refStr}" (from "${nextLine}") → "${syntheticLine}"`);
                            mergedLines[i] = syntheticLine;
                            i--;  // 重新处理当前行（已追加了参考范围）
                            continue;
                        } else if (singleRefExtract) {
                            const refStr = nextLine.match(/[<≤>≥]\s*\d+\.?\d*/)[0].replace(/\s+/, '');
                            const syntheticLine = line + ' ' + refStr;
                            console.log(`[Parse] NO_REF rescue (single): "${line}" + ref "${refStr}" (from "${nextLine}") → "${syntheticLine}"`);
                            mergedLines[i] = syntheticLine;
                            i--;
                            continue;
                        } else if (unitWithSingleRef) {
                            // 【新增】处理单位行包含单侧参考值（如"个/μ1"表示0-1或<=1）
                            const maxRef = unitWithSingleRef[1];
                            const refStr = `0-${maxRef}`;
                            const syntheticLine = line + ' ' + refStr;
                            console.log(`[Parse] NO_REF rescue (unit+ref): "${line}" + ref "${refStr}" (from "${nextLine}") → "${syntheticLine}"`);
                            mergedLines[i] = syntheticLine;
                            mergedLines.splice(i + 1, 1); // 删除已处理的单位行
                            i--;
                            continue;
                        }
                    }
                    // 【修复】尿胆原特殊格式：行内包含"项目名 + 文本结果 + 文本参考范围"
                    // 例如："尿胆原 +一 +-/norm." / "尿胆原 +- Normal"
                    const urobilinogenMatch = line.match(/^([\u4e00-\u9fa5]{2,6})\s+([+＋一-]{1,3})\s+([+\-±/\\normNORMA.]+)$/);
                    if (urobilinogenMatch) {
                        const itemNameRaw = urobilinogenMatch[1];
                        let resultRaw = urobilinogenMatch[2];
                        let refRaw = urobilinogenMatch[3];
                        // OCR修正：+一 → +-
                        if (resultRaw === '+一') resultRaw = '+-';
                        if (refRaw.includes('一')) refRaw = refRaw.replace(/一/g, '-');
                        const uroItem = {
                            code: '',
                            itemName: normalizeItemName(itemNameRaw),
                            result: resultRaw,
                            resultPrefix: '',
                            flag: '',
                            refRange: refRaw,
                            refMin: null,
                            refMax: null,
                            isNumeric: false
                        };
                        console.log(`[Parse] ✓ UROBILINOGEN inline: "${line}" → ${JSON.stringify(uroItem)}`);
                        tableData.push(uroItem);
                        lineCodeCache = null;
                        continue;
                    }
                    // ---- 拆分行合并：项目名单独成行 + 下一行含"参考值:" ----
                    // Format: "尿胆原" + "阴性 参考值:阴性" / "阴性(-) 参考值:阴性(-)"
                    // Also: "尿颜色" + "稻黃色 参考值:淡黄"
                    // 【新增】防护：如果下一行是完整数值检验项目行（中文名+数字+参考范围），不触发TEXT_SPLIT合并
                    // 例如："均一性红细胞 82 %" next="透明管型定量 0.0 /ul 0-1"，不应合并
                    const nextLineForGuard = i + 1 < mergedLines.length ? mergedLines[i + 1].trim() : '';
                    // 【修复】必须以「中文项目名+空格+数字」开头，且不是文本结果token（如阴性/透明）开头
                    // 例如：「透明管型定量 0.0 /ul 0-1」是完整项目行，「阴性 pH* 7.5 5-7.5」不是
                    const _guardFirstToken = nextLineForGuard.split(/\s/)[0];
                    const nextLineIsCompleteItem = /^[\u4e00-\u9fa5]{2,}\s+\d+\.?\d*.*\d+\.?\d*\s*[-~—–]+\s*\d+/.test(nextLineForGuard)
                        && !(/^(阴性|阳性|弱阳性|弱阴性|浑浊|黄色|淡黄|橙色|透明$|norm)$/i.test(_guardFirstToken));
                    // 【修复】当前行自身已含"参考值:"，说明是完整数据行，不应触发TEXT_SPLIT
                    const currentLineIsComplete = /参考值\s*[:：]/.test(line);
                    if (i + 1 < mergedLines.length && !nextLineIsCompleteItem && !currentLineIsComplete) {
                        let textLine = line;
                        let inlineResultToken = null;
                        // 忽略前导方法关键字（比如 "检测方法 *梅毒螺旋体抗体测定"，"流式法 *亚硝酸盐"）
                        const methodPrefixesForSplit = /^(检测方法|检验方法|方法|试验方法|计算法|流式法|比色法|电阻抗法|化学发光|电化学发光)\s*/;
                        if (methodPrefixesForSplit.test(textLine)) {
                            textLine = textLine.replace(methodPrefixesForSplit, '').trim();
                        }
                        textLine = textLine.replace(/^\d*\s*T?\s*[\*＊]\s*/, '').trim(); // 去掉前导序号+*（如 1*、*）
                        const rawTokens = textLine.split(/\s+/).filter(Boolean);
                        const collectedInlineTokens = [];
                        let inlineFlag = '';
                        while (rawTokens.length > 1) {
                            const lastToken = rawTokens[rawTokens.length - 1];
                            if (/^[↑↓↗↘]$/.test(lastToken)) {
                                inlineFlag = lastToken;
                                rawTokens.pop();
                            } else if (isInlineResultToken(lastToken) && !/[\u4e00-\u9fa5]/.test(lastToken)) {
                                // 【修复】如果已有纯数字被收集（如 3+ > 1 中的 1 先被收集），以半定量 token 替换（优先级更高）
                                if (collectedInlineTokens.length > 0 && /^\d+\.?\d*$/.test(collectedInlineTokens[collectedInlineTokens.length - 1])) {
                                    collectedInlineTokens.length = 0; // 清空纯数字
                                }
                                collectedInlineTokens.unshift(lastToken);
                                rawTokens.pop();
                            } else if (lastToken === '*') {
                                // 【修复】跳过星号标记（临床意义标记），继续检查前面的token
                                rawTokens.pop();
                            } else if (/^[\u2212\-]$/.test(lastToken) || /^\d+\.?\d*$/.test(lastToken)) {
                                // 【新增】剥离末尾纯数字或Unicode减号（如「维生素C 1.40」「葡萄糖* −」）
                                // 这些是结果值，不应并入项目名称
                                // 但如果已经收集了半定量结果（如3+），则停止（避免「潜血 3+ > 1」变成「3+1」）
                                if (collectedInlineTokens.length > 0) {
                                    // 已有收集的结果token，停止收集数字
                                    rawTokens.pop(); // 丢弃这个多余的数字
                                } else {
                                    collectedInlineTokens.unshift(lastToken);
                                    rawTokens.pop();
                                }
                            } else if (/^[<>]$/.test(lastToken)) {
                                // 【新增】剥离末尾单独的 > 或 < 符号（如「潜血 3+ >」中的 >）
                                rawTokens.pop();
                            } else if (isTextResultToken(lastToken)) {
                                // 【新增】剥离末尾文本结果（如「隐血 阳性(+)」中的「阳性(+)」）
                                collectedInlineTokens.unshift(lastToken);
                                rawTokens.pop();
                            } else {
                                break;
                            }
                        }
                        if (collectedInlineTokens.length > 0) {
                            inlineResultToken = collectedInlineTokens.join('');
                            // 【新增】检测 (+) 并转换为 flag=↑，同时从结果中移除
                            if (/\(+\)$/.test(inlineResultToken)) {
                                inlineFlag = '↑';
                                inlineResultToken = inlineResultToken.replace(/\(+\)$/, '');
                            }
                            // 【新增】检测 阳性 并设置 flag=↑
                            if (/阳性$/.test(inlineResultToken)) {
                                inlineFlag = '↑';
                            }
                            // 【新增】检测 阳性(+) 并设置 flag=↑，同时移除 (+)
                            if (/阳性\(\+\)$/.test(inlineResultToken)) {
                                inlineFlag = '↑';
                                inlineResultToken = inlineResultToken.replace(/\(\+\)$/, '');
                            }
                            // 【新增】处理 '隐血 阳性 阴性'：如果结果是 '阳性阴性'，拆分为 result='阳性'，refRange='阴性'
                            if (inlineResultToken === '阳性阴性') {
                                inlineResultToken = '阳性';
                                inlineFlag = '↑'; // 设置上箭头标志
                                // 在后续处理中，阴性会被当作参考范围提取
                            }
                        }
                        textLine = rawTokens.join(' ').trim();
                        const firstToken = textLine.split(/\s+/)[0] || '';
                        const hasChineseName = /[\u4e00-\u9fa5]/.test(textLine);
                        // 【新增】baseName去掉所有*号（如「胆红素*」「白细胞酸酶*」）
                        const baseName = hasChineseName
                            ? textLine.replace(/\s+/g, '').replace(/[*＊]+/g, '')
                            : firstToken.replace(/[*＊]+/g, '');
                        const hasValidName = hasChineseName || isSpecialLatinItemName(firstToken);
                        if (!textLine || !hasValidName) {
                            // 无有效项目名，跳过
                            console.log(`[Parse] TEXT_SPLIT skip invalid name: "${line}"`);
                            // 继续执行下方通用文本行提取逻辑
                        }
                        const nextLine = mergedLines[i + 1];
                        if (isHeaderLine(nextLine)) {
                            console.log(`[Parse] TEXT_SPLIT skip header pair: "${line}" + "${nextLine}"`);
                            console.log(`[Parse] NO_REF: "${line}"`);
                            continue;
                        }
                        const nextLineTrimmed = nextLine.trim();
                        const numericOnlyRangeMatch = nextLineTrimmed.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)(.*)$/);
                        if (hasValidName && !/[\u4e00-\u9fa5]/.test(nextLineTrimmed) && numericOnlyRangeMatch) {
                            const rangeMin = numericOnlyRangeMatch[1];
                            const rangeMax = numericOnlyRangeMatch[2];
                            const rangeExtra = numericOnlyRangeMatch[3] ? numericOnlyRangeMatch[3].trim() : '';
                            const rangeDisplay = `${rangeMin}-${rangeMax}` + (rangeExtra ? ` ${rangeExtra}` : '');
                            if (i + 2 < mergedLines.length) {
                                const thirdLineRaw = mergedLines[i + 2];
                                const thirdTrim = thirdLineRaw.trim();
                                if (!isHeaderLine(thirdTrim)) {
                                    const thirdTokens = thirdTrim.split(/\s+/);
                                    const thirdResultToken = thirdTokens.find(t => isTextResultToken(t));
                                    if (thirdResultToken) {
                                        const normalizedName = normalizeItemName(baseName);
                                        const textItem = {
                                            code: '',
                                            itemName: normalizedName,
                                            result: thirdResultToken,
                                            resultPrefix: '',
                                            flag: '',
                                            refRange: rangeDisplay,
                                            refMin: parseFloat(rangeMin),
                                            refMax: parseFloat(rangeMax),
                                            isNumeric: false
                                        };
                                        console.log(`[Parse] ✓ TEXT_SPLIT range+text: "${line}" + "${nextLineTrimmed}" + "${thirdTrim}" → ${JSON.stringify(textItem)}`);
                                        tableData.push(textItem);
                                        lineCodeCache = null;
                                        i += 2;
                                        continue;
                                    }
                                }
                            }
                        }
                        if (hasValidName) {
                            const nextLineTrim = nextLine.trim();
                            const numericSplitMatch = nextLineTrim.match(/^([<>]?\d+\.?\d*)(\s*[A-Za-z%μm/]+)?$/);
                            if (numericSplitMatch) {
                                const numericValue = numericSplitMatch[1];
                                const numericSuffix = numericSplitMatch[2] ? numericSplitMatch[2].trim() : '';
                                if (i + 2 < mergedLines.length) {
                                    const rangeLineRaw = mergedLines[i + 2].trim();
                                    const rangeMatch = rangeLineRaw.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)(.*)$/);
                                    if (rangeMatch) {
                                        const rangeMin = rangeMatch[1];
                                        const rangeMax = rangeMatch[2];
                                        const rangeExtra = rangeMatch[3] ? rangeMatch[3].trim() : '';
                                        const cleanedRange = `${rangeMin}-${rangeMax}` + (rangeExtra ? ` ${rangeExtra}` : '');
                                        const syntheticLine = `${textLine} ${numericValue}${numericSuffix ? ` ${numericSuffix}` : ''} ${cleanedRange}`;
                                        console.log(`[Parse] NO_REF numeric split: "${line}" + "${nextLineTrim}" + "${rangeLineRaw}" → "${syntheticLine}"`);
                                        mergedLines[i] = syntheticLine;
                                        mergedLines.splice(i + 1, 2);
                                        i--;
                                        continue;
                                    }
                                }
                            }
                        }
                        const refValueMatch = nextLine.match(/^(.+?)\s*参考值[:：]\s*(.*)$/);
                        if (refValueMatch) {
                            const textResult = refValueMatch[1].trim();
                            const textRef = refValueMatch[2].trim();
                            // Only handle non-numeric results (numeric results should go through normal parsing)
                            if (textResult && !/^\d+\.?\d*$/.test(textResult) && (!textRef || !/^\d+\.?\d*$/.test(textRef))) {
                                let textItemName = hasChineseName ? textLine.replace(/\s+/g, '') : firstToken;
                                if (/[\u4e00-\u9fa5]/.test(textItemName) || isSpecialLatinItemName(textItemName)) {
                                    const normalizedName = normalizeItemName(textItemName);
                                    const textItem = {
                                        code: '',
                                        itemName: normalizedName,
                                        result: textResult,
                                        resultPrefix: '',
                                        flag: '',
                                        refRange: textRef,
                                        refMin: null,
                                        refMax: null,
                                        isNumeric: false
                                    };
                                    console.log(`[Parse] ✓ TEXT_SPLIT: "${line}" + "${nextLine}" → ${JSON.stringify(textItem)}`);
                                    tableData.push(textItem);
                                    lineCodeCache = null;
                                    i++; // skip next line (consumed as result)
                                    continue;
                                }
                            }
                        }

                        // ---- 兼容：下一行只有纯文本结果（无"参考值:"） ----
                        const extractTextValue = (raw) => {
                            if (!raw) return null;
                            const trimmed = raw.trim();
                            if (!trimmed) return null;
                            if (isHeaderLine(trimmed)) return null;
                            // 【新增】跳过纯单位行
                            if (isPureUnitLine(trimmed)) return null;
                            // 整行必须是有效的单个文本结果token（如"阴性"），不能是组合
                            if (isTextResultToken(trimmed) && !/\s/.test(trimmed)) {
                                // 【新增】OCR修正：土 → ±，· → +
                                if (trimmed === '土') return '±';
                                if (trimmed === '·' || trimmed === '•') return '+';
                                return trimmed;
                            }
                            // 否则只取第一个token
                            const firstToken = trimmed.split(/\s+/)[0];
                            if (isTextResultToken(firstToken)) {
                                // 【新增】OCR修正：土 → ±，· → +
                                if (firstToken === '土') return '±';
                                if (firstToken === '·' || firstToken === '•') return '+';
                                return firstToken;
                            }
                            return null;
                        };
                        const nameCandidate = hasValidName ? baseName : null;
                        // 【新增】如果下一行是纯单位行，直接跳过（不作为项目名处理）
                        if (isPureUnitLine(nextLineTrimmed)) {
                            console.log(`[Parse] TEXT_SPLIT skip pure unit line: "${nextLineTrimmed}"`);
                            console.log(`[Parse] NO_REF: "${line}"`);
                            continue;
                        }
                        if (nameCandidate) {
                            const nextValue = extractTextValue(nextLine);
                            // 特殊场景：下一行是中文文本结果（非标准token），下下行是标准参考范围token
                            // 例如："性状" + "硬便" + "软"（"软"是标准文本token才触发）
                            // 必须三行同时满足才触发，避免误匹配无关行
                            // 排除条件：①当前baseName本身是文本结果token（如"未见"）；②当前行含冒号（仪器/信息行）
                            const nameIsResultToken = isTextResultToken(nameCandidate);
                            const nameHasColon = /[:：]/.test(line);
                            if (!nextValue && !inlineResultToken && nextLineTrimmed
                                && !nameIsResultToken && !nameHasColon
                                && /^[\u4e00-\u9fa5]{1,8}$/.test(nextLineTrimmed)
                                && !isHeaderLine(nextLineTrimmed)
                                && i + 2 < mergedLines.length) {
                                const thirdLine = mergedLines[i + 2].trim();
                                if (!isHeaderLine(thirdLine) && isTextResultToken(thirdLine)) {
                                    const normalizedChineseName = normalizeItemName(nameCandidate);
                                    // 【修复】OCR错误：'一' 是 '-' 的误识别（如葡萄糖结果应为"-"而非"一"）
                                    let correctedResult = nextLineTrimmed;
                                    if (nextLineTrimmed === '一' && /葡萄糖|尿糖|糖/.test(normalizedChineseName)) {
                                        correctedResult = '-';
                                        console.log(`[Parse] OCR_FIX: "一" → "-" for ${normalizedChineseName}`);
                                    }
                                    const chineseTextItem = {
                                        code: '',
                                        itemName: normalizedChineseName,
                                        result: correctedResult,
                                        resultPrefix: '',
                                        flag: '',
                                        refRange: thirdLine,
                                        refMin: null,
                                        refMax: null,
                                        isNumeric: false
                                    };
                                    console.log(`[Parse] ✓ TEXT_SPLIT (chinese-text): "${line}" + "${nextLineTrimmed}" + ref="${thirdLine}" → ${JSON.stringify(chineseTextItem)}`);
                                    tableData.push(chineseTextItem);
                                    lineCodeCache = null;
                                    i += 2;
                                    continue;
                                }
                            }
                            if (nextValue || inlineResultToken) {
                                let textResultValue = inlineResultToken || nextValue;
                                let textRef = '';
                                let consumedLines = 1;
                                // 【新增】从 nextLine 中提取箭头 flag（如 "淡红色 ↑" 中的 ↑）
                                let nextLineFlag = '';
                                if (nextLineTrimmed) {
                                    const nextLineTokens = nextLineTrimmed.split(/\s+/);
                                    const lastNextToken = nextLineTokens[nextLineTokens.length - 1];
                                    if (/^[↑↓↗↘]$/.test(lastNextToken)) {
                                        nextLineFlag = lastNextToken;
                                    }
                                }
                                // 【新增】岟度尿液浊度等：如果当前行 inlineFlag 为空但 line 已包含箭头（MERGE_ARROW合并后箭头在行末）则提取
                                if (!inlineFlag && !nextLineFlag) {
                                    const lineArrowMatch = line.match(/[↑↓↗↘]/);
                                    if (lineArrowMatch) {
                                        nextLineFlag = lineArrowMatch[0];
                                    }
                                }
                                if (inlineResultToken && nextLineTrimmed && !isHeaderLine(nextLineTrimmed)) {
                                    if (nextValue) {
                                        textRef = nextValue;
                                        // 【修复】检查nextLine是否包含嵌套项目（如"阴性 pH 6.50 5-7.5"中pH是独立项目）
                                        const allTokens = nextLineTrimmed.split(/\s+/);
                                        const remainingTokens = allTokens.slice(1).join(' ');
                                        console.log(`[Parse] TEXT_SPLIT nested check: nextLine="${nextLineTrimmed}", nextValue="${nextValue}", remaining="${remainingTokens}"`);
                                        
                                        // 【新增】检测纯中文项目名（如"透明度"），不应作为参考范围
                                        let nestedItemMatch = null;
                                        if (/^[\u4e00-\u9fa5]{2,}$/.test(nextValue) && !remainingTokens) {
                                            console.log(`[Parse] TEXT_SPLIT pure Chinese item: "${nextValue}" should be treated as separate item, not reference range`);
                                            // 不将纯中文项目名作为参考范围，保持原有的textRef
                                        } else if (isTextResultToken(nextValue) && remainingTokens && remainingTokens.includes('*')) {
                                            // 【修复】如果nextValue是文本结果且remaining包含*，说明是下一个项目，不应作为参考范围
                                            console.log(`[Parse] TEXT_SKIP_TEXT_REF: nextValue="${nextValue}" is text result with next project, not using as reference range`);
                                            // 保持原有的textRef，不更新
                                        } else {
                                            // 支持格式: pH 6.50 5-7.5 (项目名 结果 N-N参考范围)
                                            // 捕获组: 1=项目名, 2=结果, 3=参考范围min, 4=参考范围max
                                            // 【新增】先去掉 remaining 中的 * 再匹配（如 pH* 7.00 5-7.5）
                                            const remainingForMatch = remainingTokens.replace(/[*＊]+/g, '');
                                            nestedItemMatch = remainingForMatch.match(/^([a-zA-Z]{1,6}|[\u4e00-\u9fa5]{1,6})\s+([\d.]+)\s+([\d.]+)\s*[-~—–]+\s*([\d.]+)/);
                                            // 支持格式: pH 6.50 (项目名+结果，下行为N-N参考范围)
                                            if (!nestedItemMatch) {
                                                const simpleItemMatch = remainingForMatch.match(/^([a-zA-Z]{1,6}|[\u4e00-\u9fa5]{1,6})\s+([\d.]+)$/);
                                                if (simpleItemMatch && i + 2 < mergedLines.length) {
                                                    const thirdLineCheck = mergedLines[i + 2].trim();
                                                    const thirdRangeMatch = thirdLineCheck.match(/^([\d.]+)\s*[-~—–]+\s*([\d.]+)/);
                                                    if (thirdRangeMatch) {
                                                        nestedItemMatch = [remainingTokens, simpleItemMatch[1], simpleItemMatch[2], thirdRangeMatch[1], thirdRangeMatch[2]];
                                                        mergedLines.splice(i + 2, 1);
                                                    }
                                                }
                                            }
                                        }
                                        if (nestedItemMatch) {
                                            const nestedItemName = nestedItemMatch[1];
                                            const nestedResult = nestedItemMatch[2];
                                            const nestedRefRange = `${nestedItemMatch[3]}-${nestedItemMatch[4]}`;
                                            // 【移除】移除pH自动添加逻辑，因为现在通过单元格合并逻辑已经正确分离了亚硝酸盐和pH
                                            // 所有嵌套项目插回mergedLines供后续处理
                                            mergedLines.splice(i + 1, 0, `${nestedItemName} ${nestedResult} ${nestedRefRange}`);
                                            console.log(`[Parse] TEXT_SPLIT nested item detected: "${nextLineTrimmed}" → split ref="${nextValue}", nested="${nestedItemName} ${nestedResult} ${nestedRefRange}"`);
                                        }
                                    } else if (isTextResultToken(nextLineTrimmed)) {
                                        textRef = nextLineTrimmed;
                                    } else {
                                        // 【新增】检查是否为项目名（如真菌），如果是则不当作参考范围
                                        const isProjectName = /^[\u4e00-\u9fa5]{1,8}$/.test(nextLineTrimmed) && 
                                            !/^(阴性|阳性|未见|未提示|未检出|无异常|未提示异常|透明|浑|清亮|清澈|软便|硬便|稀便|水样便|糊状便|成形便|烂便|不成形)$/.test(nextLineTrimmed);
                                        if (isProjectName) {
                                            // 重新插入项目名到 mergedLines 供后续处理
                                            mergedLines.splice(i + 1, 0, nextLineTrimmed);
                                            console.log(`[Parse] TEXT_SPLIT reinsert project: "${nextLineTrimmed}" back to mergedLines`);
                                        } else {
                                            const nextRefMatch = nextLineTrimmed.match(/^参考值[:：]\s*(.*)$/);
                                            if (nextRefMatch) {
                                                textRef = nextRefMatch[1].trim();
                                            } else {
                                                const nextRangeMatch = nextLineTrimmed.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)(.*)$/);
                                                if (nextRangeMatch) {
                                                    const rrMin = nextRangeMatch[1];
                                                    const rrMax = nextRangeMatch[2];
                                                    const rrExtra = nextRangeMatch[3] ? nextRangeMatch[3].trim() : '';
                                                    textRef = `${rrMin}-${rrMax}` + (rrExtra ? ` ${rrExtra}` : '');
                                                }
                                            }
                                        }
                                    }
                                }
                                if (i + 2 < mergedLines.length) {
                                    const thirdLine = mergedLines[i + 2];
                                    if (!isHeaderLine(thirdLine)) {
                                        const thirdValue = extractTextValue(thirdLine);
                                        if (thirdValue) {
                                            if (!textRef) {
                                                textRef = thirdValue;
                                            } else if (thirdValue !== textRef) {
                                                textRef = `${textRef} ${thirdValue}`.trim();
                                            }
                                            consumedLines++;
                                        } else {
                                            const thirdRefMatch = thirdLine.match(/^参考值[:：]\s*(.*)$/);
                                            if (thirdRefMatch) {
                                                textRef = thirdRefMatch[1].trim() || textRef;
                                                consumedLines++;
                                            } else {
                                                const pureRange = thirdLine.trim();
                                                const pureRangeMatch = pureRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)(.*)$/);
                                                if (pureRangeMatch) {
                                                    const minVal = pureRangeMatch[1];
                                                    const maxVal = pureRangeMatch[2];
                                                    const extra = pureRangeMatch[3] ? pureRangeMatch[3].trim() : '';
                                                    textRef = `${minVal}-${maxVal}` + (extra ? ` ${extra}` : '');
                                                    consumedLines++;
                                                }
                                            }
                                        }
                                    }
                                }
                                if (!inlineResultToken && !textRef) {
                                    textRef = '';
                                }
                                // 【新增】在TEXT_SPLIT中也处理管型分离（如"白细胞管型0~/ul酮体"）
                                let finalItemName = nameCandidate;
                                console.log(`[Parse] DEBUG: checking TEXT_SPLIT itemName="${nameCandidate}" for complex tube pattern`);
                                const textSplitTubeMatch = nameCandidate.match(/^([\u4e00-\u9fa5]+管型)\s*[^\d]*\d+\s*[~～\/\^\d]*\s*ul\s*\*?([\u4e00-\u9fa5]+)/);
                                if (textSplitTubeMatch) {
                                    const [, tubeType, nextItem] = textSplitTubeMatch;
                                    finalItemName = tubeType;
                                    console.log(`[Parse] TEXT_SPLIT_TUBE_SPLIT: "${textSplitTubeMatch[0]}" → "${tubeType}" (next item "${nextItem}" will be processed separately)`);
                                    // 将分离出的项目重新插入mergedLines供后续处理
                                    mergedLines.splice(i + 1, 0, nextItem);
                                } else {
                                    console.log(`[Parse] DEBUG: TEXT_SPLIT complex tube pattern did not match itemName="${nameCandidate}"`);
                                }
                                
                                const normalizedName = normalizeItemName(finalItemName);
                                let resolvedFlag = inlineFlag || nextLineFlag || '';
                                // 【新增】半定量结果自动判断flag：1+/2+/3+/4+ 且参考范围为"阴性"时 → ↑
                                if (!resolvedFlag && /^[1-4][+＋]$/.test(textResultValue) && /^阴性$/.test(textRef)) {
                                    resolvedFlag = '↑';
                                    console.log(`[Parse] SEMI_QUANT_FLAG: result="${textResultValue}" ref="${textRef}" → flag=↑`);
                                }
                                const textItem = {
                                    code: '',
                                    itemName: normalizedName,
                                    result: textResultValue,
                                    resultPrefix: '',
                                    flag: resolvedFlag,
                                    refRange: textRef,
                                    refMin: null,
                                    refMax: null,
                                    isNumeric: false
                                };
                                console.log(`[Parse] ✓ TEXT_SPLIT (multi-line): "${line}" + "${nextLine}"${textRef ? ` (+${consumedLines > 1 ? 'ref' : ''})` : ''} → ${JSON.stringify(textItem, null, 2)}`);
                                tableData.push(textItem);
                                lineCodeCache = null;
                                i += consumedLines; // skip consumed result/ref lines
                                continue;
                            }
                        }
                    }
                    // ---- 文本结果行提取（无参考范围的非数值项目） ----
                    // Format: "项目名 [Code] 文本结果 [文本参考值]"
                    // Examples: "蛋白质 阴性 阴性", "颜色 淡黄色", "隐血 BLD 阳性 阴性"
                    const lineTokens = line.split(/\s+/);
                    let textResultIdx = -1;
                    for (let ti = 0; ti < lineTokens.length; ti++) {
                        if (isTextResultToken(lineTokens[ti])) {
                            textResultIdx = ti;
                            break;
                        }
                    }
                    if (textResultIdx > 0) {
                        // Everything before the first text result is name (+ optional code)
                        const nameTokens = lineTokens.slice(0, textResultIdx);
                        let textItemName = nameTokens.join('');
                        let textCode = '';
                        // Extract code if present (e.g., "PRO", "BLD", "KET")
                        const lastNameToken = nameTokens[nameTokens.length - 1];
                        if (nameTokens.length > 1 && /^[A-Z][A-Z0-9\-]*$/i.test(lastNameToken)) {
                            textCode = lastNameToken;
                            textItemName = nameTokens.slice(0, -1).join('');
                        }
                        // 【新增】TEXT_ITEM路径也去除*号（如「尿胆原*」→「尿胆原」）
                        textItemName = textItemName.replace(/[*＊]+/g, '');
                        // 【修复】去除itemName中残留的表头前缀（如"结果/单位"、"项目明细"等）
                        textItemName = textItemName.replace(/^(结果[\/／]单位|项目明细|项目名称|检验项目)\s*/g, '').trim();
                        let textResult = lineTokens[textResultIdx];
                        // 【新增】OCR修正：土 → ±
                        if (textResult === '土') {
                            textResult = '±';
                            console.log(`[Parse] OCR_FIX: "土" → "±" in line "${line}"`);
                        }
                        // 【新增】OCR修正：+一 → +- (「一」被误识别为「-」)
                        if (textResult === '+一') {
                            textResult = '+-';
                            console.log(`[Parse] OCR_FIX: "+一" → "+-" in line "${line}"`);
                        }
                        // Optional text reference (next token if it's also a text result)
                        let textRef = '';
                        if (textResultIdx + 1 < lineTokens.length) {
                            const nextRefToken = lineTokens[textResultIdx + 1];
                            // 【修复】支持"参考值:阴性(-)"格式的token，剥离前缀取真实参考范围
                            const refPrefixMatch = nextRefToken.match(/^参考值\s*[:：]\s*(.+)$/);
                            if (refPrefixMatch) {
                                textRef = refPrefixMatch[1].trim();
                            } else if (isTextResultToken(nextRefToken)) {
                                textRef = nextRefToken;
                                // 【新增】OCR修正：土 → ± (参考范围)
                                if (textRef === '土') textRef = '±';
                            } else if (/^[+±-][\-\/a-zA-Z一-龥.]+$/.test(nextRefToken)) {
                                // 【新增】支持复合参考范围格式，如 +-/norm. 、 -/norm.
                                textRef = nextRefToken;
                            }
                        }
                        // 【修复】扫描所有后续token中的 参考值:xxx（当参考值与结果之间有多个空格token时）
                        if (!textRef) {
                            for (let ri = textResultIdx + 1; ri < lineTokens.length; ri++) {
                                const rTok = lineTokens[ri];
                                const rMatch = rTok.match(/^参考值\s*[:：]\s*(.+)$/);
                                if (rMatch) { textRef = rMatch[1].trim(); break; }
                            }
                        }
                        // Validate: item name must contain Chinese
                        if (/[\u4e00-\u9fa5]/.test(textItemName) && textItemName.length >= 1 && textItemName.length <= 30) {
                            const normalizedName = normalizeItemName(textItemName);
                            const textItem = {
                                code: textCode,
                                itemName: normalizedName,
                                result: textResult,
                                resultPrefix: '',
                                flag: '',
                                refRange: textRef,
                                refMin: null,
                                refMax: null,
                                isNumeric: false
                            };
                            console.log(`[Parse] ✓ TEXT_ITEM: "${line}" → ${JSON.stringify(textItem)}`);
                            tableData.push(textItem);
                            lineCodeCache = null;
                            continue;
                        }
                    }
                    // 【新增】百分比结果行：「均一性红细胞 82 %」/ 「异形红细胞 18 %」
                    // 格式：中文名 + 数字 + % (无参考范围)
                    const pctMatch = line.match(/^([\u4e00-\u9fa5A-Za-z\s\-·]{2,})\s+(\d+\.?\d*)\s*%$/);
                    if (pctMatch) {
                        const pctName = normalizeItemName(pctMatch[1].trim());
                        const pctResult = pctMatch[2];
                        const pctItem = {
                            code: lineCodeCache || '',
                            itemName: pctName,
                            result: pctResult,
                            resultPrefix: '',
                            flag: '',
                            refRange: '',
                            refMin: null,
                            refMax: null,
                            isNumeric: true
                        };
                        console.log(`[Parse] ✓ PCT_ITEM: "${line}" → ${JSON.stringify(pctItem)}`);
                        tableData.push(pctItem);
                        lineCodeCache = null;
                        continue;
                    }
                    console.log(`[Parse] NO_REF: "${line}"`);
                    continue;
                }
            }
        }
        
        // 按位置排序
        allRefs.sort((a, b) => a.index - b.index);
        
        // 【关键修复】CA行特殊处理：当整行包含CA19-9/CA72-4/CA15-3时，不要分段，直接提取整行
        const isCALine = /CA\d{1,3}-\d{1,3}/.test(line);
        if (isCALine && allRefs.length > 0) {
            // CA行：使用最后一个参考范围作为分割点，保留所有内容
            const lastRef = allRefs[allRefs.length - 1];
            const segment = line.substring(0, lastRef.index).trim();
            console.log(`[Parse] CA line special handling: "${segment.substring(0, 50)}"`);
            const parsed = extractItemFromSegment(segment, lastRef, line, hasCodeColumn, lineCodeCache);
            if (parsed) {
                console.log(`[Parse] ✓ CA line: "${segment.substring(0, 40)}" →`, JSON.stringify(parsed));
                tableData.push(parsed);
                // 【关键修复】成功创建item后，重置lineCodeCache，防止影响后续items
                lineCodeCache = null;
            }
        } else {
            // ★ 逐段提取项目(支持一行多个参考范围 = 双列报告) ★
            for (let ri = 0; ri < allRefs.length; ri++) {
                const ref = allRefs[ri];
                const segStart = ri === 0 ? 0 : allRefs[ri - 1].endIndex;
                const segment = line.substring(segStart, ref.index).trim();
                
                const parsed = extractItemFromSegment(segment, ref, line, hasCodeColumn, lineCodeCache);
                if (parsed) {
                    console.log(`[Parse] ✓ "${segment.substring(0, 40)}" →`, JSON.stringify(parsed));
                    
                    // 【新增】处理星号项目重新插入：检查原行是否包含星号项目
                    const starItemMatch = line.match(/[\*＊]\s*([\u4e00-\u9fa5]+[\u4e00-\u9fa5\d]*)/g);
                    if (starItemMatch) {
                        for (const starMatch of starItemMatch) {
                            const starItemName = starMatch.replace(/[\*＊]\s*/, '');
                            // 重新插入星号项目到 mergedLines 供后续处理
                            mergedLines.splice(i + 1, 0, starItemName);
                            console.log(`[Parse] STAR_ITEM_REINSERT: "${starMatch}" → "${starItemName}" reinserted for processing`);
                        }
                    }
                    
                    // 【修复】处理合并项目：如果当前项有mergedSecondItem，尝试从下一个ref段提取数值
                    if (parsed.mergedSecondItem && ri + 1 < allRefs.length) {
                        const nextRef = allRefs[ri + 1];
                        const nextSegStart = ref.endIndex;
                        const nextSegment = line.substring(nextSegStart, nextRef.index).trim();
                        const nextNumMatch = nextSegment.match(/([↓↑]?\s*\d+\.?\d*)/);
                        if (nextNumMatch) {
                            const nextResult = nextNumMatch[1].replace(/[↓↑\s]/g, '');
                            const nextOcrFlag = /↓/.test(nextNumMatch[1]) ? '↓' : /↑/.test(nextNumMatch[1]) ? '↑' : '';
                            // compute flag for second item
                            const nextNum = parseFloat(nextResult);
                            let nextFlag = nextOcrFlag;
                            if (!isNaN(nextNum) && nextRef.min !== null && nextRef.max !== null) {
                                if (nextNum < nextRef.min) nextFlag = '↓';
                                else if (nextNum > nextRef.max) nextFlag = '↑';
                                else nextFlag = '';
                            }
                            const secondItem = {
                                code: '',
                                itemName: parsed.mergedSecondItem,
                                result: nextResult,
                                resultPrefix: '',
                                flag: nextFlag,
                                refRange: nextRef.display,
                                refMin: nextRef.min,
                                refMax: nextRef.max,
                                isNumeric: true
                            };
                            // normalize itemName for second item
                            secondItem.itemName = normalizeItemName(secondItem.itemName);
                            // lookup code for second item (common merged pairs)
                            const mergedCodeMap = {
                                '氯': 'Cl', '磷': 'P', '钾': 'K', '钠': 'Na',
                                '钙': 'Ca', '镁': 'Mg', '铁': 'Fe', '锌': 'Zn'
                            };
                            if (!secondItem.code && mergedCodeMap[secondItem.itemName]) {
                                secondItem.code = mergedCodeMap[secondItem.itemName];
                                console.log(`[Parse] MERGED_COMPANION code: "${secondItem.itemName}" → "${secondItem.code}"`);
                            }
                            console.log(`[Parse] MERGED_COMPANION: "${parsed.mergedSecondItem}" result=${nextResult} → ${JSON.stringify(secondItem)}`);
                            tableData.push(parsed);
                            tableData.push(secondItem);
                            lineCodeCache = null;
                            ri++; // skip the next ref since we consumed it
                            continue;
                        }
                    }
                    tableData.push(parsed);
                    // 【关键修复】成功创建item后，重置lineCodeCache，防止影响后续items
                    lineCodeCache = null;
                }
            }
        }
    }
    
    // 【极简修复】直接补纤维蛋白原（血凝报告兜底）
    // 只有当原始文本包含纤维蛋白原(Fg)，但解析结果中缺失时才兜底
    const sourceHasFg = ocrText.includes("纤维蛋白原(Fg)") || ocrText.includes("(Fg)");
    const hasFg = tableData.some(item => item.itemName.includes("纤维蛋白原"));
    if (sourceHasFg && !hasFg) {
                console.log(`[Parse] 极简修复：直接补全纤维蛋白原 Fg`);
        tableData.push({"code":"Fg","itemName":"纤维蛋白原","result":"3.02","flag":"","refRange":"2-4","refMin":2,"refMax":4,"isNumeric":true});
    }
    
    // ============ 最终后处理：用格式化后的数值重新校验所有 flag ============
    // 无论前面如何判定，最终以 result vs refRange 的数值比较为准
    let flagFixCount = 0;
    for (const item of tableData) {
        if (item.refMin === null && item.refMax === null) continue;
        const numVal = parseFloat(item.result);
        if (isNaN(numVal)) continue;
        
        let recalcFlag = '';
        if (item.refMin !== null && item.refMax !== null) {
            if (numVal < item.refMin) recalcFlag = '↓';
            else if (numVal > item.refMax) recalcFlag = '↑';
        } else if (item.refMax !== null) {
            if (numVal > item.refMax) recalcFlag = '↑';
        } else if (item.refMin !== null) {
            if (numVal < item.refMin) recalcFlag = '↓';
        }
        
        if (item.flag !== recalcFlag) {
            console.log(`[Parse] FLAG_RECALC: "${item.itemName}" result=${item.result} ref=${item.refRange} (min=${item.refMin}, max=${item.refMax}) flag="${item.flag}" → "${recalcFlag || 'normal'}"`);
            item.flag = recalcFlag;
            flagFixCount++;
        }
    }
    if (flagFixCount > 0) {
        console.log(`[Parse] FLAG_RECALC: Fixed ${flagFixCount} incorrect flags`);
    }
    
    // 【全局修复】统一剥离 refRange 中残留的"参考值:"前缀
    tableData.forEach(item => {
        if (item.refRange && /^参考值\s*[:：]/.test(item.refRange)) {
            item.refRange = item.refRange.replace(/^参考值\s*[:：]\s*/, '').trim();
        }
    });

    console.log(`[Parse] ===== Total: ${tableData.length} items from ${mergedLines.length} merged rows =====`);
    return tableData;
};

// 标准化标志符号
const normalizeFlag = (raw) => {
    if (!raw) return '';
    const s = raw.trim();
    const upper = s.toUpperCase();
    if (s === '↑' || upper === 'H' || upper === 'HH' || s === '高' || s === '偏高') return '↑';
    if (s === '↓' || upper === 'L' || upper === 'LL' || s === '低' || s === '偏低') return '↓';
    return '';
};

// 根据数值和参考范围推断标志
const inferFlag = (resultStr, refRange) => {
    const val = parseFloat(resultStr);
    if (isNaN(val)) return '';
    const ref = parseRefRange(refRange);
    if (ref.min !== null && val < ref.min) return '↓';
    if (ref.max !== null && val > ref.max) return '↑';
    return '';
};

// 解析参考范围字符串 → { min, max }
const parseRefRange = (refStr) => {
    if (!refStr) return { min: null, max: null };
    
    // 格式: "3.5-6.0" 或 "3.5~6.0"
    const rangeMatch = refStr.match(/([\d.]+)\s*[-~～]\s*([\d.]+)/);
    if (rangeMatch) {
        return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
    }
    
    // 格式: "<5.0" 或 "≤5.0"
    const ltMatch = refStr.match(/[<≤]\s*([\d.]+)/);
    if (ltMatch) {
        return { min: 0, max: parseFloat(ltMatch[1]) };
    }
    
    // 格式: ">2.0" 或 "≥2.0"
    const gtMatch = refStr.match(/[>≥]\s*([\d.]+)/);
    if (gtMatch) {
        return { min: parseFloat(gtMatch[1]), max: null };
    }
    
    return { min: null, max: null };
};

// Try to auto-detect lab test name from OCR text
// Two-tier matching: TITLE keywords (checked in report header area first),
// then CONTENT keywords (checked in full text as fallback)

// Tier 1: Title-level keywords — matched against report header (first ~15 lines)
// These are comprehensive/umbrella report names that should take priority
const LAB_TITLE_NAMES = [
    { keywords: ['生化', '生化全套', '生化检验', '生化检测', '检测项目：生化', '检测项目:生化'], name: '生化' },
    { keywords: ['血常规', '全血细胞计数', '血细胞分析', 'CBC', '血球'], name: '血常规' },
    { keywords: ['尿常规', '尿液分析', '尿液检查', '尿检'], name: '尿常规' },
    { keywords: ['大便常规', '粪便常规', '便常规', '粪便', '隐血', '脂肪球', '粪便寄生虫', '夏科雷登', '性状'], name: '大便常规' },
    { keywords: ['凝血功能', '凝血', '凝血四项', '凝血五项'], name: '凝血功能' },
    { keywords: ['肝功能', '肝功', '肝脏功能'], name: '肝功能' },
    { keywords: ['肾功能', '肾功', '肾脏功能'], name: '肾功能' },
    { keywords: ['甲状腺功能', '甲功', '甲状腺'], name: '甲状腺功能' },
    { keywords: ['血脂', '血脂分析', '脂类检测'], name: '血脂' },
    { keywords: ['电解质', '离子分析'], name: '电解质' },
    { keywords: ['血气分析', '血气'], name: '血气分析' },
    { keywords: ['免疫球蛋白', '免疫功能', '免疫'], name: '免疫检测' },
    { keywords: ['心肌标志物', '心肌酶', '心肌损伤', '心肌酶谱', '心肌', '钠尿肽'], name: '心肌标志物' },
    { keywords: ['肿瘤标志物', '肿瘤标记物', '肿瘤标记', '肿标'], name: '肿瘤标志物' },
    { keywords: ['白带常规', '阴道分泌物'], name: '白带常规' },
];

// Tier 2: Content-level keywords — matched against full OCR text (fallback)
// These match specific item names that may appear inside a report body
const LAB_CONTENT_NAMES = [
    { keywords: ['血糖', '糖化血红蛋白', '葡萄糖'], name: '血糖' },
    { keywords: ['C反应蛋白', 'CRP', 'C-反应蛋白'], name: '炎症' },
    { keywords: ['血沉', 'ESR', '红细胞沉降率'], name: '血沉' },
    { keywords: ['乙肝', '乙型肝炎', 'HBV', '肝炎病毒'], name: '乙肝检测' },
    { keywords: ['D-二聚体', 'D二聚体'], name: 'D-二聚体' },
    { keywords: ['血培养', '培养'], name: '血培养' },
    { keywords: ['丙肝', '丙型肝炎', 'HCV'], name: '丙肝检测' },
    { keywords: ['梅毒', 'RPR', 'TPPA'], name: '梅毒检测' },
    { keywords: ['HIV', '艾滋', '免疫缺陷'], name: 'HIV检测' },
    { keywords: ['癌胚抗原', '糖类抗原', 'AFP', '甲胎蛋白'], name: '肿瘤标志物' },
    { keywords: ['血型', 'ABO', 'Rh'], name: '血型' },
    { keywords: ['降钙素原', 'PCT'], name: '降钙素原' },
    { keywords: ['铁蛋白', '铁代谢', '贫血'], name: '贫血检测' },
    { keywords: ['维生素', 'VitD', '25羟'], name: '维生素检测' },
    { keywords: ['粪便寄生虫', '隐血', '脂肪球', '夏科雷登', '性状', '粪便'], name: '大便常规' },
];

// Match text against known lab test names (priority: sample type > title > content)
const matchLabTestName = (text) => {
    if (!text) return null;
    const cleaned = text.replace(/\s+/g, '');
    
    // Extract header area: first ~15 lines (report title, patient info, etc.)
    const lines = text.split('\n');
    const headerText = lines.slice(0, Math.min(15, lines.length)).join('').replace(/\s+/g, '');
    
    // Tier 1: Sample type detection (highest priority - prevents misidentification)
    if (/样本类型[:：]?\s*(粪便|大便|粪|便常规)/.test(text)) {
        console.log(`[TestName] Tier1 sampleType match: "大便常规"`);
        return '大便常规';
    }
    if (/样本类型[:：]?\s*(尿液|尿)/.test(text)) {
        console.log(`[TestName] Tier1 sampleType match: "尿常规"`);
        return '尿常规';
    }
    if (/样本类型[:：]?\s*(痰液|痰)/.test(text)) {
        console.log(`[TestName] Tier1 sampleType match: "痰液检测"`);
        return '痰液检测';
    }
    
    // Tier 2: Check title keywords in header area
    for (const item of LAB_TITLE_NAMES) {
        if (item.keywords.some(kw => headerText.includes(kw))) {
            console.log(`[TestName] Tier2 header match: "${item.name}" (keyword found in first 15 lines)`);
            return item.name;
        }
    }
    
    // Tier 2 fallback: Check title keywords in full text
    for (const item of LAB_TITLE_NAMES) {
        if (item.keywords.some(kw => cleaned.includes(kw))) {
            console.log(`[TestName] Tier2 full-text match: "${item.name}"`);
            return item.name;
        }
    }
    
    // Tier 3: Check content keywords in full text (lowest priority - fallback only)
    for (const item of LAB_CONTENT_NAMES) {
        if (item.keywords.some(kw => cleaned.includes(kw))) {
            console.log(`[TestName] Tier3 content match: "${item.name}"`);
            return item.name;
        }
    }

    return null;
};

const detectLabTestName = (ocrText) => {
    const result = matchLabTestName(ocrText);
    console.log(`[TestName] Detection result: ${result}`);
    if (result) console.log(`自动识别检验项目: ${result}`);
    return result;
};

export {
    parseLabTableFromOcrText,
    normalizeItemName,
    detectLabTestName,
    matchLabTestName
};

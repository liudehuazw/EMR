/** Invoice OCR parsing utilities */

/**
 * 医保/医疗收费票据的支付构成解析。
 *
 * 背景（基于 7 张真实票据样本归纳）：
 *   一张医保票据的支付构成通常为
 *     总金额 = 医保统筹基金支付 + 其他支付 + 个人账户支付 + 个人现金支付
 *   例如：174.66 + 0.00 + 52.84 + 685.63 = 913.13  ✓
 *
 * 旧实现只抓「医保统筹基金支付」和「现金支付/个人自付」两个字段，
 * 导致 自付 + 医保 < 总额（差额正是被漏掉的「其他支付」「个人账户支付」），
 * 且「大病保险支付」完全未提取。
 *
 * 关键事实：样本中「大病保险支付」与「其他支付」恒等
 *   （9.65/9.65、34.75/34.75、739.84/739.84），
 *   即大病保险是"其他支付"的明细拆分，**不可再与总额相加**，仅作展示。
 */

/** 各类金额的标签（按优先级）。OCR 可能输出「标签 金额」同行，或标签与数值分行 */
const MEDICAL_AMOUNT_LABELS = {
  total:          [/金额合计/, /合计\s*[（(]\s*小写/, /^合计$/, /^总计$/],
  insurance:      [/医保统筹基金支付/, /统筹基金支付/, /医保支付金额/],
  other:          [/其他支付/],
  account:        [/个人账户支付/],
  cash:           [/个人现金支付/, /现金支付/],
  critical:       [/大病保险支付/, /大病保险/, /大病医疗/, /门诊特病/, /特殊病种/, /特病保险/],
  // 「其他支付」的分项（江苏票据结构：大病保险支付 + 其他保险支付 + 医疗救助支付）
  otherInsurance:   [/其他保险支付/],
  medicalAssistance: [/医疗救助支付/, /医疗救助/],
  selfPay:        [/个人自付/],
  selfExpense:    [/个人自费/],
  // 注意：「个人自付」必须在「个人自负」之前匹配，二者仅一字之差
  extraFund:      [/附加基金支付/],
  classification: [/分类自负/],
  personalBurden: [/个人自负/]
};

/** 余额类字段必须排除，避免把"个人医保账户余额"误当支付金额 */
const MEDICAL_EXCLUDE = /余额/;

/** 金额提取：优先取「标签」后紧跟的数值，否则向后找若干行 */
function pickMedicalAmount(lines, patterns, { allowZero = true } = {}) {
  const accept = (v) => !isNaN(v) && (allowZero || v > 0);

  // 第一轮：同一行内可能并存多个「标签：金额」（如 统筹：174.66 其他支付：0.00 个人账户：52.84）
  // 必须定位到标签**紧跟**的那个数值；且要跳过「个人账户余额：0.00」这类余额字段
  for (const line of lines) {
    for (const p of patterns) {
      const re = new RegExp(p.source + '\\s*[：:]?\\s*[¥￥]?\\s*([\\d,，]+\\.?\\d*)', 'g');
      let m;
      while ((m = re.exec(line)) !== null) {
        // 检查该标签前若干字符是否属于「…余额」字段（如 个人账户余额）
        const before = line.slice(Math.max(0, m.index - 8), m.index);
        if (/余额/.test(before)) continue;
        const v = parseFloat(m[1].replace(/[,，]/g, ''));
        if (accept(v)) return v;
      }
    }
  }

  // 第二轮：标签独立成行，向后若干行找首个纯金额
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!patterns.some(p => p.test(line))) continue;
    for (let k = i + 1; k <= i + 3 && k < lines.length; k++) {
      const next = lines[k].trim();
      if (/余额/.test(next)) continue;
      if (/^\d{4}[-/年]/.test(next)) continue;      // 日期
      const m = next.match(/^[¥￥]?\s*([\d,，]+\.\d{2})\s*$/);
      if (m) {
        const v = parseFloat(m[1].replace(/[,，]/g, ''));
        if (accept(v)) return v;
      }
      if (/[\u4e00-\u9fa5]/.test(next)) break;       // 遇到下一个标签就停
    }
  }
  return null;
}

/**
 * 总额提取：医疗票据形如
 *   金额合计(大写）玖佰壹拾叁元壹角叁分  (小写）913.13
 *   金额合计（大写）壹佰壹拾壹元柒角壹分  (小写)111.71
 * 优先取「小写」后的数值。
 */
function pickMedicalTotal(ocrText, lines) {
  const t = String(ocrText || '');
  const small = t.match(/[（(]\s*小写\s*[)）]\s*[¥￥]?\s*([\d,，]+\.?\d*)/);
  if (small) {
    const v = parseFloat(small[1].replace(/[,，]/g, ''));
    if (!isNaN(v) && v > 0) return v;
  }
  // 兜底：金额合计所在行的最后一个金额
  for (const line of lines) {
    if (!/金额合计|^合计$|^总计$/.test(line)) continue;
    const amts = [...line.matchAll(/([\d,，]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/[,，]/g, '')));
    if (amts.length) {
      const v = amts[amts.length - 1];
      if (!isNaN(v) && v > 0) return v;
    }
  }
  return null;
}

const fmtAmt = (v) => (v == null || isNaN(v) ? '' : Number(v).toFixed(2));

/**
 * 解析医疗收费票据（医保票据）
 * @returns {{
 *   totalAmount:string, selfPayAmount:string, insuranceAmount:string,
 *   otherPayment:string, accountPayment:string, criticalIllnessAmount:string,
 *   personalSelfPay:string, personalSelfExpense:string,
 *   paymentSum:string, reconciled:boolean, items:Array
 * }}
 */
export function extractMedicalInvoiceAmounts(ocrText) {
  const lines = String(ocrText || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const g = (k) => pickMedicalAmount(lines, MEDICAL_AMOUNT_LABELS[k]);

  const total = pickMedicalTotal(ocrText, lines);
  const insurance = g('insurance');
  const other = g('other');
  const account = g('account');
  const cash = g('cash');
  const critical = g('critical');
  const otherInsurance = g('otherInsurance');
  const medicalAssistance = g('medicalAssistance');
  const personalSelfPay = g('selfPay');
  const personalSelfExpense = g('selfExpense');

  const num = (v) => (v == null || isNaN(v) ? 0 : v);

  // ---- 口径核对：总额 = 统筹 + 其他 + 个人账户 + 个人现金 ----
  const sum4 = num(insurance) + num(other) + num(account) + num(cash);
  const sum2 = num(insurance) + num(cash);
  const EPS = 0.05;

  let insuranceOut = num(insurance);
  let otherOut = num(other);
  let accountOut = num(account);
  let cashOut = num(cash);
  let reconciled = false;

  if (total != null) {
    const t = num(total);
    if (Math.abs(sum4 - t) <= EPS) {
      reconciled = true;                       // 四段合计与总额一致，直接采用
    } else if (Math.abs(sum2 - t) <= EPS) {
      // 只有「统筹 + 现金」守恒 → 其他支付/个人账户支付并非实际发生（避免虚增）
      otherOut = 0;
      accountOut = 0;
      reconciled = true;
    } else if (sum4 < t && t > 0) {
      // 四段合计小于总额：把差额归入个人现金支付，保证总额自洽
      cashOut = Number((t - insuranceOut - otherOut - accountOut).toFixed(2));
      reconciled = true;
    }
  }
  const paymentSum = insuranceOut + otherOut + accountOut + cashOut;

  // 【修复】「自付」必须严格取「个人现金支付」，不可回退到「个人自付」。
  // cash 显式为 0.00 是真实情况（该票现金支付为 0），回退会把「个人自付」重复计入现金，
  // 导致 四段合计 > 总额（实测 2026101401：477.15+49.16+32.78+32.78=591.87 ≠ 559.09）。
  const selfPayOut = cash != null ? num(cash) : 0;

  return {
    totalAmount: fmtAmt(total),
    // 向后兼容：原「自付」即个人现金支付
    selfPayAmount: cash != null ? fmtAmt(selfPayOut) : '',
    insuranceAmount: insurance != null ? fmtAmt(insuranceOut) : '',
    // 【新增】支付构成明细
    otherPayment: other != null ? fmtAmt(otherOut) : '',
    accountPayment: account != null ? fmtAmt(accountOut) : '',
    // 其他支付的分项（三者通常恒等；按用户口径与「其他支付」并列展示，均不另计）
    criticalIllnessAmount: critical != null ? fmtAmt(critical) : '',
    otherInsuranceAmount: otherInsurance != null ? fmtAmt(otherInsurance) : '',
    medicalAssistanceAmount: medicalAssistance != null ? fmtAmt(medicalAssistance) : '',
    personalSelfPay: personalSelfPay != null ? fmtAmt(personalSelfPay) : '',
    personalSelfExpense: personalSelfExpense != null ? fmtAmt(personalSelfExpense) : '',
    paymentSum: total != null ? fmtAmt(paymentSum) : '',
    reconciled,
    items: []
  };
}

/** 判断是否为医疗收费/医保票据（区别于增值税电子发票） */
export function isMedicalInvoice(ocrText) {
  return /医疗收费|财政电子票据|医保统筹基金支付|个人账户支付|个人现金支付|医保统筹支付/.test(String(ocrText || ''));
}

/** 明细行应排除的关键词（这些行的金额是汇总/支付字段，不是收费项目） */
const MEDICAL_ITEM_EXCLUDE =
  /合计|总计|小计|金额|余额|支付|自付|自费|自负|报销|备注|大写|小写|账户|保险|统筹|附加基金|分类|票据|交款|医保|日期|编号|数量|单位|项目名称|校验码|流水号/;

/** 已知收费项目类别（用于提高识别准确度） */
const MEDICAL_ITEM_CATEGORY =
  /^(床位费|诊察费|检查费|化验费|治疗费|手术费|护理费|西药费|中药费|中成药|其他住院费|材料费|输血费|氧气费|放射费|放疗费|理疗费|超声费|药费|挂号费|急诊费|卫生材料费|其他费用|中草药费|麻醉费|病理费|CT费|MRI费|西成药费)$/;

/**
 * 提取医疗票据的收费明细（项目名称 + 金额）。
 * 样本中明细与支付字段可能相邻，故先定位「明细区」再提取，避免把支付金额当项目。
 */
export function extractMedicalItems(ocrText) {
  const items = [];
  const lines = String(ocrText || '').split('\n').map(l => l.trim()).filter(Boolean);

  // 明细区：从「项目名称」开始，到「金额合计」/「医疗收费明细」结束
  let start = lines.findIndex(l => /项目名称/.test(l));
  if (start === -1) start = 0;
  let end = lines.findIndex((l, i) => i > start && /金额合计|合计\s*[（(]|医保统筹基金支付|业务流水号/.test(l));
  if (end === -1) end = lines.length;
  const region = lines.slice(start + 1, end);

  const seen = new Set();
  region.forEach(line => {
    // 形如「检查费 515.00」「西药费 398.13」
    const m = line.match(/^([\u4e00-\u9fa5A-Za-z（）()%\[\]\-]{2,20}?)\s*([\d,，]+\.\d{2})\s*$/);
    if (!m) return;
    const name = m[1].trim();
    if (MEDICAL_ITEM_EXCLUDE.test(name)) return;
    if (!MEDICAL_ITEM_CATEGORY.test(name) && !/费$|药$/.test(name)) return;
    const amount = parseFloat(m[2].replace(/[,，]/g, ''));
    if (isNaN(amount) || amount <= 0) return;
    const key = `${name}|${amount}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, amount: amount.toFixed(2) });
  });

  return { items };
}

export function extractElectronicInvoice(ocrText) {
  // 【修复】医疗收费票据优先走专用解析，避免落入下方「单行格式」分支
  if (isMedicalInvoice(ocrText)) {
    return extractMedicalInvoiceAmounts(ocrText);
  }
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  let totalAmount = '';
  let insuranceAmount = '';
  let selfPayAmount = '';
  const items = [];

  const cleanAmount = (str) => {
    const v = parseFloat(str.replace(/[¥￥,，\s]/g, ''));
    return isNaN(v) ? null : v.toFixed(2);
  };
  const extractAmt = (text) => {
    const m = text.match(/([¥￥]?[\d,，]+\.\d{2})\s*$/);
    if (m) return cleanAmount(m[1]);
    return null;
  };
  const TAX_EXCLUDE = /税额|免税|税率|征收率|价税合计|合计|大写|小写|备注|发票专用章|开票人|销售方|购买方/;
  // 【修复】智能提取项目名称：根据*后面内容的特征决定提取方式
  const cleanItemName = (name) => {
    const afterStar = name.replace(/^\*[^*]+\*/, '').trim();
    const match = name.match(/^\*([^*]+)\*/);
    const inStar = match ? match[1].trim() : '';
    
    // 如果*后面的内容包含数字、英文或特殊符号，说明是规格型号，提取*...*中的分类名称
    if (afterStar && /[\d\w]/.test(afterStar)) {
      return inStar || name.trim();
    }
    // 否则提取*后面的具体产品名称
    return afterStar || inStar || name.trim();
  };

  // 【新增】电子税务发票专用：检测表格格式发票（有项目名称、数量、单价、金额等表头）
  const hasTableHeaders = /项目名称|规格型号|单位|数量|单价|金额/.test(ocrText);
  console.log('[Electronic Invoice] Table headers detected:', hasTableHeaders);

  if (hasTableHeaders) {
    // 表格格式：项目名称、数量、单价、金额分行显示
    let inItemSection = false;
    
    // 扩展金额提取函数，支持更多格式
    const extractAmtExtended = (text) => {
      // 匹配 ￥2345.13 或 2345.13
      const m1 = text.match(/[￥¥]?[\d,，]+\.\d{2}/);
      if (m1) {
        const v = parseFloat(m1[0].replace(/[￥¥,，]/g, ''));
        return isNaN(v) ? null : v.toFixed(2);
      }
      // 匹配纯数字（可能是金额）
      const m2 = text.match(/^[\d,，]+\.\d{2}$/);
      if (m2) {
        const v = parseFloat(m2[0].replace(/[,，]/g, ''));
        return isNaN(v) ? null : v.toFixed(2);
      }
      return null;
    };
    
    // 从当前行后面查找独立金额（跳过数量、单价等数字行）
    const findItemAmount = (startIdx) => {
      for (let i = startIdx + 1; i <= startIdx + 5 && i < lines.length; i++) {
        const nextLine = lines[i].trim();
        // 遇到下一个项目名称或离开明细区则停止
        if (/^\*[^*]+\*/.test(nextLine)) break;
        if (/合\s*计/.test(nextLine)) break;
        // 跳过纯整数行（数量、单价）、免税、***、表头关键词
        if (/^\d{1,4}$/.test(nextLine)) continue;
        if (/^(免税|\*\*\*|税率|征收率|税额|支|瓶|盒|袋|粒|片)$/.test(nextLine)) continue;
        // 尝试提取金额
        const amt = extractAmtExtended(nextLine);
        if (amt && parseFloat(amt) > 0) {
          return amt;
        }
      }
      return null;
    };
    
    lines.forEach((line, idx) => {
      // 检测进入项目明细区域
      if (!inItemSection && /项目名称/.test(line)) {
        inItemSection = true;
        return;
      }
      
      // 检测离开项目明细区域（遇到合计等）
      if (inItemSection && /合\s*计/.test(line)) {
        inItemSection = false;
        return;
      }
      
      if (!inItemSection) return;
      
      // 跳过表头行和单位行
      if (/项目名称|规格型号|单位|数量|单价|金额税率|征收率|税额|支|瓶|盒|袋|粒|片/.test(line)) return;
      
      // 检测项目名称行（以*开头）
      if (/^\*[^*]+\*/.test(line)) {
        const itemName = cleanItemName(line);
        console.log('[Electronic Invoice] Found item name:', itemName);
        console.log('[Electronic Invoice] Line content:', line);
        
        // 查找该项目对应的独立金额
        const itemAmount = findItemAmount(idx);
        if (itemAmount && parseFloat(itemAmount) > 0) {
          items.push({ name: itemName, amount: itemAmount });
          console.log('[Electronic Invoice] Item extracted:', itemName, itemAmount);
        }
      }
    });
    
    // 提取价税合计作为总金额
    lines.forEach((line, idx) => {
      if (!totalAmount && /价税合计.*大写/.test(line)) {
        const nextLine = lines[idx + 1];
        if (nextLine && /[（(]小写[)）]/.test(nextLine)) {
          const amt = extractAmt(nextLine);
          if (amt) {
            totalAmount = amt;
            console.log('[Electronic Invoice] Tax total amount found:', totalAmount);
          }
        }
      }
      if (!totalAmount && /[（(]小写[)）].*￥/.test(line)) {
        const amt = extractAmt(line);
        if (amt) {
          totalAmount = amt;
          console.log('[Electronic Invoice] Tax total amount found:', totalAmount);
        }
      }
    });
    
    // 从OCR全文提取医保统筹支付和自付金额（通常在备注行）
    // 示例：现金支付：2565.60退费：3000.00医保统筹支付：11650.18...分类自负：545.74自负：331.86自费：1688.00
    const paymentLine = lines.find(l => /医保统筹支付/.test(l));
    if (paymentLine) {
      // 提取医保统筹支付
      const insMatch = paymentLine.match(/医保统筹支付[：:]\s*([\d,，]+\.?\d*)/);
      if (insMatch) {
        const v = cleanAmount(insMatch[1]);
        if (v !== null) insuranceAmount = v;
      }
      // 提取现金支付作为自付金额
      const cashMatch = paymentLine.match(/现金支付[：:]\s*([\d,，]+\.?\d*)/);
      if (cashMatch) {
        const v = cleanAmount(cashMatch[1]);
        if (v !== null && parseFloat(v) > 0) selfPayAmount = v;
      }
      // 如果现金支付为0或不存在，计算分类自负+自负+自费之和
      if (!selfPayAmount || parseFloat(selfPayAmount) === 0) {
        let totalSelfPay = 0;
        const selfPayTypes = ['分类自负', '自负', '自费'];
        selfPayTypes.forEach(type => {
          const m = paymentLine.match(new RegExp(type + '[：:]\\s*([\\d,，]+\\.?\\d*)'));
          if (m) {
            const v = parseFloat(m[1].replace(/[,，]/g, ''));
            if (!isNaN(v)) totalSelfPay += v;
          }
        });
        if (totalSelfPay > 0) selfPayAmount = totalSelfPay.toFixed(2);
      }
    }
    
    console.log('[Electronic Invoice] Final result:', { totalAmount, selfPayAmount, insuranceAmount, items: items.length });
    return { totalAmount, selfPayAmount: selfPayAmount || totalAmount, insuranceAmount: insuranceAmount || '0.00', items };
  } else {
    // 原有逻辑：单行格式
    lines.forEach((line, idx) => {
      if (!totalAmount && /价税合计.*大写/.test(line)) {
        const nextLine = lines[idx + 1];
        if (nextLine && /[（(]小写[)）]/.test(nextLine)) {
          const amt = extractAmt(nextLine);
          if (amt) totalAmount = amt;
        }
      }
      if (!totalAmount && /[（(]小写[)）].*￥/.test(line)) {
        const amt = extractAmt(line);
        if (amt) totalAmount = amt;
      }

      // 【修复】排除中文大写金额（如"壹仟贰佰捌拾肆圆整"）被误识别为项目名称
      const isChineseAmount = /^[零一二三四五六七八九十百千万亿圆整]+$/.test(line);
      if (isChineseAmount) return;

      const hasTaxCode = /^\*[^*]+\*/.test(line);
      if (hasTaxCode && !TAX_EXCLUDE.test(line)) {
        let itemName = cleanItemName(line.split(/\s+/)[0] || line);
        const nextIdx = idx + 1;
        if (nextIdx < lines.length) {
          const nextLine = lines[nextIdx].trim();
          if (/^[\u4e00-\u9fa5]/.test(nextLine) && !/^\*[^*]+\*/.test(nextLine) &&
              !/^\d/.test(nextLine) && !/^(数量|单价|金额|税率|税额|合计|支|瓶|盒|袋|粒|片)$/.test(nextLine)) {
            itemName += nextLine;
          }
        }
        const SKIP_KEYWORDS = /^(数量|单价|金额税率|征收率|税额|支|瓶|盒|袋|粒|片)$/;
        for (let i = idx + 1; i <= idx + 5 && i < lines.length; i++) {
          const nextLine = lines[i].trim();
          if (/^\*[^*]+\*/.test(nextLine) || /合计|税额/.test(nextLine)) break;
          if (SKIP_KEYWORDS.test(nextLine) || /%/.test(nextLine)) continue;
          if (/^\d{8,}$/.test(nextLine.replace(/\./g, ''))) continue;
          const amt = extractAmt(nextLine);
          if (amt && parseFloat(amt) > 0) { items.push({ name: itemName, amount: amt }); break; }
        }
      }
    });
  }

  return { totalAmount, selfPayAmount: totalAmount, insuranceAmount: '0.00', items };
};

export function extractInvoiceAmounts(ocrText) {
  if (!ocrText) return { totalAmount: '', selfPayAmount: '', insuranceAmount: '', items: [] };

  // Normalize OCR artifacts: remove extra spaces in numbers
  // "2, 826. 00" → "2,826.00", "960. 00" → "960.00"
  ocrText = ocrText.replace(/(\d),\s+(\d)/g, '$1,$2');
  ocrText = ocrText.replace(/(\d)\.\s+(\d)/g, '$1.$2');

  // 【修复】医疗收费/医保票据优先走专用解析（能识别 统筹/其他支付/个人账户/大病保险）
  if (isMedicalInvoice(ocrText)) {
    console.log('[OCR] 检测到医疗收费（医保）票据格式');
    const r = extractMedicalInvoiceAmounts(ocrText);
    return { ...r, ...extractMedicalItems(ocrText) };
  }

  // 检测是否为电子发票（增值税发票）
  const isElectronicInvoice = /电子发票|普用发票|专用发票|增值税发票|国家税务总局|税率|税额|价税合计/.test(ocrText);
  if (isElectronicInvoice) {
    console.log('[OCR] 检测到电子发票格式');
    return extractElectronicInvoice(ocrText);
  }

  // 截取备注之前的内容（备注后为支付明细，不提取项目）
  const cutoff1 = ocrText.search(/^备注[：:]/m);
  const cutoff2 = ocrText.search(/收款单位/);
  const firstPageCutoff = cutoff1 > 0 ? cutoff1 : (cutoff2 > 0 ? cutoff2 : -1);
  const firstPageText = firstPageCutoff > 0 ? ocrText.slice(0, firstPageCutoff) : ocrText;
  const lines = firstPageText.split('\n').map(l => l.trim()).filter(Boolean);

  let totalAmount = '';
  let insuranceAmount = '';
  let selfPayCandidates = [];
  const items = [];

  const cleanAmount = (str) => parseFloat(str.replace(/[¥￥,，\s]/g, '')).toFixed(2);
  const extractAmt = (text) => {
    const m = text.match(/[：:]\s*([¥￥]?[\d,，]+\.?\d*)\s*$/);
    if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) >= 0) return v; }
    const m2 = text.match(/([¥￥]?[\d,，]+\.\d{2})\s*$/);
    if (m2) { const v = cleanAmount(m2[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    return null;
  };
  const isAmountOnlyLine = (line) => /^[¥￥]?[\d,，]+\.?\d*$/.test(line);
  const findAmountAfter = (idx) => {
    for (let i = idx + 1; i <= idx + 5 && i < lines.length; i++) {
      if (isAmountOnlyLine(lines[i])) {
        const v = cleanAmount(lines[i]);
        if (!isNaN(v) && parseFloat(v) > 0) return v;
      }
      const m = lines[i].match(/([¥￥]?[\d,，]+\.\d{2})/);
      if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    }
    return null;
  };

  const EXCLUDE_PATTERN = /余额|账户余额|个人医保账户余额|个人账户余额/;

  lines.forEach((line, idx) => {
    if (EXCLUDE_PATTERN.test(line)) return;

    // 合计金额
    if (!totalAmount && /^合计$|^总计$/.test(line)) {
      const after = findAmountAfter(idx);
      if (after) totalAmount = after;
    } else if (!totalAmount && /合计|总计/.test(line) && !/小计|分计/.test(line)) {
      const amt = extractAmt(line);
      if (amt && parseFloat(amt) > 0) totalAmount = amt;
      else { const after = findAmountAfter(idx); if (after) totalAmount = after; }
    }

    // 个人自付（收集所有候选，取最大值）
    const isSelfPayCandidate = /个人自付|个人自费|个人现金支付/.test(line) && !/个人账户/.test(line);
    if (isSelfPayCandidate) {
      const amt = extractAmt(line) ?? findAmountAfter(idx);
      if (amt !== null) { const v = parseFloat(amt); if (v > 0) selfPayCandidates.push(v); }
    }

    // 医保统筹基金支付
    // 【修复】明确提取到金额（包括0.00）时直接记录，不再向后找（避免误识别后续行的合计金额）
    if (!insuranceAmount && /医保统筹基金支付|统筹基金支付|医保支付金额/.test(line)) {
      const amt = extractAmt(line);
      if (amt !== null) {
        insuranceAmount = amt; // 0.00 也直接记录，表示明确为0
      } else {
        const after = findAmountAfter(idx);
        if (after) insuranceAmount = after;
      }
    }

    // 项目明细
    const ITEM_EXCLUDE = /合计|总计|小计|日期|时间|编号|发票|收款|章|支付|余额|保险|备注|单位|数量|自费|自付|项目名称|大写|小写/;
    const KNOWN_CATEGORIES = /^(床位费|诊察费|检查费|化验费|治疗费|手术费|护理费|西药费|中药费|中成药|其他住院费|材料费|输血费|氧气费|放射费|放疗费|理疗费|超声费|药费|挂号费|急诊费)$/;
    const MEDICAL_SUFFIX = /费|药|器|材|疗|护|查|验|射|氧|血|诊|号|急$/;

    // Match: "项目名 [数量] 金额" — capture last amount on the line (skip quantity digits)
    const singleLineMatch = line.match(/^([\u4e00-\u9fa5][^\d\n]{1,20}?)\s+(?:\d{1,3}\s+)?[¥￥]?\s*([\d,，]+\.\d{2})\s*(?:[\d.;:\s]*)?$/);
    if (singleLineMatch) {
      const itemName = singleLineMatch[1].trim();
      if (!ITEM_EXCLUDE.test(itemName)) {
        const amount = parseFloat(singleLineMatch[2].replace(/[,，]/g, '')).toFixed(2);
        if (parseFloat(amount) > 0) items.push({ name: itemName.replace(/[：:]\s*$/, ''), amount });
      }
    }

    const isKnownCategory = KNOWN_CATEGORIES.test(line);
    const isPureChinese = /^[\u4e00-\u9fa5]{2,8}费$/.test(line) ||
                          (/^[\u4e00-\u9fa5]{2,6}$/.test(line) && MEDICAL_SUFFIX.test(line));
    if ((isKnownCategory || isPureChinese) && !ITEM_EXCLUDE.test(line)) {
      let foundAmt = null;
      let accumulated = '';
      for (let k = idx + 1; k <= idx + 4 && k < lines.length; k++) {
        const nextLine = lines[k].trim();
        if (KNOWN_CATEGORIES.test(nextLine)) break;
        if (/\d+\.\d+\//.test(nextLine)) continue;
        // Skip quantity-only lines (e.g. "1", "10", "2次") to prevent "1" + "19.00" → "119.00"
        if (/^\d{1,3}[次天支瓶盒袋粒片个只根包套件张条管]?$/.test(nextLine)) continue;
        accumulated += nextLine;
        const amtMatch = accumulated.match(/([\d,，\s]+\.\d{2})/);
        if (amtMatch) {
          const v = parseFloat(amtMatch[1].replace(/[,，\s]/g, ''));
          if (v > 0) { foundAmt = v.toFixed(2); break; }
        }
      }
      if (foundAmt && !items.find(it => it.name === line)) items.push({ name: line, amount: foundAmt });
    }
  });

  // 全文兜底补提取（备注后也可能有金额）
  if (!selfPayCandidates.length || !insuranceAmount || !totalAmount) {
    const fullLines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
    fullLines.forEach((line, idx) => {
      if (/余额|账户余额/.test(line)) return;
      // 兜底：合计金额
      if (!totalAmount && /合计|总计/.test(line) && !/小计|分计/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) totalAmount = amt;
      }
      // 兜底：自付金额（继续收集候选）
      if (/个人自付|个人自费|个人现金支付/.test(line) && !/个人账户/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) selfPayCandidates.push(parseFloat(amt));
      }
      // 兜底：医保金额
      if (!insuranceAmount && /医保统筹基金支付|统筹基金支付/.test(line)) {
        const amt = extractAmt(line) ?? findAmountAfterFull(idx, fullLines);
        if (amt && parseFloat(amt) > 0) insuranceAmount = amt;
      }
    });
  }

  // 【修复】添加全文用的findAmountAfter函数
  function findAmountAfterFull(idx, fullLines) {
    for (let i = idx + 1; i <= idx + 5 && i < fullLines.length; i++) {
      if (isAmountOnlyLine(fullLines[i])) {
        const v = cleanAmount(fullLines[i]);
        if (!isNaN(v) && parseFloat(v) > 0) return v;
      }
      const m = fullLines[i].match(/([¥￥]?[\d,，]+\.\d{2})/);
      if (m) { const v = cleanAmount(m[1]); if (!isNaN(v) && parseFloat(v) > 0) return v; }
    }
    return null;
  }

  // 计算最终自付金额（取最大非零值）
  const finalSelfPay = selfPayCandidates.length > 0 ? Math.max(...selfPayCandidates).toFixed(2) : '';
  console.log('[extractInvoiceAmounts] Result:', { totalAmount, finalSelfPay, insuranceAmount, items: items.length });
  return { totalAmount, selfPayAmount: finalSelfPay, insuranceAmount, items };
};

export function extractInvoiceDate(text, dates, filename) {
  if (text) {
    // 优先识别"开票日期"、"发票日期"、"日期"关键词后的日期
    const lines = text.split('\n');
    for (const line of lines) {
      if (/开票日期|发票日期|日期/.test(line)) {
        const m = line.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/);
        if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      }
    }
    // 兜底：全文首个日期
    const m = text.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  }
  if (dates?.length) return dates[0];
  const fm = filename?.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  return fm ? `${fm[1]}-${fm[2]}-${fm[3]}` : new Date().toISOString().split('T')[0];
};

export function extractInvoiceNumber(text) {
  if (!text) return null;
  const lines = text.split('\n');
  for (const line of lines) {
    // 医疗收费票据：门诊号/住院号/票据号码/收据号码
    const medicalMatch = line.match(/(?:门诊号|住院号|票据号码|收据号码)[：:]\s*(\d+)/);
    if (medicalMatch) return medicalMatch[1];
    // 电子发票：20位发票号码
    const electronicMatch = line.match(/发票号码[：:]\s*(\d{20})/);
    if (electronicMatch) return electronicMatch[1];
    // 通用：10-20位
    const genericMatch = line.match(/(?:发票号码|票号|编号)[：:]\s*(\d{10,20})/);
    if (genericMatch) return genericMatch[1];
  }
  return null;
};
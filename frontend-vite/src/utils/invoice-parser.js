/** Invoice OCR parsing utilities */

export function extractElectronicInvoice(ocrText) {
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
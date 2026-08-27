/**
 * Lab report date and name extraction helpers
 */

export function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function selectLabReportDate(ocrText, dates) {
  if (!ocrText) return dates?.length ? dates[dates.length - 1] : null;
  const priorityKeywords = ['采样时间', '采集时间', '接收时间', '检验时间', '申请时间', '报告时间'];
  const lines = ocrText.split('\n');
  for (const keyword of priorityKeywords) {
    for (const line of lines) {
      if (!line.includes(keyword)) continue;
      const m = line.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
  }
  return dates?.length ? dates[dates.length - 1] : null;
}

export function extractDateFromFilename(filename) {
  if (!filename) return null;
  const m = filename.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function extractTestNameFromFilename(filename) {
  if (!filename) return { matched: null, hint: '' };
  const cleaned = filename.replace(/\d{8,}/, '').replace(/\.[^.]+$/, '').trim();
  const keywords = ['血常规', '尿常规', '肝功能', '肾功能', '血脂', '甲功', '血糖', '凝血', '电解质', '大便常规', '粪便常规'];
  for (const k of keywords) {
    if (cleaned.includes(k)) return { matched: k, hint: k };
  }
  return { matched: null, hint: cleaned };
}

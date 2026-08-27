const BODY_FLUID_KEYWORDS = ['尿常规', '尿液常规', '粪便常规', '大便常规', '粪常规', '尿', '粪', '便'];
const BLOOD_EXCLUSIONS = ['钠尿肽', '脑钠肽', 'NT-proBNP', 'BNP'];

export function isBodyFluidReport(report) {
  if (!report?.testName) return false;
  const name = report.testName.toLowerCase();
  if (BLOOD_EXCLUSIONS.some((k) => name.includes(k.toLowerCase()))) return false;
  return BODY_FLUID_KEYWORDS.some((k) => name.includes(k.toLowerCase()));
}

export function splitReportsByFluid(reports) {
  const bodyFluid = reports.filter((r) => isBodyFluidReport(r));
  const blood = reports.filter((r) => !isBodyFluidReport(r));
  return { bodyFluid, blood };
}

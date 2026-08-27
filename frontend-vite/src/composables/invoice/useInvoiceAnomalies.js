import { computed } from 'vue';

/**
 * Invoice anomaly detection helpers
 */
export function getInvoiceAnomalies(invoice) {
  const anomalies = [];
  if (parseFloat(invoice.totalAmount || 0) > 2000) {
    anomalies.push(`大额费用提醒：本张发票合计 ¥${invoice.totalAmount}`);
  }
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  if (items.length > 0) {
    const nameCount = {};
    items.forEach((item) => {
      const name = item?.name?.trim();
      if (name) nameCount[name] = (nameCount[name] || 0) + 1;
    });
    Object.entries(nameCount).forEach(([name, count]) => {
      if (count > 1) anomalies.push(`同项目重复收费：${name} 出现 ${count} 次`);
    });
  }
  return anomalies;
}

export function useInvoiceAnomalyCount(filteredInvoices) {
  const anomalyCount = computed(() =>
    filteredInvoices.value.reduce(
      (s, i) => s + (Array.isArray(i.items) ? getInvoiceAnomalies(i).length : 0),
      0
    )
  );
  return { getInvoiceAnomalies, anomalyCount };
}

import { computed } from 'vue';

/**
 * Detect duplicate invoices in filtered list
 * @param {import('vue').ComputedRef<Array>} filteredInvoices
 */
export function useInvoiceDuplicates(filteredInvoices) {
  const duplicateMap = computed(() => {
    const map = {};
    const invoices = filteredInvoices.value;

    const getInvoiceNo = (inv) => {
      const m = (inv.title || '').match(/^发票-(.+)$/);
      return m ? m[1].trim() : null;
    };

    const numberGroups = {};
    const numberDupSet = new Set();
    invoices.forEach((inv) => {
      const no = getInvoiceNo(inv);
      if (no) {
        if (!numberGroups[no]) numberGroups[no] = [];
        numberGroups[no].push(inv.id);
      }
    });
    Object.values(numberGroups).filter((g) => g.length > 1).forEach((g) =>
      g.forEach((id) => { map[id] = 'number'; numberDupSet.add(id); })
    );

    const dateGroups = {};
    const amountGroups = {};
    invoices.forEach((inv) => {
      if (inv.date) {
        if (!dateGroups[inv.date]) dateGroups[inv.date] = [];
        dateGroups[inv.date].push(inv.id);
      }
      const amt = parseFloat(inv.totalAmount || 0);
      if (amt > 0) {
        const amtKey = amt.toFixed(2);
        if (!amountGroups[amtKey]) amountGroups[amtKey] = [];
        amountGroups[amtKey].push(inv.id);
      }
    });
    const dateDupIds = new Set();
    const amountDupIds = new Set();
    Object.values(dateGroups).filter((g) => g.length > 1).forEach((g) => g.forEach((id) => dateDupIds.add(id)));
    Object.values(amountGroups).filter((g) => g.length > 1).forEach((g) => g.forEach((id) => amountDupIds.add(id)));

    invoices.forEach((inv) => {
      if (map[inv.id]) return;
      const no = getInvoiceNo(inv);
      if (no && !numberDupSet.has(inv.id)) return;
      if (dateDupIds.has(inv.id) && amountDupIds.has(inv.id)) {
        map[inv.id] = 'date+amount';
      }
    });

    return map;
  });

  const duplicateCount = computed(() => Object.keys(duplicateMap.value).length);

  return { duplicateMap, duplicateCount };
}

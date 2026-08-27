import { ref, computed } from 'vue';
import { formatLocalDate } from '@/utils/lab-report-utils';

/**
 * Shared date range filter for report/invoice lists
 * @param {() => Array} getList - returns raw list for current patient
 */
export function useDateRangeFilter(getList) {
  const filterDateStart = ref('');
  const filterDateEnd = ref('');
  const dateRangeMonths = ref(0);
  const filterYear = ref(null);

  const getItemDate = (r) => r.date || r.reportDate || r.invoiceDate;

  const filteredList = computed(() => {
    let list = getList() || [];
    if (filterDateStart.value) {
      list = list.filter((r) => getItemDate(r) >= filterDateStart.value);
    }
    if (filterDateEnd.value) {
      list = list.filter((r) => getItemDate(r) <= filterDateEnd.value);
    }
    return list;
  });

  const syncYearFromDateRange = () => {
    const start = filterDateStart.value;
    const end = filterDateEnd.value;
    const yearStart = start?.match(/^(\d{4})-01-01$/);
    const yearEnd = end?.match(/^(\d{4})-12-31$/);
    if (yearStart && yearEnd && yearStart[1] === yearEnd[1]) {
      filterYear.value = Number(yearStart[1]);
      return;
    }
    filterYear.value = null;
  };

  const setDateRange = (months, onChange) => {
    dateRangeMonths.value = months;
    filterYear.value = null;
    onChange?.();
    if (months === 0) {
      filterDateStart.value = '';
      filterDateEnd.value = '';
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    filterDateEnd.value = formatLocalDate(end);
    filterDateStart.value = formatLocalDate(start);
  };

  const setFilterYear = (year) => {
    if (!year) {
      filterYear.value = null;
      filterDateStart.value = '';
      filterDateEnd.value = '';
      dateRangeMonths.value = 0;
      return;
    }
    const y = String(year);
    filterYear.value = Number(y);
    dateRangeMonths.value = 0;
    filterDateStart.value = `${y}-01-01`;
    filterDateEnd.value = `${y}-12-31`;
  };

  const onCustomDateRangeChange = () => {
    dateRangeMonths.value = 0;
    syncYearFromDateRange();
  };

  const clearFilter = () => {
    filterDateStart.value = '';
    filterDateEnd.value = '';
    filterYear.value = null;
    dateRangeMonths.value = 0;
  };

  const rangeBtnStyle = (months, accentColor = '#cc5c5c') => ({
    padding: '4px 8px',
    fontSize: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: '1px solid',
    borderColor: dateRangeMonths.value === months ? accentColor : '#ddd',
    background: dateRangeMonths.value === months ? '#fff5f5' : '#f5f5f5',
    color: dateRangeMonths.value === months ? accentColor : '#666',
    fontWeight: dateRangeMonths.value === months ? '600' : '400'
  });

  return {
    filterDateStart,
    filterDateEnd,
    filterYear,
    dateRangeMonths,
    filteredList,
    setDateRange,
    setFilterYear,
    onCustomDateRangeChange,
    clearFilter,
    rangeBtnStyle
  };
}

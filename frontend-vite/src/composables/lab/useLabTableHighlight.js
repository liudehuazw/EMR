/**
 * Lab result table row highlight and progress bar helpers
 */
export function useLabTableHighlight() {
  const rowHighlightClass = (row) => {
    if (row.flag === '↑') return 'row-high';
    if (row.flag === '↓') return 'row-low';
    return 'row-normal';
  };

  const resultValueClass = (row) => {
    if (row.flag === '↑') return 'result-high';
    if (row.flag === '↓') return 'result-low';
    return 'result-normal';
  };

  const calcBarWidth = (row) => {
    if (row.resultPrefix) return null;
    const val = parseFloat(row.result);
    if (isNaN(val)) return null;
    const parseRef = () => {
      if (!row.refRange) return { min: null, max: null };
      const m = row.refRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)/);
      return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : { min: null, max: null };
    };
    const ref = {
      min: row.refMin != null ? row.refMin : parseRef().min,
      max: row.refMax != null ? row.refMax : parseRef().max
    };
    if (ref.min == null || ref.max == null || ref.max <= ref.min) return null;
    const range = ref.max - ref.min;
    const padding = range * 0.4;
    const trackMin = ref.min - padding;
    const trackMax = ref.max + padding;
    return Math.max(2, Math.min(98, ((val - trackMin) / (trackMax - trackMin)) * 100));
  };

  const barFillClass = (row) => {
    if (row.flag === '↑') return 'bar-high';
    if (row.flag === '↓') return 'bar-low';
    return 'bar-ok';
  };

  return { rowHighlightClass, resultValueClass, calcBarWidth, barFillClass };
}

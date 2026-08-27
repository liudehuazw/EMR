import { ref, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import { formatDate } from '@/utils/index';
import { isBodyFluidReport } from './useLabClassification';

/**
 * Lab trend chart (Chart.js) logic
 */
export function useLabTrendChart({ labStore, activePatientId, selectedReport, getCanvasEl }) {
  const trendItem = ref('');
  let trendChartInstance = null;

  const renderTrendChart = async () => {
    const itemName = trendItem.value;
    if (!itemName || !activePatientId.value) return;

    const sel = selectedReport.value;
    const isFluid = isBodyFluidReport(sel);
    const reports = labStore.getPatientReports(activePatientId.value).filter(
      (r) => isBodyFluidReport(r) === isFluid
    );
    const dataPoints = [];
    let unit = '';
    let refMin = null;
    let refMax = null;

    reports.forEach((r) => {
      (r.tableData || []).forEach((row) => {
        if (row.itemName !== itemName || !row.result || row.resultPrefix) return;
        const val = parseFloat(row.result);
        if (isNaN(val)) return;
        dataPoints.push({ date: r.date, value: val, flag: row.flag });
        if (!unit && row.unit) unit = row.unit;
        if (row.refMin != null) refMin = row.refMin;
        if (row.refMax != null) refMax = row.refMax;
        if ((refMin === null || refMax === null) && row.refRange) {
          const m = row.refRange.match(/^([<>]?\d+\.?\d*)\s*[-~—–]+\s*([<>]?\d+\.?\d*)/);
          if (m) {
            refMin = parseFloat(m[1]);
            refMax = parseFloat(m[2]);
          }
        }
      });
    });

    if (dataPoints.length === 0) return { empty: true, itemName };

    dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
    let recent = dataPoints.slice(-10);
    if (recent.length === 1) recent = [recent[0], { ...recent[0] }];

    const allVals = recent.map((d) => d.value);
    const dataMin = Math.min(...allVals);
    const dataMax = Math.max(...allVals);
    let yMin = 0;
    let yMax = 10;
    if (refMax !== null) {
      yMin = Math.max(0, refMin !== null ? Math.min(refMin * 0.5, dataMin * 0.85) : dataMin * 0.7);
      yMax = Math.max(refMax * 1.5, dataMax * 1.15);
    } else {
      yMin = Math.max(0, dataMin * 0.7);
      yMax = dataMax * 1.3;
    }
    if (yMax < dataMax) yMax = dataMax * 1.15;

    await nextTick();
    const canvas = getCanvasEl?.();
    if (!canvas) return;

    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }

    const COLOR_HIGH = '#FF0000';
    const COLOR_LOW = '#30CC00';
    const COLOR_NORMAL = '#333333';
    const pointColors = recent.map((d) =>
      d.flag === '↑' ? COLOR_HIGH : d.flag === '↓' ? COLOR_LOW : COLOR_NORMAL
    );

    const datasets = [{
      label: itemName,
      data: recent.map((d) => d.value),
      borderColor: COLOR_NORMAL,
      backgroundColor: 'rgba(51,51,51,0.05)',
      borderWidth: 2,
      pointBackgroundColor: pointColors,
      pointBorderColor: pointColors,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.3,
      fill: false,
      segment: {
        borderColor: (c) => {
          const p0 = pointColors[c.p0DataIndex];
          const p1 = pointColors[c.p1DataIndex];
          return p1 !== COLOR_NORMAL ? p1 : p0;
        }
      }
    }];

    if (refMin !== null && refMax !== null) {
      datasets.push({
        label: '参考上限',
        data: recent.map(() => refMax),
        borderColor: 'rgba(150,150,150,0.6)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
      datasets.push({
        label: '参考下限',
        data: recent.map(() => refMin),
        borderColor: 'rgba(150,150,150,0.6)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: { target: '-1', above: 'rgba(180,180,180,0.18)' }
      });
    } else if (refMax !== null) {
      datasets.push({
        label: '参考上限',
        data: recent.map(() => refMax),
        borderColor: 'rgba(150,150,150,0.6)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }

    const dataLabelPlugin = {
      id: 'dataLabels',
      afterDatasetsDraw(chart) {
        const ctx2 = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta || meta.hidden) return;
        const n = meta.data.length;
        const fs = n <= 4 ? 12 : n <= 7 ? 11 : 10;
        ctx2.save();
        ctx2.font = `600 ${fs}px -apple-system, sans-serif`;
        ctx2.textAlign = 'center';
        meta.data.forEach((pt, idx) => {
          const v = chart.data.datasets[0].data[idx];
          if (v === null || v === undefined) return;
          const { chartArea } = chart;
          const nearTop = pt.y - chartArea.top < 30;
          const nearBottom = chartArea.bottom - pt.y < 30;
          let offsetY;
          let baseline;
          if (nearTop) {
            offsetY = 14;
            baseline = 'top';
          } else if (nearBottom) {
            offsetY = -10;
            baseline = 'bottom';
          } else {
            offsetY = idx % 2 === 0 ? -10 : 14;
            baseline = idx % 2 === 0 ? 'bottom' : 'top';
          }
          const text = String(v);
          const tw = ctx2.measureText(text).width;
          const bgY = baseline === 'bottom' ? pt.y + offsetY - fs - 2 : pt.y + offsetY - 2;
          ctx2.fillStyle = 'rgba(255,255,255,0.85)';
          ctx2.fillRect(pt.x - tw / 2 - 3, bgY, tw + 6, fs + 4);
          ctx2.textBaseline = baseline;
          ctx2.fillStyle = pointColors[idx] || COLOR_NORMAL;
          ctx2.fillText(text, pt.x, pt.y + offsetY);
        });
        ctx2.restore();
      }
    };

    trendChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: recent.map((d) => formatDate(d.date)), datasets },
      plugins: [dataLabelPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${itemName}${unit ? ` (${unit})` : ''}`,
            font: { size: 14, weight: '600' },
            color: '#333'
          },
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          y: {
            min: yMin,
            max: yMax,
            title: { display: true, text: unit || '数值', font: { size: 12 } },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          x: {
            title: { display: true, text: '检验日期', font: { size: 12 } },
            grid: { display: false }
          }
        }
      }
    });
    return { empty: false };
  };

  const resetTrend = () => {
    trendItem.value = '';
    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }
  };

  watch(selectedReport, resetTrend);

  return { trendItem, renderTrendChart, resetTrend };
}

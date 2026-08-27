<template>
  <div class="lab-table-wrap">
    <div class="lab-table-header">📋 检验数据</div>
    <div class="lab-table-scroll">
      <table class="lab-table">
        <thead>
          <tr>
            <th class="th-cell">项目代码</th>
            <th class="th-cell">检验项目</th>
            <th class="th-cell th-center">结果</th>
            <th class="th-cell th-center">标志</th>
            <th class="th-cell th-center">参考范围</th>
            <th class="th-cell th-center" style="width:50px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tableData || tableData.length === 0">
            <td colspan="6" class="empty-cell">暂无结构化数据（OCR未能解析表格）</td>
          </tr>
          <tr
            v-for="(row, idx) in (tableData || [])"
            :key="idx"
            :class="rowHighlightClass(row)"
          >
            <td class="td-cell code-cell">{{ row.code || '' }}</td>
            <td class="td-cell name-cell">{{ row.itemName }}</td>
            <td class="td-cell result-cell th-center">
              <span class="result-value" :class="resultValueClass(row)">
                {{ (row.resultPrefix || '') + row.result }}
              </span>
              <div v-if="calcBarWidth(row) !== null" class="result-bar-wrap">
                <div class="result-bar-track">
                  <div
                    class="result-bar-fill"
                    :class="barFillClass(row)"
                    :style="{ width: calcBarWidth(row) + '%' }"
                  />
                  <div class="result-bar-normal" />
                </div>
              </div>
            </td>
            <td class="td-cell flag-cell th-center">
              <span v-if="row.flag" class="flag-badge" :class="row.flag === '↑' ? 'flag-high' : 'flag-low'">
                {{ row.flag }}
              </span>
            </td>
            <td class="td-cell ref-cell th-center">{{ row.refRange || '' }}</td>
            <td class="td-cell th-center">
              <span class="edit-btn" title="修改此行" @click="$emit('edit-row', idx)">✏️</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useLabTableHighlight } from '@/composables/lab/useLabTableHighlight';

defineProps({
  tableData: { type: Array, default: () => [] }
});

defineEmits(['edit-row']);

const { rowHighlightClass, resultValueClass, calcBarWidth, barFillClass } = useLabTableHighlight();
</script>

<style scoped>
.lab-table-wrap {
  flex: 1;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.lab-table-header {
  padding: 10px 14px;
  background: #f5f5f5;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  border-bottom: 1px solid #ddd;
}
.lab-table-scroll { flex: 1; overflow: auto; padding: 8px; }
.lab-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.th-cell { padding: 10px 12px; text-align: left; border-bottom: 2px solid #ccc; font-weight: 600; color: #444; white-space: nowrap; }
.th-center { text-align: center; }
.td-cell { padding: 8px 12px; border-bottom: 1px solid #eee; }
.empty-cell { padding: 20px; text-align: center; color: #bbb; }
.row-high { background: #fff5f5 !important; border-left: 3px solid #ef4444; }
.row-low { background: #f0f7ff !important; border-left: 3px solid #3b82f6; }
.row-normal { border-left: 3px solid transparent; }
.result-cell { vertical-align: middle; text-align: center; }
.result-value { font-weight: 700; font-size: 14px; display: block; line-height: 1.3; }
.result-high { color: #dc2626; }
.result-low { color: #2563eb; }
.result-normal { color: #1e2d4a; }
.code-cell { color: #888; }
.name-cell { font-weight: 500; }
.ref-cell { color: #666; font-size: 12px; }
.result-bar-wrap { margin-top: 4px; }
.result-bar-track { position: relative; height: 5px; background: #e5e7eb; border-radius: 99px; overflow: hidden; width: 100%; min-width: 60px; }
.result-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
.bar-high { background: linear-gradient(90deg, #fca5a5, #ef4444); }
.bar-low { background: linear-gradient(90deg, #93c5fd, #3b82f6); }
.bar-ok { background: linear-gradient(90deg, #6ee7b7, #10b981); }
.flag-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: 800; }
.flag-high { background: #fee2e2; color: #dc2626; }
.flag-low { background: #dbeafe; color: #2563eb; }
.edit-btn { cursor: pointer; color: #6366f1; font-size: 13px; }
</style>

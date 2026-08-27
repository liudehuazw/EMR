<template>
  <div v-if="invoiceCount > 0" class="summary-card">
    <div class="summary-item">
      <span class="summary-emoji">💰</span>
      <div>
        <div class="summary-label">总计金额</div>
        <div class="summary-value amount-total">¥{{ totalAmount }}</div>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-emoji">🧾</span>
      <div>
        <div class="summary-label">发票数量</div>
        <div class="summary-value">{{ invoiceCount }} 张</div>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-emoji">💊</span>
      <div>
        <div class="summary-label">自付金额</div>
        <div class="summary-value amount-self">¥{{ selfPayAmount }}</div>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-emoji">🛡️</span>
      <div>
        <div class="summary-label">商保报销</div>
        <div class="summary-value amount-commercial">¥{{ commercialAmount }}</div>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-emoji">💵</span>
      <div>
        <div class="summary-label">实际自付</div>
        <div class="summary-value amount-actual">¥{{ actualSelfPayAmount }}</div>
      </div>
    </div>
    <div v-if="duplicateCount > 0" class="summary-item duplicate-box">
      <span class="summary-emoji-sm">⚠️</span>
      <div>
        <div class="summary-label-warn">疑似重复</div>
        <div class="summary-value-warn">{{ duplicateCount }} 张</div>
      </div>
    </div>
    <div v-if="anomalyCount > 0" class="summary-item anomaly-box">
      <span class="summary-emoji-sm">❗</span>
      <div>
        <div class="summary-label-warn">异常提醒</div>
        <div class="summary-value-anomaly">{{ anomalyCount }} 条</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalAmount: { type: String, default: '0.00' },
  selfPayAmount: { type: String, default: '0.00' },
  commercialAmount: { type: String, default: '0.00' },
  actualSelfPayAmount: { type: String, default: '0.00' },
  invoiceCount: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  anomalyCount: { type: Number, default: 0 }
});
</script>

<style scoped>
.summary-card {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 1rem;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fff8f8 0%, #fff 100%);
  border-radius: 10px;
  border: 1px solid #f0d0d0;
}
.summary-item { display: flex; align-items: center; gap: 10px; min-width: 140px; }
.summary-emoji { font-size: 22px; }
.summary-emoji-sm { font-size: 18px; }
.summary-label { font-size: 11px; color: #888; }
.summary-value { font-size: 18px; font-weight: 700; color: #333; }
.amount-total { color: #d03050; }
.amount-self { color: #e67e22; }
.amount-commercial { color: #2e7d32; }
.amount-actual { color: #6a1b9a; }
.duplicate-box {
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 8px;
  padding: 8px 12px;
}
.anomaly-box {
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  padding: 8px 12px;
}
.summary-label-warn { font-size: 11px; color: #e6a23c; }
.summary-value-warn { font-size: 16px; font-weight: 700; color: #e6a23c; }
.summary-value-anomaly { font-size: 16px; font-weight: 700; color: #d03050; }
</style>

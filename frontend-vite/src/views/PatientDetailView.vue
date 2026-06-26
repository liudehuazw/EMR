<template>
  <div class="dashboard">
    <div class="content-card">
      <div style="display:flex; align-items:center; margin-bottom:2rem;">
        <el-button @click="router.push({name:'Patients'})" style="margin-right:1rem;">← 返回</el-button>
        <h2 style="margin:0;">患者详情：{{ patient?.name }}</h2>
      </div>

      <div v-if="patient">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="患者编号">{{ patient.patientNo }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ patient.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ patient.gender === 1 ? '男' : '女' }}</el-descriptions-item>
          <el-descriptions-item label="出生日期">{{ patient.birthDate }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ patient.phone }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{ patient.idCard || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="住址" :span="2">{{ patient.address || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系人">{{ patient.emergencyContact || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系电话">{{ patient.emergencyPhone || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="过敏史" :span="2">{{ patient.allergyHistory || '无' }}</el-descriptions-item>
          <el-descriptions-item label="既往病史" :span="2">{{ patient.medicalHistory || '无' }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top:2rem; display:flex; gap:1rem; flex-wrap:wrap;">
          <el-button type="warning" @click="router.push({name:'Records', query:{patientId: patient.id}})">📋 查看病历统计</el-button>
          <el-button type="danger"  @click="router.push({name:'Lab', query:{patientId: patient.id}})">🔬 查看检验报告</el-button>
          <el-button type="primary" @click="router.push({name:'Imaging', query:{patientId: patient.id}})">🏥 查看影像报告</el-button>
          <el-button @click="router.push({name:'Invoice', query:{patientId: patient.id}})">💰 查看发票统计</el-button>
        </div>
      </div>

      <el-empty v-else description="未找到患者信息" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePatientsStore } from '@/stores/usePatients';

const route = useRoute();
const router = useRouter();
const patientsStore = usePatientsStore();

const patient = computed(() => patientsStore.getPatientById(route.params.id));
</script>

<style scoped>
@media (max-width: 768px) {
  :deep(.el-descriptions__label) { width: 100px; }
  :deep(.el-descriptions__content) { word-break: break-all; }
}
@media (max-width: 576px) {
  :deep(.el-descriptions) { font-size: 13px; }
  :deep(.el-descriptions__label) { width: 80px; padding: 8px !important; }
  :deep(.el-descriptions__content) { padding: 8px !important; }
}
</style>

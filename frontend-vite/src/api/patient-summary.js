import { apiRequest } from './client';

/**
 * 批量获取患者各模块记录数（病历/检验/影像/发票）。
 *
 * 后端一次请求完成 4 条 GROUP BY 聚合查询，
 * 替代原先「4 × 患者数」次请求（N+1）以及「等全量数据下载完再本地 .length」的做法。
 *
 * @param {Array<number|string>} patientIds
 * @returns {Promise<{code:number, message:string, data:Array<{patientId:number, records:number, lab:number, imaging:number, invoice:number}>}>}
 */
export function fetchPatientCounts(patientIds) {
  const ids = (patientIds || []).filter(id => id !== null && id !== undefined && id !== '');
  if (ids.length === 0) {
    return Promise.resolve({ code: 200, message: 'ok', data: [] });
  }
  return apiRequest(`/patient-summary/counts?patientIds=${ids.join(',')}`);
}

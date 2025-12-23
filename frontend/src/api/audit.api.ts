import apiClient from './client';
import { AuditLogResponse, AuditLogQuery } from '../types/audit';

export const auditApi = {
  getLogs: async (query: AuditLogQuery) => {
    const { data } = await apiClient.get<AuditLogResponse>('/audit-logs', {
      params: query,
    });
    return data;
  },
};

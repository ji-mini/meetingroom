export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  userId?: string;
  user?: {
    name: string;
    email: string;
    departmentName?: string;
  };
  createdAt: string;
}

export interface AuditLogQuery {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

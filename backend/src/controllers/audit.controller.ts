import type { Request, Response } from 'express';
import * as auditService from '../services/audit.service.js';

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const action = req.query.action as string;
    const entity = req.query.entity as string;

    const result = await auditService.getAuditLogs({
      page,
      limit,
      action,
      entity,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: '로그 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

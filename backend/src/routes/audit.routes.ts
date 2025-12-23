import { Router } from 'express';
import { ssoMiddleware, requireAdmin } from '../middleware/ssoMiddleware.js';
import * as auditController from '../controllers/audit.controller.js';

const router = Router();

// 모든 로그 관련 API는 관리자 권한 필요
router.use(ssoMiddleware);
router.use(requireAdmin);

router.get('/', auditController.getAuditLogs);

export default router;

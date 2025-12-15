import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// 모든 사용자 라우트는 관리자 권한 필요
router.get('/', requireAdmin, userController.getUsers);
router.patch('/:id/role', requireAdmin, userController.updateUserRole);

export default router;
















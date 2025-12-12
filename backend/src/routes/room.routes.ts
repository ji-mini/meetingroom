import { Router } from 'express';
import * as roomController from '../controllers/room.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

router.get('/', roomController.getRooms);
router.get('/all', requireAdmin, roomController.getAllRooms); // 관리자용: 모든 회의실 조회
router.post('/', requireAdmin, roomController.createRoom); // 관리자만 회의실 생성 가능
router.get('/:id', roomController.getRoomById);
router.put('/:id', requireAdmin, roomController.updateRoom); // 관리자만 회의실 수정 가능
router.patch('/:id/toggle-status', requireAdmin, roomController.toggleRoomStatus); // 관리자만 상태 토글 가능
router.delete('/:id', roomController.deleteRoom);
router.patch('/:id/close', requireAdmin, roomController.closeRoom); // 관리자만 회의실 비활성화 가능

export default router;



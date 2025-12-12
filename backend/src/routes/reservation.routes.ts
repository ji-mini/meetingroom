import { Router } from 'express';
import * as reservationController from '../controllers/reservation.controller.js';
import { ssoMiddleware } from '../middleware/ssoMiddleware.js';

const router = Router();

// GET 요청은 optionalAuthMiddleware 사용 (app.ts에서 이미 적용됨)
router.get('/', reservationController.getReservations);
router.get('/:id', reservationController.getReservationById);

// POST, PUT, DELETE는 SSO 인증 필요 (로그인 버튼 클릭 후에만 가능)
// app.ts에서 이미 ssoMiddleware가 적용되어 있으므로 여기서 중복 적용할 필요 없음
router.post('/', reservationController.createReservation);
router.put('/:id', reservationController.updateReservation);
router.delete('/:id', reservationController.deleteReservation);

export default router;











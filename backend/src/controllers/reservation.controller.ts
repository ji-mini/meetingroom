import type { Request, Response } from 'express';
import * as reservationService from '../services/reservation.service.js';
import type { CreateReservationDto, UpdateReservationDto, ReservationQuery } from '../types/reservation.js';

/**
 * 예약 목록 조회
 */
export async function getReservations(req: Request, res: Response) {
  try {
    const query: ReservationQuery = {
      roomId: req.query.roomId as string | undefined,
      date: req.query.date as string | undefined,
    };

    const reservations = await reservationService.getReservations(query);
    res.json(reservations);
  } catch (error) {
    console.error('Error getting reservations:', error);
    res.status(500).json({
      message: '예약 목록 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 예약 단건 조회
 */
export async function getReservationById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reservation = await reservationService.getReservationById(id);

    if (!reservation) {
      return res.status(404).json({
        message: '존재하지 않는 예약입니다.',
      });
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({
      message: '예약 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 예약 생성
 */
export async function createReservation(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        message: '인증이 필요합니다.',
      });
    }

    const data: CreateReservationDto = req.body;
    
    // userId는 인증된 사용자로부터 자동 설정
    const reservationData = {
      ...data,
      userId: user.employeeId, // SSO에서 받은 employeeId를 사용하여 User 조회
    };

    const reservation = await reservationService.createReservation(reservationData);
    res.status(201).json(reservation);
  } catch (error) {
    // 정기예약 충돌 에러 처리
    if (error instanceof Error && (error as any).code === 'CONFLICT_RECURRING') {
      return res.status(409).json({
        message: '일부 날짜에 예약 충돌이 있습니다.',
        conflicts: (error as any).conflicts,
        code: 'CONFLICT_RECURRING',
      });
    }

    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '예약 생성 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 예약 수정
 */
export async function updateReservation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data: UpdateReservationDto = req.body;
    const actorId = (req as any).user?.id;

    const reservation = await reservationService.updateReservation(id, data, actorId);
    res.json(reservation);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '예약 수정 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 예약 삭제
 */
export async function deleteReservation(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        message: '인증이 필요합니다.',
      });
    }

    const { id } = req.params;
    const scope = req.query.scope as 'this' | 'all' | undefined;
    const actorId = user.id;

    // ADMIN이면 employeeId 체크 건너뛰기 위해 null 전달 (서비스 로직에 따라 다름)
    // 현재 서비스는 employeeId가 있으면 본인 체크를 함.
    // ADMIN 권한이면 employeeId를 undefined로 넘겨야 함.
    const checkEmployeeId = user.role === 'ADMIN' ? undefined : user.employeeId;

    await reservationService.deleteReservation(id, checkEmployeeId, actorId, scope);
    res.status(204).send();
  } catch (error) {
    let statusCode = 500;
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('존재하지 않는')) {
      statusCode = 404;
    } else if (message.includes('권한이 없습니다')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '예약 삭제 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

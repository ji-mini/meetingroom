import type { Request, Response } from 'express';
import * as roomService from '../services/room.service.js';
import type { CreateRoomDto, UpdateRoomDto } from '../types/room.js';

/**
 * 회의실 목록 조회
 */
export async function getRooms(req: Request, res: Response) {
  try {
    const rooms = await roomService.getRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({
      message: '회의실 목록 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 단건 조회
 */
export async function getRoomById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);

    if (!room) {
      return res.status(404).json({
        message: '존재하지 않는 회의실입니다.',
      });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({
      message: '회의실 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 생성
 */
export async function createRoom(req: Request, res: Response) {
  try {
    const data: CreateRoomDto = req.body;
    const user = (req as any).user;
    const actorId = user?.id || user?.employeeId; // employeeId를 fallback으로 사용하지만 원칙적으로는 id여야 함

    // 필수 필드 검증
    if (!data.name || !data.building || !data.floor || !data.capacity) {
      return res.status(400).json({
        message: '회의실 이름, 건물, 층, 최대 참석 가능 인원은 필수입니다.',
      });
    }

    // 최대 참석 가능 인원 양수 검증
    if (data.capacity <= 0) {
      return res.status(400).json({
        message: '최대 참석 가능 인원은 1명 이상이어야 합니다.',
      });
    }

    const room = await roomService.createRoom(data, actorId);
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : '회의실 생성 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 삭제
 */
export async function deleteRoom(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const actorId = user?.id || user?.employeeId; // employeeId를 fallback으로 사용하지만 원칙적으로는 id여야 함

    await roomService.deleteRoom(id, actorId);
    res.status(204).send();
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '회의실 삭제 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 모든 회의실 목록 조회 (관리자용)
 */
export async function getAllRooms(req: Request, res: Response) {
  try {
    const rooms = await roomService.getAllRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({
      message: '회의실 목록 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 정보 수정
 */
export async function updateRoom(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data: UpdateRoomDto = req.body;
    const user = (req as any).user;
    const actorId = user?.id || user?.employeeId; // employeeId를 fallback으로 사용하지만 원칙적으로는 id여야 함

    // capacity 검증
    if (data.capacity !== undefined && data.capacity <= 0) {
      return res.status(400).json({
        message: '최대 참석 가능 인원은 1명 이상이어야 합니다.',
      });
    }

    const room = await roomService.updateRoom(id, {
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      hasMonitor: data.hasMonitor,
      hasProjector: data.hasProjector,
    }, actorId);
    res.json(room);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '회의실 수정 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 활성/비활성 토글
 */
export async function toggleRoomStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const actorId = user?.id || user?.employeeId; // employeeId를 fallback으로 사용하지만 원칙적으로는 id여야 함
    const room = await roomService.toggleRoomStatus(id, actorId);
    res.json(room);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '회의실 상태 변경 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 회의실 CLOSED 상태로 변경
 */
export async function closeRoom(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const actorId = user?.id || user?.employeeId; // employeeId를 fallback으로 사용하지만 원칙적으로는 id여야 함
    const room = await roomService.closeRoom(id, actorId);
    res.status(200).json(room);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '회의실 비활성화 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

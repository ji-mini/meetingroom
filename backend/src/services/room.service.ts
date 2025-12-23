import prisma from '../config/database.js';
import type { CreateRoomDto } from '../types/room.js';
import { logAction } from '../utils/audit.js';

/**
 * 회의실 목록 조회 (ACTIVE 상태만)
 */
export async function getRooms() {
  return await prisma.meetingRoom.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: [
      { building: 'asc' },
      { floor: 'asc' },
      { name: 'asc' },
    ],
  });
}

/**
 * 모든 회의실 목록 조회 (관리자용 - ACTIVE/CLOSED 모두)
 */
export async function getAllRooms() {
  return await prisma.meetingRoom.findMany({
    orderBy: [
      { name: 'asc' },
    ],
  });
}

/**
 * 회의실 단건 조회
 */
export async function getRoomById(id: string) {
  return await prisma.meetingRoom.findUnique({
    where: { id },
  });
}

/**
 * 회의실 생성
 */
export async function createRoom(data: CreateRoomDto, actorId?: string) {
  const room = await prisma.meetingRoom.create({
    data: {
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      hasMonitor: data.hasMonitor ?? false,
      hasProjector: data.hasProjector ?? false,
      status: data.status || 'ACTIVE',
    },
  });

  await logAction('CREATE', 'MEETING_ROOM', room.id, room, actorId);
  return room;
}

/**
 * 회의실 삭제
 */
export async function deleteRoom(id: string, actorId?: string) {
  // 회의실 존재 확인
  const room = await prisma.meetingRoom.findUnique({
    where: { id },
    include: {
      reservations: true,
    },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  // 예약이 있는 경우 삭제 불가
  if (room.reservations.length > 0) {
    throw new Error('예약이 있는 회의실은 삭제할 수 없습니다.');
  }

  const deleted = await prisma.meetingRoom.delete({
    where: { id },
  });

  await logAction('DELETE', 'MEETING_ROOM', id, { name: room.name }, actorId);
  return deleted;
}

/**
 * 회의실 CLOSED 상태로 변경
 */
export async function closeRoom(id: string, actorId?: string) {
  // 회의실 존재 확인
  const room = await prisma.meetingRoom.findUnique({
    where: { id },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  if (room.status === 'CLOSED') {
    throw new Error('이미 비활성화된 회의실입니다.');
  }

  const updated = await prisma.meetingRoom.update({
    where: { id },
    data: {
      status: 'CLOSED',
    },
  });

  await logAction('UPDATE', 'MEETING_ROOM', id, { status: 'CLOSED' }, actorId);
  return updated;
}

/**
 * 회의실 정보 수정
 */
export async function updateRoom(id: string, data: { name?: string; building?: string; floor?: string; capacity?: number; hasMonitor?: boolean; hasProjector?: boolean }, actorId?: string) {
  const room = await prisma.meetingRoom.findUnique({
    where: { id },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  const updated = await prisma.meetingRoom.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.building !== undefined && { building: data.building }),
      ...(data.floor !== undefined && { floor: data.floor }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.hasMonitor !== undefined && { hasMonitor: data.hasMonitor }),
      ...(data.hasProjector !== undefined && { hasProjector: data.hasProjector }),
    },
  });

  await logAction('UPDATE', 'MEETING_ROOM', id, data, actorId);
  return updated;
}

/**
 * 회의실 활성/비활성 토글
 * 비활성화 시 미래 예약이 있으면 불가
 */
export async function toggleRoomStatus(id: string, actorId?: string) {
  const room = await prisma.meetingRoom.findUnique({
    where: { id },
    include: {
      reservations: {
        where: {
          startAt: {
            gte: new Date(), // 현재 시간 이후의 예약만
          },
        },
      },
    },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  // 비활성화하려는 경우 미래 예약 체크
  if (room.status === 'ACTIVE' && room.reservations.length > 0) {
    throw new Error('미래에 예약이 있는 회의실은 비활성화할 수 없습니다.');
  }

  const newStatus = room.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';

  const updated = await prisma.meetingRoom.update({
    where: { id },
    data: {
      status: newStatus,
    },
  });

  await logAction('UPDATE', 'MEETING_ROOM', id, { status: newStatus }, actorId);
  return updated;
}

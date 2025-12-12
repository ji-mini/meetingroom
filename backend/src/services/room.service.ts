import prisma from '../config/database.js';
import type { CreateRoomDto } from '../types/room.js';

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
      { createdAt: 'desc' },
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
export async function createRoom(data: CreateRoomDto) {
  // 이름 중복 체크 (선택사항 - 필요시 활성화)
  // const existing = await prisma.meetingRoom.findFirst({
  //   where: { name: data.name, building: data.building, floor: data.floor },
  // });
  // if (existing) {
  //   throw new Error('같은 위치에 동일한 이름의 회의실이 이미 존재합니다.');
  // }

  return await prisma.meetingRoom.create({
    data: {
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      status: data.status || 'ACTIVE',
    },
  });
}

/**
 * 회의실 삭제
 */
export async function deleteRoom(id: string) {
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

  return await prisma.meetingRoom.delete({
    where: { id },
  });
}

/**
 * 회의실 CLOSED 상태로 변경
 */
export async function closeRoom(id: string) {
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

  return await prisma.meetingRoom.update({
    where: { id },
    data: {
      status: 'CLOSED',
    },
  });
}

/**
 * 회의실 정보 수정
 */
export async function updateRoom(id: string, data: { name?: string; building?: string; floor?: string; capacity?: number }) {
  const room = await prisma.meetingRoom.findUnique({
    where: { id },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  return await prisma.meetingRoom.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.building !== undefined && { building: data.building }),
      ...(data.floor !== undefined && { floor: data.floor }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
    },
  });
}

/**
 * 회의실 활성/비활성 토글
 * 비활성화 시 미래 예약이 있으면 불가
 */
export async function toggleRoomStatus(id: string) {
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

  return await prisma.meetingRoom.update({
    where: { id },
    data: {
      status: newStatus,
    },
  });
}



import prisma from '../config/database.js';
import type { CreateReservationDto, UpdateReservationDto, ReservationQuery } from '../types/reservation.js';
import { getUserByEmployeeId } from './user.service.js';
import { Prisma } from '@prisma/client';
import { logAction } from '../utils/audit.js';

/**
 * 운영 시간 및 점심시간 체크
 * - 운영 시간: 08:00 ~ 18:00
 * - 점심 시간: 11:30 ~ 12:30 (예약 불가)
 */
function checkBusinessHours(startAt: Date, endAt: Date): void {
  // startAt and endAt are "Fake UTC" dates where getUTCHours() gives the wall clock hour.
  const startHour = startAt.getUTCHours();
  const startMin = startAt.getUTCMinutes();
  const startTotal = startHour * 60 + startMin;

  const endHour = endAt.getUTCHours();
  const endMin = endAt.getUTCMinutes();
  const endTotal = endHour * 60 + endMin;

  // 1. 점심시간 체크 (11:30 ~ 12:30)
  const lunchStart = 11 * 60 + 30; // 11:30
  const lunchEnd = 12 * 60 + 30;   // 12:30

  if (startTotal < lunchEnd && endTotal > lunchStart) {
    throw new Error('점심시간(11:30 ~ 12:30)에는 예약할 수 없습니다.');
  }

  // 2. 운영시간 체크 (08:00 ~ 18:00)
  const opStart = 8 * 60;  // 08:00
  const opEnd = 18 * 60;   // 18:00

  if (startTotal < opStart || endTotal > opEnd) {
    throw new Error('예약 가능한 시간은 08:00 ~ 18:00 입니다.');
  }

  return true; // 통과
}

/**
 * 예약 시간 중복 체크
 */
async function checkTimeConflict(
  roomId: string,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const where: Prisma.ReservationWhereInput = {
    roomId,
    // 중복 조건 수정:
    // 기존 예약 (Existing)과 새 예약 (New)이 겹치는 조건:
    // Existing.start < New.end AND Existing.end > New.start
    // 즉, 서로의 구간이 조금이라도 겹치면 중복
    AND: [
      { startAt: { lt: endAt } },
      { endAt: { gt: startAt } },
    ],
  };

  if (excludeReservationId) {
    where.id = { not: excludeReservationId };
  }

  const conflict = await prisma.reservation.findFirst({
    where,
  });

  return conflict !== null;
}

function extractLocalDateTime(dateTimeString: string): string {
  let cleanDateTime = dateTimeString;
  if (cleanDateTime.includes('+')) {
    cleanDateTime = cleanDateTime.replace(/[+-]\d{2}:\d{2}$/, '');
  } else if (cleanDateTime.endsWith('Z')) {
    cleanDateTime = cleanDateTime.replace(/Z$/, '');
  } else if (/-\d{2}:\d{2}$/.test(cleanDateTime)) {
    cleanDateTime = cleanDateTime.replace(/-\d{2}:\d{2}$/, '');
  }
  return cleanDateTime.replace('T', ' ');
}

function parseLocalDateTime(dateTimeString: string): Date {
  const localDateTimeStr = extractLocalDateTime(dateTimeString);
  const [datePart, timePart] = localDateTimeStr.split(' ');
  if (!datePart || !timePart) {
    return new Date(dateTimeString);
  }
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = '0'] = timePart.split(':').map(Number);
  // Date.UTC를 사용하여 타임존 변환 없이 입력된 시간 그대로를 UTC로 취급 (DB의 timestamp 타입과 일치시키기 위함)
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0, 0));
}

// 헬퍼 함수: 예약 정보 매핑 (부서명 처리)
function mapReservation(reservation: any) {
  if (!reservation) return null;
  return {
    ...reservation,
    user: reservation.user ? {
      ...reservation.user,
      dept: reservation.user.deptId || reservation.user.dept, // dept는 ID로 반환
      departmentName: reservation.user.department?.name || null // 부서명 추가
    } : null
  };
}

export async function createReservation(data: CreateReservationDto) {
  const startAt = parseLocalDateTime(data.startAt);
  const endAt = parseLocalDateTime(data.endAt);

  if (startAt >= endAt) {
    throw new Error('예약 종료 시간은 시작 시간보다 늦어야 합니다.');
  }

  // 운영 시간 및 점심시간 체크 (에러 발생 시 throw)
  checkBusinessHours(startAt, endAt);

  const room = await prisma.meetingRoom.findUnique({
    where: { id: data.roomId },
  });

  if (!room) {
    throw new Error('존재하지 않는 회의실입니다.');
  }

  if (room.status !== 'ACTIVE') {
    throw new Error('예약할 수 없는 회의실입니다.');
  }

  const hasConflict = await checkTimeConflict(data.roomId, startAt, endAt);
  if (hasConflict) {
    throw new Error('해당 시간대에 이미 예약이 있습니다.');
  }

  let userId: string | null = null;
  if (data.userId) {
    const user = await getUserByEmployeeId(data.userId);
    if (user) {
      userId = user.id;
    }
  }

  const startAtStr = extractLocalDateTime(data.startAt);
  const endAtStr = extractLocalDateTime(data.endAt);
  
  const sql = userId 
    ? `INSERT INTO reservations (id, "roomId", "userId", title, "startAt", "endAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::timestamp, $5::timestamp, NOW(), NOW())
       RETURNING id`
    : `INSERT INTO reservations (id, "roomId", "userId", title, "startAt", "endAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, NULL, $2, $3::timestamp, $4::timestamp, NOW(), NOW())
       RETURNING id`;
  
  const params = userId 
    ? [data.roomId, userId, data.title, startAtStr, endAtStr]
    : [data.roomId, data.title, startAtStr, endAtStr];
  
  const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(sql, ...params);
  
  const createdId = result[0]?.id;
  if (!createdId) {
    throw new Error('예약 생성에 실패했습니다.');
  }

  const newReservation = await prisma.reservation.findUnique({
    where: { id: createdId },
    include: {
      room: true,
      user: {
        include: {
          department: true,
        }
      } as any,
    },
  });
  
  if (newReservation) {
    await logAction('CREATE', 'RESERVATION', newReservation.id, {
      title: newReservation.title,
      roomId: newReservation.roomId,
      startAt: newReservation.startAt,
      endAt: newReservation.endAt,
    }, userId || undefined);
  }

  return mapReservation(newReservation);
}

export async function getReservations(query: ReservationQuery) {
  const where: Prisma.ReservationWhereInput = {};

  if (query.roomId) {
    where.roomId = query.roomId;
  }

  if (query.date) {
    const [year, month, day] = query.date.split('-').map(Number);
    // Date.UTC를 사용하여 쿼리 날짜도 "Fake UTC"로 생성
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    where.startAt = {
      gte: date,
      lt: nextDate,
    };
  } else if (query.startDate && query.endDate) {
    // startDate와 endDate가 모두 있으면 범위 조회 수행 (월간 뷰용)
    const startDate = parseLocalDateTime(query.startDate);
    const endDate = parseLocalDateTime(query.endDate);
    
    // endDate에 하루를 더해서 그 전까지 조회 (예: 2025-12-31 종료면 2026-01-01 00:00 전까지)
    const nextDayOfEnd = new Date(endDate);
    nextDayOfEnd.setUTCDate(nextDayOfEnd.getUTCDate() + 1);

    where.startAt = {
      gte: startDate,
      lt: nextDayOfEnd, 
    };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      room: true,
      user: {
        include: {
          department: true,
        }
      } as any,
    },
    orderBy: {
      startAt: 'asc',
    },
  });

  return reservations.map(mapReservation);
}

export async function getReservationById(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      room: true,
      user: {
        include: {
          department: true,
        }
      } as any,
    },
  });
  
  return mapReservation(reservation);
}

export async function updateReservation(id: string, data: UpdateReservationDto, actorId?: string) {
  const existing = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('존재하지 않는 예약입니다.');
  }

  const startAt = data.startAt ? parseLocalDateTime(data.startAt) : existing.startAt;
  const endAt = data.endAt ? parseLocalDateTime(data.endAt) : existing.endAt;

  if (startAt >= endAt) {
    throw new Error('예약 종료 시간은 시작 시간보다 늦어야 합니다.');
  }

  // 운영 시간 및 점심시간 체크 (에러 발생 시 throw)
  checkBusinessHours(startAt, endAt);

  const hasConflict = await checkTimeConflict(existing.roomId, startAt, endAt, id);
  if (hasConflict) {
    throw new Error('해당 시간대에 이미 예약이 있습니다.');
  }

  if (data.startAt || data.endAt) {
    const startAtStr = data.startAt ? extractLocalDateTime(data.startAt) : null;
    const endAtStr = data.endAt ? extractLocalDateTime(data.endAt) : null;
    
    const updateParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (data.title) {
      updateParts.push(`title = $${paramIndex}`);
      params.push(data.title);
      paramIndex++;
    }
    if (startAtStr) {
      updateParts.push(`"startAt" = $${paramIndex}::timestamp`);
      params.push(startAtStr);
      paramIndex++;
    }
    if (endAtStr) {
      updateParts.push(`"endAt" = $${paramIndex}::timestamp`);
      params.push(endAtStr);
      paramIndex++;
    }
    
    updateParts.push(`"updatedAt" = NOW()`);
    params.push(id);
    
    await prisma.$executeRawUnsafe(
      `UPDATE reservations SET ${updateParts.join(', ')} WHERE id = $${paramIndex}::uuid`,
      ...params
    );
    
    const updated = await prisma.reservation.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          include: {
            department: true,
          }
        } as any,
      },
    });

    if (updated) {
      await logAction('UPDATE', 'RESERVATION', id, data, actorId);
    }

    return mapReservation(updated);
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      title: data.title,
    },
    include: {
      room: true,
      user: {
        include: {
          department: true,
        }
      } as any,
    },
  });

  if (updated) {
    await logAction('UPDATE', 'RESERVATION', id, { title: data.title }, actorId);
  }

  return mapReservation(updated);
}

export async function deleteReservation(id: string, employeeId?: string, actorId?: string) {
  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!existing) {
    throw new Error('존재하지 않는 예약입니다.');
  }

  if (employeeId) {
    if (!existing.user || existing.user.employeeId !== employeeId) {
      throw new Error('본인의 예약만 취소할 수 있습니다. (권한이 없습니다)');
    }
  }

  // userId from employeeId for log if actorId is not provided (which might be the case for deleteReservation with employeeId check)
  // But caller should provide actorId (uuid) for logging properly. 
  // If not provided, we can try to use existing.userId if it matches employeeId... but safest is passed actorId.
  // For now, if actorId is missing, we log it as anonymous or system if userId is null.

  const result = await prisma.reservation.delete({
    where: { id },
  });

  await logAction('DELETE', 'RESERVATION', id, { title: existing.title }, actorId || existing.userId || undefined);

  return result;
}

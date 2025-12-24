import prisma from '../config/database.js';
import type { CreateReservationDto, UpdateReservationDto, ReservationQuery } from '../types/reservation.js';
import { getUserByEmployeeId } from './user.service.js';
import { Prisma } from '@prisma/client';
import { logAction } from '../utils/audit.js';

import { isHoliday } from '../utils/koreanHolidays.js';

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

// 헬퍼 함수: 예약 정보 매핑 (부서명 처리 및 Timezone 처리)
function mapReservation(reservation: any) {
  if (!reservation) return null;

  // Fake UTC 전략: DB에 저장된 시간(UTC로 마킹되어 있으나 값은 로컬 시간)을
  // 'Z'를 제거한 문자열로 반환하여 프론트엔드가 이를 로컬 시간으로 해석하도록 함
  const startAt = reservation.startAt instanceof Date 
    ? reservation.startAt.toISOString().replace('Z', '') 
    : reservation.startAt;

  const endAt = reservation.endAt instanceof Date 
    ? reservation.endAt.toISOString().replace('Z', '') 
    : reservation.endAt;

  return {
    ...reservation,
    startAt,
    endAt,
    user: reservation.user ? {
      ...reservation.user,
      dept: reservation.user.deptId || reservation.user.dept, // dept는 ID로 반환
      departmentName: reservation.user.department?.name || null // 부서명 추가
    } : null
  };
}

// 헬퍼 함수: 날짜 더하기 (일 단위)
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 헬퍼 함수: 두 날짜 사이의 일수 차이
function diffDays(a: Date, b: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((a.getTime() - b.getTime()) / oneDay));
}

// 헬퍼 함수: 날짜 포맷 (YYYY-MM-DD)
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  // 사용자 ID 조회
  let userId: string | null = null;
  if (data.userId) {
    const user = await getUserByEmployeeId(data.userId);
    if (user) {
      userId = user.id;
    }
  }

  // 정기예약 처리
  if (data.recurring) {
    const recurringEndDate = parseLocalDateTime(data.recurring.endDate + 'T23:59:59'); // 날짜의 끝
    
    // 1. 기간 제한 체크 (최대 8주)
    if (diffDays(startAt, recurringEndDate) > 56) {
      throw new Error('정기예약은 최대 8주까지만 등록할 수 있습니다.');
    }

    const instances: { start: Date; end: Date }[] = [];
    const conflicts: { date: string; reason: string }[] = [];
    
    // 2. 인스턴스 생성 및 필터링
    let currentDate = new Date(startAt);
    // 시간 부분 유지
    const duration = endAt.getTime() - startAt.getTime();

    // currentDate가 startAt(첫 예약일)부터 시작
    // recurringEndDate까지 반복
    while (currentDate <= recurringEndDate) {
      // 주말 체크 (0: 일, 6: 토)
      const day = currentDate.getDay();
      if (day === 0 || day === 6) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // 공휴일 체크
      if (isHoliday(currentDate)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // 인스턴스 시간 계산
      const instanceStart = new Date(currentDate);
      const instanceEnd = new Date(currentDate.getTime() + duration);

      // 충돌 체크
      const hasConflict = await checkTimeConflict(data.roomId, instanceStart, instanceEnd);
      if (hasConflict) {
        conflicts.push({
          date: formatDate(instanceStart),
          reason: '이미 예약된 시간입니다.',
        });
      } else {
        instances.push({ start: instanceStart, end: instanceEnd });
      }

      // 개수 제한 체크 (최대 20개) -> 충돌 포함해서 체크해야 하나? 
      // 요구사항: "최대 생성 횟수: 20개". 생성하려는 것이 20개 넘으면 안됨.
      // 충돌난 것은 생성되지 않으므로 instances 개수로 체크하는게 맞음.
      // 하지만 "사용자 입력 단계에서 선제적으로 막고"라고 했으니, 전체 시도 횟수가 20개 넘으면 안될 수도.
      // 여기서는 "생성될 예정인 개수"가 20개를 넘으면 에러로 처리.
      if (instances.length > 20) {
        throw new Error('정기예약은 최대 20회까지만 등록할 수 있습니다.');
      }

      currentDate = addDays(currentDate, 1);
    }

    if (instances.length === 0 && conflicts.length === 0) {
      throw new Error('생성 가능한 날짜가 없습니다 (주말/공휴일 제외됨).');
    }

    // 3. 충돌 처리
    if (conflicts.length > 0) {
      if (!data.recurring.skipConflicts) {
        // 충돌이 있고 skip 옵션이 없으면 에러(또는 충돌 정보) 반환
        // 컨트롤러에서 catch하여 409와 함께 conflicts 정보를 내려줄 수 있도록 커스텀 에러나 객체 반환 필요
        // 여기서는 throw Error하고 메시지에 정보를 담거나, 별도 처리가 필요.
        // 서비스 함수가 Error 객체 외에 구조화된 데이터를 반환하려면 설계를 바꿔야 함.
        // 편의상 Error를 던지되, JSON stringify된 정보를 담아서 컨트롤러가 파싱하게 하거나,
        // 서비스가 { success: false, conflicts: [...] } 형태를 반환하도록 변경.
        // 기존 createReservation 시그니처 유지를 위해 throw Error 방식을 사용하되, 
        // 컨트롤러에서 잡을 수 있는 특수 에러 클래스를 만들거나, 그냥 여기서 throw하고 컨트롤러가 처리.
        // 하지만 conflicts 배열을 전달해야 하므로 throw 객체가 나음.
        const error = new Error('예약 충돌이 발생했습니다.');
        (error as any).conflicts = conflicts;
        (error as any).code = 'CONFLICT_RECURRING';
        throw error;
      }
      // skipConflicts === true 이면 conflicts 무시하고 진행
    }

    if (instances.length === 0) {
       throw new Error('충돌 제외 후 생성 가능한 날짜가 없습니다.');
    }

    // 4. 저장 (트랜잭션)
    const result = await prisma.$transaction(async (tx) => {
      // 4-1. RecurringReservation 생성
      const recurring = await tx.recurringReservation.create({
        data: {
          userId: userId || 'system', // userId가 없으면? 일단 string 필수이므로
          roomId: data.roomId,
          title: data.title,
          startDate: startAt,
          endDate: recurringEndDate,
          weekDays: '1,2,3,4,5', // 주말 제외 매일
        },
      });

      // 4-2. Reservation 인스턴스들 생성
      const createdReservations = [];
      for (const instance of instances) {
        const startAtStr = extractLocalDateTime(instance.start.toISOString());
        const endAtStr = extractLocalDateTime(instance.end.toISOString());
        
        // Raw SQL 사용 이유: Prisma createMany는 relation 연결이 까다롭거나 RETURNING 지원 문제 등..
        // 여기서는 그냥 prisma.reservation.create를 써도 됨 (반복 횟수 20회 제한이므로 성능 문제 크지 않음)
        const res = await tx.reservation.create({
          data: {
            roomId: data.roomId,
            userId: userId,
            title: data.title,
            startAt: instance.start,
            endAt: instance.end,
            recurringId: recurring.id,
          },
        });
        createdReservations.push(res);
      }
      
      return { recurring, count: createdReservations.length };
    });

    // 로그 (대표로 하나만 남기거나, "정기예약 생성" 로그를 남김)
    await logAction('CREATE', 'RESERVATION', result.recurring.id, {
      title: data.title,
      type: 'RECURRING',
      count: result.count,
      roomId: data.roomId,
    }, userId || undefined);

    // 첫 번째 예약 반환 (포맷 맞춰서)
    // 실제로는 생성된 예약 중 첫 번째를 반환하거나, 별도 응답 포맷이 필요할 수 있음.
    // 프론트엔드가 목록을 다시 불러오므로 크게 중요하지 않음.
    // 가장 빠른 예약일의 예약 정보를 반환
    const firstRes = await prisma.reservation.findFirst({
        where: { recurringId: result.recurring.id },
        orderBy: { startAt: 'asc' },
        include: {
            room: true,
            user: {
                include: {
                    department: true
                }
            } as any
        }
    });
    return mapReservation(firstRes);

  } else {
    // 단건 예약 (기존 로직)
    const hasConflict = await checkTimeConflict(data.roomId, startAt, endAt);
    if (hasConflict) {
      throw new Error('해당 시간대에 이미 예약이 있습니다.');
    }

    const startAtStr = extractLocalDateTime(data.startAt);
    const endAtStr = extractLocalDateTime(data.endAt);
    
    // ... 기존 INSERT 로직 ...
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

export async function deleteReservation(
  id: string, 
  employeeId?: string, 
  actorId?: string,
  scope: 'this' | 'all' = 'this'
) {
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
    // ADMIN 권한 체크 로직이 여기 없으므로, employeeId가 넘어오면 본인 확인.
    // 컨트롤러에서 ADMIN이면 employeeId를 안 넘기거나 별도 플래그가 필요할 수 있음.
    // 현재 구조상 deleteReservation 호출 시 employeeId가 있으면 본인 확인 강제.
    if (!existing.user || existing.user.employeeId !== employeeId) {
      throw new Error('본인의 예약만 취소할 수 있습니다. (권한이 없습니다)');
    }
  }

  // 전체 삭제 (정기예약인 경우)
  if (scope === 'all' && existing.recurringId) {
    // 트랜잭션으로 정기예약 그룹과 하위 예약들 삭제
    // onDelete: SetNull로 되어있을 수 있으므로 명시적 삭제 권장
    await prisma.$transaction(async (tx) => {
      // 1. 해당 그룹의 모든 예약 삭제
      const { count } = await tx.reservation.deleteMany({
        where: { recurringId: existing.recurringId },
      });

      // 2. RecurringReservation 삭제
      await tx.recurringReservation.delete({
        where: { id: existing.recurringId! },
      });

      // 로그 (대표로 하나만 남김)
      await logAction('DELETE', 'RESERVATION', existing.recurringId!, {
        title: existing.title,
        type: 'RECURRING_ALL',
        count,
      }, actorId || existing.userId || undefined);
    });

    return { count: 1 }; // 임시 반환값
  }

  // 단건 삭제
  const result = await prisma.reservation.delete({
    where: { id },
  });

  await logAction('DELETE', 'RESERVATION', id, { title: existing.title }, actorId || existing.userId || undefined);

  return result;
}

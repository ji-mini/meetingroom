export interface CreateReservationDto {
  roomId: string;
  userId?: string;
  title: string;
  startAt: string;
  endAt: string;
  // 정기예약 관련 필드 (선택)
  recurring?: {
    endDate: string; // 반복 종료일 (YYYY-MM-DD)
    weekDays?: string; // "0,1,2,3,4,5,6" (Optional, default: 매일)
    skipConflicts?: boolean; // 충돌 시 건너뛰기 여부
  };
}

export interface UpdateReservationDto {
  title?: string;
  startAt?: string;
  endAt?: string;
}

export interface ReservationQuery {
  roomId?: string;
  date?: string;     // YYYY-MM-DD (Specific date)
  startDate?: string; // YYYY-MM-DD (Range start)
  endDate?: string;   // YYYY-MM-DD (Range end)
}


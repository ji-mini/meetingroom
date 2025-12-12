export interface CreateReservationDto {
  roomId: string;
  userId?: string;
  title: string;
  startAt: string;
  endAt: string;
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


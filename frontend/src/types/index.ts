export interface MeetingRoom {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'ACTIVE' | 'CLOSED';
  facilities?: string[]; // 선택적 속성 추가
}

export interface Reservation {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  createdAt: string;
  updatedAt: string;
  user?: MeResponse; // join된 유저 정보
  room?: MeetingRoom; // join된 룸 정보
}

export interface MeResponse {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  dept?: string;
  departmentName?: string;
  role: 'USER' | 'ADMIN';
}

export type UserRole = 'USER' | 'ADMIN';

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
  date?: string;
  startDate?: string;
  endDate?: string;
}

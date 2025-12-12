export type CreateRoomDto = {
  name: string;
  building: string;
  floor: string;
  capacity: number; // 최대 참석 가능 인원
  status?: 'ACTIVE' | 'CLOSED';
};

export type UpdateRoomDto = {
  name?: string;
  building?: string;
  floor?: string;
  capacity?: number;
  status?: 'ACTIVE' | 'CLOSED';
};




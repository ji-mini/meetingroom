import apiClient from './client';
import type { Reservation, CreateReservationDto, UpdateReservationDto, ReservationQuery } from '../types';

export const reservationApi = {
  /**
   * 예약 목록 조회
   */
  getReservations: async (query?: ReservationQuery): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>('/reservations', { params: query });
    return data;
  },

  /**
   * 예약 단건 조회
   */
  getReservationById: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.get<Reservation>(`/reservations/${id}`);
    return data;
  },

  /**
   * 예약 생성
   */
  createReservation: async (dto: CreateReservationDto): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>('/reservations', dto);
    return data;
  },

  /**
   * 예약 수정
   */
  updateReservation: async (id: string, dto: UpdateReservationDto): Promise<Reservation> => {
    const { data } = await apiClient.put<Reservation>(`/reservations/${id}`, dto);
    return data;
  },

  /**
   * 예약 삭제
   */
  deleteReservation: async (id: string): Promise<void> => {
    await apiClient.delete(`/reservations/${id}`);
  },
};





















import apiClient from './client';
import type { MeetingRoom } from '../types';

export const roomApi = {
  /**
   * 회의실 목록 조회 (ACTIVE만)
   */
  getRooms: async (): Promise<MeetingRoom[]> => {
    const { data } = await apiClient.get<MeetingRoom[]>('/rooms');
    return data;
  },

  /**
   * 모든 회의실 목록 조회 (관리자용 - ACTIVE/CLOSED 모두)
   */
  getAllRooms: async (): Promise<MeetingRoom[]> => {
    const { data } = await apiClient.get<MeetingRoom[]>('/rooms/all');
    return data;
  },

  /**
   * 회의실 단건 조회
   */
  getRoomById: async (id: string): Promise<MeetingRoom> => {
    const { data } = await apiClient.get<MeetingRoom>(`/rooms/${id}`);
    return data;
  },

  /**
   * 회의실 생성
   */
  createRoom: async (payload: { 
    name: string; 
    building: string; 
    floor: string; 
    capacity: number;
    hasMonitor?: boolean;
    hasProjector?: boolean;
  }) => {
    const { data } = await apiClient.post<MeetingRoom>('/rooms', payload);
    return data;
  },

  /**
   * 회의실 정보 수정
   */
  updateRoom: async (id: string, payload: { 
    name?: string; 
    building?: string; 
    floor?: string; 
    capacity?: number;
    hasMonitor?: boolean;
    hasProjector?: boolean;
  }): Promise<MeetingRoom> => {
    const { data } = await apiClient.put<MeetingRoom>(`/rooms/${id}`, payload);
    return data;
  },

  /**
   * 회의실 활성/비활성 토글
   */
  toggleRoomStatus: async (id: string): Promise<MeetingRoom> => {
    const { data } = await apiClient.patch<MeetingRoom>(`/rooms/${id}/toggle-status`);
    return data;
  },

  /**
   * 회의실 삭제
   */
  deleteRoom: async (id: string): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`);
  },

  /**
   * 회의실 CLOSED 상태로 변경
   */
  closeRoom: async (id: string): Promise<MeetingRoom> => {
    const { data } = await apiClient.patch<MeetingRoom>(`/rooms/${id}/close`);
    return data;
  },
};



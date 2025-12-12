import apiClient from './client';
import type { MeResponse } from '../types';

export const authApi = {
  /**
   * 현재 로그인된 사용자 정보 조회
   */
  getMe: async (): Promise<MeResponse> => {
    // 백엔드 라우트 변경 (/api/me -> /api/auth/me)
    const { data } = await apiClient.get<MeResponse>('/auth/me');
    return data;
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<{ redirectUrl: string }> => {
    // 백엔드 라우트 변경 (/api/logout -> /api/auth/logout)
    const { data } = await apiClient.post<{ redirectUrl: string }>('/auth/logout');
    return data;
  },
};














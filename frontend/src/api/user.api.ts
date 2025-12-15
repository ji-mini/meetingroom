import apiClient from './client';

export type User = {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  dept: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
};

export const userApi = {
  /**
   * 사용자 목록 조회 (관리자만)
   */
  getUsers: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  /**
   * 사용자 권한 업데이트 (관리자만)
   */
  updateUserRole: async (id: string, role: 'ADMIN' | 'USER'): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/role`, { role });
    return data;
  },
};














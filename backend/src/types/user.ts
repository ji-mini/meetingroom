export interface SSOUserInfo {
  employeeId: string;
  name: string;
  email: string | null;
  dept: string | null;
  company: string | null;
}

export interface Department {
  id: string;
  name: string;
  companyCode: string | null;
  companyName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  // dept: string | null; // Removed
  company: string | null;
  role: 'USER' | 'ADMIN';
  department?: Department | null; // 조인된 부서 정보
}

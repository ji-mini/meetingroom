import prisma from '../config/database.js';
import type { SSOUserInfo } from '../types/user.js';

/**
 * SSO 사용자 정보를 기반으로 User 테이블에서 조회하거나 생성
 * 존재하면 이름/부서 정보를 업데이트
 */
export async function findOrCreateUser(userInfo: SSOUserInfo) {
  const { employeeId, name, email, dept, company } = userInfo;

  // 부서명이 있다면 Departments 테이블 확인 및 생성 (Optional)
  // 현재 MVP에서는 deptId를 필수는 아니지만, 추후 확장을 위해
  // Departments 테이블에 해당 부서가 없으면 생성하고, User.deptId를 연결하는 것이 좋음.
  // 다만 현재 dept 코드가 아닌 dept 이름만 넘어오므로, dept 이름 자체를 id로 사용할 수도 있고
  // UUID를 사용할 수도 있음. 
  // 여기서는 스키마에 정의된 대로 Department 테이블을 활용한다고 가정.
  // 만약 Department 테이블이 단순히 { id: string, name: string } 이고 id가 부서 코드라면
  // SSO에서 부서 코드를 받아와야 함.
  // SSOUserInfo에 deptId가 없으므로 일단 dept 이름으로 Department 조회/생성 시도 (id=name으로 가정하거나 별도 로직 필요)
  
  // 여기서는 기존 로직 유지하되, department relation만 include 해서 반환하도록 수정
  // (Department 테이블 데이터 채우는 로직은 별도로 필요하거나, 여기서 upsert 해야 함)

  // 1. Department 테이블에 부서 정보가 있다면 연결, 없다면... 일단 넘어감 (또는 이름으로 생성)
  // MVP 스펙상 복잡도를 낮추기 위해 기존 문자열 dept 컬럼 우선 사용 + department relation include
  
  // employeeId로 기존 사용자 조회
  const existingUser = await prisma.user.findUnique({
    where: { employeeId },
  });

  if (existingUser) {
    // 존재하면 이름/부서/계열사 업데이트
    // 개발 모드에서 홍길동(E123456)은 항상 ADMIN 권한으로 업데이트
    const updateData: {
      name: string;
      email: string | null;
      deptId: string | null; // dept -> deptId로 변경
      dept: string | null;
      company: string | null;
      role?: 'ADMIN' | 'USER';
    } = {
      name,
      email: email || null,
      deptId: dept || null, // dept 값을 deptId에 저장
      dept: dept || null, // 하위 호환성을 위해 dept 필드에도 저장 (deprecated)
      company: company || null,
    };

    // 개발 모드에서 홍길동은 항상 ADMIN 권한으로 업데이트
    // NODE_ENV가 설정되지 않았거나 'production'이 아니면 개발 모드로 간주
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
    if (isDev && employeeId === 'E123456') {
      updateData.role = 'ADMIN';
    }

    return await prisma.user.update({
      where: { employeeId },
      data: updateData,
      include: {
        department: true,
      }
    });
  }

  // 없으면 새로 생성
  // 개발 모드에서 홍길동(E123456)은 기본적으로 ADMIN 권한 부여
  // NODE_ENV가 설정되지 않았거나 'production'이 아니면 개발 모드로 간주
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
  const defaultRole = isDev && employeeId === 'E123456' ? 'ADMIN' : 'USER';

  return await prisma.user.create({
    data: {
      employeeId,
      name,
      email: email || null,
      deptId: dept || null, // dept 값을 deptId에 저장 (FK 연결)
      dept: dept || null,   // 하위 호환성을 위해 dept 필드에도 저장
      company: company || null,
      role: defaultRole,
    },
    include: {
      department: true,
    }
  });
}

/**
 * employeeId로 User 조회
 */
export async function getUserByEmployeeId(employeeId: string) {
  // Prisma Client가 아직 업데이트되지 않았을 수 있으므로 (EPERM 등)
  // department include가 실패하면 기본 조회로 폴백
  try {
    return await prisma.user.findUnique({
      where: { employeeId },
      include: {
        department: true,
      } as any // 강제 캐스팅
    });
  } catch (error) {
    console.error('getUserByEmployeeId error:', error);
    // department 필드를 모르는 경우 (Prisma Client 미업데이트)
    // 기존 방식으로 조회
    return await prisma.user.findUnique({
      where: { employeeId },
    });
  }
}

/**
 * 모든 사용자 목록 조회
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { name: 'asc' },
    ],
    include: {
      department: true, // 부서 정보 Join
    }
  });
  
  // Response 포맷에 맞게 매핑
  return users.map(user => ({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      dept: user.deptId || user.dept, // deptId 우선 사용
      departmentName: user.department?.name || null, // 조인된 부서명 사용
      company: user.company,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
  }));
}

/**
 * 사용자 권한 업데이트
 */
export async function updateUserRole(id: string, role: 'ADMIN' | 'USER') {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('존재하지 않는 사용자입니다.');
  }

  return await prisma.user.update({
    where: { id },
    data: { role },
    include: {
      department: true,
    }
  });
}

import prisma from '../config/database.js';
import type { SSOUserInfo } from '../types/user.js';

/**
 * SSO 사용자 정보를 기반으로 User 테이블에서 조회하거나 생성
 * 존재하면 이름/부서 정보를 업데이트
 */
export async function findOrCreateUser(userInfo: SSOUserInfo) {
  const { employeeId, name, email, dept, company } = userInfo;

  // 부서 처리: Department 테이블에 부서 정보 upsert
  let deptId: string | null = null;
  if (dept) {
    try {
      // 1. 이름으로 부서 조회
      let department = await prisma.department.findFirst({
        where: { name: dept },
      });

      // 2. 없으면 생성 (ID는 랜덤 UUID 또는 규칙에 따라 생성, 여기선 UUID)
      if (!department) {
        // 부서 생성 시 ID가 필요함. Department 모델 정의에 따라 다름.
        // 현재 Department ID는 String @id (수동 입력 필요)로 보임.
        // 임시로 랜덤 UUID나 부서명을 ID로 사용.
        // 만약 ID 규칙이 있다면 그에 따라야 함.
        // 여기서는 부서명을 ID로 사용하는 것이 간단할 수 있으나, 중복 방지를 위해 UUID 생성
        // 하지만 Department 모델에 default(uuid())가 없다면 직접 만들어야 함.
        // 스키마 확인 결과: model Department { id String @id ... } 
        // ID 생성 전략이 없으므로 UUID 생성 또는 부서명을 ID로 사용.
        // 부서명을 ID로 사용하면 읽기 쉽지만 변경 시 문제됨. UUID 사용 권장.
        // crypto.randomUUID() 사용 (Node 19+) 또는 uuid 라이브러리 사용
        // 여기서는 간단히 부서명을 ID로 사용하고 prefix 붙임 (임시) -> 아니면 uuid import
        // uuid 라이브러리가 있는지 확인 필요. 없으면 간단 생성 함수 사용.
        
        // 기존 코드에서 dept 자체를 deptId에 넣으려 했던 것으로 보아
        // '부서명' 자체를 ID로 쓰려 했을 수 있음.
        // 가장 안전한 방법: 부서명을 ID로 사용 (한글 포함 가능)
        // 하지만 PK는 영어/숫자가 좋음.
        
        // 여기서는 랜덤 ID 생성 함수 사용
        const newDeptId = `DEPT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        department = await prisma.department.create({
          data: {
            id: newDeptId,
            name: dept,
            companyName: company,
          },
        });
      }
      
      deptId = department.id;
    } catch (error) {
      console.warn('부서 정보 처리 중 오류 발생:', error);
      // 부서 처리 실패해도 사용자 로그인은 진행되어야 함
    }
  }

  // employeeId로 기존 사용자 조회
  const existingUser = await prisma.user.findUnique({
    where: { employeeId },
  });

  if (existingUser) {
    const updateData: any = {
      name,
      email: email || null,
      company: company || null,
    };

    if (deptId) {
        updateData.deptId = deptId;
    }

    // 개발 모드에서 홍길동(E123456)은 항상 ADMIN 권한으로 업데이트
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
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
  const defaultRole = isDev && employeeId === 'E123456' ? 'ADMIN' : 'USER';

  return await prisma.user.create({
    data: {
      employeeId,
      name,
      email: email || null,
      deptId: deptId,
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
      dept: null, // deprecated field removed
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

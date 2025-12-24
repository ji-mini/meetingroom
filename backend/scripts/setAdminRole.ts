import prisma from '../src/config/database.js';

/**
 * 홍길동(E123456)에게 관리자 권한 부여 스크립트
 */
async function setAdminRole() {
  try {
    const user = await prisma.user.update({
      where: { employeeId: 'E123456' },
      data: { role: 'ADMIN' },
    });
    console.log('✅ 관리자 권한이 부여되었습니다:', user);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update does not exist')) {
      console.log('⚠️ 사용자를 찾을 수 없습니다. 먼저 로그인하여 사용자를 생성해주세요.');
    } else {
      console.error('❌ 오류 발생:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

setAdminRole();






















/**
 * 권지용 사용자 생성 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/create-kwon-jiyong.ts
 */

import prisma from '../src/config/database.js';

async function createKwonJiyong() {
  try {
    // 권지용 사용자 생성 또는 업데이트
    const user = await prisma.user.upsert({
      where: { employeeId: 'E123458' },
      update: {
        name: '권지용',
        role: 'ADMIN',
        // email과 dept는 선택사항이므로 null로 설정
        email: null,
        dept: null,
      },
      create: {
        employeeId: 'E123458',
        name: '권지용',
        role: 'ADMIN',
        email: null,
        dept: null,
      },
    });

    console.log('✅ 권지용 사용자가 성공적으로 생성/업데이트되었습니다.');
    console.log(`   - 이름: ${user.name}`);
    console.log(`   - 사번: ${user.employeeId}`);
    console.log(`   - 권한: ${user.role}`);
    console.log(`   - ID: ${user.id}`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createKwonJiyong();














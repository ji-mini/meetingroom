/**
 * 사용자 목록 확인 스크립트
 */

import prisma from '../src/config/database.js';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    console.log('\n📋 현재 데이터베이스의 사용자 목록:\n');
    
    if (users.length === 0) {
      console.log('❌ 사용자가 없습니다.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   - 사번: ${user.employeeId}`);
        console.log(`   - 권한: ${user.role}`);
        console.log(`   - 이메일: ${user.email || '(없음)'}`);
        console.log(`   - 부서: ${user.dept || '(없음)'}`);
        console.log(`   - ID: ${user.id}`);
        console.log('');
      });
    }

    // 권지용 사용자 특별 확인
    const kwonJiyong = await prisma.user.findUnique({
      where: { employeeId: 'E123458' },
    });

    if (kwonJiyong) {
      console.log('✅ 권지용 사용자 확인됨!');
      console.log(`   - 이름: ${kwonJiyong.name}`);
      console.log(`   - 사번: ${kwonJiyong.employeeId}`);
      console.log(`   - 권한: ${kwonJiyong.role}`);
    } else {
      console.log('❌ 권지용 사용자(E123458)를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

















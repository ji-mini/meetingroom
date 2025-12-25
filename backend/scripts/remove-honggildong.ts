/**
 * 개발용 사용자 홍길동(개발) 삭제 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/remove-honggildong.ts
 */

import prisma from '../src/config/database.js';

async function removeHongGildong() {
  try {
    // 홍길동(개발) 사용자 찾기
    const hongGildong = await prisma.user.findUnique({
      where: { employeeId: 'E123456' },
      include: {
        reservations: true,
      },
    });

    if (!hongGildong) {
      console.log('✅ 홍길동(개발) 사용자가 데이터베이스에 없습니다.');
      return;
    }

    console.log(`⚠️  홍길동(개발) 사용자를 찾았습니다.`);
    console.log(`   - 이름: ${hongGildong.name}`);
    console.log(`   - 사번: ${hongGildong.employeeId}`);
    console.log(`   - 예약 수: ${hongGildong.reservations.length}개`);

    if (hongGildong.reservations.length > 0) {
      console.log(`\n⚠️  이 사용자에게 연결된 예약이 ${hongGildong.reservations.length}개 있습니다.`);
      console.log('   예약도 함께 삭제됩니다.');
    }

    // 예약과 함께 사용자 삭제 (onDelete: Cascade 또는 SetNull에 따라)
    await prisma.user.delete({
      where: { employeeId: 'E123456' },
    });

    console.log('\n✅ 홍길동(개발) 사용자가 성공적으로 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removeHongGildong();























import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertChaEunwoo() {
  const employeeId = 'E654321';

  const user = await prisma.user.upsert({
    where: { employeeId },
    update: {
      name: '차은우',
      email: 'cha.eunwoo@example.com',
      dept: '브랜드팀',
      role: UserRole.USER,
    },
    create: {
      employeeId,
      name: '차은우',
      email: 'cha.eunwoo@example.com',
      dept: '브랜드팀',
      role: UserRole.USER,
    },
  });

  console.log('✅ 차은우 사용자 등록/업데이트 완료:', user);
}

upsertChaEunwoo()
  .catch((error) => {
    console.error('❌ 차은우 사용자 등록 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






















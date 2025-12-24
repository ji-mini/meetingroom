import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 회의실 데이터 생성
  const rooms = [
    {
      name: '회의실 A',
      building: '본관',
      floor: '10층',
      capacity: 8,
      hasMonitor: true,
      hasProjector: true,
      status: 'ACTIVE' as const,
    },
    {
      name: '회의실 B',
      building: '본관',
      floor: '10층',
      capacity: 6,
      hasMonitor: true,
      hasProjector: false,
      status: 'ACTIVE' as const,
    },
    {
      name: '대회의실',
      building: '본관',
      floor: '11층',
      capacity: 20,
      hasMonitor: true,
      hasProjector: true,
      status: 'ACTIVE' as const,
    },
    {
      name: '집중 회의실',
      building: '별관',
      floor: '3층',
      capacity: 4,
      hasMonitor: false,
      hasProjector: false,
      status: 'ACTIVE' as const,
    },
    {
      name: '화상 회의실',
      building: '별관',
      floor: '3층',
      capacity: 6,
      hasMonitor: true,
      hasProjector: false,
      status: 'ACTIVE' as const,
    },
  ];

  console.log('회의실 데이터 시딩 시작...');

  for (const room of rooms) {
    await prisma.meetingRoom.create({
      data: room,
    });
  }

  console.log('회의실 데이터 시딩 완료.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


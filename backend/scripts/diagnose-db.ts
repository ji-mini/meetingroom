import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking meeting_rooms columns...');
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'meeting_rooms';
    `;
    console.log('MeetingRoom Columns:', columns);

    console.log('Checking audit_logs table...');
    const auditTable = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'audit_logs';
    `;
    console.log('AuditLog Table:', auditTable);

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();







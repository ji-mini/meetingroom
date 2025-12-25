import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Audit Logs Table (with details as JSONB)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "entity" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "details" JSONB,
        "userId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
      );
    `);

    // 2. Add Foreign Key for userId in audit_logs
    // Check if constraint exists first to avoid error
    try {
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_userId_fkey') THEN
                    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
    } catch (e) {
        console.log('Foreign key might already exist or failed:', e);
    }

    console.log('Schema update script completed.');
  } catch (error) {
    console.error('Error executing schema update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();








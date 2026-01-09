-- Create departments table (idempotent)
CREATE TABLE IF NOT EXISTS "departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "companyCode" TEXT,
  "companyName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- Ensure users.deptId exists (new schema uses deptId relation; legacy uses users.dept)
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "deptId" TEXT;

-- Best-effort backfill: if legacy dept exists and deptId is empty, copy it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'dept'
  ) THEN
    EXECUTE 'UPDATE "users" SET "deptId" = "dept" WHERE "deptId" IS NULL AND "dept" IS NOT NULL';
  END IF;
END $$;

-- Foreign key users.deptId -> departments.id (idempotent via DO block)
DO $$
BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_deptId_fkey"
    FOREIGN KEY ("deptId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Index for users.deptId (idempotent)
CREATE INDEX IF NOT EXISTS "users_deptId_idx" ON "users"("deptId");

-- Create audit_logs table (idempotent)
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

-- FK audit_logs.userId -> users.id (idempotent via DO block)
DO $$
BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for audit logs (idempotent)
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");




-- Add meeting room equipment columns (idempotent)
ALTER TABLE "meeting_rooms"
ADD COLUMN IF NOT EXISTS "hasMonitor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "meeting_rooms"
ADD COLUMN IF NOT EXISTS "hasProjector" BOOLEAN NOT NULL DEFAULT false;

-- Create recurring reservations table (idempotent)
CREATE TABLE IF NOT EXISTS "recurring_reservations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "weekDays" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recurring_reservations_pkey" PRIMARY KEY ("id")
);

-- Add recurringId to reservations (idempotent)
ALTER TABLE "reservations"
ADD COLUMN IF NOT EXISTS "recurringId" TEXT;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "reservations_recurringId_idx" ON "reservations"("recurringId");

CREATE INDEX IF NOT EXISTS "recurring_reservations_userId_idx" ON "recurring_reservations"("userId");
CREATE INDEX IF NOT EXISTS "recurring_reservations_roomId_idx" ON "recurring_reservations"("roomId");

-- Foreign keys (idempotent via DO block)
DO $$
BEGIN
  ALTER TABLE "recurring_reservations"
    ADD CONSTRAINT "recurring_reservations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "recurring_reservations"
    ADD CONSTRAINT "recurring_reservations_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "meeting_rooms"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "reservations"
    ADD CONSTRAINT "reservations_recurringId_fkey"
    FOREIGN KEY ("recurringId") REFERENCES "recurring_reservations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;





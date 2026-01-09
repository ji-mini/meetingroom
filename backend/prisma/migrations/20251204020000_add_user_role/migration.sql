-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Update existing users to ADMIN if they are 홍길동 (E123456) in development
-- This will be handled by application logic, but we set default to USER



































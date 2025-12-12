-- UserRole enum 생성
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- users 테이블에 role 컬럼 추가 (기본값: USER)
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- 홍길동(E123456)에게 관리자 권한 부여
UPDATE "users" 
SET "role" = 'ADMIN' 
WHERE "employee_id" = 'E123456';













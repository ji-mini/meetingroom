-- Drop legacy users.company column (idempotent)
-- Company information should be derived via users.deptId -> departments.companyName/companyCode.
ALTER TABLE "users"
DROP COLUMN IF EXISTS "company";




-- Drop legacy users.dept column (idempotent)
-- We use deptId + departments relation going forward.
ALTER TABLE "users"
DROP COLUMN IF EXISTS "dept";




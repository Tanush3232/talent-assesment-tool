-- AlterTable: Add nullable managerName and function columns safely
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managerName" TEXT,
ADD COLUMN IF NOT EXISTS "function" TEXT;

-- Backfill managerName for existing rows from User (matching id or email), falling back to managerEmail
UPDATE "Employee" e
SET "managerName" = COALESCE(
  (
    SELECT u."name"
    FROM "User" u
    WHERE u."id" = e."managerId"
       OR LOWER(u."email") = LOWER(e."managerEmail")
    LIMIT 1
  ),
  e."managerEmail"
)
WHERE e."managerName" IS NULL;

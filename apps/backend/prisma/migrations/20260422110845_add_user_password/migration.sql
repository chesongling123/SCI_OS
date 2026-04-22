/*
  Warnings:

  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add nullable column first
ALTER TABLE "users" ADD COLUMN "password" TEXT;

-- Step 2: Set default password for existing users (bcrypt hash of 'password123')
UPDATE "users" SET "password" = '$2b$10$cFhE6/.sYggl3eB5nbCEGeUIvlvO4K3BB4u96GZEMzQierFjq9YwG' WHERE "password" IS NULL;

-- Step 3: Make it NOT NULL
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;

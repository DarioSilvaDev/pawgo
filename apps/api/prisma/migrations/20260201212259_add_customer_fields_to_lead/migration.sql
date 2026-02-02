-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastName" TEXT,
ADD COLUMN IF NOT EXISTS "dni" TEXT,
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

CREATE INDEX "leads_email_idx" ON "leads"("email");
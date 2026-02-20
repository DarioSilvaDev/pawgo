/*
  Warnings:

  - The `codeType` column on the `discount_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DiscountCodeType" AS ENUM ('influencer', 'lead_reservation');

-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "commissionType" "DiscountType",
ADD COLUMN     "commissionValue" DECIMAL(10,2),
DROP COLUMN "codeType",
ADD COLUMN     "codeType" "DiscountCodeType" NOT NULL DEFAULT 'influencer';

-- Eliminar constraint de email único en leads
ALTER TABLE "leads" DROP CONSTRAINT "leads_email_key";

-- CreateIndex
CREATE INDEX "discount_codes_codeType_idx" ON "discount_codes"("codeType");

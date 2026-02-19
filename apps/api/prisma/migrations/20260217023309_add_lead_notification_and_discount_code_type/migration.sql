/*
  Warnings:

  - A unique constraint covering the columns `[reservationDiscountCodeId]` on the table `leads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "discount_codes" ADD COLUMN     "codeType" TEXT NOT NULL DEFAULT 'influencer',
ALTER COLUMN "influencerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "notificationSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "reservationDiscountCodeId" TEXT;

-- CreateIndex
CREATE INDEX "discount_codes_codeType_idx" ON "discount_codes"("codeType");

-- CreateIndex
CREATE UNIQUE INDEX "leads_reservationDiscountCodeId_key" ON "leads"("reservationDiscountCodeId");

-- CreateIndex
CREATE INDEX "leads_notifiedAt_idx" ON "leads"("notifiedAt");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_reservationDiscountCodeId_fkey" FOREIGN KEY ("reservationDiscountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

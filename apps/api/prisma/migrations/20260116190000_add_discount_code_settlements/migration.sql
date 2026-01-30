-- CreateTable
CREATE TABLE "discount_code_settlements" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "commissionsCount" INTEGER NOT NULL DEFAULT 0,
    "influencerPaymentId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_code_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_code_settlements_discountCodeId_key" ON "discount_code_settlements"("discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_code_settlements_influencerPaymentId_key" ON "discount_code_settlements"("influencerPaymentId");

-- CreateIndex
CREATE INDEX "discount_code_settlements_influencerId_idx" ON "discount_code_settlements"("influencerId");

-- CreateIndex
CREATE INDEX "discount_code_settlements_processedAt_idx" ON "discount_code_settlements"("processedAt");

-- AddForeignKey
ALTER TABLE "discount_code_settlements" ADD CONSTRAINT "discount_code_settlements_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_code_settlements" ADD CONSTRAINT "discount_code_settlements_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_code_settlements" ADD CONSTRAINT "discount_code_settlements_influencerPaymentId_fkey" FOREIGN KEY ("influencerPaymentId") REFERENCES "influencer_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE "influencer_invoices" (
    "id" TEXT NOT NULL,
    "influencerPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "url" TEXT NOT NULL,
    "observation" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "uploadedByAuthId" TEXT NOT NULL,
    "statusChangedByAuthId" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "influencer_invoices_influencerPaymentId_idx" ON "influencer_invoices"("influencerPaymentId");

-- CreateIndex
CREATE INDEX "influencer_invoices_influencerPaymentId_enabled_idx" ON "influencer_invoices"("influencerPaymentId", "enabled");

-- CreateIndex
CREATE INDEX "influencer_invoices_status_idx" ON "influencer_invoices"("status");

-- CreateIndex
CREATE INDEX "influencer_invoices_uploadedByAuthId_idx" ON "influencer_invoices"("uploadedByAuthId");

-- CreateIndex
CREATE INDEX "influencer_invoices_statusChangedByAuthId_idx" ON "influencer_invoices"("statusChangedByAuthId");

-- AddForeignKey
ALTER TABLE "influencer_invoices" ADD CONSTRAINT "influencer_invoices_influencerPaymentId_fkey" FOREIGN KEY ("influencerPaymentId") REFERENCES "influencer_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_invoices" ADD CONSTRAINT "influencer_invoices_uploadedByAuthId_fkey" FOREIGN KEY ("uploadedByAuthId") REFERENCES "auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_invoices" ADD CONSTRAINT "influencer_invoices_statusChangedByAuthId_fkey" FOREIGN KEY ("statusChangedByAuthId") REFERENCES "auth"("id") ON DELETE SET NULL ON UPDATE CASCADE;


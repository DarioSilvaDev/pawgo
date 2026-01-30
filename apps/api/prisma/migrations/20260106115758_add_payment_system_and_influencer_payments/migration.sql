-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "influencerPaymentId" TEXT;

-- AlterTable
ALTER TABLE "influencers" ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "cvu" TEXT,
ADD COLUMN     "mercadopagoEmail" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shippingMethod" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'mercadopago';

-- CreateTable
CREATE TABLE "influencer_payments" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "commissionIds" TEXT[],
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accountNumber" TEXT,
    "cvu" TEXT,
    "bankName" TEXT,
    "mercadopagoEmail" TEXT,
    "invoiceUrl" TEXT,
    "paymentProofUrl" TEXT,
    "contentLinks" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceUploadedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "influencer_payments_influencerId_idx" ON "influencer_payments"("influencerId");

-- CreateIndex
CREATE INDEX "influencer_payments_status_idx" ON "influencer_payments"("status");

-- CreateIndex
CREATE INDEX "commissions_influencerPaymentId_idx" ON "commissions"("influencerPaymentId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "payments_mercadoPagoPaymentId_idx" ON "payments"("mercadoPagoPaymentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_influencerPaymentId_fkey" FOREIGN KEY ("influencerPaymentId") REFERENCES "influencer_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_payments" ADD CONSTRAINT "influencer_payments_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

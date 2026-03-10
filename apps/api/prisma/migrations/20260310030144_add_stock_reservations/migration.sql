-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "desiredQuantity" INTEGER NOT NULL DEFAULT 1,
    "notifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_reservations_variantId_idx" ON "stock_reservations"("variantId");

-- CreateIndex
CREATE INDEX "stock_reservations_leadId_idx" ON "stock_reservations"("leadId");

-- CreateIndex
CREATE INDEX "stock_reservations_notifiedAt_idx" ON "stock_reservations"("notifiedAt");

-- CreateIndex
CREATE INDEX "stock_reservations_createdAt_idx" ON "stock_reservations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_leadId_variantId_notifiedAt_key" ON "stock_reservations"("leadId", "variantId", "notifiedAt");

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

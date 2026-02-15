-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "miCorreoCustomerId" TEXT,
ADD COLUMN     "miCorreoDeliveryType" TEXT,
ADD COLUMN     "miCorreoProductType" TEXT,
ADD COLUMN     "miCorreoShippingCost" DECIMAL(10,2),
ADD COLUMN     "miCorreoShippingQuote" JSONB,
ADD COLUMN     "miCorreoTrackingNumber" TEXT,
ADD COLUMN     "shippingSubsidyAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "shipping_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "city" TEXT,
    "postalCode" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalShippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageShippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSubsidyAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "homeDeliveryCount" INTEGER NOT NULL DEFAULT 0,
    "branchDeliveryCount" INTEGER NOT NULL DEFAULT 0,
    "avgDeliveryTimeMin" INTEGER,
    "avgDeliveryTimeMax" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipping_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_analytics_date_idx" ON "shipping_analytics"("date");

-- CreateIndex
CREATE INDEX "shipping_analytics_provinceCode_idx" ON "shipping_analytics"("provinceCode");

-- CreateIndex
CREATE INDEX "shipping_analytics_postalCode_idx" ON "shipping_analytics"("postalCode");

-- CreateIndex
CREATE INDEX "shipping_analytics_createdAt_idx" ON "shipping_analytics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_analytics_date_postalCode_key" ON "shipping_analytics"("date", "postalCode");

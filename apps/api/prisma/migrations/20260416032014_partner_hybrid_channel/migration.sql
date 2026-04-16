-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('home_delivery', 'pickup_point');

-- CreateEnum
CREATE TYPE "PartnerReferralSourceType" AS ENUM ('local_qr', 'local_code');

-- CreateEnum
CREATE TYPE "PartnerCommissionStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "PickupRequestStatus" AS ENUM ('awaiting_stock', 'ready_notified', 'cancelled');

-- CreateEnum
CREATE TYPE "PartnerInventoryMovementType" AS ENUM ('inbound_wholesale', 'outbound_sale', 'adjustment');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'home_delivery',
ADD COLUMN     "pickupPointId" TEXT;

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_points" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "address" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_referral_sources" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerPointId" TEXT,
    "sourceType" "PartnerReferralSourceType" NOT NULL DEFAULT 'local_qr',
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "landingTarget" TEXT NOT NULL DEFAULT 'checkout',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_referral_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_attributions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "referralSourceId" TEXT NOT NULL,
    "partnerPointId" TEXT,
    "attributionMethod" TEXT NOT NULL DEFAULT 'qr',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderAttributionId" TEXT,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "status" "PartnerCommissionStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_wholesale_sales" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "soldAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "totalProfit" DECIMAL(10,2) NOT NULL,
    "createdByAuthId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_wholesale_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_wholesale_sale_items" (
    "id" TEXT NOT NULL,
    "wholesaleSaleId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitWholesalePrice" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "totalProfit" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_wholesale_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_inventory_movements" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerPointId" TEXT,
    "wholesaleSaleId" TEXT,
    "productVariantId" TEXT NOT NULL,
    "movementType" "PartnerInventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerPointId" TEXT NOT NULL,
    "status" "PickupRequestStatus" NOT NULL DEFAULT 'awaiting_stock',
    "readyAt" TIMESTAMPTZ(3),
    "notifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_slug_key" ON "partners"("slug");

-- CreateIndex
CREATE INDEX "partners_isActive_idx" ON "partners"("isActive");

-- CreateIndex
CREATE INDEX "partners_createdAt_idx" ON "partners"("createdAt");

-- CreateIndex
CREATE INDEX "partner_points_partnerId_idx" ON "partner_points"("partnerId");

-- CreateIndex
CREATE INDEX "partner_points_isActive_idx" ON "partner_points"("isActive");

-- CreateIndex
CREATE INDEX "partner_points_pickupEnabled_idx" ON "partner_points"("pickupEnabled");

-- CreateIndex
CREATE INDEX "partner_points_createdAt_idx" ON "partner_points"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_referral_sources_slug_key" ON "partner_referral_sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "partner_referral_sources_code_key" ON "partner_referral_sources"("code");

-- CreateIndex
CREATE INDEX "partner_referral_sources_partnerId_idx" ON "partner_referral_sources"("partnerId");

-- CreateIndex
CREATE INDEX "partner_referral_sources_partnerPointId_idx" ON "partner_referral_sources"("partnerPointId");

-- CreateIndex
CREATE INDEX "partner_referral_sources_isActive_idx" ON "partner_referral_sources"("isActive");

-- CreateIndex
CREATE INDEX "partner_referral_sources_sourceType_idx" ON "partner_referral_sources"("sourceType");

-- CreateIndex
CREATE INDEX "partner_referral_sources_createdAt_idx" ON "partner_referral_sources"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_attributions_orderId_key" ON "order_attributions"("orderId");

-- CreateIndex
CREATE INDEX "order_attributions_partnerId_idx" ON "order_attributions"("partnerId");

-- CreateIndex
CREATE INDEX "order_attributions_referralSourceId_idx" ON "order_attributions"("referralSourceId");

-- CreateIndex
CREATE INDEX "order_attributions_partnerPointId_idx" ON "order_attributions"("partnerPointId");

-- CreateIndex
CREATE INDEX "order_attributions_createdAt_idx" ON "order_attributions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commissions_orderId_key" ON "partner_commissions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commissions_orderAttributionId_key" ON "partner_commissions"("orderAttributionId");

-- CreateIndex
CREATE INDEX "partner_commissions_partnerId_idx" ON "partner_commissions"("partnerId");

-- CreateIndex
CREATE INDEX "partner_commissions_status_idx" ON "partner_commissions"("status");

-- CreateIndex
CREATE INDEX "partner_commissions_createdAt_idx" ON "partner_commissions"("createdAt");

-- CreateIndex
CREATE INDEX "partner_wholesale_sales_partnerId_idx" ON "partner_wholesale_sales"("partnerId");

-- CreateIndex
CREATE INDEX "partner_wholesale_sales_soldAt_idx" ON "partner_wholesale_sales"("soldAt");

-- CreateIndex
CREATE INDEX "partner_wholesale_sales_createdAt_idx" ON "partner_wholesale_sales"("createdAt");

-- CreateIndex
CREATE INDEX "partner_wholesale_sale_items_wholesaleSaleId_idx" ON "partner_wholesale_sale_items"("wholesaleSaleId");

-- CreateIndex
CREATE INDEX "partner_wholesale_sale_items_productVariantId_idx" ON "partner_wholesale_sale_items"("productVariantId");

-- CreateIndex
CREATE INDEX "partner_inventory_movements_partnerId_idx" ON "partner_inventory_movements"("partnerId");

-- CreateIndex
CREATE INDEX "partner_inventory_movements_partnerPointId_idx" ON "partner_inventory_movements"("partnerPointId");

-- CreateIndex
CREATE INDEX "partner_inventory_movements_wholesaleSaleId_idx" ON "partner_inventory_movements"("wholesaleSaleId");

-- CreateIndex
CREATE INDEX "partner_inventory_movements_productVariantId_idx" ON "partner_inventory_movements"("productVariantId");

-- CreateIndex
CREATE INDEX "partner_inventory_movements_occurredAt_idx" ON "partner_inventory_movements"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_requests_orderId_key" ON "pickup_requests"("orderId");

-- CreateIndex
CREATE INDEX "pickup_requests_partnerPointId_idx" ON "pickup_requests"("partnerPointId");

-- CreateIndex
CREATE INDEX "pickup_requests_status_idx" ON "pickup_requests"("status");

-- CreateIndex
CREATE INDEX "pickup_requests_createdAt_idx" ON "pickup_requests"("createdAt");

-- CreateIndex
CREATE INDEX "orders_pickupPointId_idx" ON "orders"("pickupPointId");

-- CreateIndex
CREATE INDEX "orders_fulfillmentType_idx" ON "orders"("fulfillmentType");

-- AddForeignKey
ALTER TABLE "partner_points" ADD CONSTRAINT "partner_points_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referral_sources" ADD CONSTRAINT "partner_referral_sources_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_referral_sources" ADD CONSTRAINT "partner_referral_sources_partnerPointId_fkey" FOREIGN KEY ("partnerPointId") REFERENCES "partner_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "partner_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_referralSourceId_fkey" FOREIGN KEY ("referralSourceId") REFERENCES "partner_referral_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_attributions" ADD CONSTRAINT "order_attributions_partnerPointId_fkey" FOREIGN KEY ("partnerPointId") REFERENCES "partner_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_orderAttributionId_fkey" FOREIGN KEY ("orderAttributionId") REFERENCES "order_attributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_wholesale_sales" ADD CONSTRAINT "partner_wholesale_sales_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_wholesale_sale_items" ADD CONSTRAINT "partner_wholesale_sale_items_wholesaleSaleId_fkey" FOREIGN KEY ("wholesaleSaleId") REFERENCES "partner_wholesale_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_wholesale_sale_items" ADD CONSTRAINT "partner_wholesale_sale_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_inventory_movements" ADD CONSTRAINT "partner_inventory_movements_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_inventory_movements" ADD CONSTRAINT "partner_inventory_movements_partnerPointId_fkey" FOREIGN KEY ("partnerPointId") REFERENCES "partner_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_inventory_movements" ADD CONSTRAINT "partner_inventory_movements_wholesaleSaleId_fkey" FOREIGN KEY ("wholesaleSaleId") REFERENCES "partner_wholesale_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_inventory_movements" ADD CONSTRAINT "partner_inventory_movements_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_partnerPointId_fkey" FOREIGN KEY ("partnerPointId") REFERENCES "partner_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

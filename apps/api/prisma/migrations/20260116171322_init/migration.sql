/*
  Warnings:

  - You are about to drop the column `otpBackupCodes` on the `auth` table. All the data in the column will be lost.
  - The `role` column on the `auth` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `orderTotal` on the `commissions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `discountAmount` on the `commissions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `commissionRate` on the `commissions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `commissionAmount` on the `commissions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `commissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `discountValue` on the `discount_codes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `minPurchase` on the `discount_codes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `influencer_invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `commissionIds` on the `influencer_payments` table. All the data in the column will be lost.
  - You are about to alter the column `totalAmount` on the `influencer_payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `influencer_payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `subtotal` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `discount` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `total` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `shippingCost` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `price` on the `product_variants` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `basePrice` on the `products` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - Changed the type of `discountType` on the `discount_codes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('admin', 'influencer', 'user');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'rejected', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "InfluencerPaymentStatus" AS ENUM ('pending', 'invoice_uploaded', 'invoice_rejected', 'approved', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "InfluencerInvoiceStatus" AS ENUM ('pending', 'uploaded', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "auth" DROP COLUMN "otpBackupCodes",
DROP COLUMN "role",
ADD COLUMN     "role" "AuthRole" NOT NULL DEFAULT 'user',
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "commissions" ALTER COLUMN "orderTotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "commissionAmount" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" "CommissionStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "discount_codes" DROP COLUMN "discountType",
ADD COLUMN     "discountType" "DiscountType" NOT NULL,
ALTER COLUMN "discountValue" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "minPurchase" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "influencer_invoices" DROP COLUMN "status",
ADD COLUMN     "status" "InfluencerInvoiceStatus" NOT NULL DEFAULT 'uploaded';

-- AlterTable
ALTER TABLE "influencer_payments" DROP COLUMN "commissionIds",
ADD COLUMN     "invoiceRejectedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceRejectionReason" TEXT,
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" "InfluencerPaymentStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "shippingCost" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "basePrice" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "otp_backup_codes" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productVariantId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_backup_codes_authId_idx" ON "otp_backup_codes"("authId");

-- CreateIndex
CREATE INDEX "otp_backup_codes_usedAt_idx" ON "otp_backup_codes"("usedAt");

-- CreateIndex
CREATE INDEX "otp_backup_codes_createdAt_idx" ON "otp_backup_codes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "otp_backup_codes_authId_codeHash_key" ON "otp_backup_codes"("authId", "codeHash");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_productVariantId_idx" ON "order_items"("productVariantId");

-- CreateIndex
CREATE INDEX "order_items_createdAt_idx" ON "order_items"("createdAt");

-- CreateIndex
CREATE INDEX "admins_createdAt_idx" ON "admins"("createdAt");

-- CreateIndex
CREATE INDEX "auth_createdAt_idx" ON "auth"("createdAt");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "commissions_createdAt_idx" ON "commissions"("createdAt");

-- CreateIndex
CREATE INDEX "discount_codes_createdAt_idx" ON "discount_codes"("createdAt");

-- CreateIndex
CREATE INDEX "event_counters_createdAt_idx" ON "event_counters"("createdAt");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE INDEX "influencer_invoices_status_idx" ON "influencer_invoices"("status");

-- CreateIndex
CREATE INDEX "influencer_invoices_createdAt_idx" ON "influencer_invoices"("createdAt");

-- CreateIndex
CREATE INDEX "influencer_payments_status_idx" ON "influencer_payments"("status");

-- CreateIndex
CREATE INDEX "influencer_payments_createdAt_idx" ON "influencer_payments"("createdAt");

-- CreateIndex
CREATE INDEX "influencers_createdAt_idx" ON "influencers"("createdAt");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "product_variants_createdAt_idx" ON "product_variants"("createdAt");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_createdAt_idx" ON "refresh_tokens"("createdAt");

-- AddForeignKey
ALTER TABLE "otp_backup_codes" ADD CONSTRAINT "otp_backup_codes_authId_fkey" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

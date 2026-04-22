-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('card', 'cash');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "cashPrice" DECIMAL(10,2);

-- Backfill existing products with launch cash value
UPDATE "products"
SET "cashPrice" = 68200
WHERE "cashPrice" IS NULL;

-- Enforce not null once data is backfilled
ALTER TABLE "products"
ALTER COLUMN "cashPrice" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_variants"
ADD COLUMN "cashPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'card',
ADD COLUMN "pricingBreakdown" JSONB;

-- AlterTable
ALTER TABLE "payments"
ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'card';

-- Replace unique constraint to support one payment attempt per order+method+paymentType
DROP INDEX "payments_orderId_paymentMethod_key";

CREATE UNIQUE INDEX "payments_orderId_paymentMethod_paymentType_key"
ON "payments"("orderId", "paymentMethod", "paymentType");

-- Additional indexes for filtering/reporting
CREATE INDEX "orders_paymentType_idx" ON "orders"("paymentType");
CREATE INDEX "payments_paymentType_idx" ON "payments"("paymentType");

/*
  Warnings:

  - The values [pending] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('not_created', 'label_created', 'in_transit', 'delivered', 'returned', 'lost');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('awaiting_payment', 'paid', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'refunded');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'awaiting_payment';
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'chargeback';

-- DropIndex
DROP INDEX "leads_email_key";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'awaiting_payment';

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'not_created',
    "trackingNumber" TEXT,
    "labelUrl" TEXT,
    "carrier" TEXT NOT NULL DEFAULT 'correo_argentino',
    "extOrderId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_event_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

-- CreateIndex
CREATE INDEX "order_event_logs_orderId_idx" ON "order_event_logs"("orderId");

-- CreateIndex
CREATE INDEX "order_event_logs_event_idx" ON "order_event_logs"("event");

-- CreateIndex
CREATE INDEX "order_event_logs_createdAt_idx" ON "order_event_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_idempotencyKey_key" ON "email_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_logs_idempotencyKey_idx" ON "email_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_logs_event_idx" ON "email_logs"("event");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_event_logs" ADD CONSTRAINT "order_event_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

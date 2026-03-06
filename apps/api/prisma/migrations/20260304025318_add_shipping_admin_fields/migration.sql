-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "notificationSentAt" TIMESTAMPTZ(3),
ADD COLUMN     "shippedAt" TIMESTAMPTZ(3),
ADD COLUMN     "shippedByAdminId" TEXT;

-- Drop legacy unique constraint by email to allow configurable multiple reviews
DROP INDEX IF EXISTS "reviews_email_key";

-- Allow reviews created via admin-enabled email without order
ALTER TABLE "reviews" ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "review_email_access" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "remainingReviews" INTEGER NOT NULL DEFAULT 0,
    "usedReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "enabledBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "review_email_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_email_access_email_key" ON "review_email_access"("email");

-- CreateIndex
CREATE INDEX "review_email_access_isActive_idx" ON "review_email_access"("isActive");

-- CreateIndex
CREATE INDEX "review_email_access_updatedAt_idx" ON "review_email_access"("updatedAt");

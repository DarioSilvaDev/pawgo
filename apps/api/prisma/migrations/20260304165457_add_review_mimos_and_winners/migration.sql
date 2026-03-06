-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "mimoCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "review_mimos" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "leadId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_mimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_monthly_winners" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "mimosCount" INTEGER NOT NULL,
    "couponCodeId" TEXT,
    "announcedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_monthly_winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_mimos_reviewId_idx" ON "review_mimos"("reviewId");

-- CreateIndex
CREATE INDEX "review_mimos_fingerprint_idx" ON "review_mimos"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "review_mimos_reviewId_leadId_key" ON "review_mimos"("reviewId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "review_mimos_reviewId_fingerprint_key" ON "review_mimos"("reviewId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "review_monthly_winners_couponCodeId_key" ON "review_monthly_winners"("couponCodeId");

-- CreateIndex
CREATE INDEX "review_monthly_winners_month_idx" ON "review_monthly_winners"("month");

-- CreateIndex
CREATE UNIQUE INDEX "review_monthly_winners_month_key" ON "review_monthly_winners"("month");

-- CreateIndex
CREATE INDEX "reviews_mimoCount_idx" ON "reviews"("mimoCount");

-- AddForeignKey
ALTER TABLE "review_mimos" ADD CONSTRAINT "review_mimos_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_mimos" ADD CONSTRAINT "review_mimos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_monthly_winners" ADD CONSTRAINT "review_monthly_winners_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_monthly_winners" ADD CONSTRAINT "review_monthly_winners_couponCodeId_fkey" FOREIGN KEY ("couponCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "micorreo_customers" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "phone" TEXT,
    "cellPhone" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "micorreo_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micorreo_rate_caches" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "miCorreoCustomerId" TEXT,
    "postalCodeOrigin" TEXT NOT NULL,
    "postalCodeDestination" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "rates" JSONB NOT NULL,
    "validTo" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micorreo_rate_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "micorreo_customers_leadId_key" ON "micorreo_customers"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "micorreo_customers_customerId_key" ON "micorreo_customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "micorreo_customers_email_key" ON "micorreo_customers"("email");

-- CreateIndex
CREATE INDEX "micorreo_customers_customerId_idx" ON "micorreo_customers"("customerId");

-- CreateIndex
CREATE INDEX "micorreo_customers_email_idx" ON "micorreo_customers"("email");

-- CreateIndex
CREATE INDEX "micorreo_customers_leadId_idx" ON "micorreo_customers"("leadId");

-- CreateIndex
CREATE INDEX "micorreo_customers_createdAt_idx" ON "micorreo_customers"("createdAt");

-- CreateIndex
CREATE INDEX "micorreo_rate_caches_customerId_idx" ON "micorreo_rate_caches"("customerId");

-- CreateIndex
CREATE INDEX "micorreo_rate_caches_miCorreoCustomerId_idx" ON "micorreo_rate_caches"("miCorreoCustomerId");

-- CreateIndex
CREATE INDEX "micorreo_rate_caches_validTo_idx" ON "micorreo_rate_caches"("validTo");

-- CreateIndex
CREATE INDEX "micorreo_rate_caches_postalCodeOrigin_postalCodeDestination_idx" ON "micorreo_rate_caches"("postalCodeOrigin", "postalCodeDestination");

-- CreateIndex
CREATE INDEX "micorreo_rate_caches_createdAt_idx" ON "micorreo_rate_caches"("createdAt");

-- AddForeignKey
ALTER TABLE "micorreo_customers" ADD CONSTRAINT "micorreo_customers_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micorreo_rate_caches" ADD CONSTRAINT "micorreo_rate_caches_miCorreoCustomerId_fkey" FOREIGN KEY ("miCorreoCustomerId") REFERENCES "micorreo_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

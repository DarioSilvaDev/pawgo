-- CreateTable
CREATE TABLE "event_counters" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_counters_type_idx" ON "event_counters"("type");

-- CreateIndex
CREATE INDEX "event_counters_date_idx" ON "event_counters"("date");

-- CreateIndex
CREATE INDEX "event_counters_type_date_idx" ON "event_counters"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "event_counters_type_date_key" ON "event_counters"("type", "date");

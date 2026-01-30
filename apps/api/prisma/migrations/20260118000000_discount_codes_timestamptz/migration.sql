-- Migrate discount_codes validity fields to timestamptz for unambiguous timezone handling.
-- Existing TIMESTAMP(3) values are interpreted as UTC instants.

ALTER TABLE "discount_codes"
  ALTER COLUMN "validFrom" TYPE TIMESTAMPTZ(3)
  USING ("validFrom" AT TIME ZONE 'UTC');

ALTER TABLE "discount_codes"
  ALTER COLUMN "validUntil" TYPE TIMESTAMPTZ(3)
  USING ("validUntil" AT TIME ZONE 'UTC');


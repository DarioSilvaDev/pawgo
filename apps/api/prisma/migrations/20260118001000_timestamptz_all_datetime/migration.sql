-- Standardize all DateTime columns to TIMESTAMPTZ(3) for consistent timezone semantics.
-- Assumption: existing TIMESTAMP(3) values represent UTC instants (typical with Prisma/JS Date).
-- NOTE: @db.Date columns (date-only) are not touched.

-- leads
ALTER TABLE "leads"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- auth
ALTER TABLE "auth"
  ALTER COLUMN "lockedUntil" TYPE TIMESTAMPTZ(3) USING ("lockedUntil" AT TIME ZONE 'UTC'),
  ALTER COLUMN "lastLoginAt" TYPE TIMESTAMPTZ(3) USING ("lastLoginAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "emailVerificationExpires" TYPE TIMESTAMPTZ(3) USING ("emailVerificationExpires" AT TIME ZONE 'UTC'),
  ALTER COLUMN "passwordResetExpires" TYPE TIMESTAMPTZ(3) USING ("passwordResetExpires" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- otp_backup_codes
ALTER TABLE "otp_backup_codes"
  ALTER COLUMN "usedAt" TYPE TIMESTAMPTZ(3) USING ("usedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC');

-- refresh_tokens
ALTER TABLE "refresh_tokens"
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING ("expiresAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "revokedAt" TYPE TIMESTAMPTZ(3) USING ("revokedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC');

-- admins
ALTER TABLE "admins"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- events
ALTER TABLE "events"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC');

-- event_counters (date column is @db.Date and is NOT changed)
ALTER TABLE "event_counters"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- products
ALTER TABLE "products"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- product_variants
ALTER TABLE "product_variants"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- influencers
ALTER TABLE "influencers"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- discount_codes (validFrom/validUntil are migrated in a dedicated migration)
ALTER TABLE "discount_codes"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- discount_code_settlements
ALTER TABLE "discount_code_settlements"
  ALTER COLUMN "processedAt" TYPE TIMESTAMPTZ(3) USING ("processedAt" AT TIME ZONE 'UTC');

-- orders
ALTER TABLE "orders"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- order_items
ALTER TABLE "order_items"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- payments
ALTER TABLE "payments"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- commissions
ALTER TABLE "commissions"
  ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ(3) USING ("paidAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- influencer_payments
ALTER TABLE "influencer_payments"
  ALTER COLUMN "requestedAt" TYPE TIMESTAMPTZ(3) USING ("requestedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "invoiceUploadedAt" TYPE TIMESTAMPTZ(3) USING ("invoiceUploadedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "invoiceRejectedAt" TYPE TIMESTAMPTZ(3) USING ("invoiceRejectedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "approvedAt" TYPE TIMESTAMPTZ(3) USING ("approvedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ(3) USING ("paidAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "cancelledAt" TYPE TIMESTAMPTZ(3) USING ("cancelledAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- influencer_invoices
ALTER TABLE "influencer_invoices"
  ALTER COLUMN "statusChangedAt" TYPE TIMESTAMPTZ(3) USING ("statusChangedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');


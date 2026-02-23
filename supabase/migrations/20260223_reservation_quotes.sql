-- ─── Reservation Quotes Migration ─────────────────────────────────────────────
-- Date: 2026-02-23
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE core_reservations
ADD COLUMN IF NOT EXISTS quoted_total numeric,
ADD COLUMN IF NOT EXISTS quoted_currency text DEFAULT 'CLP',
ADD COLUMN IF NOT EXISTS quoted_nights integer;

COMMENT ON COLUMN core_reservations.quoted_total IS 'The total price quoted to the guest at the time of inquiry.';
COMMENT ON COLUMN core_reservations.quoted_currency IS 'The currency of the quoted price.';
COMMENT ON COLUMN core_reservations.quoted_nights IS 'The number of nights the quote covers.';

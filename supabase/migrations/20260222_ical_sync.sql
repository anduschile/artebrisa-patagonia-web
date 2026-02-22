-- ─── iCal Sync Migration ─────────────────────────────────────────────────────
-- Safe / additive: uses IF NOT EXISTS guards everywhere.
-- Run in Supabase SQL Editor.
-- Date: 2026-02-22
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. core_external_calendars ───────────────────────────────────────────────
-- Ensure the table exists (it should already; this is a no-op if it does).
CREATE TABLE IF NOT EXISTS core_external_calendars (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    name        text,
    ics_url     text NOT NULL,
    is_active   boolean NOT NULL DEFAULT true
);

-- Add unit_id if not present (links calendar → specific unit)
ALTER TABLE core_external_calendars
    ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES core_units(id) ON DELETE SET NULL;

-- Add source label (e.g. 'airbnb', 'booking', 'custom')
ALTER TABLE core_external_calendars
    ADD COLUMN IF NOT EXISTS source text;

-- Add last_synced_at timestamp
ALTER TABLE core_external_calendars
    ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- ── 2. core_reservations — external columns for idempotence ──────────────────
ALTER TABLE core_reservations
    ADD COLUMN IF NOT EXISTS external_source text;          -- 'ical'

ALTER TABLE core_reservations
    ADD COLUMN IF NOT EXISTS external_uid text;             -- VEVENT UID from ICS

ALTER TABLE core_reservations
    ADD COLUMN IF NOT EXISTS external_calendar_id uuid
        REFERENCES core_external_calendars(id) ON DELETE SET NULL;

-- ── 3. Unique index — prevents duplicates across syncs ───────────────────────
-- Only one row per (source, uid, calendar) can exist.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_external_uid
    ON core_reservations (external_source, external_uid, external_calendar_id)
    WHERE external_source IS NOT NULL
      AND external_uid IS NOT NULL
      AND external_calendar_id IS NOT NULL;

-- ── 4. Ensure 'blocked' is a valid status ────────────────────────────────────
-- If status is a plain text column there is nothing to do.
-- If there is a CHECK constraint, update it to include 'blocked'.
-- This block is safe: it does nothing if there is no constraint named after
-- the common pattern.
DO $$
DECLARE
    constraint_name text;
    constraint_def  text;
BEGIN
    SELECT conname, pg_get_constraintdef(oid)
      INTO constraint_name, constraint_def
      FROM pg_constraint
     WHERE conrelid = 'core_reservations'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) LIKE '%status%'
     LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        -- Only patch if 'blocked' is not already in the constraint
        IF constraint_def NOT LIKE '%blocked%' THEN
            EXECUTE format(
                'ALTER TABLE core_reservations DROP CONSTRAINT %I',
                constraint_name
            );
            EXECUTE
                'ALTER TABLE core_reservations ADD CONSTRAINT '
                || constraint_name
                || ' CHECK (status IN (''inquiry'', ''confirmed'', ''cancelled'', ''blocked''))';
            RAISE NOTICE 'Updated status constraint to include ''blocked''';
        ELSE
            RAISE NOTICE 'Status constraint already includes ''blocked'' — no change';
        END IF;
    ELSE
        RAISE NOTICE 'No status CHECK constraint found — plain text column, no change needed';
    END IF;
END $$;

-- ── 5. Helpful comments ──────────────────────────────────────────────────────
COMMENT ON COLUMN core_reservations.external_source IS
    'Set to ''ical'' for records imported from iCal feeds. NULL for manual/web reservations.';

COMMENT ON COLUMN core_reservations.external_uid IS
    'The UID field from the VEVENT block in the ICS file. Used for idempotent upserts.';

COMMENT ON COLUMN core_reservations.external_calendar_id IS
    'FK to core_external_calendars. Identifies which calendar feed this block came from.';

COMMENT ON COLUMN core_external_calendars.unit_id IS
    'The unit whose availability this calendar controls. Required for active calendars.';

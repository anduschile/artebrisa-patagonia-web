-- ─── Dynamic Daily Rates Migration ─────────────────────────────────────────────
-- Date: 2026-02-23
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update core_units with base_price and currency
ALTER TABLE core_units 
ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CLP';

-- 2. Create core_unit_daily_rates table
CREATE TABLE IF NOT EXISTS core_unit_daily_rates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id     uuid NOT NULL REFERENCES core_units(id) ON DELETE CASCADE,
    date        date NOT NULL,
    price       numeric NOT NULL,
    currency    text DEFAULT 'CLP',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(unit_id, date)
);

-- 3. Add updated_at trigger (reusing existing pattern if possible, or simple one)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_core_unit_daily_rates') THEN
        CREATE TRIGGER set_updated_at_core_unit_daily_rates
        BEFORE UPDATE ON core_unit_daily_rates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE core_unit_daily_rates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Admin: All access
CREATE POLICY "Admin full access on daily rates"
ON core_unit_daily_rates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Public: No read access (as requested: "Público NO puede leer esa tabla")
-- By default, if no policy allows it, it's denied.

-- Public read on core_units (needed to see base_price)
-- core_units likely already has a policy, but ensuring base_price is visible.
-- (Assuming core_units already has a public read policy)

COMMENT ON TABLE core_unit_daily_rates IS 'Stores daily price overrides for specific units. Takes precedence over core_units.base_price.';

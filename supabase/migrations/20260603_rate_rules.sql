-- ─── Rate Rules Migration ────────────────────────────────────────────────────
-- Date: 2026-06-03
-- Adds: core_rate_rules table + base_price editing via update on core_units
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create core_rate_rules table
CREATE TABLE IF NOT EXISTS core_rate_rules (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    adj_type    text NOT NULL CHECK (adj_type IN ('percent', 'fixed')),
    adj_value   numeric NOT NULL,
    -- adj_value interpretation:
    --   percent → 15 means +15%, -10 means -10%
    --   fixed   → 5000 means +$5000 CLP, -3000 means -$3000 CLP
    date_from   date NOT NULL,
    date_to     date NOT NULL,
    unit_scope  text NOT NULL DEFAULT 'all'
                CHECK (unit_scope IN ('all', 'cabana', 'departamento', 'manual')),
    unit_ids    uuid[] NOT NULL DEFAULT '{}',
    -- unit_ids only used when unit_scope = 'manual'
    is_active   boolean NOT NULL DEFAULT true,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rate_rules_dates_check CHECK (date_to >= date_from)
);

-- 2. updated_at trigger (reuses function created in 20260223_dynamic_rates.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_core_rate_rules'
    ) THEN
        CREATE TRIGGER set_updated_at_core_rate_rules
        BEFORE UPDATE ON core_rate_rules
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE core_rate_rules ENABLE ROW LEVEL SECURITY;

-- 4. RLS policy — authenticated admins only (same pattern as core_unit_daily_rates)
CREATE POLICY "Admin full access on rate rules"
ON core_rate_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Index for date range queries
CREATE INDEX IF NOT EXISTS idx_rate_rules_dates
    ON core_rate_rules (date_from, date_to)
    WHERE is_active = true;

COMMENT ON TABLE core_rate_rules IS
    'Price adjustment rules applied on top of core_units.base_price. '
    'Overrides in core_unit_daily_rates take precedence over computed rule price.';

COMMENT ON COLUMN core_rate_rules.adj_value IS
    'For percent: percentage points (15 = +15%). For fixed: CLP amount (5000 = +$5000).';

COMMENT ON COLUMN core_rate_rules.unit_scope IS
    'all=all units, cabana=unit_type cabana, departamento=unit_type departamento, manual=unit_ids list.';

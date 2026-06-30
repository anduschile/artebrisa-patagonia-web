-- Add restrictive RLS policies to core_units and core_unit_daily_rates
-- Date: 2026-06-30
-- Purpose: Restrict price editing to admin@artebrisa.com only
-- Context: Both tables had problematic RLS:
--          1. core_units: RLS enabled but NO UPDATE policy -> UPDATE denied silently (error: null)
--          2. core_unit_daily_rates: RLS enabled with FOR ALL policy -> allows any authenticated user
--          This caused base_price edit bug and security issue (other users could edit prices).
-- Important: ReservationWidget.jsx needs to read core_unit_daily_rates as anon role for price
--            calculation, so SELECT must be allowed to anon.
-- =========================================================================

-- 1. DROP old overly-permissive policy on core_unit_daily_rates
--    (FOR ALL TO authenticated allows any authenticated user to write)
DROP POLICY IF EXISTS "Admin full access on daily rates" ON core_unit_daily_rates;

-- ========== CORE_UNITS POLICIES ==========

-- 2. Add UPDATE policy restricting to admin@artebrisa.com on core_units
CREATE POLICY "Admin only: UPDATE base_price"
ON core_units
FOR UPDATE
TO authenticated
USING (auth.email() = 'admin@artebrisa.com')
WITH CHECK (auth.email() = 'admin@artebrisa.com');

COMMENT ON POLICY "Admin only: UPDATE base_price" ON core_units IS
    'Restricts base_price updates to admin@artebrisa.com only. Prevents other users '
    'from shared auth.users table from editing prices of this project.';

-- ========== CORE_UNIT_DAILY_RATES POLICIES ==========

-- 3. SELECT policy for public (anon) read access
--    Needed for ReservationWidget.jsx to calculate prices for visitors
CREATE POLICY "Public read daily rates"
ON core_unit_daily_rates
FOR SELECT
TO anon
USING (true);

-- 4. SELECT policy for authenticated read access
CREATE POLICY "Authenticated read daily rates"
ON core_unit_daily_rates
FOR SELECT
TO authenticated
USING (true);

-- 5. INSERT policy restricting to admin@artebrisa.com only
CREATE POLICY "Admin only: INSERT daily rates"
ON core_unit_daily_rates
FOR INSERT
TO authenticated
WITH CHECK (auth.email() = 'admin@artebrisa.com');

-- 6. UPDATE policy restricting to admin@artebrisa.com only
CREATE POLICY "Admin only: UPDATE daily rates"
ON core_unit_daily_rates
FOR UPDATE
TO authenticated
USING (auth.email() = 'admin@artebrisa.com')
WITH CHECK (auth.email() = 'admin@artebrisa.com');

-- 7. DELETE policy restricting to admin@artebrisa.com only
CREATE POLICY "Admin only: DELETE daily rates"
ON core_unit_daily_rates
FOR DELETE
TO authenticated
USING (auth.email() = 'admin@artebrisa.com');

COMMENT ON POLICY "Public read daily rates" ON core_unit_daily_rates IS
    'Allows unauthenticated visitors to read daily rate overrides for price calculation.';

COMMENT ON POLICY "Authenticated read daily rates" ON core_unit_daily_rates IS
    'Allows authenticated users to read daily rate overrides.';

COMMENT ON POLICY "Admin only: INSERT daily rates" ON core_unit_daily_rates IS
    'Restricts daily rate override creation to admin@artebrisa.com only.';

COMMENT ON POLICY "Admin only: UPDATE daily rates" ON core_unit_daily_rates IS
    'Restricts daily rate override updates to admin@artebrisa.com only.';

COMMENT ON POLICY "Admin only: DELETE daily rates" ON core_unit_daily_rates IS
    'Restricts daily rate override deletion to admin@artebrisa.com only.';

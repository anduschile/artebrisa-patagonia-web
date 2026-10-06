-- ─── Test Payment Log Migration ────────────────────────────────────────────
-- Date: 2026-10-06
-- Purpose: tabla de log para /test-pago + supabase/functions/test-payment —
--          cobro real aislado con el Card Payment Brick para validar que una
--          tarjeta extranjera puede pagar en producción, sin tocar
--          core_reservations/core_guests ni disparar notify-reservation o el
--          email de Resend. Esta tabla es independiente y no bloquea
--          disponibilidad de ninguna unidad.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS test_payment_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at     timestamptz DEFAULT now(),
    payment_id     text,
    status         text,
    status_detail  text,
    amount         numeric,
    card_last_four text,
    raw_response   jsonb
);

COMMENT ON TABLE test_payment_log IS 'Log de cobros de prueba reales hechos via /test-pago + test-payment Edge Function. No esta relacionada con core_reservations.';

-- RLS: nadie publico puede leer ni escribir. La Edge Function escribe con la
-- service role key (bypassa RLS). Solo usuarios autenticados (panel /admin)
-- pueden leer, mismo patron que core_unit_daily_rates / core_rate_rules.
ALTER TABLE test_payment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on test payment log"
ON test_payment_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

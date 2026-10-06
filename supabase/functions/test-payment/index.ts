// ─── test-payment Edge Function ───────────────────────────────────────────
// Supabase Edge Function (Deno) — cobro de prueba real y aislado, Card Payment Brick
//
// POST /functions/v1/test-payment
//
// Cobra un monto fijo bajo (definido acá, no en el cliente) usando el token de
// un solo uso generado por el Card Payment Brick en la página /test-pago.
//
// A diferencia de process-payment, este flujo NO está atado a ninguna reserva:
// no lee ni escribe core_reservations ni core_guests, no llama a
// notify-reservation (WhatsApp a Karina) ni envía el email de confirmación por
// Resend. El resultado se guarda únicamente en test_payment_log.
//
// Variables de entorno requeridas (ya existen en el proyecto; esta función no
// crea secrets nuevos):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   MP_ACCESS_TOKEN — mismo secret de producción compartido con el resto del sitio
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_API_ENDPOINT = 'https://api.mercadopago.com/v1/payments'

// Monto fijo definido acá, en el backend — el cliente nunca lo envía ni puede
// manipularlo (ver CardPaymentForm en ReservationWidget.jsx, que sí envía el
// monto desde el cliente para una reserva real; acá se eligió lo contrario a
// propósito). CLP 1.500 queda por sobre el piso práctico reportado para pagos
// con tarjeta de crédito en Chile (~CLP 1.000 según fuentes de integradores,
// no documentado como mínimo oficial único en la API de Mercado Pago). Si MP
// rechaza el pago por motivo de monto, el 'cause' del error lo indica.
const TEST_AMOUNT_CLP = 1500

// Email fijo de uso interno — a propósito no se le pide email a quien prueba
// (la tarea pide no solicitar datos de huésped).
const TEST_PAYER_EMAIL = 'test-pago@artebrisapatagonia.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://artebrisapatagonia.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  // ── Parse request body ─────────────────────────────────────────────────
  let token: string
  let payment_method_id: string
  let issuer_id: number | null
  let installments: number
  let identification_type: string | null
  let identification_number: string | null

  try {
    const body = await req.json()
    token = body.token?.trim()
    payment_method_id = body.payment_method_id?.trim()
    issuer_id = body.issuer_id ? parseInt(body.issuer_id, 10) : null
    installments = parseInt(body.installments, 10) || 1
    identification_type = body.identification_type?.trim() || null
    identification_number = body.identification_number?.trim() || null

    if (!token || !payment_method_id) {
      return jsonError('Missing required fields: token, payment_method_id', 400)
    }

    if (installments < 1) {
      return jsonError('installments must be >= 1', 400)
    }
  } catch (e) {
    return jsonError('Invalid JSON', 400)
  }

  // ── Initialize Supabase client (solo para escribir test_payment_log) ───
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!mpAccessToken) {
    console.error('[TEST-PAYMENT] Missing MP_ACCESS_TOKEN')
    return jsonError('Server misconfiguration', 500)
  }

  // external_reference propio, con prefijo que lo distingue claramente de un
  // reservation_id real — no corresponde a ninguna fila de core_reservations.
  const externalReference = `test-payment-${crypto.randomUUID()}`
  const idempotencyKey = crypto.randomUUID()

  const paymentPayload: any = {
    transaction_amount: TEST_AMOUNT_CLP,
    token,
    description: 'Cobro de prueba Arte Brisa Patagonia (no asociado a una reserva)',
    installments,
    payment_method_id,
    payer: { email: TEST_PAYER_EMAIL },
    external_reference: externalReference,
    // Sin notification_url a propósito: este pago no tiene fila en
    // core_reservations, así que no necesitamos que MP notifique nada vía
    // IPN. Si la cuenta de MP tiene un webhook global configurado en el
    // panel (no por-request) que igual dispare confirm-payment, ese handler
    // no encontrará ninguna fila con este external_reference y no hará nada
    // (ver notas de la investigación previa).
  }

  if (identification_type && identification_number) {
    paymentPayload.payer.identification = {
      type: identification_type,
      number: identification_number,
    }
  }

  if (issuer_id !== null && !isNaN(issuer_id)) {
    paymentPayload.issuer_id = issuer_id
  }

  console.log(`[TEST-PAYMENT] Iniciando cobro de prueba: external_reference=${externalReference}, amount=${TEST_AMOUNT_CLP}`)

  // ── Call Mercado Pago API ───────────────────────────────────────────────
  let mpResponse: Response
  try {
    mpResponse = await fetch(MP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    })
  } catch (e) {
    console.error('[TEST-PAYMENT] Network error calling Mercado Pago:', e)
    return jsonError('Failed to connect to payment provider', 502)
  }

  const rawBodyText = await mpResponse.text()
  let responseData: any

  try {
    responseData = JSON.parse(rawBodyText)
  } catch (e) {
    console.error(`[TEST-PAYMENT] MP response parse error (status=${mpResponse.status}):`, rawBodyText)
    return jsonError('Invalid response from payment provider', 502)
  }

  if (!mpResponse.ok) {
    console.error(`[TEST-PAYMENT] Mercado Pago error (status=${mpResponse.status}):`, JSON.stringify(responseData))

    const { error: logErr } = await supabase.from('test_payment_log').insert({
      payment_id: responseData?.id ? String(responseData.id) : null,
      status: 'error',
      status_detail: responseData?.message || responseData?.cause?.[0]?.description || 'Unknown error',
      amount: TEST_AMOUNT_CLP,
      card_last_four: null,
      raw_response: responseData,
    })
    if (logErr) console.error('[TEST-PAYMENT] Failed to write test_payment_log (error case):', logErr)

    const detail = responseData?.message || responseData?.cause?.[0]?.description || 'Unknown error'
    return jsonError(`Payment provider error: ${detail}`, 502)
  }

  const paymentId = responseData.id
  const mpStatus = responseData.status
  const statusDetail = responseData.status_detail
  const cardLastFour = responseData.card?.last_four_digits ?? null

  if (!paymentId || !mpStatus) {
    console.error('[TEST-PAYMENT] Mercado Pago response missing id or status:', JSON.stringify(responseData))
    return jsonError('Invalid payment provider response', 502)
  }

  console.log(`[TEST-PAYMENT] Pago de prueba procesado: payment_id=${paymentId}, status=${mpStatus}, status_detail=${statusDetail}`)

  // ── Guardar resultado en el log aislado (no core_reservations) ─────────
  const { error: logErr } = await supabase.from('test_payment_log').insert({
    payment_id: String(paymentId),
    status: mpStatus,
    status_detail: statusDetail ?? null,
    amount: TEST_AMOUNT_CLP,
    card_last_four: cardLastFour,
    raw_response: responseData,
  })

  if (logErr) {
    console.error('[TEST-PAYMENT] Failed to write test_payment_log:', logErr)
  }

  return jsonOk({
    status: mpStatus,
    status_detail: statusDetail ?? null,
    payment_id: paymentId,
    amount: TEST_AMOUNT_CLP,
  })
})

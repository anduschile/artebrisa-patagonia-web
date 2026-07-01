// ─── create-payment Edge Function ─────────────────────────────────────────
// Supabase Edge Function (Deno) — Mercado Pago Checkout Pro integration
//
// POST /functions/v1/create-payment
//
// Inicia una transacción de pago en Mercado Pago.
// Recibe: { reservation_id, amount }
// Responde: { token, url, buy_order } o error
//
// Variables de entorno requeridas (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   MP_ACCESS_TOKEN
//   MP_RETURN_URL
//   MP_WEBHOOK_URL
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_API_ENDPOINT = 'https://api.mercadopago.com/checkout/preferences'

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405)
  }

  // ── Parse request body ─────────────────────────────────────────────────
  let reservation_id: string
  let amount: number

  try {
    const body = await req.json()
    reservation_id = body.reservation_id?.trim()
    amount = parseInt(body.amount, 10)

    if (!reservation_id || !amount || amount <= 0) {
      return jsonError('Invalid request: reservation_id and amount (positive integer) required', 400)
    }
  } catch (e) {
    return jsonError('Invalid JSON', 400)
  }

  // ── Initialize Supabase client ─────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // ── 1. Fetch reservation and verify status ──────────────────────────────
  const { data: reservation, error: fetchErr } = await supabase
    .from('core_reservations')
    .select('id, status, guest_id')
    .eq('id', reservation_id)
    .single()

  if (fetchErr || !reservation) {
    console.error('Reservation not found:', reservation_id, fetchErr)
    return jsonError('Reservation not found', 404)
  }

  if (reservation.status !== 'inquiry') {
    return jsonError(
      `Cannot create payment for reservation in status '${reservation.status}'. Must be 'inquiry'.`,
      409,
    )
  }

  // ── 2. Prepare Mercado Pago preference ──────────────────────────────────
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  const mpReturnUrl = Deno.env.get('MP_RETURN_URL') ?? 'https://artebrisapatagonia.com'
  const mpWebhookUrl = Deno.env.get('MP_WEBHOOK_URL')

  if (!mpAccessToken || !mpWebhookUrl) {
    console.error('Missing Mercado Pago configuration secrets')
    return jsonError('Server misconfiguration', 500)
  }

  const preferencePayload = {
    items: [
      {
        title: 'Seña reserva Arte Brisa Patagonia',
        quantity: 1,
        unit_price: amount,
        currency_id: 'CLP',
      },
    ],
    back_urls: {
      success: `${mpReturnUrl}/reserva/confirmar?status=paid`,
      failure: `${mpReturnUrl}/reserva/confirmar?status=failed`,
      pending: `${mpReturnUrl}/reserva/confirmar?status=pending`,
    },
    auto_return: 'approved',
    external_reference: reservation_id,
    notification_url: mpWebhookUrl,
  }

  console.log(`[CREATE-PAYMENT] Iniciando preferencia MP: reservation_id=${reservation_id}, amount=${amount}`)

  // ── 3. Call Mercado Pago API ───────────────────────────────────────────
  let mpResponse: Response
  try {
    mpResponse = await fetch(MP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    })
  } catch (e) {
    console.error('Network error calling Mercado Pago:', e)
    return jsonError('Failed to connect to payment provider', 502)
  }

  // ── 4. Handle Mercado Pago response ────────────────────────────────────
  const statusCode = mpResponse.status
  let responseData: any

  try {
    responseData = await mpResponse.json()
  } catch (e) {
    console.error('Mercado Pago response parse error (status=' + statusCode + '):', e)
    return jsonError('Invalid response from payment provider', 502)
  }

  if (!mpResponse.ok) {
    console.error(`Mercado Pago error (status=${statusCode}):`, JSON.stringify(responseData))
    const detail = responseData?.message || responseData?.cause?.[0]?.description || 'Unknown error'
    return jsonError(`Payment provider error: ${detail}`, 502)
  }

  const preferenceId = responseData.id
  const initPoint = responseData.init_point

  if (!preferenceId || !initPoint) {
    console.error('Mercado Pago response missing id or init_point:', JSON.stringify(responseData))
    return jsonError('Invalid payment provider response', 502)
  }

  // ── 5. Update reservation with payment info ────────────────────────────
  const { error: updateErr } = await supabase
    .from('core_reservations')
    .update({
      payment_id: preferenceId,
      payment_url: initPoint,
      payment_buy_order: preferenceId,
      payment_created_at: new Date().toISOString(),
    })
    .eq('id', reservation_id)

  if (updateErr) {
    console.error('Failed to update reservation:', reservation_id, updateErr)
    // NOTA: La preferencia ya fue creada en MP. No podemos deshacerla.
    // El cliente debe usar el init_point aunque la BD falle (y se recuperará en el paso de confirmación).
    console.warn('Returning init_point to client despite DB error — may need manual reconciliation')
  }

  console.log(`[CREATE-PAYMENT] Preferencia creada exitosamente: reservation_id=${reservation_id}, preference_id=${preferenceId}`)

  return jsonOk({
    token: preferenceId,
    url: initPoint,
    buy_order: preferenceId,
  })
})

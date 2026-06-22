// ─── create-payment Edge Function ─────────────────────────────────────────
// Supabase Edge Function (Deno) — Webpay Plus integration (integration environment)
//
// POST /functions/v1/create-payment
//
// Inicia una transacción de pago en Webpay Plus (Transbank).
// Recibe: { reservation_id, amount }
// Responde: { token, url } o error
//
// Variables de entorno requeridas (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   TRANSBANK_API_KEY_ID
//   TRANSBANK_API_KEY_SECRET
//   TRANSBANK_RETURN_URL
//   TRANSBANK_ENVIRONMENT (integration | production)
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRANSBANK_ENDPOINTS = {
  integration: 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
  production: 'https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
}

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

/** Genera un buy_order único de máximo 26 caracteres */
function generateBuyOrder(reservationId: string): string {
  // Transbank requiere máximo 26 caracteres
  // Usa los últimos 20 caracteres del UUID + timestamp de milisegundos (mod 1000000)
  const now = Date.now() % 1000000
  const suffix = reservationId.slice(-10)
  return `${now}${suffix}`.substring(0, 26)
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

  // ── 2. Generate Webpay transaction parameters ───────────────────────────
  const buyOrder = generateBuyOrder(reservation_id)
  const sessionId = reservation_id

  // ── 3. Call Transbank API ──────────────────────────────────────────────
  const apiKeyId = Deno.env.get('TRANSBANK_API_KEY_ID')
  const apiKeySecret = Deno.env.get('TRANSBANK_API_KEY_SECRET')
  const returnUrl = Deno.env.get('TRANSBANK_RETURN_URL')
  const environment = Deno.env.get('TRANSBANK_ENVIRONMENT') ?? 'integration'

  if (!apiKeyId || !apiKeySecret || !returnUrl) {
    console.error('Missing Transbank configuration secrets')
    return jsonError('Server misconfiguration', 500)
  }

  const endpoint = TRANSBANK_ENDPOINTS[environment as keyof typeof TRANSBANK_ENDPOINTS]
  if (!endpoint) {
    console.error('Invalid TRANSBANK_ENVIRONMENT:', environment)
    return jsonError('Server misconfiguration', 500)
  }

  const transactionPayload = {
    buy_order: buyOrder,
    session_id: sessionId,
    amount: amount,
    return_url: returnUrl,
  }

  console.log(`[CREATE-PAYMENT] Iniciando transacción: buy_order=${buyOrder}, amount=${amount}, reservation_id=${reservation_id}`)

  let transResponse: Response
  try {
    transResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Tbk-Api-Key-Id': apiKeyId,
        'Tbk-Api-Key-Secret': apiKeySecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionPayload),
    })
  } catch (e) {
    console.error('Network error calling Transbank:', e)
    return jsonError('Failed to connect to payment provider', 502)
  }

  // ── 4. Handle Transbank response ───────────────────────────────────────
  const statusCode = transResponse.status
  let responseData: any

  try {
    responseData = await transResponse.json()
  } catch (e) {
    console.error('Transbank response parse error (status=' + statusCode + '):', e)
    return jsonError('Invalid response from payment provider', 502)
  }

  if (!transResponse.ok) {
    console.error(`Transbank error (status=${statusCode}):`, JSON.stringify(responseData))
    const detail = responseData?.detail || responseData?.message || 'Unknown error'
    return jsonError(`Payment provider error: ${detail}`, 502)
  }

  const token = responseData.token
  const url = responseData.url

  if (!token || !url) {
    console.error('Transbank response missing token or url:', JSON.stringify(responseData))
    return jsonError('Invalid payment provider response', 502)
  }

  // ── 5. Update reservation with payment info ────────────────────────────
  const { error: updateErr } = await supabase
    .from('core_reservations')
    .update({
      payment_id: token,
      payment_url: url,
      payment_buy_order: buyOrder,
      payment_created_at: new Date().toISOString(),
    })
    .eq('id', reservation_id)

  if (updateErr) {
    console.error('Failed to update reservation:', reservation_id, updateErr)
    // NOTA: La transacción ya fue iniciada en Transbank. No podemos deshacerla.
    // El cliente debe usar el token/url aunque la BD falle (y se recuperará en el paso de confirmación).
    console.warn('Returning token/url to client despite DB error — may need manual reconciliation')
  }

  console.log(`[CREATE-PAYMENT] Transacción iniciada exitosamente: reservation_id=${reservation_id}, token=${token}`)

  return jsonOk({
    token,
    url,
    buy_order: buyOrder,
  })
})

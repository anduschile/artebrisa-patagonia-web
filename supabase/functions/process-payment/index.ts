// ─── process-payment Edge Function ────────────────────────────────────────
// Supabase Edge Function (Deno) — Mercado Pago Card Payment Brick integration
//
// POST /functions/v1/process-payment
//
// Procesa un pago con tarjeta (token generado por Card Payment Brick).
// Recibe: {reservation_id, token, payment_method_id, issuer_id, installments, payer_email, identification_type, identification_number}
// Responde: {status: "approved"|"pending"|"rejected"|"unknown", payment_id, amount} o error
//
// Variables de entorno requeridas (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   MP_ACCESS_TOKEN
//   MP_WEBHOOK_URL
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_API_ENDPOINT = 'https://api.mercadopago.com/v1/payments'

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
  let reservation_id: string
  let token: string
  let payment_method_id: string
  let issuer_id: number | null
  let installments: number
  let payer_email: string
  let identification_type: string
  let identification_number: string

  try {
    const body = await req.json()
    reservation_id = body.reservation_id?.trim()
    token = body.token?.trim()
    payment_method_id = body.payment_method_id?.trim()
    issuer_id = body.issuer_id ? parseInt(body.issuer_id, 10) : null
    installments = parseInt(body.installments, 10) || 1
    payer_email = body.payer_email?.trim()
    identification_type = body.identification_type?.trim()
    identification_number = body.identification_number?.trim()

    if (!reservation_id || !token || !payment_method_id || !payer_email || !identification_type || !identification_number) {
      return jsonError('Missing required fields: reservation_id, token, payment_method_id, payer_email, identification_type, identification_number', 400)
    }

    if (installments < 1) {
      return jsonError('installments must be >= 1', 400)
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
    .select('id, status, unit_id, check_in')
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

  // ── 2. Get price of first night ─────────────────────────────────────────
  let priceFirstNight: number

  try {
    // Try to fetch daily rate override for check_in date
    const { data: dailyRate, error: rateErr } = await supabase
      .from('core_unit_daily_rates')
      .select('price')
      .eq('unit_id', reservation.unit_id)
      .eq('date', reservation.check_in)
      .maybeSingle()

    if (rateErr) {
      console.warn('Error fetching daily rate:', rateErr)
      priceFirstNight = 0
    } else if (dailyRate?.price) {
      priceFirstNight = dailyRate.price
    } else {
      // Fallback to base_price from unit
      const { data: unit, error: unitErr } = await supabase
        .from('core_units')
        .select('base_price')
        .eq('id', reservation.unit_id)
        .single()

      if (unitErr || !unit) {
        console.error('Unit not found:', reservation.unit_id, unitErr)
        return jsonError('Unit not found', 404)
      }

      priceFirstNight = unit.base_price || 0
    }

    if (priceFirstNight <= 0) {
      return jsonError('Unable to determine payment amount', 400)
    }
  } catch (e) {
    console.error('Error fetching price:', e)
    return jsonError('Error calculating payment amount', 500)
  }

  // ── 3. Prepare Mercado Pago payment payload ────────────────────────────
  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  const mpWebhookUrl = Deno.env.get('MP_WEBHOOK_URL')

  if (!mpAccessToken || !mpWebhookUrl) {
    console.error('Missing Mercado Pago configuration secrets')
    return jsonError('Server misconfiguration', 500)
  }

  const paymentPayload: any = {
    transaction_amount: priceFirstNight,
    token: token,
    description: 'Seña reserva Arte Brisa Patagonia',
    installments: installments,
    payment_method_id: payment_method_id,
    payer: {
      email: payer_email,
      identification: {
        type: identification_type,
        number: identification_number,
      },
    },
    external_reference: reservation_id,
    notification_url: mpWebhookUrl,
  }

  // Only add issuer_id if provided
  if (issuer_id !== null && !isNaN(issuer_id)) {
    paymentPayload.issuer_id = issuer_id
  }

  console.log(`[PROCESS-PAYMENT] Iniciando pago: reservation_id=${reservation_id}, amount=${priceFirstNight}`)

  // ── 4. Call Mercado Pago API ───────────────────────────────────────────
  let mpResponse: Response
  try {
    mpResponse = await fetch(MP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'X-Idempotency-Key': reservation_id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    })
  } catch (e) {
    console.error('Network error calling Mercado Pago:', e)
    return jsonError('Failed to connect to payment provider', 502)
  }

  // ── 5. Handle Mercado Pago response ────────────────────────────────────
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

  const paymentId = responseData.id
  const mpStatus = responseData.status

  if (!paymentId || !mpStatus) {
    console.error('Mercado Pago response missing id or status:', JSON.stringify(responseData))
    return jsonError('Invalid payment provider response', 502)
  }

  // ── 6. Map Mercado Pago status to our database schema ──────────────────
  let dbStatus: string
  let paymentStatus: string

  if (mpStatus === 'approved') {
    dbStatus = 'confirmed'
    paymentStatus = 'paid'
  } else if (mpStatus === 'in_process' || mpStatus === 'pending') {
    dbStatus = 'inquiry'
    paymentStatus = 'pending'
  } else if (mpStatus === 'rejected') {
    dbStatus = 'inquiry'
    paymentStatus = 'failed'
  } else {
    dbStatus = 'inquiry'
    paymentStatus = 'unknown'
  }

  // ── 7. Update reservation with payment info ────────────────────────────
  const updatePayload: any = {
    status: dbStatus,
    payment_status: paymentStatus,
    payment_method: 'mercadopago',
    payment_id: paymentId,
  }

  if (paymentStatus === 'paid') {
    updatePayload.paid_amount = priceFirstNight
  }

  const { error: updateErr } = await supabase
    .from('core_reservations')
    .update(updatePayload)
    .eq('id', reservation_id)

  if (updateErr) {
    console.error('Failed to update reservation:', reservation_id, updateErr)
    // Still return success to client because the payment was processed
    console.warn('Returning payment result to client despite DB error — may need manual reconciliation')
  }

  console.log(`[PROCESS-PAYMENT] Pago procesado: reservation_id=${reservation_id}, payment_id=${paymentId}, status=${mpStatus}`)

  return jsonOk({
    status: mpStatus === 'approved' ? 'approved' : mpStatus === 'in_process' || mpStatus === 'pending' ? 'pending' : mpStatus === 'rejected' ? 'rejected' : 'unknown',
    payment_id: paymentId,
    amount: priceFirstNight,
  })
})

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
//   RESEND_API_KEY
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

function formatCLP(amount: number | null): string {
  if (amount == null) return 'No disponible'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getAddressByUnitCode(unitCode: string | null): string {
  if (!unitCode) return 'Clodomiro Rosas 164D'
  if (unitCode.startsWith('CAB-') || unitCode.startsWith('TINY-')) {
    return 'Clodomiro Rosas 164D'
  } else if (unitCode.startsWith('DEP-')) {
    return 'Guacolda 1615'
  }
  return 'Clodomiro Rosas 164D'
}

async function sendGuestConfirmationEmail(
  supabase: any,
  reservationId: string,
  payerEmail: string,
  paidAmount: number,
) {
  try {
    const { data: reservation, error: fetchErr } = await supabase
      .from('core_reservations')
      .select(`
        id, check_in, check_out, status,
        core_units ( code, name ),
        core_guests ( full_name )
      `)
      .eq('id', reservationId)
      .single()

    if (fetchErr || !reservation) {
      console.error(`[GUEST-EMAIL] Failed to fetch reservation ${reservationId}:`, fetchErr)
      return
    }

    const unit = Array.isArray(reservation.core_units) ? reservation.core_units[0] : reservation.core_units
    const guest = Array.isArray(reservation.core_guests) ? reservation.core_guests[0] : reservation.core_guests

    const unitName = unit?.name ?? 'Unidad'
    const unitCode = unit?.code ?? ''
    const guestName = guest?.full_name ?? 'Huésped'
    const address = getAddressByUnitCode(unitCode)
    const amountFormatted = formatCLP(paidAmount)

    const sender = 'Arte Brisa Patagonia <reservas@artebrisapatagonia.com>'
    const subject = `Confirmación de pago — Reserva ${reservationId}`

    const html = `
<div style="font-family: Arial, sans-serif; color: #222; max-width: 560px;">
  <h2 style="margin:0 0 16px;">¡Pago confirmado!</h2>
  <p style="margin:0 0 16px;">Hola ${escapeHtml(guestName)},</p>
  <p style="margin:0 0 16px;">Tu pago ha sido procesado exitosamente. Aquí están los detalles de tu reserva:</p>

  <div style="background:#f5f5f5; padding:16px; border-radius:6px; margin:16px 0;">
    <p style="margin:0 0 8px;"><strong>Confirmación de pago</strong></p>
    <p style="margin:0 0 8px; color:#666;">Monto pagado: <strong>${escapeHtml(amountFormatted)}</strong></p>
    <p style="margin:0; color:#666;">ID de reserva: <strong>${escapeHtml(reservationId)}</strong></p>
  </div>

  <div style="margin:16px 0;">
    <p style="margin:0 0 8px; font-weight:bold;">Detalles de la estadía</p>
    <p style="margin:0 0 4px; color:#666;">Unidad: ${escapeHtml(unitName)} (${escapeHtml(unitCode)})</p>
    <p style="margin:0 0 4px; color:#666;">Check-in: ${escapeHtml(formatDate(reservation.check_in))}</p>
    <p style="margin:0 0 8px; color:#666;">Check-out: ${escapeHtml(formatDate(reservation.check_out))}</p>
  </div>

  <div style="margin:16px 0;">
    <p style="margin:0 0 8px; font-weight:bold;">Información de la unidad</p>
    <p style="margin:0 0 4px; color:#666;">Dirección: ${escapeHtml(address)}</p>
    <p style="margin:0 0 8px; color:#666;">Horario: Check-in 14:00 hrs / Check-out 11:00 hrs</p>
  </div>

  <div style="margin:16px 0; padding-top:16px; border-top:1px solid #eee;">
    <p style="margin:0 0 8px; color:#666;">¿Preguntas? Contáctanos por WhatsApp:</p>
    <p style="margin:0;"><a href="https://wa.me/56950921745" style="color:#1f6feb; text-decoration:none;">+56 9 5092 1745</a></p>
  </div>

  <p style="margin:24px 0 0; color:#999; font-size:12px;">Este es un correo automatizado. No responda a este mensaje.</p>
</div>`.trim()

    const text = [
      '¡Pago confirmado!',
      '',
      `Hola ${guestName},`,
      'Tu pago ha sido procesado exitosamente.',
      '',
      'CONFIRMACIÓN DE PAGO',
      `Monto pagado: ${amountFormatted}`,
      `ID de reserva: ${reservationId}`,
      '',
      'DETALLES DE LA ESTADÍA',
      `Unidad: ${unitName} (${unitCode})`,
      `Check-in: ${formatDate(reservation.check_in)}`,
      `Check-out: ${formatDate(reservation.check_out)}`,
      '',
      'INFORMACIÓN DE LA UNIDAD',
      `Dirección: ${address}`,
      'Horario: Check-in 14:00 hrs / Check-out 11:00 hrs',
      '',
      '¿Preguntas? Contáctanos por WhatsApp: +56 9 5092 1745',
      '',
      'Este es un correo automatizado. No responda a este mensaje.',
    ].join('\n')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('[GUEST-EMAIL] RESEND_API_KEY no configurada')
      return
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: sender, to: [payerEmail], subject, html, text }),
    })

    if (!resendResp.ok) {
      const errBody = await resendResp.text()
      console.error(`[GUEST-EMAIL] Resend error (${resendResp.status}):`, errBody)
      return
    }

    const sent = await resendResp.json()
    console.log(`[GUEST-EMAIL] Confirmación enviada: reservation_id=${reservationId}, email_id=${sent?.id ?? 'unknown'}`)
  } catch (error) {
    console.error('[GUEST-EMAIL] Unexpected error:', error)
  }
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
  let identification_type: string | null
  let identification_number: string | null

  try {
    const body = await req.json()
    reservation_id = body.reservation_id?.trim()
    token = body.token?.trim()
    payment_method_id = body.payment_method_id?.trim()
    issuer_id = body.issuer_id ? parseInt(body.issuer_id, 10) : null
    installments = parseInt(body.installments, 10) || 1
    payer_email = body.payer_email?.trim()
    identification_type = body.identification_type?.trim() || null
    identification_number = body.identification_number?.trim() || null

    if (!reservation_id || !token || !payment_method_id || !payer_email) {
      return jsonError('Missing required fields: reservation_id, token, payment_method_id, payer_email', 400)
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
    },
    external_reference: reservation_id,
    notification_url: mpWebhookUrl,
  }

  // Only add identification if provided
  if (identification_type && identification_number) {
    paymentPayload.payer.identification = {
      type: identification_type,
      number: identification_number,
    }
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

  const paidAmount = responseData.transaction_amount

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

  // ── 8. Send guest confirmation email (fire-and-forget) ────────────────────
  if (mpStatus === 'approved') {
    // Non-blocking email send; errors are logged but don't affect payment response
    sendGuestConfirmationEmail(supabase, reservation_id, payer_email, paidAmount)
      .catch(err => console.error('[GUEST-EMAIL] Unhandled error:', err))
  }

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

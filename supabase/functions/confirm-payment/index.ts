// ─── confirm-payment Edge Function ────────────────────────────────────────
// Supabase Edge Function (Deno) — Webpay Plus payment confirmation webhook
//
// POST /functions/v1/confirm-payment
//
// Webhook que recibe el redirect POST de Transbank después de que el usuario
// completa la transacción en el checkout de Webpay. Valida el pago y redirige
// al frontend con el resultado.
//
// Transbank envía: POST body form-urlencoded con token_ws (normal)
//                  o TBK_TOKEN, TBK_ORDEN_COMPRA (cancelación del usuario)
// Responde: HTTP 302 redirect a /reserva/confirmar?status=paid/failed/cancelled/unknown&reservation_id=...
//
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   TRANSBANK_API_KEY_ID
//   TRANSBANK_API_KEY_SECRET
//   TRANSBANK_ENVIRONMENT (integration | production)
//   PAYMENT_CONFIRM_RETURN_URL (base URL del frontend, e.g. https://artebrisapatagonia.com)
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRANSBANK_ENDPOINTS = {
  integration: 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
  production: 'https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions',
}

function redirect(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: { 'Location': url },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const frontendReturnUrl = Deno.env.get('PAYMENT_CONFIRM_RETURN_URL') ?? 'https://artebrisapatagonia.com'

  // ── 1. Parse form-urlencoded body from Transbank ────────────────────────
  let tokenWs: string | null = null
  let tbkToken: string | null = null
  let tbkOrdenCompra: string | null = null

  try {
    if (req.method === 'POST') {
      const body = await req.text()
      const params = new URLSearchParams(body)
      tokenWs = params.get('token_ws')
      tbkToken = params.get('TBK_TOKEN')
      tbkOrdenCompra = params.get('TBK_ORDEN_COMPRA')
    } else {
      // GET request: extract from query string
      const url = new URL(req.url)
      tokenWs = url.searchParams.get('token_ws')
      tbkToken = url.searchParams.get('TBK_TOKEN')
      tbkOrdenCompra = url.searchParams.get('TBK_ORDEN_COMPRA')
    }

    // ── Check for cancellation first (TBK_TOKEN = user cancelled) ──────────
    if (tbkToken) {
      console.log(`[CONFIRM-PAYMENT] User cancelled payment: TBK_TOKEN=${tbkToken}, TBK_ORDEN_COMPRA=${tbkOrdenCompra}`)

      // Find reservation by payment_buy_order
      if (!tbkOrdenCompra) {
        console.warn('[CONFIRM-PAYMENT] Cancellation without TBK_ORDEN_COMPRA')
        return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
      }

      // Initialize Supabase client
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } },
      )

      const { data: reservation, error: findErr } = await supabase
        .from('core_reservations')
        .select('id')
        .eq('payment_buy_order', tbkOrdenCompra)
        .single()

      if (findErr || !reservation) {
        console.warn(`[CONFIRM-PAYMENT] Reservation not found for TBK_ORDEN_COMPRA=${tbkOrdenCompra}:`, findErr)
        return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
      }

      const reservationId = reservation.id
      console.log(`[CONFIRM-PAYMENT] Marking reservation as cancelled: ${reservationId}`)

      // Mark as cancelled and redirect (NO call to Transbank commit)
      const { error: updateErr } = await supabase
        .from('core_reservations')
        .update({
          status: 'inquiry',
          payment_status: 'cancelled_by_user',
          payment_url: null,
        })
        .eq('id', reservationId)

      if (updateErr) {
        console.error(`[CONFIRM-PAYMENT] Failed to update reservation ${reservationId}: ${updateErr}`)
      }

      return redirect(`${frontendReturnUrl}/reserva/confirmar?status=cancelled&reservation_id=${reservationId}`)
    }

    // ── Normal flow: token_ws (payment completion) ────────────────────────
    if (!tokenWs) {
      console.warn('[CONFIRM-PAYMENT] Missing token_ws and TBK_TOKEN in request')
      return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
    }
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Error parsing body:', e)
    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
  }

  console.log(`[CONFIRM-PAYMENT] Received token_ws: ${tokenWs}`)

  // ── 2. Initialize Supabase client ──────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // ── 3. Find reservation by payment_id = token_ws ────────────────────────
  const { data: reservation, error: findErr } = await supabase
    .from('core_reservations')
    .select('id, status, guest_id, quoted_total')
    .eq('payment_id', tokenWs)
    .single()

  if (findErr || !reservation) {
    console.warn(`[CONFIRM-PAYMENT] Reservation not found for token_ws=${tokenWs}:`, findErr)
    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
  }

  const reservationId = reservation.id
  console.log(`[CONFIRM-PAYMENT] Found reservation: ${reservationId}`)

  // ── 4. Call Transbank to commit the transaction ────────────────────────
  const apiKeyId = Deno.env.get('TRANSBANK_API_KEY_ID')
  const apiKeySecret = Deno.env.get('TRANSBANK_API_KEY_SECRET')
  const environment = Deno.env.get('TRANSBANK_ENVIRONMENT') ?? 'integration'

  if (!apiKeyId || !apiKeySecret) {
    console.error('[CONFIRM-PAYMENT] Missing Transbank configuration')
    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
  }

  const endpoint = TRANSBANK_ENDPOINTS[environment as keyof typeof TRANSBANK_ENDPOINTS]
  if (!endpoint) {
    console.error(`[CONFIRM-PAYMENT] Invalid TRANSBANK_ENVIRONMENT: ${environment}`)
    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error`)
  }

  const commitUrl = `${endpoint}/${tokenWs}`
  console.log(`[CONFIRM-PAYMENT] Calling Transbank commit: ${commitUrl}`)

  let transResponse: Response
  try {
    transResponse = await fetch(commitUrl, {
      method: 'PUT',
      headers: {
        'Tbk-Api-Key-Id': apiKeyId,
        'Tbk-Api-Key-Secret': apiKeySecret,
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    console.error(`[CONFIRM-PAYMENT] Network error calling Transbank: ${e}`)
    // Transbank failed to respond, but we can't be sure if the payment was processed
    // Mark as unknown, not failed, because result is uncertain
    await supabase
      .from('core_reservations')
      .update({
        status: 'inquiry',
        payment_status: 'unknown',
        payment_url: null,
      })
      .eq('id', reservationId)
      .catch(err => console.error(`[CONFIRM-PAYMENT] DB update failed: ${err}`))

    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=unknown&reservation_id=${reservationId}`)
  }

  const statusCode = transResponse.status
  let responseData: any

  try {
    responseData = await transResponse.json()
  } catch (e) {
    console.error(`[CONFIRM-PAYMENT] Failed to parse Transbank response (status=${statusCode}): ${e}`)
    return redirect(`${frontendReturnUrl}/reserva/confirmar?status=error&reservation_id=${reservationId}`)
  }

  console.log(`[CONFIRM-PAYMENT] Transbank response: ${JSON.stringify(responseData)}`)

  if (!transResponse.ok) {
    console.warn(`[CONFIRM-PAYMENT] Transbank error (status=${statusCode}): ${JSON.stringify(responseData)}`)
  }

  // ── 5. Determine payment success based on Transbank response ────────────
  const responseCode = responseData?.response_code
  const status = responseData?.status
  const amount = responseData?.amount

  const paymentSuccess = responseCode === 0 && status === 'AUTHORIZED'

  console.log(`[CONFIRM-PAYMENT] Payment success: ${paymentSuccess} (response_code=${responseCode}, status=${status})`)

  // ── 6. Update reservation based on result ──────────────────────────────
  const updatePayload: any = {
    status: 'inquiry',
    payment_url: null,
  }

  if (paymentSuccess) {
    updatePayload.payment_status = 'paid'
    updatePayload.paid_amount = amount ?? reservation.quoted_total
    updatePayload.payment_method = 'webpay'
  } else {
    updatePayload.payment_status = 'failed'
  }

  const { error: updateErr } = await supabase
    .from('core_reservations')
    .update(updatePayload)
    .eq('id', reservationId)

  if (updateErr) {
    console.error(`[CONFIRM-PAYMENT] Failed to update reservation ${reservationId}: ${updateErr}`)
    // Still redirect, because the payment WAS confirmed in Transbank
    // The reservation update failure is a separate concern that may need manual fix
  }

  const finalStatus = paymentSuccess ? 'paid' : 'failed'
  console.log(`[CONFIRM-PAYMENT] Transaction complete: reservation_id=${reservationId}, status=${finalStatus}`)

  // ── 7. Redirect to frontend with result (NO token in URL, only status) ──
  return redirect(`${frontendReturnUrl}/reserva/confirmar?status=${finalStatus}&reservation_id=${reservationId}`)
})

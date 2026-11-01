// ─── confirm-payment Edge Function ────────────────────────────────────────
// Supabase Edge Function (Deno) — Mercado Pago payment confirmation webhook
//
// GET /functions/v1/confirm-payment?collection_id=...&collection_status=...&external_reference=...&payment_id=...
// POST /functions/v1/confirm-payment (IPN webhook)
//
// Maneja dos flujos:
// 1. Redirect GET desde back_urls de Mercado Pago después del checkout.
//    SOLO redirige al frontend: NO lee ni modifica core_reservations y NO afirma
//    que hubo un pago aprobado (ningún parámetro de la URL se puede verificar
//    aquí). Nada que venga en la URL puede confirmar, cancelar ni devolver a
//    'inquiry' una reserva.
// 2. IPN/webhook POST cuando Mercado Pago notifica cambios en pagos
//
// Valida el pago, actualiza core_reservations (POST) y responde 200.
//
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   MP_ACCESS_TOKEN
//   MP_RETURN_URL (base URL del frontend)
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_API_ENDPOINT = 'https://api.mercadopago.com/v1/payments'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function redirect(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: { 'Location': url },
  })
}

function jsonOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function notifyKarinaConfirmed(supabaseUrl: string, serviceRoleKey: string, reservationId: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/notify-reservation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reservation_id: reservationId }),
    })
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Error notificando a Karina:', e)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
  const mpReturnUrl = Deno.env.get('MP_RETURN_URL') ?? 'https://artebrisapatagonia.com'

  // ── Handle GET (redirect desde back_urls): solo redirige, sin tocar la base ─
  if (req.method === 'GET') {
    return handleRedirect(req, mpReturnUrl)
  }

  if (!mpAccessToken) {
    console.error('[CONFIRM-PAYMENT] Missing MP_ACCESS_TOKEN')
    return redirect(`${mpReturnUrl}/reserva/confirmar?status=error`)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // ── Handle POST (IPN webhook) ──────────────────────────────────────────
  return handleWebhook(req, supabase, mpAccessToken)
})

/**
 * GET (redirect desde back_urls de Mercado Pago): SOLO informativo y NEUTRAL.
 * No lee ni escribe en la base de datos. Como aquí no hay forma de verificar el
 * pago, la URL nunca puede producir un "pagado": collection_status=approved se
 * muestra como "pago en proceso" (status=pending). La confirmación real la hace
 * el webhook POST, que consulta el pago a la API de Mercado Pago.
 */
function handleRedirect(req: Request, mpReturnUrl: string): Response {
  try {
    const url = new URL(req.url)
    const collectionStatus = url.searchParams.get('collection_status')
    const externalReference = url.searchParams.get('external_reference')

    console.log(`[CONFIRM-PAYMENT] GET redirect (solo informativo): status=${collectionStatus}`)

    // external_reference debe ser un UUID: no se refleja nada más en la redirección
    if (!externalReference || !UUID_RE.test(externalReference)) {
      return redirect(`${mpReturnUrl}/reserva/confirmar?status=error`)
    }

    let finalStatus: string
    if (!collectionStatus || collectionStatus === 'null') finalStatus = 'cancelled'
    else if (collectionStatus === 'approved' || collectionStatus === 'pending') finalStatus = 'pending'
    else if (collectionStatus === 'rejected') finalStatus = 'failed'
    else finalStatus = 'unknown'

    return redirect(`${mpReturnUrl}/reserva/confirmar?status=${finalStatus}&reservation_id=${externalReference}`)
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Error in handleRedirect:', e)
    return redirect(`${mpReturnUrl}/reserva/confirmar?status=error`)
  }
}

async function handleWebhook(req: Request, supabase: any, mpAccessToken: string): Promise<Response> {
  try {
    let body: any

    try {
      body = await req.json()
    } catch (e) {
      console.error('[CONFIRM-PAYMENT] Failed to parse webhook body:', e)
      // Responder 200 de todas formas para que MP no reintente
      return jsonOk()
    }

    console.log(`[CONFIRM-PAYMENT] Webhook received: type=${body.type}`)

    // ── Solo procesar notificaciones de pago ────────────────────────────
    if (body.type !== 'payment') {
      console.log('[CONFIRM-PAYMENT] Ignoring non-payment notification')
      return jsonOk()
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      console.warn('[CONFIRM-PAYMENT] Webhook missing payment ID')
      return jsonOk()
    }

    // ── 1. Obtener detalles del pago desde Mercado Pago ─────────────────
    console.log(`[CONFIRM-PAYMENT] Fetching payment details: ${paymentId}`)

    let paymentResponse: Response
    try {
      paymentResponse = await fetch(`${MP_API_ENDPOINT}/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      console.error(`[CONFIRM-PAYMENT] Network error fetching payment ${paymentId}:`, e)
      // Responder 200 para que MP no reintente indefinidamente
      return jsonOk()
    }

    if (!paymentResponse.ok) {
      console.error(`[CONFIRM-PAYMENT] MP API error (status=${paymentResponse.status}):`, await paymentResponse.text())
      return jsonOk()
    }

    let paymentData: any
    try {
      paymentData = await paymentResponse.json()
    } catch (e) {
      console.error('[CONFIRM-PAYMENT] Failed to parse payment details:', e)
      return jsonOk()
    }

    const mpStatus = paymentData.status
    const externalRef = paymentData.external_reference
    const paidAmount = paymentData.transaction_amount

    console.log(`[CONFIRM-PAYMENT] Payment details: status=${mpStatus}, ref=${externalRef}, amount=${paidAmount}`)

    if (!externalRef) {
      console.warn('[CONFIRM-PAYMENT] Payment missing external_reference')
      return jsonOk()
    }

    // ── 2. Mapear status de Mercado Pago a nuestro modelo ───────────────
    let dbStatus: string
    let paymentStatus: string

    if (mpStatus === 'approved') {
      dbStatus = 'confirmed'
      paymentStatus = 'paid'
    } else if (mpStatus === 'rejected') {
      dbStatus = 'inquiry'
      paymentStatus = 'failed'
    } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
      dbStatus = 'inquiry'
      paymentStatus = 'pending'
    } else if (mpStatus === 'cancelled') {
      dbStatus = 'inquiry'
      paymentStatus = 'cancelled_by_user'
    } else {
      dbStatus = 'inquiry'
      paymentStatus = 'unknown'
    }

    console.log(`[CONFIRM-PAYMENT] Webhook update: ref=${externalRef}, db_status=${dbStatus}, payment_status=${paymentStatus}`)

    // ── 3. Actualizar core_reservations ────────────────────────────────
    const updatePayload: any = {
      status: dbStatus,
      payment_status: paymentStatus,
      payment_url: null,
      payment_method: 'mercadopago',
    }

    if (paymentStatus === 'paid' && paidAmount) {
      updatePayload.paid_amount = paidAmount
    }

    // Guard atómico: solo actualiza si la reserva NO está ya 'confirmed'. MP
    // puede reintentar este webhook, y process-payment puede haber confirmado
    // el mismo pago de forma síncrona antes de que este IPN llegue — sin este
    // guard, Karina recibiría el WhatsApp de confirmación duplicado.
    const { data: updatedRows, error: updateErr } = await supabase
      .from('core_reservations')
      .update(updatePayload)
      .eq('id', externalRef)
      .neq('status', 'confirmed')
      .select('id')

    if (updateErr) {
      console.error(`[CONFIRM-PAYMENT] Failed to update reservation ${externalRef}: ${updateErr}`)
      // Pero seguimos respondiendo 200 porque el pago fue procesado
    }

    // Notificar a Karina por WhatsApp (fire-and-forget) — solo la primera vez
    // que esta reserva pasa a 'confirmed'/'paid' (ver comentario del guard arriba).
    if (dbStatus === 'confirmed' && (updatedRows?.length ?? 0) > 0) {
      notifyKarinaConfirmed(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        externalRef,
      ).catch(err => console.error('[CONFIRM-PAYMENT] Unhandled notify error:', err))
    }

    console.log(`[CONFIRM-PAYMENT] Webhook processed: reservation_id=${externalRef}, status=${dbStatus}`)
    return jsonOk()
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Unexpected error in handleWebhook:', e)
    return jsonOk()
  }
}

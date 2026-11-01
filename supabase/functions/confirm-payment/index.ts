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
// 2. Webhook POST cuando Mercado Pago notifica cambios en pagos (las notificaciones IPN
//    heredadas ?topic=... se ignoran). Es el único camino que actualiza core_reservations, y
//    siempre a partir del pago consultado a la API de Mercado Pago con nuestro access token.
//
// Pagos aprobados: monto EXACTO (= quoted_total) y moneda CLP → confirma. Cualquier otra cosa
// (monto menor o mayor, moneda distinta, reserva sin quoted_total) NO confirma: la reserva pasa a
// 'blocked' (retiene las fechas) con payment_status 'amount_mismatch' o 'missing_quote', se guarda
// paid_amount y se alerta a José y a Karina para conciliar a mano. Solo se modifican reservas en
// 'inquiry'; 'confirmed', 'blocked' y 'cancelled' nunca se tocan.
//
// Firma x-signature de Mercado Pago: MP_SIGNATURE_MODE=off|log|enforce (ver checkMpSignature).
//
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   MP_ACCESS_TOKEN
//   MP_RETURN_URL (base URL del frontend)
// Opcionales:
//   MP_SIGNATURE_MODE (off | log | enforce) y MP_WEBHOOK_SECRET (clave secreta de Webhooks de MP)
//   MP_COLLECTOR_ID (id de la cuenta receptora esperada)
//   JOSE_ALERT_EMAIL + RESEND_API_KEY, JOSE_ALERT_PHONE + TWILIO_* (alertas, como whatsapp-bot)
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

const SENDER_EMAIL = 'Arte Brisa Patagonia <reservas@artebrisapatagonia.com>'
const KARINA_EMAIL = 'reservasartebrisa@gmail.com'
// ContentSid de 'derivacion_humano_v1' (plantilla aprobada por Meta; mismo valor y patrón que whatsapp-bot).
const TWILIO_CONTENT_SID_DERIVACION_HUMANO =
  Deno.env.get('TWILIO_CONTENT_SID_DERIVACION_HUMANO') || 'HX6d9b14d80e1fe6110a2541b0b7b4feda'

// Estado de retención: un pago que no se puede conciliar automáticamente deja la reserva en
// 'blocked'. Es el único estado que TODOS los consumidores (buscador web, ReservationWidget,
// whatsapp-bot, export-ical, calendario admin, RLS pública) ya tratan como ocupado y que
// ninguno expira (inquiry expira a las 4 h; sync-ical solo cancela filas 'blocked' con
// external_calendar_id propio, y estas no lo tienen).
const HOLD_STATUS = 'blocked'
const HOLD_PAYMENT_STATUSES = ['amount_mismatch', 'missing_quote']

// ─── Firma x-signature de Mercado Pago (Webhooks) ─────────────────────────
// Documentación oficial: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
//   Header:   x-signature: ts=<epoch>,v1=<hmac sha256 hex>      Header: x-request-id
//   Query:    data.id=<id del pago>  (si es alfanumérico, en minúsculas)
//   Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;   (se omiten las partes ausentes)
//   v1 = HMAC_SHA256(clave secreta de la aplicación, manifest) en hex.
// MP_SIGNATURE_MODE: 'off' (default, no verifica) | 'log' (observación: registra el resultado
// y NUNCA rechaza) | 'enforce' (rechaza con 401 lo que no sea válido).
// MP_WEBHOOK_SECRET: "Clave secreta" de Webhooks en el panel de Mercado Pago. Nunca se loguea.
type SignatureResult =
  | 'valid' | 'invalid' | 'missing_header' | 'malformed' | 'missing_data_id' | 'no_secret'

type SignatureCheck = { mode: string; result: SignatureResult | 'skipped'; ageSeconds: number | null }

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

async function checkMpSignature(req: Request): Promise<SignatureCheck> {
  const mode = (Deno.env.get('MP_SIGNATURE_MODE') ?? 'off').trim().toLowerCase()
  if (mode !== 'log' && mode !== 'enforce') return { mode, result: 'skipped', ageSeconds: null }

  const secret = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''
  if (!secret) return { mode, result: 'no_secret', ageSeconds: null }

  const sigHeader = req.headers.get('x-signature')
  if (!sigHeader) return { mode, result: 'missing_header', ageSeconds: null }

  let ts = ''
  let v1 = ''
  for (const part of sigHeader.split(',')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k === 'ts') ts = v
    else if (k === 'v1') v1 = v
  }
  const v1Bytes = hexToBytes(v1)
  if (!ts || !v1Bytes) return { mode, result: 'malformed', ageSeconds: null }

  // ts viene en segundos (algunas cuentas lo reportan en milisegundos): solo para medir antigüedad.
  const tsNum = Number(ts)
  const ageSeconds = Number.isFinite(tsNum)
    ? Math.round(Date.now() / 1000 - (tsNum > 1e12 ? tsNum / 1000 : tsNum))
    : null

  const rawDataId = new URL(req.url).searchParams.get('data.id')
  if (!rawDataId) return { mode, result: 'missing_data_id', ageSeconds }
  const dataId = /^[a-z0-9]+$/i.test(rawDataId) ? rawDataId.toLowerCase() : rawDataId
  const requestId = req.headers.get('x-request-id')

  let manifest = `id:${dataId};`
  if (requestId) manifest += `request-id:${requestId};`
  manifest += `ts:${ts};`

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  )
  // crypto.subtle.verify compara en tiempo constante
  const valid = await crypto.subtle.verify('HMAC', key, v1Bytes, new TextEncoder().encode(manifest))
  return { mode, result: valid ? 'valid' : 'invalid', ageSeconds }
}

// ─── Alertas ──────────────────────────────────────────────────────────────
/**
 * Alerta técnica a José (email Resend + WhatsApp Twilio): mismo mecanismo y mismas variables que
 * enviarAlertaTecnicaAJose de whatsapp-bot. Se ESPERA el envío (tope 5 s por canal): el runtime
 * puede cortar promesas pendientes al responder, y estas alertas no pueden perderse.
 * No incluye datos del pagador.
 */
async function alertJose(subject: string, detail: string): Promise<void> {
  try {
    const alertText = `⚠️ ${subject}\n\n${detail}\nTimestamp: ${new Date().toISOString()}`
    const tasks: Promise<unknown>[] = []

    const joseAlertEmail = Deno.env.get('JOSE_ALERT_EMAIL') ?? ''
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    if (joseAlertEmail && resendKey) {
      tasks.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: SENDER_EMAIL, to: [joseAlertEmail], subject: `⚠️ ${subject}`, text: alertText }),
          signal: AbortSignal.timeout(5000),
        }).catch(err => console.error('[CONFIRM-PAYMENT] Error enviando alerta por email a José:', err)),
      )
    }

    const joseAlertPhone = Deno.env.get('JOSE_ALERT_PHONE') ?? ''
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''
    if (joseAlertPhone && accountSid && twilioAuthToken && fromNumber) {
      tasks.push(
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: fromNumber, To: `whatsapp:${joseAlertPhone}`, Body: alertText }).toString(),
          signal: AbortSignal.timeout(5000),
        }).catch(err => console.error('[CONFIRM-PAYMENT] Error enviando alerta por WhatsApp a José:', err)),
      )
    }

    if (tasks.length === 0) {
      console.error('[CONFIRM-PAYMENT] Alerta a José sin canal configurado (JOSE_ALERT_EMAIL/JOSE_ALERT_PHONE):', subject)
    }
    await Promise.allSettled(tasks)
  } catch (alertErr) {
    console.error('[CONFIRM-PAYMENT] Excepción enviando alerta a José:', alertErr)
  }
}

/**
 * Aviso a Karina (email + WhatsApp con la plantilla aprobada 'derivacion_humano_v1', porque un
 * texto libre falla fuera de la ventana de 24 h — Twilio 63016). Mismo patrón que whatsapp-bot.
 */
async function alertKarina(detail: string): Promise<void> {
  try {
    const tasks: Promise<unknown>[] = []
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    if (resendKey) {
      tasks.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: SENDER_EMAIL, to: [KARINA_EMAIL], subject: 'Pago por revisar: reserva con fechas retenidas', text: detail }),
          signal: AbortSignal.timeout(5000),
        }).catch(err => console.error('[CONFIRM-PAYMENT] Error enviando aviso por email a Karina:', err)),
      )
    }

    const karinasPhone = Deno.env.get('KARINA_WHATSAPP_PHONE') ?? '+56958383166'
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''
    if (accountSid && twilioAuthToken && fromNumber) {
      // Twilio exige que 'Body' esté ausente cuando se usa ContentSid.
      tasks.push(
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: `whatsapp:${karinasPhone}`,
            ContentSid: TWILIO_CONTENT_SID_DERIVACION_HUMANO,
            ContentVariables: JSON.stringify({ '1': 'Pago por revisar', '2': 'Panel de reservas', '3': detail.replace(/\s+/g, ' ').slice(0, 480) }),
          }).toString(),
          signal: AbortSignal.timeout(5000),
        }).catch(err => console.error('[CONFIRM-PAYMENT] Error enviando aviso por WhatsApp a Karina:', err)),
      )
    }
    await Promise.allSettled(tasks)
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Excepción enviando aviso a Karina:', e)
  }
}

// ─── Verificación de un pago aprobado contra la reserva ───────────────────
type ApprovedVerdict =
  | { kind: 'ok' }
  | { kind: 'amount_mismatch'; reason: string }
  | { kind: 'missing_quote'; reason: string }

/**
 * Pago EXACTO o nada. Compara transaction_amount (el precio; total_paid_amount incluiría el
 * costo del financiamiento de las cuotas y NO se usa) con quoted_total, y la moneda del pago y
 * de la reserva con CLP. Nota: quoted_total lo calcula hoy el navegador; esta comparación es una
 * protección transitoria, no reemplaza el recálculo independiente del importe en el servidor.
 */
function classifyApprovedPayment(
  payment: { transaction_amount?: unknown; currency_id?: unknown; collector_id?: unknown },
  reservation: { quoted_total: unknown; quoted_currency: unknown },
): ApprovedVerdict {
  const paid = Number(payment.transaction_amount)
  const currency = String(payment.currency_id ?? '').toUpperCase()
  const expected = reservation.quoted_total == null ? NaN : Number(reservation.quoted_total)
  const expectedCurrency = String(reservation.quoted_currency ?? 'CLP').toUpperCase()

  const expectedCollector = Deno.env.get('MP_COLLECTOR_ID') ?? ''
  if (expectedCollector && String(payment.collector_id ?? '') !== expectedCollector) {
    return { kind: 'amount_mismatch', reason: `el pago no fue recibido por la cuenta esperada (collector_id ${String(payment.collector_id ?? 'desconocido')})` }
  }
  if (!Number.isFinite(expected) || expected <= 0) {
    return { kind: 'missing_quote', reason: 'la reserva no tiene quoted_total válido; no hay monto contra el cual comparar' }
  }
  if (currency !== 'CLP') return { kind: 'amount_mismatch', reason: `moneda del pago '${currency || 'desconocida'}' (se esperaba CLP)` }
  if (expectedCurrency !== 'CLP') return { kind: 'amount_mismatch', reason: `moneda de la reserva '${expectedCurrency}' (se esperaba CLP)` }
  if (!Number.isFinite(paid) || paid <= 0) return { kind: 'amount_mismatch', reason: `monto pagado inválido (${String(payment.transaction_amount)})` }
  if (Math.abs(paid - expected) >= 0.5) {
    return { kind: 'amount_mismatch', reason: `monto pagado ${paid} distinto del esperado ${expected}` }
  }
  return { kind: 'ok' }
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

    // ── 0. Firma x-signature (modo observación u obligatoria según MP_SIGNATURE_MODE) ──
    // Solo se registra la categoría del resultado y la antigüedad: nunca la clave, el header
    // ni el manifest. Las notificaciones IPN heredadas (?topic=...) no traen firma y este
    // handler ya las ignora porque su body no es type=payment.
    const sig = await checkMpSignature(req)
    if (sig.result !== 'skipped') {
      console.log(`[CONFIRM-PAYMENT][SIG] mode=${sig.mode} result=${sig.result} age_s=${sig.ageSeconds ?? 'n/a'}`)
    }
    if (sig.mode === 'enforce' && sig.result !== 'valid') {
      console.error(`[CONFIRM-PAYMENT][SIG] Notificación rechazada por firma (${sig.result})`)
      return new Response(JSON.stringify({ ok: false, error: 'invalid signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    // ── 1. Obtener detalles del pago desde Mercado Pago ─────────────────
    // (consultado con NUESTRO access token: solo devuelve pagos de nuestra cuenta)
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

    // ── 2. Pagos aprobados: verificación de monto/moneda y retención ────
    if (mpStatus === 'approved') {
      return await handleApprovedPayment(supabase, paymentData, externalRef)
    }

    // ── 2b. Resto de estados (rechazado, pendiente, cancelado…): igual que antes ──
    let paymentStatus: string

    if (mpStatus === 'rejected') {
      paymentStatus = 'failed'
    } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
      paymentStatus = 'pending'
    } else if (mpStatus === 'cancelled') {
      paymentStatus = 'cancelled_by_user'
    } else {
      paymentStatus = 'unknown'
    }

    console.log(`[CONFIRM-PAYMENT] Webhook update: ref=${externalRef}, db_status=inquiry, payment_status=${paymentStatus}`)

    // Guard atómico: solo toca reservas que siguen en 'inquiry'. Una reserva 'confirmed' (pago ya
    // confirmado), 'blocked' (pago retenido para revisión) o 'cancelled' NO se modifica: así un
    // aviso viejo o fuera de orden (p. ej. 'pending' llegando después de 'approved') no degrada
    // una reserva ya confirmada ni libera las fechas de una retenida.
    const { error: updateErr } = await supabase
      .from('core_reservations')
      .update({
        status: 'inquiry',
        payment_status: paymentStatus,
        payment_url: null,
        payment_method: 'mercadopago',
      })
      .eq('id', externalRef)
      .eq('status', 'inquiry')

    if (updateErr) {
      console.error(`[CONFIRM-PAYMENT] Failed to update reservation ${externalRef}: ${updateErr.message}`)
      // Seguimos respondiendo 200: no es un pago aprobado, nada que reintentar
    }

    console.log(`[CONFIRM-PAYMENT] Webhook processed: reservation_id=${externalRef}, status=inquiry`)
    return jsonOk()
  } catch (e) {
    console.error('[CONFIRM-PAYMENT] Unexpected error in handleWebhook:', e)
    return jsonOk()
  }
}

/**
 * Pago APROBADO por Mercado Pago:
 *  - monto exacto (= quoted_total) y moneda CLP en pago y reserva → confirma, como hoy;
 *  - cualquier otra cosa (monto distinto, mayor o menor; moneda distinta; reserva sin quoted_total
 *    válido) → NO confirma: la reserva pasa a 'blocked' (retiene las fechas, no expira), con
 *    payment_status 'amount_mismatch' o 'missing_quote' y paid_amount real, y se alerta a José
 *    y a Karina para conciliar a mano.
 * Idempotente: los reintentos y los avisos duplicados no repiten cambios ni alertas.
 */
async function handleApprovedPayment(supabase: any, paymentData: any, externalRef: string): Promise<Response> {
  const paidAmount = paymentData.transaction_amount
  const paidCurrency = paymentData.currency_id

  const { data: reservation, error: reservationErr } = await supabase
    .from('core_reservations')
    .select('id, status, payment_status, quoted_total, quoted_currency')
    .eq('id', externalRef)
    .maybeSingle()

  if (reservationErr) {
    // Error transitorio de lectura: no se confirma a ciegas; 500 para que MP reintente.
    console.error(`[CONFIRM-PAYMENT] No se pudo leer la reserva ${externalRef}: ${reservationErr.message}`)
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  if (!reservation) {
    console.error(`[CONFIRM-PAYMENT] Pago aprobado sin reserva: ref=${externalRef}`)
    await alertJose(
      'Pago aprobado sin reserva asociada',
      `Mercado Pago aprobó el pago ${paymentData.id} (${paidAmount} ${paidCurrency}) con external_reference ${externalRef}, pero esa reserva no existe. Revisar en Mercado Pago.`,
    )
    return jsonOk()
  }

  const verdict = classifyApprovedPayment(paymentData, reservation)

  // Reserva ya confirmada: nunca se modifica (guard). Un reintento del mismo pago es silencioso.
  if (reservation.status === 'confirmed') {
    if (verdict.kind !== 'ok') {
      await alertJose(
        'Pago aprobado con monto distinto sobre una reserva ya confirmada',
        `Reserva ${externalRef} (confirmada, no se modificó). Pago ${paymentData.id}: ${verdict.reason}. Pagado: ${paidAmount} ${paidCurrency}. Esperado: ${reservation.quoted_total} ${reservation.quoted_currency}.`,
      )
    }
    return jsonOk()
  }

  // Reserva ya retenida por un pago bajo revisión: reintento o aviso duplicado, no se repite nada.
  if (reservation.status === HOLD_STATUS && HOLD_PAYMENT_STATUSES.includes(reservation.payment_status)) {
    console.log(`[CONFIRM-PAYMENT] Reserva ${externalRef} ya retenida (${reservation.payment_status}); aviso ignorado`)
    return jsonOk()
  }

  // Solo una reserva en 'inquiry' puede confirmarse o retenerse automáticamente.
  if (reservation.status !== 'inquiry') {
    await alertJose(
      'Pago aprobado sobre una reserva que no está en consulta',
      `Reserva ${externalRef} está en estado '${reservation.status}' y no se modificó. Pago ${paymentData.id}: ${paidAmount} ${paidCurrency}. Esperado: ${reservation.quoted_total} ${reservation.quoted_currency}. Revisar a mano.`,
    )
    return jsonOk()
  }

  const paidRounded = Number.isFinite(Number(paidAmount)) ? Math.round(Number(paidAmount)) : null

  if (verdict.kind === 'ok') {
    console.log(`[CONFIRM-PAYMENT] Webhook update: ref=${externalRef}, db_status=confirmed, payment_status=paid`)
    const { data: updatedRows, error: updateErr } = await supabase
      .from('core_reservations')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_url: null,
        payment_method: 'mercadopago',
        paid_amount: paidRounded,
      })
      .eq('id', externalRef)
      .eq('status', 'inquiry')
      .select('id')

    if (updateErr) {
      // Pago aprobado que no se pudo registrar: 500 para que MP reintente (el guard hace el reintento seguro).
      console.error(`[CONFIRM-PAYMENT] Failed to confirm reservation ${externalRef}: ${updateErr.message}`)
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Aviso a Karina solo la primera vez que la reserva pasa a 'confirmed' (ver guard arriba).
    if ((updatedRows?.length ?? 0) > 0) {
      notifyKarinaConfirmed(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        externalRef,
      ).catch(err => console.error('[CONFIRM-PAYMENT] Unhandled notify error:', err))
    }
    console.log(`[CONFIRM-PAYMENT] Webhook processed: reservation_id=${externalRef}, status=confirmed`)
    return jsonOk()
  }

  // ── Retención: no se confirma, pero tampoco se liberan las fechas ──
  console.error(`[CONFIRM-PAYMENT] PAGO BAJO REVISIÓN (${verdict.kind}): reservation_id=${externalRef}, payment_id=${paymentData.id}, ${verdict.reason}`)
  const { data: heldRows, error: holdErr } = await supabase
    .from('core_reservations')
    .update({
      status: HOLD_STATUS,
      payment_status: verdict.kind,
      payment_url: null,
      payment_method: 'mercadopago',
      paid_amount: paidRounded,
    })
    .eq('id', externalRef)
    .eq('status', 'inquiry')
    .select('id')

  if (holdErr) {
    console.error(`[CONFIRM-PAYMENT] Failed to hold reservation ${externalRef}: ${holdErr.message}`)
    await alertJose(
      'URGENTE: no se pudo retener una reserva con pago bajo revisión',
      `Reserva ${externalRef}, pago ${paymentData.id}: ${verdict.reason}. Error: ${holdErr.message}. La reserva sigue en 'inquiry' y sus fechas podrían liberarse. Pagado: ${paidAmount} ${paidCurrency}. Esperado: ${reservation.quoted_total} ${reservation.quoted_currency}.`,
    )
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // Alertas solo si ESTA invocación realizó el cambio (los reintentos concurrentes no duplican).
  if ((heldRows?.length ?? 0) > 0) {
    const detail =
      `Reserva: ${externalRef}\nPago Mercado Pago: ${paymentData.id}\n` +
      `Monto esperado: ${reservation.quoted_total ?? 'sin cotización'} ${reservation.quoted_currency ?? ''}\n` +
      `Monto pagado: ${paidAmount} ${paidCurrency}\nMotivo: ${verdict.reason}\n` +
      `La reserva NO se confirmó: sus fechas quedan retenidas (estado 'blocked', payment_status '${verdict.kind}'). ` +
      `Conciliar a mano: confirmarla, reembolsar o ajustar.`
    await Promise.allSettled([
      alertJose('Pago aprobado que no coincide con la reserva', detail),
      alertKarina(detail),
    ])
  }
  return jsonOk()
}

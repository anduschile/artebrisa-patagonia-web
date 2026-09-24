// ─── notify-reservation Edge Function ──────────────────────────────────────
// Supabase Edge Function (Deno) — Notifica a Karina por WhatsApp de nuevas reservas
//
// POST /functions/v1/notify-reservation
//
// Recibe: { reservation_id }
// Responde: { ok: true } siempre (incluso si falla Twilio)
//
// Variables de entorno requeridas:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ContentSid de la plantilla de WhatsApp 'reserva_confirmada_v1' (aprobada por Meta),
// mismo patrón que TWILIO_CONTENT_SID_RESERVA_CONFIRMADA en whatsapp-bot/index.ts.
const TWILIO_CONTENT_SID_RESERVA_CONFIRMADA =
  Deno.env.get('TWILIO_CONTENT_SID_RESERVA_CONFIRMADA') || 'HXe160a61164be096a4847735f92de5fd4'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://artebrisapatagonia.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function jsonError(msg: string): Response {
  return new Response(JSON.stringify({ ok: true, warning: msg }), {
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
    return jsonError('Method not allowed')
  }

  // Parse request body
  let reservation_id: string
  try {
    const body = await req.json()
    reservation_id = body.reservation_id?.trim()

    if (!reservation_id) {
      return jsonError('Missing reservation_id')
    }
  } catch (e) {
    return jsonError('Invalid JSON')
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    // Fetch reservation with guest and unit details
    const { data: reservation, error: fetchErr } = await supabase
      .from('core_reservations')
      .select(`
        id,
        check_in,
        check_out,
        adults,
        status,
        payment_status,
        paid_amount,
        guests:guest_id (full_name),
        units:unit_id (name)
      `)
      .eq('id', reservation_id)
      .single()

    if (fetchErr || !reservation) {
      console.error('[notify-reservation] Reservation not found:', reservation_id, fetchErr)
      return jsonOk()
    }

    // Esta función solo debe avisar "reserva confirmada" cuando el pago
    // realmente se confirmó — nunca al crear una inquiry/consulta.
    if (reservation.status !== 'confirmed' || reservation.payment_status !== 'paid') {
      console.warn(
        '[notify-reservation] Reserva aún no confirmada/pagada, no se envía WhatsApp:',
        reservation_id, reservation.status, reservation.payment_status,
      )
      return jsonOk()
    }

    const guestName = reservation.guests?.full_name || 'Sin nombre'
    const unitName = reservation.units?.name || 'Unidad'
    const checkIn = reservation.check_in
    const checkOut = reservation.check_out
    const adults = reservation.adults || 1
    const paidAmount = reservation.paid_amount || 0

    // Format dates to dd/mm/yy
    const checkInDate = new Date(checkIn + 'T00:00:00')
    const checkOutDate = new Date(checkOut + 'T00:00:00')
    const checkInFormatted = checkInDate.toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })
    const checkOutFormatted = checkOutDate.toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })

    // Format price
    const priceFormatted = paidAmount.toLocaleString('es-CL')

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !twilioAuthToken || !fromNumber) {
      console.warn('[notify-reservation] Missing Twilio configuration')
      return jsonOk()
    }

    // Send WhatsApp message to Karina usando la plantilla aprobada 'reserva_confirmada_v1'
    // — Karina normalmente no le escribió al bot en las últimas 24h, así que un mensaje de
    // texto libre (Body) falla con Twilio error 63016.
    const karinasPhone = Deno.env.get('KARINA_WHATSAPP_PHONE') ?? '+56958383166'
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const contentVariables = JSON.stringify({
      '1': guestName,
      '2': unitName,
      '3': checkInFormatted,
      '4': checkOutFormatted,
      '5': `$${priceFormatted}`,
    })

    // IMPORTANTE: Twilio exige que 'Body' esté COMPLETAMENTE AUSENTE del
    // request cuando se usa ContentSid — no basta con dejarlo vacío o null.
    const twilioBody = new URLSearchParams({
      From: fromNumber,
      To: `whatsapp:${karinasPhone}`,
      ContentSid: TWILIO_CONTENT_SID_RESERVA_CONFIRMADA,
      ContentVariables: contentVariables,
    })

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioBody.toString(),
    })

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error('[notify-reservation] Twilio error:', twilioRes.status, errText)
    }

    return jsonOk()
  } catch (e) {
    console.error('[notify-reservation] Unexpected error:', e)
    return jsonOk()
  }
})

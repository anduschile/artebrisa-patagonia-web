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
        quoted_total,
        guests:guest_id (full_name),
        units:unit_id (name)
      `)
      .eq('id', reservation_id)
      .single()

    if (fetchErr || !reservation) {
      console.error('[notify-reservation] Reservation not found:', reservation_id, fetchErr)
      return jsonOk()
    }

    const guestName = reservation.guests?.full_name || 'Sin nombre'
    const unitName = reservation.units?.name || 'Unidad'
    const checkIn = reservation.check_in
    const checkOut = reservation.check_out
    const adults = reservation.adults || 1
    const quotedTotal = reservation.quoted_total || 0

    // Format dates to dd/mm/yy
    const checkInDate = new Date(checkIn + 'T00:00:00')
    const checkOutDate = new Date(checkOut + 'T00:00:00')
    const checkInFormatted = checkInDate.toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })
    const checkOutFormatted = checkOutDate.toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })

    // Format price
    const priceFormatted = quotedTotal.toLocaleString('es-CL')

    // Build notification message
    const notificationMsg = `🔔 Nueva reserva WEB\n👤 ${guestName}\n🏠 ${unitName}\n📅 ${checkInFormatted} → ${checkOutFormatted}\n👥 ${adults} personas\n💰 Seña: $${priceFormatted} (1ra noche estimada)\n🔗 https://artebrisapatagonia.com/admin/reservas`

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !twilioAuthToken || !fromNumber) {
      console.warn('[notify-reservation] Missing Twilio configuration')
      return jsonOk()
    }

    // Send WhatsApp message to Karina
    const karinasPhone = '+56950921745'
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const twilioBody = new URLSearchParams({
      From: fromNumber,
      To: `whatsapp:${karinasPhone}`,
      Body: notificationMsg,
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

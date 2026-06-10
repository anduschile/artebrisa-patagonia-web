// ─── send-whatsapp Edge Function ─────────────────────────────────────────────
// Envía un mensaje WhatsApp vía Twilio REST API.
// Llamada desde el panel admin — JWT de Supabase requerido (verify JWT activo).
//
// POST body: { phone: "+56XXXXXXXXX", message: "texto" }
// ──────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }

    let phone: string, message: string
    try {
        const body = await req.json()
        phone = body.phone
        message = body.message
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    if (!phone || !message) {
        return new Response(JSON.stringify({ error: 'phone and message are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const from       = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

    if (!accountSid || !authToken || !from) {
        console.error('Missing Twilio env vars')
        return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const twilioBody = new URLSearchParams({ From: from, To: to, Body: message })

    const resp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
    })

    if (!resp.ok) {
        const errText = await resp.text()
        console.error('Twilio error:', resp.status, errText)
        return new Response(JSON.stringify({ error: 'Twilio send failed', detail: errText }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
})

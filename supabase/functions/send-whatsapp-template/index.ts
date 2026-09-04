// ─── send-whatsapp-template Edge Function ─────────────────────────────────────
// Envía una plantilla de WhatsApp aprobada por Meta (Twilio Content API) para
// que Karina inicie contacto proactivo con un huésped fuera de la ventana de
// 24h de conversación. Llamada desde el panel admin — JWT de Supabase requerido.
//
// POST body: { name: string, phone: "+E164...", message: string }
//
// Antes de enviar, verifica si ya existe una conversación con un mensaje del
// huésped (role='user') en las últimas 24h; si existe, NO envía la plantilla
// y devuelve { alreadyActive: true, conversationId, hoursSinceLastMessage }.
//
// Secretos usados: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-inyectados),
// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (ya existentes),
// TWILIO_CONTENT_SID_CONTACTO_HUESPED (opcional — si no está seteado usa el
// ContentSid de contacto_huesped_v1 como valor por defecto).
// ──────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// E.164 genérico: '+' seguido de 8 a 15 dígitos (no restringido a Chile).
const PHONE_RE = /^\+\d{8,15}$/

const TEMPLATE_CONTENT_SID =
    Deno.env.get('TWILIO_CONTENT_SID_CONTACTO_HUESPED') || 'HX6afa444ad50d38b6e918ac575613e418'

function renderTemplate(name: string, message: string) {
    return `Hola ${name}, te escribe Karina de Arte Brisa Patagonia. ${message} Quedo atenta a tu respuesta.`
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders })
    }
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }

    let name: string, phone: string, message: string
    try {
        const body = await req.json()
        name = String(body.name ?? '').trim()
        phone = String(body.phone ?? '').trim()
        message = String(body.message ?? '').trim()
    } catch {
        return json({ error: 'Invalid JSON body' }, 400)
    }

    if (!name || !phone || !message) {
        return json({ error: 'name, phone and message are required' }, 400)
    }
    if (!PHONE_RE.test(phone)) {
        return json({ error: 'Formato de teléfono inválido (E.164, ej: +5491122334455)' }, 400)
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const from = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !accountSid || !authToken || !from) {
        console.error('Missing required env vars')
        return json({ error: 'Server misconfiguration' }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // ── Verificar ventana de 24h (último mensaje del huésped, no de Karina/bot) ──
    const { data: existingConv, error: convError } = await supabase
        .from('core_chat_conversations')
        .select('id, status')
        .eq('phone', phone)
        .maybeSingle()

    if (convError) {
        console.error('Conversation lookup error:', convError)
        return json({ error: 'Error consultando conversaciones' }, 500)
    }

    if (existingConv) {
        const { data: lastGuestMsg, error: msgError } = await supabase
            .from('core_chat_messages')
            .select('created_at')
            .eq('conversation_id', existingConv.id)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (msgError) {
            console.error('Last guest message lookup error:', msgError)
            return json({ error: 'Error consultando mensajes' }, 500)
        }

        if (lastGuestMsg) {
            const hoursSince = (Date.now() - new Date(lastGuestMsg.created_at).getTime()) / 3_600_000
            if (hoursSince < 24) {
                return json({
                    alreadyActive: true,
                    conversationId: existingConv.id,
                    hoursSinceLastMessage: Math.round(hoursSince * 10) / 10,
                })
            }
        }
    }

    // ── Enviar plantilla vía Twilio Content API ─────────────────────────────────
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const contentVariables = JSON.stringify({ '1': name, '2': message })

    // IMPORTANTE: Twilio exige que 'Body' esté COMPLETAMENTE AUSENTE del
    // request cuando se usa ContentSid — no basta con dejarlo vacío o null.
    const twilioBody = new URLSearchParams({
        From: from,
        To: to,
        ContentSid: TEMPLATE_CONTENT_SID,
        ContentVariables: contentVariables,
    })

    const twilioResp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
    })

    if (!twilioResp.ok) {
        const errText = await twilioResp.text()
        console.error('Twilio error:', twilioResp.status, errText)
        return json({ error: 'Twilio send failed', detail: errText }, 502)
    }

    // ── Registrar la conversación como iniciada por un humano (Karina) ──────────
    // status: 'human' para que el bot no responda automáticamente si el huésped
    // contesta — fue Karina quien inició el contacto a propósito.
    const renderedText = renderTemplate(name, message)
    const nowIso = new Date().toISOString()

    let conversationId = existingConv?.id ?? null

    if (conversationId) {
        const { error: updateError } = await supabase
            .from('core_chat_conversations')
            .update({ status: 'human', last_message_at: nowIso })
            .eq('id', conversationId)
        if (updateError) console.error('Conversation update error:', updateError)
    } else {
        const { data: newConv, error: insertConvError } = await supabase
            .from('core_chat_conversations')
            .insert({ phone, contact_name: name, status: 'human', last_message_at: nowIso })
            .select('id')
            .single()
        if (insertConvError) {
            console.error('Conversation insert error:', insertConvError)
            return json({ error: 'Plantilla enviada pero no se pudo registrar la conversación' }, 500)
        }
        conversationId = newConv.id
    }

    const { error: insertMsgError } = await supabase
        .from('core_chat_messages')
        .insert({ conversation_id: conversationId, role: 'assistant', content: renderedText })
    if (insertMsgError) console.error('Message insert error:', insertMsgError)

    return json({ ok: true, conversationId })
})

// ─── whatsapp-bot Edge Function ────────────────────────────────────────────
// Supabase Edge Function (Deno) — no external npm dependencies.
//
// POST /functions/v1/whatsapp-bot
//
// Webhook de Twilio para mensajes WhatsApp entrantes.
// Consulta contexto de la BD, llama a Claude API y responde al turista.
//
// Variables de entorno requeridas (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-inyectadas
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM   — ej: whatsapp:+14155238886
//   ANTHROPIC_API_KEY
//   RESEND_API_KEY
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

// ── Constants ──────────────────────────────────────────────────────────────

const RECIPIENT_EMAIL = 'reservasartebrisa@gmail.com'
const SENDER_EMAIL    = 'Arte Brisa Patagonia <reservas@artebrisapatagonia.com>'
const CLAUDE_MODEL    = 'claude-sonnet-4-5'
const CLAUDE_API_URL  = 'https://api.anthropic.com/v1/messages'
const TWILIO_WEBHOOK_URL = 'https://khryuvmashcqwsuhhsdd.supabase.co/functions/v1/whatsapp-bot'

const SYSTEM_PROMPT_TEMPLATE = `Eres el asistente virtual de Arte Brisa Patagonia, un complejo de alojamiento en Puerto Natales, Chile. Te llamas Arte Brisa Patagonia y hablas de forma cálida y familiar con los turistas.

ESTABLECIMIENTOS:

Departamentos Patagonia
- Dirección: Huacolda 1615, entre Patagonia y 18 de Septiembre, Puerto Natales
- Ubicación en mapa: https://maps.app.goo.gl/rLHmjrGWSE1pD9QX6
- Unidades: 4 departamentos (para 3, 4 y 5 personas)
- Estacionamiento: no tiene privado, estacionamiento en calle gratuito disponible

Cabañas Arte Brisa Patagonia
- Dirección: Clodomiro Rosas 164D, camino 2, Huertos Familiares, frente al rodeo
- Ubicación en mapa: https://maps.app.goo.gl/aX3Vp5z2rjjxCcov6
- Tiny Houses (cabañas 5-8): para 2 personas
- Cabañas familiares (cabañas 1-4): para 4 a 6 personas
- Estacionamiento: privado y gratuito

HORARIOS:
- Check-in: desde las 14:00 hrs (se puede llegar en cualquier horario posterior)
- Check-out: 11:00 hrs, sin flexibilidad
- Acceso sin recepción presencial: código de acceso entregado por WhatsApp 1-2 días antes

TARIFAS POR NOCHE (en pesos chilenos):

Departamentos - Temporada Alta (nov-mar):
- Depto 1 (5 personas): $95.000
- Depto 2 (3 personas): $65.000
- Depto 3 (4 personas): $80.000
- Depto 4 (5 personas): $90.000

Departamentos - Temporada Media (sep-oct):
- Depto 1: $80.000 | Depto 2: $55.000 | Depto 3: $70.000 | Depto 4: $80.000

Departamentos - Temporada Baja (ago, jun):
- Depto 1: $60.000 | Depto 2: $45.000 | Depto 3: $50.000 | Depto 4: $60.000

Departamentos - Abril/Mayo:
- Depto 1: $60.000 | Depto 2: $45.000 | Depto 3: $50.000 | Depto 4: $60.000

Cabañas familiares - Temporada Alta (nov-mar):
- Cabaña 1: $100.000 | Cabaña 2: $100.000 | Cabaña 3: $120.000 | Cabaña 4: $100.000

Cabañas familiares - Temporada Media (sep-oct):
- Cabaña 1-2-4: $85.000 | Cabaña 3: $100.000

Cabañas familiares - Temporada Baja (ago, jun):
- Cabaña 1-2-4: $70.000 | Cabaña 3: $90.000

Tiny Houses - Temporada Alta (nov-mar): $70.000
Tiny Houses - Temporada Media (sep-oct): $60.000
Tiny Houses - Temporada Baja (ago, jun): $50.000

Abril/Mayo cabañas: familiares $70.000-$90.000 | Tiny Houses $50.000
Julio: CERRADO por mantención y vacaciones

POLÍTICAS:
- Sin estadía mínima ni máxima (desde 1 noche)
- Cancelación con devolución total hasta 5 días antes
- No se aceptan mascotas
- Formas de pago: transferencia, efectivo, tarjeta de crédito, débito y prepago

INCLUIDO EN TODAS LAS UNIDADES:
- Ropa de cama y toallas
- WiFi
- Cabañas: parrilla y cocina completamente equipada
- Calefacción central
- Cuna disponible bajo solicitud
- No incluye alimentación ni desayuno
- Camas adicionales: no disponemos
- Traslados y tours: disponibles mediante contactos que podemos entregar

FOTOS:
- Pueden verse en nuestro sitio web: https://artebrisapatagonia.com

DISPONIBILIDAD ACTUAL:
{context_disponibilidad}

INSTRUCCIONES:
1. Responde en el idioma en que te escribe el turista (español, inglés o portugués)
2. Usa un tono familiar y cercano, como si fueras parte del equipo de Arte Brisa
3. Sé conciso, máximo 3-4 oraciones por mensaje
4. Cuando alguien pida la ubicación, envía la dirección y el link de Google Maps del establecimiento correspondiente
5. Para consultas de disponibilidad usa el contexto provisto arriba
6. Si el turista quiere reservar, solicita: nombre, fechas, número de personas y tipo de unidad
7. Una vez con esos datos, confirma que registrarás la solicitud y que será confirmada a la brevedad con detalles de pago
8. No confirmes reservas de forma definitiva ni garantices disponibilidad sin verificar
9. Si hay queja, problema con reserva existente o necesitas tomar una decisión que no puedes: incluye ##DERIVAR## en tu respuesta
10. No inventes información. Si no sabes algo, dilo y ofrece derivar
11. No menciones que eres IA a menos que te lo pregunten directamente`

// ── Helpers ────────────────────────────────────────────────────────────────

function twimlEmpty(): Response {
    return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
    )
}

function jsonError(msg: string, status: number): Response {
    return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

/** Verifica la firma HMAC-SHA1 que Twilio adjunta en x-twilio-signature. */
async function validateTwilioSignature(
    req: Request,
    authToken: string,
    rawBody: string,
): Promise<boolean> {
    const twilioSig = req.headers.get('x-twilio-signature')
    if (!twilioSig) return false

    const params = new URLSearchParams(rawBody)

    // Twilio ordena los params alfabéticamente y los concatena a la URL base
    const sortedKeys = [...params.keys()].sort()
    let sigBase = TWILIO_WEBHOOK_URL
    for (const key of sortedKeys) {
        sigBase += key + (params.get(key) ?? '')
    }

    const mac = createHmac('sha1', authToken).update(sigBase).digest('base64')
    return mac === twilioSig
}

/** Formatea las reservas activas en texto legible para el system prompt. */
function formatAvailabilityContext(
    rows: Array<{ unit_id: string; check_in: string; check_out: string }>,
): string {
    if (rows.length === 0) return 'Sin reservas activas registradas en el sistema.'
    return rows
        .map(r => `- Unidad ${r.unit_id}: ocupada del ${r.check_in} al ${r.check_out}`)
        .join('\n')
}

function sanitizeMessages(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (messages.length === 0) return messages

    const result: Array<{ role: 'user' | 'assistant'; content: string }> = []

    for (const msg of messages) {
        if (result.length === 0) {
            result.push(msg)
        } else if (result[result.length - 1].role === msg.role) {
            result[result.length - 1].content += '\n' + msg.content
        } else {
            result.push(msg)
        }
    }

    // Asegurar que el último mensaje siempre sea del user
    // Si termina en assistant, remover ese último mensaje
    while (result.length > 0 && result[result.length - 1].role === 'assistant') {
        result.pop()
    }

    return result
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' },
        })
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    // ── Leer body crudo (necesario para validar firma Twilio) ─────────────
    const rawBody = await req.text()

    // ── Validar firma Twilio ──────────────────────────────────────────────
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const skipSig = Deno.env.get('SKIP_TWILIO_SIGNATURE') === 'true'
    const sigValid = skipSig || await validateTwilioSignature(req, twilioAuthToken, rawBody)
    if (!sigValid) {
        return jsonError('Forbidden: invalid Twilio signature', 403)
    }

    // ── Parsear campos del form-urlencoded de Twilio ──────────────────────
    const params      = new URLSearchParams(rawBody)
    const body        = params.get('Body')?.trim() ?? ''
    const fromRaw     = params.get('From') ?? ''          // whatsapp:+56XXXXXXXXX
    const messageSid  = params.get('MessageSid') ?? ''
    const profileName = params.get('ProfileName') ?? ''

    if (!fromRaw || !messageSid) {
        return twimlEmpty()
    }

    const phone = fromRaw.replace(/^whatsapp:/, '')       // +56XXXXXXXXX

    // ── Supabase client ───────────────────────────────────────────────────
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } },
    )

    // ── 1. Buscar o crear conversación ────────────────────────────────────
    let conversation: { id: string; status: string }

    const { data: existing } = await supabase
        .from('core_chat_conversations')
        .select('id, status')
        .eq('phone', phone)
        .maybeSingle()

    if (existing) {
        conversation = existing
    } else {
        const { data: created, error: createErr } = await supabase
            .from('core_chat_conversations')
            .insert({ phone, status: 'bot', contact_name: profileName || null })
            .select('id, status')
            .single()

        if (createErr || !created) {
            console.error('Error creando conversación:', createErr)
            return twimlEmpty()
        }
        conversation = created
    }

    // ── 2. Si está en modo humano: guardar y salir ─────────────────────────
    if (conversation.status === 'human') {
        await supabase.from('core_chat_messages').insert({
            conversation_id: conversation.id,
            role: 'user',
            content: body,
            twilio_sid: messageSid,
        })
        return twimlEmpty()
    }

    // ── 3. Deduplicar reintento de Twilio ─────────────────────────────────
    const { data: duplicate } = await supabase
        .from('core_chat_messages')
        .select('id')
        .eq('twilio_sid', messageSid)
        .maybeSingle()

    if (duplicate) {
        return twimlEmpty()
    }

    // ── 4. Guardar mensaje del usuario ────────────────────────────────────
    await supabase.from('core_chat_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: body,
        twilio_sid: messageSid,
    })

    // ── 5. Cargar historial (últimos 10 mensajes, con corte por gap de 2h) ──
    const { data: history } = await supabase
        .from('core_chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation.id)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(20)

    const historyAsc = (history ?? []).reverse()

    // Encontrar el último gap > 2 horas y tomar solo los mensajes posteriores
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000
    let sessionStart = 0
    for (let i = 1; i < historyAsc.length; i++) {
        const prev = new Date(historyAsc[i - 1].created_at).getTime()
        const curr = new Date(historyAsc[i].created_at).getTime()
        if (curr - prev > TWO_HOURS_MS) {
            sessionStart = i
        }
    }
    const sessionMessages = historyAsc.slice(sessionStart)
    const sessionHistory = sessionMessages.slice(-10)

    const messages = sessionHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
    }))

    // ── 6. Consultar disponibilidad ───────────────────────────────────────
    const { data: availability } = await supabase
        .from('core_reservations')
        .select('unit_id, check_in, check_out')
        .in('status', ['confirmed', 'blocked'])
        .gte('check_out', new Date().toISOString().split('T')[0])
        .order('check_in', { ascending: true })
        .limit(50)

    const availabilityCtx = formatAvailabilityContext(availability ?? [])
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{context_disponibilidad}', availabilityCtx)

    // ── 7. Llamar a Claude API ────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    const sanitizedMessages = sanitizeMessages(messages)
    const claudeResp = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: sanitizedMessages,
        }),
    })

    if (!claudeResp.ok) {
        const errText = await claudeResp.text()
        console.error('Claude API error:', claudeResp.status, errText)
        return twimlEmpty()
    }

    const claudeData = await claudeResp.json()
    console.log('Claude response:', JSON.stringify(claudeData?.content))
    let assistantText: string = claudeData?.content?.[0]?.text ?? ''

    // ── 8. Detectar ##DERIVAR## ───────────────────────────────────────────
    if (!assistantText || assistantText.trim() === '') {
        const fallbackMsg = 'Gracias por tu mensaje. En este momento estoy teniendo dificultades técnicas. Por favor escríbenos nuevamente en unos minutos.'
        assistantText = fallbackMsg
    }

    const shouldDerive = assistantText.includes('##DERIVAR##')
    if (shouldDerive) {
        assistantText = assistantText.replace(/##DERIVAR##/g, '').trim()

        await supabase
            .from('core_chat_conversations')
            .update({ status: 'human' })
            .eq('id', conversation.id)

        const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
        if (resendKey) {
            const displayName = profileName || phone
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: SENDER_EMAIL,
                    to: [RECIPIENT_EMAIL],
                    subject: 'Chat requiere atención humana',
                    text: `El chat con ${displayName} (${phone}) requiere atención humana.\n\nÚltimo mensaje: "${body}"`,
                    html: `<p>El chat con <strong>${displayName}</strong> (${phone}) requiere atención humana.</p><p>Último mensaje: <em>${body}</em></p>`,
                }),
            }).catch(e => console.error('Resend error:', e))
        }
    }

    // ── 9. Guardar respuesta del asistente ────────────────────────────────
    await supabase.from('core_chat_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantText,
    })

    // ── 10. Actualizar last_message_at ────────────────────────────────────
    await supabase
        .from('core_chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)

    // ── 11. Enviar respuesta vía Twilio REST API ───────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''
    const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const twilioBody = new URLSearchParams({
        From: fromNumber,
        To:   fromRaw,
        Body: assistantText,
    })

    const twilioSend = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
    })

    if (!twilioSend.ok) {
        const errText = await twilioSend.text()
        console.error('Twilio send error:', twilioSend.status, errText)
    }

    return twimlEmpty()
})

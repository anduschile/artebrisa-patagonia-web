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

// ── Contexto dinámico: unidades + tarifas ──────────────────────────────────

type Unit = {
    id: string
    name: string
    code: string
    unit_type: string
    capacity_total: number
    base_price: number
    property_id: string
    is_active: boolean
}

/**
 * Devuelve la fecha actual en formato 'YYYY-MM-DD' en hora de Chile (America/Santiago).
 * IMPORTANTE: Evita el bug de timezone donde UTC puede estar un día adelante durante
 * las noches chilenas (20:00-23:59 hora de Chile = día siguiente en UTC).
 */
function getTodayInChile(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
    const parts = formatter.formatToParts(new Date())
    const year = parts.find(p => p.type === 'year')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    return `${year}-${month}-${day}`
}

/**
 * Suma 'months' meses a una fecha 'YYYY-MM-DD' (string), sin librerías externas.
 * El día no se ajusta a meses cortos (ej. 31 de febrero es aceptable aquí):
 * el resultado solo se usa para comparación lexicográfica de strings ISO,
 * no como fecha calendario real.
 */
function addMonthsToDateString(dateStr: string, months: number): string {
    const [year, month, day] = dateStr.split('-').map(Number)
    const totalMonths = year * 12 + (month - 1) + months
    const newYear = Math.floor(totalMonths / 12)
    const newMonth = (totalMonths % 12) + 1
    const yyyy = String(newYear).padStart(4, '0')
    const mm = String(newMonth).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

/**
 * Carga las unidades activas desde core_units. Reutilizable por formatAvailabilityContext
 * y buildUnitsContext para mantener consistencia.
 */
async function getActiveUnits(supabase: any): Promise<Unit[]> {
    const { data: units, error: err } = await supabase
        .from('core_units')
        .select('id, name, code, unit_type, capacity_total, base_price, property_id, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (err) {
        console.error('[whatsapp-bot] Error fetching core_units:', err)
        return []
    }

    return units || []
}

/**
 * Construye un mapa { unit_id: code } para traducir UUIDs a códigos de unidad.
 * Los códigos son el identificador único legible en toda la conversación.
 */
function createUnitCodeMap(units: Unit[]): Record<string, string> {
    const map: Record<string, string> = {}
    units.forEach(unit => {
        map[unit.id] = unit.code
    })
    return map
}

/**
 * Calcula el precio total para una reserva, consultando overrides de precio
 * en una sola query para todo el rango de fechas (no N+1).
 */
async function calculateReservationPrice(
    supabase: any,
    unitId: string,
    checkIn: string,
    checkOut: string,
    unitBasePrice: number
): Promise<number> {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000))

    // UNA SOLA consulta para todos los overrides del rango
    const { data: overrides, error: err } = await supabase
        .from('core_unit_daily_rates')
        .select('date, price')
        .eq('unit_id', unitId)
        .gte('date', checkIn)
        .lt('date', checkOut)

    if (err) {
        console.error('[whatsapp-bot] calculateReservationPrice: error fetching rates:', err)
        return unitBasePrice * nights
    }

    // Construir mapa { date: price }
    const overridesMap: Record<string, number> = {}
    overrides?.forEach(r => {
        overridesMap[r.date] = Number(r.price)
    })

    // Calcular precio por cada noche
    let totalPrice = 0
    for (let i = 0; i < nights; i++) {
        const currentDate = new Date(checkInDate)
        currentDate.setDate(currentDate.getDate() + i)
        const dateStr = currentDate.toISOString().split('T')[0]
        const priceForDate = overridesMap[dateStr] ?? unitBasePrice
        totalPrice += priceForDate
    }

    return totalPrice
}

/**
 * Parsea el marcador ##RESERVA_LISTA##{JSON} de la respuesta del bot.
 * Retorna un objeto con { success: true, data } si está OK.
 * Retorna { success: false, reason, rawText? } si hay error:
 *   - 'no_marker': no hay marcador (continuar normalmente)
 *   - 'invalid_json': marcador presente pero JSON no parsea (derivar + email)
 */
function parseReservaLista(text: string):
    | { success: true; data: { nombre: string; check_in: string; check_out: string; personas: number; unidad_codigo: string } }
    | { success: false; reason: 'no_marker' | 'invalid_json'; rawText?: string } {

    const match = text.match(/##RESERVA_LISTA##(\{[^}]*\})/)
    if (!match) {
        return { success: false, reason: 'no_marker' }
    }

    try {
        const data = JSON.parse(match[1])
        return { success: true, data }
    } catch (e) {
        console.error('[whatsapp-bot] parseReservaLista: JSON inválido:', match[1], e)
        return { success: false, reason: 'invalid_json', rawText: match[1] }
    }
}

/**
 * Parsea el marcador ##COTIZAR##{JSON} de la respuesta del bot.
 * A diferencia de ##RESERVA_LISTA##, un fallo de parseo aquí no deriva a humano
 * ni dispara email — simplemente no se activa el flujo de cotización con precio real.
 */
function parseCotizar(text: string):
    | { success: true; data: { unit_code: string; check_in: string; check_out: string } }
    | { success: false } {

    const match = text.match(/##COTIZAR##(\{[^}]*\})/)
    if (!match) {
        return { success: false }
    }

    try {
        const data = JSON.parse(match[1])
        return { success: true, data }
    } catch (e) {
        console.error('[whatsapp-bot] parseCotizar: JSON inválido:', match[1], e)
        return { success: false }
    }
}

/**
 * Procesa una reserva confirmada desde WhatsApp.
 * Valida formato, disponibilidad, crea guest + reserva inquiry, dispara pago.
 *
 * GARANTÍA: SIEMPRE retorna { success, reason } o { success, paymentUrl, monto }
 * nunca lanza excepciones no controladas (try/catch global envuelve todo).
 */
async function processReservaLista(
    supabase: any,
    parsed: {
        nombre: string
        check_in: string
        check_out: string
        personas: number
        unidad_codigo: string
    },
    phone: string,
    conversationId: string,
    activeUnits: Unit[]
): Promise<{ success: boolean; paymentUrl?: string; monto?: number; reason?: string }> {
    try {
        // ── VALIDACIÓN DE FORMATO (antes de cualquier consulta a BD) ──────────
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/

        if (!dateRegex.test(parsed.check_in)) {
            return { success: false, reason: 'formato_check_in_invalido' }
        }
        if (!dateRegex.test(parsed.check_out)) {
            return { success: false, reason: 'formato_check_out_invalido' }
        }
        if (!Number.isInteger(parsed.personas) || parsed.personas <= 0) {
            return { success: false, reason: 'personas_invalido' }
        }

        // a. Lookup unit_id por code
        const unit = activeUnits.find(u => u.code === parsed.unidad_codigo)
        if (!unit) {
            return { success: false, reason: 'unidad_no_encontrada' }
        }

        const today = getTodayInChile()

        // b. Validar check_in < check_out y check_in >= hoy
        if (parsed.check_in >= parsed.check_out) {
            return { success: false, reason: 'fechas_invalidas_orden' }
        }
        if (parsed.check_in < today) {
            return { success: false, reason: 'check_in_en_pasado' }
        }
        if (parsed.check_in > addMonthsToDateString(today, 18)) {
            return { success: false, reason: 'check_in_fecha_muy_lejana' }
        }

        // c. Validar personas <= capacity_total
        if (parsed.personas > unit.capacity_total) {
            return { success: false, reason: 'capacidad_insuficiente' }
        }

        // d. Re-verificar disponibilidad (conflictos)
        const fourHoursAgoMs = Date.now() - 4 * 60 * 60 * 1000

        const { data: conflicts, error: conflictsErr } = await supabase
            .from('core_reservations')
            .select('check_in, check_out, status, created_at')
            .eq('unit_id', unit.id)
            .in('status', ['inquiry', 'confirmed', 'blocked'])
            .lt('check_in', parsed.check_out)

        if (conflictsErr) {
            console.error('[whatsapp-bot] processReservaLista: error checking conflicts:', conflictsErr)
            return { success: false, reason: 'error_verificando_disponibilidad' }
        }

        const activeConflicts = (conflicts || []).filter(r => {
            const isExpiredInquiry = r.status === 'inquiry' && new Date(r.created_at).getTime() < fourHoursAgoMs
            return !isExpiredInquiry && r.check_out > parsed.check_in
        })

        if (activeConflicts.length > 0) {
            return { success: false, reason: 'no_disponible' }
        }

        // f. Resolver guest_id (buscar por phone primero, sin riesgo de excepción por duplicados)
        let guest_id: string

        const { data: guestList, error: guestErr } = await supabase
            .from('core_guests')
            .select('id')
            .eq('phone', phone)
            .order('created_at', { ascending: true })
            .limit(1)

        if (guestErr) {
            console.error('[whatsapp-bot] processReservaLista: error querying guests:', guestErr)
            return { success: false, reason: 'error_buscando_guest' }
        }

        const existingGuest = guestList?.[0] || null

        if (existingGuest) {
            guest_id = existingGuest.id
        } else {
            // Llamar RPC find_or_create_guest con email null (forzar nueva si no existe)
            const { data: newGuestId, error: rpcErr } = await supabase.rpc('find_or_create_guest', {
                p_full_name: parsed.nombre.trim(),
                p_email: null,
                p_phone: phone,
            })

            if (rpcErr || !newGuestId) {
                console.error('[whatsapp-bot] processReservaLista: find_or_create_guest error:', rpcErr)
                return { success: false, reason: 'error_creando_guest' }
            }

            guest_id = newGuestId
        }

        // e. Buscar si ya existe una reserva 'inquiry' para el mismo guest/unit/fechas en últimos 30 min
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

        const { data: existingReservation } = await supabase
            .from('core_reservations')
            .select('id')
            .eq('guest_id', guest_id)
            .eq('unit_id', unit.id)
            .eq('check_in', parsed.check_in)
            .eq('check_out', parsed.check_out)
            .eq('status', 'inquiry')
            .gte('created_at', thirtyMinutesAgo)
            .maybeSingle()

        let reservationId: string

        if (existingReservation) {
            // Reusar la existente (deduplicación)
            reservationId = existingReservation.id
            console.log(`[whatsapp-bot] processReservaLista: reusando reserva existente ${reservationId}`)
        } else {
            // h. Calcular precios y crear nueva reserva
            const totalPrice = await calculateReservationPrice(supabase, unit.id, parsed.check_in, parsed.check_out, Number(unit.base_price))
            const nights = Math.ceil((new Date(parsed.check_out).getTime() - new Date(parsed.check_in).getTime()) / (24 * 60 * 60 * 1000))

            const { data: newReservation, error: insertErr } = await supabase
                .from('core_reservations')
                .insert({
                    property_id: unit.property_id,
                    unit_id: unit.id,
                    guest_id: guest_id,
                    channel_id: '6f103945-cd69-4c55-8610-5167b028bdb3', // WhatsApp
                    status: 'inquiry',
                    check_in: parsed.check_in,
                    check_out: parsed.check_out,
                    adults: parsed.personas,
                    children: 0,
                    quoted_total: totalPrice,
                    quoted_currency: 'CLP',
                    quoted_nights: nights,
                    notes: `Reserva vía WhatsApp. Conversación: ${conversationId}. Cobro: total de la reserva.`,
                })
                .select('id')
                .single()

            if (insertErr || !newReservation) {
                console.error('[whatsapp-bot] processReservaLista: insert reservation error:', insertErr)
                return { success: false, reason: 'error_creando_reserva' }
            }

            reservationId = newReservation.id
        }

        // i. Llamar a create-payment para obtener la URL y token
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
            console.error('[whatsapp-bot] processReservaLista: missing Supabase config')
            return { success: false, reason: 'error_config' }
        }

        // Obtener detalles de la reserva
        const { data: reservation } = await supabase
            .from('core_reservations')
            .select('quoted_total, quoted_nights')
            .eq('id', reservationId)
            .single()

        if (!reservation) {
            return { success: false, reason: 'reserva_no_encontrada' }
        }

        // Se cobra el TOTAL de la reserva (quoted_total), no un adelanto parcial
        const totalAmount = Number(reservation.quoted_total)

        const createPaymentUrl = `${SUPABASE_URL}/functions/v1/create-payment`

        const paymentRes = await fetch(createPaymentUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reservation_id: reservationId,
                amount: totalAmount,
            }),
        })

        if (!paymentRes.ok) {
            const errText = await paymentRes.text()
            console.error('[whatsapp-bot] processReservaLista: create-payment error:', paymentRes.status, errText)
            return { success: false, reason: 'error_pago' }
        }

        const paymentData = await paymentRes.json()

        // Actualizar reserva con datos de pago
        const { error: updateErr } = await supabase
            .from('core_reservations')
            .update({
                payment_id: paymentData.token,
                payment_url: paymentData.url,
                payment_buy_order: paymentData.buy_order,
                payment_created_at: new Date().toISOString(),
            })
            .eq('id', reservationId)

        if (updateErr) {
            console.error('[whatsapp-bot] processReservaLista: error updating payment fields:', updateErr)
        }

        // k. Notificar a Karina por WhatsApp (fire-and-forget)
        try {
            const karinasPhone = Deno.env.get('KARINA_WHATSAPP_PHONE') ?? '+56950921745'
            const check_inFormatted = new Date(parsed.check_in + 'T00:00:00').toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })
            const check_outFormatted = new Date(parsed.check_out + 'T00:00:00').toLocaleDateString('es-CL', { year: '2-digit', month: '2-digit', day: '2-digit' })
            const priceFormatted = totalAmount.toLocaleString('es-CL')

            const notificationMsg = `🔔 Nueva reserva WhatsApp\n👤 ${parsed.nombre}\n🏠 ${unit.name}\n📅 ${check_inFormatted} → ${check_outFormatted}\n👥 ${parsed.personas} personas\n💰 Total: $${priceFormatted}\n🔗 https://artebrisapatagonia.com/admin/reservas`

            const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
            const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
            const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

            if (accountSid && twilioAuthToken && fromNumber) {
                const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
                const twilioBody = new URLSearchParams({
                    From: fromNumber,
                    To: `whatsapp:${karinasPhone}`,
                    Body: notificationMsg,
                })

                await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + btoa(`${accountSid}:${twilioAuthToken}`),
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: twilioBody.toString(),
                }).catch(e => console.error('[whatsapp-bot] Error notificando a Karina:', e))
            }
        } catch (e) {
            console.error('[whatsapp-bot] Exception notificando a Karina:', e)
        }

        // j. Retornar éxito con URL y monto
        return {
            success: true,
            paymentUrl: paymentData.url,
            monto: totalAmount,
        }
    } catch (e) {
        // Try/catch GLOBAL — SIEMPRE retorna { success, reason }, nunca exception
        console.error('[whatsapp-bot] processReservaLista: error no controlado:', e)
        return { success: false, reason: 'error_desconocido' }
    }
}

/**
 * Construye el bloque dinámico de unidades + tarifas BASE para inyectar en el system prompt.
 * Muestra siempre base_price (precio "desde"), NUNCA el precio de hoy: este bloque es
 * contexto general de referencia, no una cotización para fechas específicas del huésped.
 * El precio real por rango de fechas se calcula aparte con calculateReservationPrice()
 * al momento de generar la reserva (##RESERVA_LISTA##).
 *
 * IMPORTANTE (Diseño de Identificación):
 * Identifica cada unidad por su CÓDIGO (unit.code), NO por UUID.
 * Cuando se implemente ##RESERVA_LISTA## en el flujo de pago, el modelo debe
 * generar el código de la unidad (ej: "CABIN1"), nunca un UUID.
 * El servidor hará lookup exacto: core_units WHERE code = $1 → id
 *
 * NOTA TÉCNICA (core_rate_rules):
 * core_rate_rules existe en la BD pero no tiene filas activas (verificado 2026-06-22).
 * Si en el futuro se cargan reglas estacionales, aplicarlas en calculateReservationPrice()
 * (precio real por rango), no en este bloque de precios base.
 * TAMBIÉN ACTUALIZAR: getDailyRatesForRange() en src/components/ReservationWidget.jsx
 * para mantener consistencia de precios entre canales (web y WhatsApp).
 */
async function buildUnitsContext(supabase: any, units: Unit[]): Promise<string> {
    if (!units || units.length === 0) {
        return 'TARIFAS: No hay unidades disponibles cargadas en el sistema.'
    }

    // Agrupar por unit_type
    const byType: Record<string, Unit[]> = {}
    units.forEach(unit => {
        if (!byType[unit.unit_type]) byType[unit.unit_type] = []
        byType[unit.unit_type].push(unit)
    })

    // Construir el bloque (precio BASE "desde" — el precio final depende de las fechas
    // exactas de la estadía y se calcula aparte, ver instrucción 4b del system prompt)
    const lines: string[] = ['TARIFAS BASE POR NOCHE ("desde", en pesos chilenos):']
    lines.push('')

    for (const [unitType, unitList] of Object.entries(byType)) {
        const typeLabel = unitType === 'cabana' ? 'Cabañas Familiares' :
                          unitType === 'tiny_house' ? 'Tiny Houses' :
                          unitType === 'departamento' ? 'Departamentos' :
                          unitType

        lines.push(`${typeLabel}:`)

        for (const unit of unitList) {
            const priceStr = new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Number(unit.base_price))

            // Usar CÓDIGO (unit.code), NO UUID
            lines.push(
                `- ${unit.name} [código: ${unit.code}] (máx ${unit.capacity_total} personas): desde ${priceStr} por noche`
            )
        }

        lines.push('')
    }

    return lines.join('\n')
}

const SYSTEM_PROMPT_TEMPLATE = `Eres el asistente virtual de Arte Brisa Patagonia, un complejo de alojamiento en Puerto Natales, Chile. Te llamas Arte Brisa Patagonia y hablas de forma cálida y familiar con los turistas.

La fecha de hoy es {fecha_actual}. Cuando el huésped mencione una fecha sin especificar el año (ej: "4 de octubre", "del 20 al 25 de diciembre"), asume el año más próximo que sea igual o posterior a hoy. Si la fecha mencionada ya pasó este año, asume el año siguiente. Nunca asumas un año más de 18 meses hacia el futuro sin que el huésped lo especifique explícitamente.

ESTABLECIMIENTOS:

Departamentos Patagonia
- Dirección: Guacolda 1615, entre Patagonia y 18 de Septiembre, Puerto Natales
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

{context_tarifas}

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
4b. PRECIOS Y COTIZACIONES:
   - La sección TARIFAS BASE POR NOCHE muestra precios "desde", calculados sobre la tarifa
     base de cada unidad. NO es necesariamente el precio final: la tarifa real puede variar
     según temporada y fechas exactas.
   - Si el turista aún no te ha confirmado fechas de check-in y check-out específicas, puedes
     mostrar el precio "desde $X" de la sección TARIFAS BASE.
   - Si el turista ya te confirmó fechas específicas para una unidad determinada, pero todavía
     no tienes los 5 datos completos para generar la reserva (instrucción 6), NO inventes ni
     calcules tú mismo el precio final para esas fechas — usa el marcador ##COTIZAR## de la
     instrucción 4c en vez de responder con texto.
   - Nunca afirmes un precio final concreto para fechas específicas basándote en la sección
     TARIFAS BASE POR NOCHE: es solo un precio de referencia general (precio base), no el
     precio real calculado para el rango de fechas del turista.
4c. COTIZACIÓN DE FECHAS ESPECÍFICAS (##COTIZAR##):
   Si el turista ya te confirmó fechas de check-in y check-out específicas para una unidad
   determinada (aunque todavía no tengas los demás datos para completar la reserva de la
   instrucción 6), responde ÚNICAMENTE con el siguiente marcador, sin ningún otro texto antes
   o después en ese turno:
   ##COTIZAR##{"unit_code":"CODE","check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD"}
   - Usa el CODE exacto de la unidad (mismos códigos de la instrucción 6)
   - El JSON debe estar en UNA SOLA línea, sin espacios extra ni saltos
   - Este marcador se procesa automáticamente servidor-side — el turista nunca lo verá; el
     sistema calculará el precio real y generará la respuesta que el turista sí recibirá
   - No mezcles este marcador con texto conversacional en el mismo turno
5. VERIFICACIÓN DE DISPONIBILIDAD (sigue este procedimiento exacto):
   Antes de confirmar que una unidad está disponible para fechas solicitadas por el turista,
   revisa la sección DISPONIBILIDAD ACTUAL. Una unidad está OCUPADA para las fechas solicitadas
   si se cumple esta condición:
   (fecha_checkin_solicitada < fecha_fin_bloqueo) Y (fecha_checkout_solicitada > fecha_inicio_bloqueo)
   Es decir: si el rango solicitado se superpone EN CUALQUIER PARTE con un rango marcado como
   'ocupado' para esa misma unidad, NO está disponible, sin excepciones, incluso si la
   superposición es parcial. Si tienes cualquier duda sobre el cálculo, o las fechas son
   ambiguas, NO confirmes disponibilidad — pide que te confirmen las fechas exactas o incluye
   ##DERIVAR##. Nunca confirmes disponibilidad sin haber verificado explícitamente contra
   el bloque de DISPONIBILIDAD ACTUAL para ese código de unidad específico.
5b. PRIORIDAD DE DATOS: La sección DISPONIBILIDAD ACTUAL siempre refleja el estado
   MÁS RECIENTE y VERIFICADO del sistema, generado en este mismo momento. Si en el historial
   de la conversación ya confirmaste disponibilidad para una unidad/fecha en un mensaje
   anterior, pero el bloque DISPONIBILIDAD ACTUAL de ahora indica que esa unidad está
   ocupada para esas fechas, DEBES corregirte explícitamente con el cliente
   (ej: "Disculpa la confusión, al verificar nuevamente no tenemos disponibilidad para
   esas fechas") en lugar de mantener la afirmación anterior. Los datos frescos de
   DISPONIBILIDAD ACTUAL siempre tienen prioridad sobre cualquier afirmación previa tuya
   en la conversación.
5c. CONSULTAS DE ÚLTIMO MOMENTO VS. CONSULTAS DE RANGO AMPLIO:
   - Si el turista pregunta por disponibilidad para EL MISMO DÍA (hoy) o con menos de
     24 horas de anticipación, deriva a humano con ##DERIVAR## — estas consultas requieren
     confirmación humana inmediata porque pueden depender de información que cambia en
     tiempo real.
   - Si el turista pregunta por un MES CALENDARIO COMPLETO o un rango amplio de fechas
     (ej. "¿hay algo en junio?", "¿qué tienen para julio?"), responde directamente usando
     el bloque DISPONIBILIDAD ACTUAL, sin derivar, salvo que genuinamente no tengas datos
     suficientes para ese rango. Si TODAS las unidades están ocupadas para ese mes completo
     según los datos, dilo directamente: "Lamentablemente no tenemos disponibilidad durante
     [mes], todas nuestras unidades están reservadas/bloqueadas en ese período." NO derives
     a humano solo porque el mes esté completo o vacío de disponibilidad — esa es información
     que ya tienes y puedes comunicar tú mismo.
6. GENERACIÓN DE RESERVA (##RESERVA_LISTA##):
   Si el turista ha confirmado EXPLÍCITAMENTE (mediante mensajes claros del cliente):
   - Su nombre completo
   - Fecha de check-in (YYYY-MM-DD)
   - Fecha de check-out (YYYY-MM-DD)
   - Número de personas (SOLO ADULTOS, sin niños; si hay niños, deriva con ##DERIVAR##)
   - Código de unidad — usa EXACTAMENTE uno de estos códigos: CAB-CHILCO, CAB-CIRUELILLO, CAB-FLOR-DE-NOTRO, CAB-LUPINO, DEP-1, DEP-2, DEP-3, DEP-4, TINY-CALAFATE, TINY-MARGARITA, TINY-NIRRE, TINY-VIOLETA

   Y si NO detectas problemas de disponibilidad, capacidad o fechas inválidas,
   incluye al final de tu respuesta (en una línea nueva separada) el marcador:
   ##RESERVA_LISTA##{"nombre":"Nombre Completo","check_in":"YYYY-MM-DD","check_out":"YYYY-MM-DD","personas":N,"unidad_codigo":"CODE"}

   REGLAS CRÍTICAS:
   - El JSON debe estar en UNA SOLA línea, sin espacios extra ni saltos
   - Usa el CODE exacto de la unidad (nunca el nombre conversacional, nunca UUID, ej: CAB-CHILCO, DEP-2, TINY-NIRRE)
   - Este marcador se procesa automáticamente servidor-side — el turista nunca lo verá
   - Si hay CUALQUIER duda sobre disponibilidad, capacidad o validación, NO incluyas el marcador
   - Si el turista menciona NIÑOS o MENORES, deriva con ##DERIVAR## en lugar del marcador
7. Si el turista quiere reservar, solicita: nombre, fechas, número de personas y tipo de unidad
8. Una vez que tengas los 5 datos confirmados (nombre, check-in, check-out, personas, unidad), NO envíes un mensaje de confirmación manual — en cambio, genera el marcador ##RESERVA_LISTA## según la instrucción 6. El sistema procesará el pago automáticamente.
9. No confirmes reservas de forma definitiva ni garantices disponibilidad sin verificar
10. Si hay queja, problema con reserva existente o necesitas tomar una decisión que no puedes: incluye ##DERIVAR## en tu respuesta
11. No inventes información. Si no sabes algo, dilo y ofrece derivar
12. No menciones que eres IA a menos que te lo pregunten directamente`

// ── Helpers ────────────────────────────────────────────────────────────────

function twimlEmpty(): Response {
    return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } },
    )
}

function twimlMessage(text: string): Response {
    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text}</Message></Response>`,
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

/**
 * Formatea las reservas activas en texto legible, consolidando rangos superpuestos.
 *
 * Algoritmo de consolidación (merge overlapping intervals):
 * 1. Agrupar filas por unit_id
 * 2. Ordenar rangos de cada unidad por check_in ascendente
 * 3. Recorrer y fusionar: si check_in del rango actual <= check_out del anterior,
 *    extender el anterior (no crear líneas duplicadas)
 * 4. Generar una línea por cada rango consolidado
 *
 * @param rows Array de reservas activas con unit_id (UUID), check_in, check_out
 * @param unitCodeMap Mapa { unit_id: code } para traducir UUIDs a códigos
 * @returns String formateado (rangos consolidados) para inyectar en el system prompt
 */
function formatAvailabilityContext(
    rows: Array<{ unit_id: string; check_in: string; check_out: string }>,
    unitCodeMap: Record<string, string>,
): string {
    if (rows.length === 0) return 'Sin reservas activas registradas en el sistema.'

    // ── 1. Agrupar por unit_id ──────────────────────────────────────────────
    const byUnit: Record<string, Array<{ check_in: string; check_out: string }>> = {}
    rows.forEach(r => {
        if (!byUnit[r.unit_id]) byUnit[r.unit_id] = []
        byUnit[r.unit_id].push({ check_in: r.check_in, check_out: r.check_out })
    })

    const lines: string[] = []

    // ── 2-4. Para cada unidad: consolidar rangos y generar líneas ──────────
    for (const [unitId, ranges] of Object.entries(byUnit)) {
        const code = unitCodeMap[unitId]
        const identifier = code || `[UUID: ${unitId} - unidad no encontrada]`

        // Ordenar por check_in
        ranges.sort((a, b) => a.check_in.localeCompare(b.check_in))

        // Consolidar (merge overlapping intervals)
        const consolidated: Array<{ check_in: string; check_out: string }> = []
        for (const range of ranges) {
            if (consolidated.length === 0) {
                consolidated.push(range)
            } else {
                const last = consolidated[consolidated.length - 1]
                // Si check_in del nuevo rango es <= check_out del anterior, se solapan o son adyacentes
                if (range.check_in <= last.check_out) {
                    // Extender check_out al máximo de ambos
                    last.check_out = [last.check_out, range.check_out].sort((a, b) => a.localeCompare(b))[1]
                } else {
                    // Nuevo rango sin superposición
                    consolidated.push(range)
                }
            }
        }

        // Generar una línea por cada rango consolidado
        for (const range of consolidated) {
            lines.push(`- Unidad ${identifier}: ocupada del ${range.check_in} al ${range.check_out}`)
        }
    }

    return lines.join('\n')
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
    // TEMPORAL DIAGNÓSTICO — REMOVER
    console.log('[TWILIO-SIG-DEBUG] Header signature:', req.headers.get('x-twilio-signature'))
    console.log('[TWILIO-SIG-DEBUG] From:', new URLSearchParams(rawBody).get('From'))
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    const skipSig = Deno.env.get('SKIP_TWILIO_SIGNATURE') === 'true'
    const sigValid = skipSig || await validateTwilioSignature(req, twilioAuthToken, rawBody)
    // TEMPORAL DIAGNÓSTICO — REMOVER
    console.log('[TWILIO-SIG-DEBUG] sigValid:', sigValid, 'skipSig:', skipSig)
    if (!sigValid) {
        // TEMPORAL DIAGNÓSTICO — REMOVER
        console.error('[TWILIO-SIG-DEBUG] Firma inválida para From:', new URLSearchParams(rawBody).get('From'))
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

    // TEMPORAL DIAGNÓSTICO — REMOVER
    console.log('[BOT-FLOW] Conversación:', conversation.id, 'From:', phone)

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
    if (body === '') {
        // Mensaje sin texto (imagen, audio, sticker, ubicación, etc.)
        await supabase.from('core_chat_messages').insert({
            conversation_id: conversation.id,
            role: 'user',
            content: '[Mensaje multimedia]',
            twilio_sid: messageSid,
        })

        return twimlMessage('Solo puedo procesar mensajes de texto. Si tienes alguna consulta sobre disponibilidad o reservas, escríbeme con texto.')
    }

    const { data: insertedMsg } = await supabase
        .from('core_chat_messages')
        .insert({
            conversation_id: conversation.id,
            role: 'user',
            content: body,
            twilio_sid: messageSid,
        })
        .select('id')
        .single()

    // TEMPORAL DIAGNÓSTICO — REMOVER
    console.log('[BOT-FLOW] Mensaje guardado, id:', insertedMsg?.id)

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

    // ── 6. Cargar unidades activas (reutilizable para tarifas + disponibilidad) ────────
    const activeUnits = await getActiveUnits(supabase)
    const unitCodeMap = createUnitCodeMap(activeUnits)

    // ── 7. Consultar disponibilidad ───────────────────────────────────────
    const fourHoursAgoMs = Date.now() - 4 * 60 * 60 * 1000

    const { data: allReservations } = await supabase
        .from('core_reservations')
        .select('unit_id, check_in, check_out, status, created_at')
        .in('status', ['inquiry', 'confirmed', 'blocked'])
        .gte('check_out', new Date().toISOString().split('T')[0])
        .order('check_in', { ascending: true })
        .limit(50)

    // Filter in-memory: confirmed/blocked always count, inquiry only if created less than 4 hours ago
    const availability = (allReservations || []).filter(r => {
        const isExpiredInquiry = r.status === 'inquiry' && new Date(r.created_at).getTime() < fourHoursAgoMs
        return !isExpiredInquiry
    })

    // Ambos bloques de contexto ahora usan el mismo identificador (code)
    const availabilityCtx = formatAvailabilityContext(availability ?? [], unitCodeMap)
    const unitsCtx = await buildUnitsContext(supabase, activeUnits)
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
        .replace('{context_tarifas}', unitsCtx)
        .replace('{context_disponibilidad}', availabilityCtx)
        .replace('{fecha_actual}', getTodayInChile())

    // DEBUG: Loguear el systemPrompt completo para auditoría
    console.log('[whatsapp-bot] === SYSTEM PROMPT ENVIADO A CLAUDE ===')
    console.log(systemPrompt)
    console.log('[whatsapp-bot] === FIN SYSTEM PROMPT ===')

    // ── 8. Llamar a Claude API ────────────────────────────────────────────
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

    // ── 9. Detectar y procesar ##COTIZAR## (cotización con precio real, 2da llamada) ────
    const cotizarResult = parseCotizar(assistantText)

    if (cotizarResult.success) {
        const { unit_code, check_in, check_out } = cotizarResult.data
        const cotizarStart = Date.now()
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        const unit = activeUnits.find(u => u.code === unit_code)
        let usedFallback = false

        const priceFallbackText = (basePrice: number) =>
            `Dame un momento para confirmarte el precio exacto para esas fechas 🙂 Mientras tanto, el precio de referencia de ${unit_code} es desde ${basePrice.toLocaleString('es-CL')} por noche.`

        if (!unit) {
            // unit_code inválido generado por el LLM: señal de que algo no cuadra, amerita revisión humana
            usedFallback = true
            console.error(`[whatsapp-bot] ##COTIZAR## unit_code no encontrado: ${unit_code}`)
            assistantText = `Dame un momento para confirmarte disponibilidad y precio para esas fechas 🙂 Ya te contacto con la información.`

            await supabase
                .from('core_chat_conversations')
                .update({ status: 'human' })
                .eq('id', conversation.id)
        } else if (!dateRegex.test(check_in) || !dateRegex.test(check_out) || check_in >= check_out) {
            usedFallback = true
            console.error(`[whatsapp-bot] ##COTIZAR## fechas inválidas: check_in=${check_in} check_out=${check_out}`)
            assistantText = priceFallbackText(Number(unit.base_price))
        } else {
            try {
                const totalPrice = await calculateReservationPrice(supabase, unit.id, check_in, check_out, Number(unit.base_price))
                const nights = Math.ceil((new Date(check_out).getTime() - new Date(check_in).getTime()) / (24 * 60 * 60 * 1000))
                const avgPrice = Math.round(totalPrice / nights)

                const priceNote = `El precio real calculado para ${unit_code} del ${check_in} al ${check_out} es $${totalPrice.toLocaleString('es-CL')} total ($${avgPrice.toLocaleString('es-CL')}/noche, ${nights} noches). Comunícaselo al huésped de forma natural y cálida, invitándolo a continuar con la reserva si le interesa.`

                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 8000)

                try {
                    const secondResp = await fetch(CLAUDE_API_URL, {
                        method: 'POST',
                        headers: {
                            'x-api-key': anthropicKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: CLAUDE_MODEL,
                            max_tokens: 1024,
                            system: `${systemPrompt}\n\n${priceNote}`,
                            messages: sanitizedMessages,
                        }),
                        signal: controller.signal,
                    })

                    if (!secondResp.ok) {
                        throw new Error(`HTTP ${secondResp.status}`)
                    }

                    const secondData = await secondResp.json()
                    const secondText: string = secondData?.content?.[0]?.text ?? ''

                    if (!secondText.trim()) {
                        throw new Error('respuesta vacía')
                    }

                    assistantText = secondText
                } finally {
                    clearTimeout(timeoutId)
                }
            } catch (e) {
                usedFallback = true
                const reason = (e as Error).name === 'AbortError' ? 'timeout_8s' : (e as Error).message
                console.error(`[whatsapp-bot] ##COTIZAR## segunda llamada falló (${reason})`)
                assistantText = priceFallbackText(Number(unit.base_price))
            }
        }

        console.log(`[whatsapp-bot] ##COTIZAR## disparado: unit_code=${unit_code} check_in=${check_in} check_out=${check_out} elapsed_ms=${Date.now() - cotizarStart} fallback=${usedFallback}`)
    }

    // ── 10. Detectar y procesar ##RESERVA_LISTA## ─────────────────────────────
    const parseResult = parseReservaLista(assistantText)

    if (parseResult.success) {
        // JSON parseó correctamente — procesar la reserva
        assistantText = assistantText.replace(/##RESERVA_LISTA##\{[^}]*\}/, '').trim()

        const paymentResult = await processReservaLista(
            supabase,
            parseResult.data,
            phone,
            conversation.id,
            activeUnits
        )

        if (paymentResult.success) {
            // ✅ Éxito: agregar confirmación con link de pago
            const montoStr = paymentResult.monto?.toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })
            assistantText += `\n\n✅ *Reserva confirmada*\n\nTotal a pagar: ${montoStr}\n\n🔗 [Completa tu pago aquí](${paymentResult.paymentUrl})\n\n(El código de acceso a la unidad te llegará 24 horas antes del check-in)`
        } else if (paymentResult.reason === 'check_in_fecha_muy_lejana') {
            // ⚠️ Posible año mal inferido: pedir aclaración sin derivar a humano
            console.error(`[whatsapp-bot] Fecha muy lejana en ##RESERVA_LISTA## (posible año mal inferido): ${JSON.stringify(parseResult.data)}`)
            assistantText += `\n\nCreo que puede haber un malentendido con el año de la fecha — ¿me puedes confirmar el año exacto de tu check-in? Por ejemplo: "4 de octubre de 2026".`
        } else {
            // ❌ Fallo en processReservaLista: derivar a humano + email específico
            console.error(`[whatsapp-bot] Fallo al procesar ##RESERVA_LISTA##: ${paymentResult.reason}`)
            assistantText += `\n\n⚠️ No pudimos procesar tu reserva en este momento. Nuestro equipo se pondrá en contacto contigo para ayudarte.`

            // Derivar a humano
            await supabase
                .from('core_chat_conversations')
                .update({ status: 'human' })
                .eq('id', conversation.id)

            // Email específico con detalles del fallo
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
                        subject: 'Error procesando reserva desde WhatsApp',
                        text: `Error procesando ##RESERVA_LISTA## con ${displayName} (${phone}).\n\nMotivo: ${paymentResult.reason}\n\nDatos parseados:\n${JSON.stringify(parseResult.data, null, 2)}\n\nÚltimo mensaje del turista: "${body}"`,
                        html: `<p>Error procesando <code>##RESERVA_LISTA##</code> con <strong>${displayName}</strong> (${phone}).</p><p><strong>Motivo del fallo:</strong> <code>${paymentResult.reason}</code></p><p><strong>Datos parseados:</strong></p><pre>${JSON.stringify(parseResult.data, null, 2)}</pre><p><strong>Último mensaje del turista:</strong> <em>${body}</em></p>`,
                    }),
                }).catch(e => console.error('Resend error:', e))
            }
        }
    } else if (parseResult.reason === 'invalid_json') {
        // JSON malformado en ##RESERVA_LISTA##: derivar a humano + email específico
        console.error(`[whatsapp-bot] JSON malformado en ##RESERVA_LISTA##: ${parseResult.rawText}`)
        assistantText = assistantText.replace(/##RESERVA_LISTA##\{[^}]*\}/, '').trim()
        assistantText += `\n\n⚠️ No pudimos procesar tu solicitud. Nuestro equipo se pondrá en contacto contigo.`

        // Derivar a humano
        await supabase
            .from('core_chat_conversations')
            .update({ status: 'human' })
            .eq('id', conversation.id)

        // Email específico para JSON malformado
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
                    subject: 'JSON inválido en ##RESERVA_LISTA##',
                    text: `El modelo generó un marcador ##RESERVA_LISTA## con JSON malformado.\n\nTeléfono: ${phone}\n\nJSON crudo que no pudo parsearse:\n${parseResult.rawText}\n\nÚltimo mensaje del turista: "${body}"`,
                    html: `<p>El modelo generó un marcador <code>##RESERVA_LISTA##</code> con JSON malformado.</p><p><strong>Teléfono:</strong> ${phone}</p><p><strong>JSON crudo que no pudo parsearse:</strong></p><pre>${parseResult.rawText}</pre><p><strong>Último mensaje del turista:</strong> <em>${body}</em></p>`,
                }),
            }).catch(e => console.error('Resend error:', e))
        }
    }
    // Si parseResult.reason === 'no_marker': no hacer nada especial, continuar

    // ── 11. Detectar ##DERIVAR## (flujo normal, sin cambios) ──────────────────
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

    // ── 12. Guardar respuesta del asistente ───────────────────────────────
    await supabase.from('core_chat_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantText,
    })

    // ── 13. Actualizar last_message_at ────────────────────────────────────
    await supabase
        .from('core_chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)

    // ── 14. Enviar respuesta vía Twilio REST API ───────────────────────────
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

    // TEMPORAL DIAGNÓSTICO — REMOVER
    console.log('[BOT-FLOW] Respuesta enviada a Twilio, status:', twilioSend.status)

    if (!twilioSend.ok) {
        const errText = await twilioSend.text()
        console.error('Twilio send error:', twilioSend.status, errText)
    }

    return twimlEmpty()
})

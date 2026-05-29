// ─── notify-inquiry Edge Function ─────────────────────────────────────────────
// Supabase Edge Function (Deno) — no external npm dependencies.
//
// POST /functions/v1/notify-inquiry
//
// Disparada por un Supabase Database Webhook en INSERT sobre core_reservations
// con status = 'inquiry'. Envía un email de aviso a la casilla de reservas vía Resend.
//
// Deploy con --no-verify-jwt. Se protege con un secreto compartido en el header
// x-webhook-secret, validado contra NOTIFY_WEBHOOK_SECRET (mismo patrón que sync-ical).
//
// Variables de entorno / secrets requeridos:
//   SUPABASE_URL              — auto-inyectada por Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-inyectada; usada para el JOIN units + guests (bypassa RLS)
//   RESEND_API_KEY            — API key de Resend (supabase secrets set RESEND_API_KEY=...)
//   NOTIFY_WEBHOOK_SECRET     — secreto compartido; debe coincidir con el header del webhook
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RECIPIENT = 'reservasartebrisa@gmail.com'
const SENDER = 'Arte Brisa Patagonia <reservas@artebrisapatagonia.com>'
const ADMIN_URL = 'https://artebrisapatagonia.com/admin/reservas'

// ── Types ──────────────────────────────────────────────────────────────────
interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    schema: string
    record: ReservationRecord | null
    old_record: ReservationRecord | null
}

interface ReservationRecord {
    id: string
    unit_id: string | null
    guest_id: string | null
    check_in: string
    check_out: string
    status: string
    quoted_total: number | null
    quoted_nights: number | null
    channel_id: string | null
    notes: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCLP(amount: number | null): string {
    if (amount == null) return 'No cotizado'
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(amount)
}

/** Noches entre dos fechas ISO (YYYY-MM-DD). */
function nightsBetween(checkIn: string, checkOut: string): number {
    const a = new Date(checkIn + 'T00:00:00Z').getTime()
    const b = new Date(checkOut + 'T00:00:00Z').getTime()
    const diff = Math.round((b - a) / 86_400_000)
    return diff > 0 ? diff : 0
}

/** '2026-05-28' → '28-05-2026' */
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

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    // ── Auth por secreto compartido (función con --no-verify-jwt) ────────────
    const expectedSecret = Deno.env.get('NOTIFY_WEBHOOK_SECRET')
    if (expectedSecret) {
        const provided = req.headers.get('x-webhook-secret')
        if (provided !== expectedSecret) {
            return jsonResponse({ error: 'Unauthorized' }, 401)
        }
    }

    // ── Parsear payload del webhook ──────────────────────────────────────────
    let payload: WebhookPayload
    try {
        payload = await req.json()
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const record = payload.record
    if (!record || payload.type !== 'INSERT') {
        return jsonResponse({ skipped: 'No es INSERT o sin record' }, 200)
    }

    // Defensivo: el trigger ya filtra status='inquiry', pero re-chequeamos.
    if (record.status !== 'inquiry') {
        return jsonResponse({ skipped: `status=${record.status}` }, 200)
    }

    // ── Traer la reserva completa (JOIN units + guests) ──────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    })

    const { data: full, error: fetchErr } = await supabase
        .from('core_reservations')
        .select(`
            id, check_in, check_out, status, quoted_total, quoted_nights, notes,
            core_units ( code, name ),
            core_guests ( full_name, email, phone )
        `)
        .eq('id', record.id)
        .single()

    if (fetchErr || !full) {
        return jsonResponse({ error: `Fetch falló: ${fetchErr?.message ?? 'no encontrada'}` }, 500)
    }

    // PostgREST puede devolver la relación embebida como objeto o como array.
    const unit = Array.isArray(full.core_units) ? full.core_units[0] : full.core_units
    const guest = Array.isArray(full.core_guests) ? full.core_guests[0] : full.core_guests

    const unitName = unit?.name ?? '—'
    const unitCode = unit?.code ?? '—'
    const guestName = guest?.full_name ?? 'Sin nombre'
    const guestEmail = guest?.email ?? '—'
    const guestPhone = guest?.phone ?? '—'
    const nights = full.quoted_nights ?? nightsBetween(full.check_in, full.check_out)
    const total = formatCLP(full.quoted_total)

    // ── Armar email ──────────────────────────────────────────────────────────
    const subject = `Nueva consulta de reserva — ${unitName} (${formatDate(full.check_in)} → ${formatDate(full.check_out)})`

    const row = (label: string, value: string, bold = false) =>
        `<tr><td style="padding:6px 12px 6px 0; color:#666;">${label}</td>` +
        `<td style="padding:6px 0;">${bold ? `<strong>${value}</strong>` : value}</td></tr>`

    const html = `
<div style="font-family: Arial, sans-serif; color: #222; max-width: 560px;">
  <h2 style="margin:0 0 16px;">Nueva consulta de reserva</h2>
  <p style="margin:0 0 16px;">Entró una nueva consulta (<strong>inquiry</strong>) en el sistema:</p>
  <table style="border-collapse: collapse; width: 100%;">
    ${row('Unidad', `${escapeHtml(unitName)} (${escapeHtml(unitCode)})`, true)}
    ${row('Check-in', escapeHtml(formatDate(full.check_in)))}
    ${row('Check-out', escapeHtml(formatDate(full.check_out)))}
    ${row('Noches', String(nights))}
    ${row('Huésped', escapeHtml(guestName))}
    ${row('Email', escapeHtml(guestEmail))}
    ${row('Teléfono', escapeHtml(guestPhone))}
    ${row('Total cotizado', escapeHtml(total), true)}
  </table>
  ${full.notes ? `<p style="margin:16px 0 0; color:#666;">Notas: ${escapeHtml(full.notes)}</p>` : ''}
  <p style="margin:24px 0 0;">
    <a href="${ADMIN_URL}" style="background:#1f6feb; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; display:inline-block;">Ver en el panel</a>
  </p>
  <p style="margin:12px 0 0; color:#999; font-size:13px;">${ADMIN_URL}</p>
</div>`.trim()

    const text = [
        'Nueva consulta de reserva',
        '',
        `Unidad: ${unitName} (${unitCode})`,
        `Check-in: ${formatDate(full.check_in)}`,
        `Check-out: ${formatDate(full.check_out)}`,
        `Noches: ${nights}`,
        `Huésped: ${guestName}`,
        `Email: ${guestEmail}`,
        `Teléfono: ${guestPhone}`,
        `Total cotizado: ${total}`,
        full.notes ? `Notas: ${full.notes}` : '',
        '',
        `Ver en el panel: ${ADMIN_URL}`,
    ].filter(Boolean).join('\n')

    // ── Enviar vía Resend ──────────────────────────────────────────────────────
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
        return jsonResponse({ error: 'RESEND_API_KEY no configurada' }, 500)
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: SENDER, to: [RECIPIENT], subject, html, text }),
    })

    if (!resendResp.ok) {
        const errBody = await resendResp.text()
        return jsonResponse({ error: `Resend falló: HTTP ${resendResp.status}`, detail: errBody }, 502)
    }

    const sent = await resendResp.json()
    return jsonResponse({ ok: true, reservation_id: full.id, email_id: sent?.id ?? null })
})

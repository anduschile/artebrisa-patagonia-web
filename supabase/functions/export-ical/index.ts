// ─── export-ical Edge Function ────────────────────────────────────────────────
// Supabase Edge Function (Deno) — no external npm dependencies.
//
// GET /functions/v1/export-ical?unit=<unit_code>&channel=<airbnb|booking>
//
// Public endpoint (deploy with --no-verify-jwt). Returns a VCALENDAR (.ics)
// with future confirmed + blocked reservations for the unit, so that
// Booking, Airbnb and other iCal-aware platforms can import availability.
//
// IMPORTANT — feedback-loop avoidance:
// In-house reservations (external_source IS NULL: web, phone, walk-in,
// low-season) are always exported to every channel.
// Reservations imported from an OTA via sync-ical (external_source = 'ical')
// are excluded ONLY from the export that goes back to that same OTA, to
// avoid a feedback loop: Airbnb → Arte Brisa → export-ical → Airbnb.
// They ARE exported to every OTHER channel, so e.g. a Booking.com
// reservation still blocks the dates on Airbnb, and vice versa.
//
// - ?channel=airbnb  → excludes reservations with channel_id = Airbnb's
// - ?channel=booking → excludes reservations with channel_id = Booking's
// - channel omitted  → back-compat fallback: excludes ALL reservations with
//   external_source non-null (legacy behaviour, used by the 24 URLs
//   configured in Airbnb/Booking before this parameter existed)
//
// Environment variables required (auto-injected by Supabase):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (used to bypass RLS for this read-only export)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Types ────────────────────────────────────────────────────────────────────
interface GuestRef {
    full_name: string | null
}

interface ReservationRow {
    id: string
    check_in: string
    check_out: string
    status: string
    notes: string | null
    external_source: string | null
    channel_id: string | null
    core_guests: GuestRef | GuestRef[] | null
}

// ── Channel mapping ──────────────────────────────────────────────────────────
// Same channel_id values used by sync-ical when importing OTA reservations.
const CHANNEL_IDS: Record<string, string> = {
    airbnb: 'd7e30a58-20db-40eb-bfe5-d53ded1e493e',
    booking: '68df4842-1461-4cef-aaf3-97b51a400ec1',
}

// ── ICS helpers ──────────────────────────────────────────────────────────────

/** '2026-05-25' → '20260525' */
function toIcsDate(iso: string): string {
    return iso.replace(/-/g, '')
}

/** YYYYMMDDTHHMMSSZ (UTC, for DTSTAMP) */
function nowStamp(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    )
}

/** RFC 5545 §3.3.11 text escape — only , ; \ \n */
function escapeText(s: string | null | undefined): string {
    if (!s) return ''
    return s
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
}

/** RFC 5545 §3.1 line folding — max 75 octets, continuation with CRLF + space */
function foldLine(line: string): string {
    const MAX = 75
    if (line.length <= MAX) return line
    const out: string[] = [line.slice(0, MAX)]
    let i = MAX
    while (i < line.length) {
        out.push(' ' + line.slice(i, i + (MAX - 1)))
        i += (MAX - 1)
    }
    return out.join('\r\n')
}

/** Today as YYYY-MM-DD in America/Santiago — used to filter out past stays */
function todayInChile(): string {
    // Build a date string in es-CL with sv-SE format (gives ISO date)
    const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' })
    return d // 'YYYY-MM-DD'
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {

    // CORS preflight (for browser fetches; OTAs are server-to-server)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            },
        })
    }

    if (req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    const url = new URL(req.url)
    const unitCode = url.searchParams.get('unit')?.trim()

    if (!unitCode) {
        return new Response('Missing required query param: unit', {
            status: 400,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    }

    // ── Optional ?channel= param (back-compat: omitted = legacy behaviour) ───
    const channelParam = url.searchParams.get('channel')?.trim().toLowerCase() || null
    let requestingChannelId: string | null = null
    if (channelParam) {
        requestingChannelId = CHANNEL_IDS[channelParam] ?? null
        if (!requestingChannelId) {
            return new Response(
                `Invalid channel: '${channelParam}'. Valid values: ${Object.keys(CHANNEL_IDS).join(', ')}`,
                {
                    status: 400,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }
            )
        }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    })

    // ── 1. Lookup unit by code ───────────────────────────────────────────────
    const { data: unit, error: unitErr } = await supabase
        .from('core_units')
        .select('id, code, name')
        .eq('code', unitCode)
        .maybeSingle()

    if (unitErr) {
        return new Response(`DB error looking up unit: ${unitErr.message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    }
    if (!unit) {
        return new Response(`Unit not found: ${unitCode}`, {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    }

    // ── 2. Fetch active future reservations ──────────────────────────────────
    const today = todayInChile()

    const { data: reservations, error: resErr } = await supabase
        .from('core_reservations')
        .select('id, check_in, check_out, status, notes, external_source, channel_id, core_guests(full_name)')
        .eq('unit_id', unit.id)
        .in('status', ['confirmed', 'blocked'])
        .gte('check_out', today)
        .order('check_in', { ascending: true })

    if (resErr) {
        return new Response(`DB error fetching reservations: ${resErr.message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    }

    // ── Feedback-loop filter ─────────────────────────────────────────────────
    // In-house reservations (external_source null) always pass through.
    // OTA-imported reservations are excluded only from the export that goes
    // back to their own channel; no ?channel= means the legacy behaviour
    // (exclude every OTA-imported reservation) so the 24 existing URLs keep
    // working unchanged.
    const filteredReservations = ((reservations || []) as ReservationRow[]).filter((r) => {
        if (!r.external_source) return true
        if (!requestingChannelId) return false
        return r.channel_id !== requestingChannelId
    })

    // ── 3. Build VCALENDAR ───────────────────────────────────────────────────
    const host = 'artebrisapatagonia.com'
    const stamp = nowStamp()
    const calName = `${unit.name || unit.code} — Arte Brisa Patagonia`

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Arte Brisa Patagonia//Reservations Export 1.0//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        foldLine(`X-WR-CALNAME:${escapeText(calName)}`),
        'X-WR-TIMEZONE:America/Santiago',
    ]

    for (const r of filteredReservations) {
        // Guest name: PostgREST may return the embedded relation as obj OR array
        const g = r.core_guests
        const guestName = Array.isArray(g) ? g[0]?.full_name : g?.full_name

        let summary: string
        if (r.status === 'blocked') {
            summary = 'Bloqueado'
        } else if (guestName && guestName.trim()) {
            summary = `Reserva — ${guestName.trim()}`
        } else {
            summary = 'Reserva confirmada'
        }

        const description = (r.notes && r.notes.trim())
            ? r.notes.trim()
            : `Reserva ${r.status} en ${unit.name || unit.code}`

        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${r.id}@${host}`)
        lines.push(`DTSTAMP:${stamp}`)
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(r.check_in)}`)
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(r.check_out)}`)
        lines.push(foldLine(`SUMMARY:${escapeText(summary)}`))
        lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`))
        lines.push('STATUS:CONFIRMED')
        lines.push('TRANSP:OPAQUE')
        lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')

    // RFC 5545 §3.1: CRLF line endings + final CRLF
    const ics = lines.join('\r\n') + '\r\n'

    return new Response(ics, {
        status: 200,
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="cal-${unitCode.toLowerCase()}.ics"`,
            // Booking polls every ~2-6 h, Airbnb every ~2-3 h. Cache 5 min is safe.
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'Access-Control-Allow-Origin': '*',
        },
    })
})

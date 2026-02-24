// ─── sync-ical Edge Function ──────────────────────────────────────────────────
// Supabase Edge Function (Deno) — no external npm dependencies.
//
// POST /functions/v1/sync-ical
//
// Environment variables required (set via `supabase secrets set`):
//   SUPABASE_URL              — automatically injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — your project's service role key (bypasses RLS)
//
// Returns JSON:
//   { calendars: CalendarResult[], totals: Totals, synced_at: string }
//
// Minimal required columns in core_external_calendars:
//   id (uuid), is_active (bool), ics_url (text), unit_id (uuid, nullable)
//
// Optional columns (used if present, ignored if missing):
//   source (text), name (text), last_synced_at (timestamptz)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Types ────────────────────────────────────────────────────────────────────
interface Calendar {
    id: string
    ics_url: string
    unit_id: string | null
    // Optional columns — may not exist in the table yet
    name?: string | null
    source?: string | null
}

interface VEvent {
    uid: string
    dtstart: string   // 'YYYY-MM-DD'
    dtend: string     // 'YYYY-MM-DD'
    summary: string
}

interface CalendarResult {
    calendar_id: string
    display_name: string   // derived label, never null
    inserted: number
    updated: number
    skipped: number
    errors: string[]
}

/** Build a human-readable label for the calendar even when `name` is absent. */
function calendarLabel(cal: Calendar): string {
    if (cal.name) return cal.name
    const prefix = cal.source ? cal.source.charAt(0).toUpperCase() + cal.source.slice(1) : 'iCal'
    return `${prefix} (${cal.unit_id?.slice(0, 8) ?? cal.id.slice(0, 8)}…)`
}

// ── iCal parser ──────────────────────────────────────────────────────────────
/**
 * Parse an ICS text into an array of VEvent objects.
 * Handles both DATE (YYYYMMDD) and DATETIME (YYYYMMDDTHHmmssZ) formats.
 */
function parseIcs(icsText: string): VEvent[] {
    const events: VEvent[] = []
    const blocks = icsText
        .replace(/\r\n/g, '\n')
        .replace(/\n[ \t]/g, '')         // unfold long lines (RFC 5545 §3.1)
        .split('BEGIN:VEVENT')

    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i]
        const uid = extractProp(block, 'UID') ?? `generated-${i}`
        const dtstart = extractDateProp(block, 'DTSTART')
        const dtend = extractDateProp(block, 'DTEND')
        const summary = extractProp(block, 'SUMMARY') ?? ''

        if (!dtstart || !dtend) continue
        if (dtend <= dtstart) continue

        events.push({ uid, dtstart, dtend, summary })
    }
    return events
}

function extractProp(block: string, prop: string): string | undefined {
    const match = block.match(new RegExp(`^${prop}[;:][^\n]*`, 'm'))
    if (!match) return undefined
    const colonIdx = match[0].indexOf(':')
    return colonIdx >= 0 ? match[0].slice(colonIdx + 1).trim() : undefined
}

function extractDateProp(block: string, prop: string): string | undefined {
    const match = block.match(new RegExp(`^${prop}[^:\n]*:([^\n]+)`, 'm'))
    if (!match) return undefined
    return icsDateToIso(match[1].trim())
}

function icsDateToIso(raw: string): string | undefined {
    const digits = raw.replace(/[^0-9]/g, '')
    if (digits.length < 8) return undefined
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    })

    // ── Fetch active calendars ─────────────────────────────────────────────────
    // Select only the guaranteed-to-exist columns.
    // name and source are selected tentatively — if the migration hasn't run,
    // the query will still succeed because we handle missing columns gracefully
    // by not requiring them. However, PostgREST will error on unknown columns, so
    // we only include them if present; the safest approach is to always run the
    // migration first or use a try/fallback here.
    //
    // Strategy: first try with optional columns; on error, retry with minimal set.
    let calendars: Calendar[] | null = null
    let calErr: { message: string } | null = null

        // Try with optional columns (name, source)
        ; ({ data: calendars, error: calErr } = await supabase
            .from('core_external_calendars')
            .select('id, ics_url, unit_id, name, source')
            .eq('is_active', true))

    if (calErr) {
        // Fallback: minimal columns only
        ; ({ data: calendars, error: calErr } = await supabase
            .from('core_external_calendars')
            .select('id, ics_url, unit_id')
            .eq('is_active', true))
    }

    if (calErr) {
        return jsonResponse({ error: `Failed to fetch calendars: ${calErr.message}` }, 500)
    }

    if (!calendars || calendars.length === 0) {
        return jsonResponse({
            message: 'No active calendars found.',
            calendars: [],
            totals: zeroTotals(),
            synced_at: new Date().toISOString(),
        })
    }

    // ── Get or create the SYSTEM guest ────────────────────────────────────────
    const systemGuestId = await getOrCreateSystemGuest(supabase)

    // ── Process each calendar ─────────────────────────────────────────────────
    const results: CalendarResult[] = []
    const globalTotals = zeroTotals()

    for (const cal of calendars as Calendar[]) {
        const result = await processCalendar(supabase, cal, systemGuestId)
        results.push(result)
        globalTotals.inserted += result.inserted
        globalTotals.updated += result.updated
        globalTotals.skipped += result.skipped
        globalTotals.errors += result.errors.length

        // Update last_synced_at — ignore error if column doesn't exist yet
        await supabase
            .from('core_external_calendars')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', cal.id)
            .then(() => { /* silent */ })
    }

    return jsonResponse({
        calendars: results,
        totals: globalTotals,
        synced_at: new Date().toISOString(),
    })
})

// ── Process a single calendar ─────────────────────────────────────────────────
async function processCalendar(
    supabase: ReturnType<typeof createClient>,
    cal: Calendar,
    systemGuestId: string,
): Promise<CalendarResult> {
    const result: CalendarResult = {
        calendar_id: cal.id,
        display_name: calendarLabel(cal),
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [],
    }

    if (!cal.unit_id) {
        const msg = 'Calendar has no unit_id — skipping'
        result.errors.push(msg)
        await logSyncError(supabase, {
            calendar_id: cal.id,
            unit_id: null,
            ics_url: cal.ics_url,
            error_message: msg,
        })
        return result
    }

    // ── Fetch ICS ─────────────────────────────────────────────────────────────
    let icsText: string
    try {
        const resp = await fetch(cal.ics_url, {
            headers: { 'User-Agent': 'ArteBrisa-iCalSync/1.0' },
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        icsText = await resp.text()
    } catch (e) {
        const msg = `Failed to fetch ICS: ${(e as Error).message}`
        result.errors.push(msg)
        await logSyncError(supabase, {
            calendar_id: cal.id,
            unit_id: cal.unit_id,
            ics_url: cal.ics_url,
            error_message: msg,
            error_stack: (e as Error).stack,
        })
        return result
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    let events: VEvent[]
    try {
        events = parseIcs(icsText)
    } catch (e) {
        const msg = `Failed to parse ICS: ${(e as Error).message}`
        result.errors.push(msg)
        await logSyncError(supabase, {
            calendar_id: cal.id,
            unit_id: cal.unit_id,
            ics_url: cal.ics_url,
            error_message: msg,
            error_stack: (e as Error).stack,
        })
        return result
    }

    // ── Get property_id from unit ─────────────────────────────────────────────
    const { data: unit } = await supabase
        .from('core_units')
        .select('property_id')
        .eq('id', cal.unit_id)
        .single()

    const propertyId = unit?.property_id ?? null

    // ── Channel & Provider Mapping ────────────────────────────────────────────
    const source = (cal.source || '').toLowerCase()
    let provider = source || 'ical'
    let channelId: string | null = null

    if (source.includes('airbnb')) {
        provider = 'airbnb'
        channelId = 'd7e30a58-20db-40eb-bfe5-d53ded1e493e'
    } else if (source.includes('booking')) {
        provider = 'booking'
        channelId = '68df4842-1461-4cef-aaf3-97b51a400ec1'
    }

    // Force system guest
    const guestId = 'c7782684-5e23-44b7-957a-4bfa5c41a7d2'

    // ── Upsert each VEVENT ────────────────────────────────────────────────────
    for (const ev of events) {
        if (!channelId) {
            const msg = `UID ${ev.uid}: Unknown provider '${cal.source}' - Missing channel_id`
            result.errors.push(msg)
            await logSyncError(supabase, {
                calendar_id: cal.id,
                unit_id: cal.unit_id,
                ics_url: cal.ics_url,
                event_uid: ev.uid,
                event_summary: ev.summary,
                raw_event: JSON.stringify(ev),
                error_message: msg,
            })
            result.skipped++
            continue
        }

        try {
            const payload = {
                property_id: propertyId,
                unit_id: cal.unit_id,
                guest_id: guestId,
                channel_id: channelId,
                status: 'blocked',
                check_in: ev.dtstart,
                check_out: ev.dtend,
                adults: 0,
                children: 0,
                notes: ev.summary ? `[${provider.toUpperCase()}] ${ev.summary}` : `[${provider.toUpperCase()}] Bloqueo externo`,
                external_provider: provider,
                external_uid: ev.uid,
                external_calendar_id: cal.id,
                external_source: 'ical',
            }

            const { data: existing, error: selectErr } = await supabase
                .from('core_reservations')
                .select('id')
                .eq('unit_id', cal.unit_id)
                .eq('external_provider', provider)
                .eq('external_uid', ev.uid)
                .maybeSingle()

            if (selectErr) throw new Error(`Select error: ${selectErr.message}`)

            if (existing?.id) {
                const { error: updateErr } = await supabase
                    .from('core_reservations')
                    .update(payload)
                    .eq('id', existing.id)

                if (updateErr) throw new Error(`Update error: ${updateErr.message}`)
                result.updated++
            } else {
                const { error: insertErr } = await supabase
                    .from('core_reservations')
                    .insert(payload)
                    .select('id')
                    .single()

                if (insertErr) {
                    if (insertErr.code === '23505') {
                        result.skipped++
                    } else {
                        throw new Error(`Insert error: ${insertErr.message}`)
                    }
                } else {
                    result.inserted++
                }
            }
        } catch (e) {
            const msg = `UID ${ev.uid}: ${(e as Error).message}`
            result.errors.push(msg)
            await logSyncError(supabase, {
                calendar_id: cal.id,
                unit_id: cal.unit_id,
                ics_url: cal.ics_url,
                event_uid: ev.uid,
                event_summary: ev.summary,
                raw_event: JSON.stringify(ev),
                error_message: (e as Error).message,
                error_stack: (e as Error).stack,
            })
        }
    }

    return result
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function logSyncError(
    supabase: ReturnType<typeof createClient>,
    {
        calendar_id,
        unit_id,
        ics_url,
        event_uid = null,
        event_summary = null,
        raw_event = null,
        error_message,
        error_stack = null,
    }: {
        calendar_id: string
        unit_id: string | null
        ics_url: string
        event_uid?: string | null
        event_summary?: string | null
        raw_event?: string | null
        error_message: string
        error_stack?: string | null
    }
) {
    const payload = {
        calendar_id,
        unit_id,
        provider: 'ical', // generalized
        direction: 'import',
        ics_url,
        event_uid,
        event_summary,
        raw_event: raw_event && typeof raw_event === 'object' ? JSON.stringify(raw_event) : raw_event,
        error_message,
        error_stack,
    }

    console.error('[sync-ical error]', payload)

    try {
        await supabase.from('core_ical_sync_errors').insert(payload)
    } catch (dbErr) {
        console.error('Failed to register error in core_ical_sync_errors:', dbErr)
    }
}

async function getOrCreateSystemGuest(
    supabase: ReturnType<typeof createClient>,
): Promise<string> {
    const { data, error } = await supabase.rpc('find_or_create_guest', {
        p_full_name: 'SISTEMA',
        p_email: null,
        p_phone: null,
    })
    if (!error && data) return data

    const { data: existing } = await supabase
        .from('core_guests')
        .select('id')
        .eq('full_name', 'SISTEMA')
        .limit(1)
        .single()
    if (existing) return existing.id

    const { data: created } = await supabase
        .from('core_guests')
        .insert({ full_name: 'SISTEMA' })
        .select('id')
        .single()
    return created!.id
}

function zeroTotals() {
    return { inserted: 0, updated: 0, skipped: 0, errors: 0 }
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    })
}

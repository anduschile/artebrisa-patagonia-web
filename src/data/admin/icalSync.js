import { supabase } from '../../lib/supabaseClient'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Invoke the `sync-ical` Edge Function with explicit auth headers.
 * @returns {Promise<{ calendars: Array, totals: object, synced_at: string }>}
 */
export async function runIcalSync() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
        throw new Error('No session token')
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    }

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/sync-ical`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
    })

    if (!resp.ok) {
        const text = await resp.text()
        let msg = `HTTP ${resp.status}`
        try {
            const parsed = JSON.parse(text)
            msg = parsed.error || parsed.message || msg
        } catch (e) {
            msg = text || msg
        }
        throw new Error(msg)
    }

    return resp.json()
}

/**
 * Fetch all iCal calendars for display in the admin.
 * Selects only guaranteed columns; name/source/last_synced_at are optional.
 * Falls back to minimal columns if the extended select fails.
 */
export async function getExternalCalendars() {
    // Try with optional columns first
    let { data, error } = await supabase
        .from('core_external_calendars')
        .select('id, ics_url, is_active, unit_id, name, source, last_synced_at, core_units(id, name, code)')
        .order('is_active', { ascending: false })

    if (error) {
        // Fallback: minimal guaranteed columns
        ; ({ data, error } = await supabase
            .from('core_external_calendars')
            .select('id, ics_url, is_active, unit_id')
            .order('is_active', { ascending: false }))
    }

    if (error) throw new Error(`getExternalCalendars: ${error.message}`)
    return (data || []).map(cal => ({
        ...cal,
        // Derive display label if name column is absent or null
        display_name: cal.name
            ?? (cal.source
                ? `${cal.source.charAt(0).toUpperCase()}${cal.source.slice(1)}`
                : 'iCal')
            + ` (${(cal.unit_id ?? cal.id)?.slice(0, 8) ?? ''}…)`,
    }))
}

/**
 * Toggle the is_active flag of a calendar.
 */
export async function setCalendarActive(id, isActive) {
    const { error } = await supabase
        .from('core_external_calendars')
        .update({ is_active: isActive })
        .eq('id', id)
    if (error) throw new Error(`setCalendarActive: ${error.message}`)
}

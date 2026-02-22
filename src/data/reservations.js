import { supabase } from '../lib/supabaseClient'

/**
 * Check for overlapping reservations using the half-open interval [check_in, check_out).
 * Overlap condition: existing.check_in < new_check_out AND existing.check_out > new_check_in
 *
 * NOTE: PostgREST does not support comparing two columns directly in a filter,
 * so we fetch reservations for the unit within a broad date window and filter
 * in-memory. This is correct and documented here intentionally.
 *
 * @param {{ unit_id: number|string, check_in: string, check_out: string }} params  (dates as 'YYYY-MM-DD')
 * @returns {Promise<Array>} array of conflicting reservations (empty = available)
 */
export async function getConflicts({ unit_id, check_in, check_out }) {
    const ACTIVE_STATUSES = ['inquiry', 'confirmed', 'blocked']

    // Fetch all active reservations for this unit that could possibly overlap:
    // existing.check_in < check_out_new  →  existing.check_in is before our checkout
    const { data, error } = await supabase
        .from('core_reservations')
        .select('id, check_in, check_out, status')
        .eq('unit_id', unit_id)
        .in('status', ACTIVE_STATUSES)
        .lt('check_in', check_out)   // PostgreSQL can compare dates as strings (ISO format)

    if (error) throw new Error(`getConflicts: ${error.message}`)

    // In-memory filter: existing.check_out > check_in_new
    const conflicts = (data || []).filter(r => r.check_out > check_in)

    return conflicts
}

/**
 * Insert a new inquiry reservation.
 *
 * @param {{
 *   unit: object,         // full unit record (needs unit.id, unit.property_id)
 *   guest_id: string,
 *   channel_id: string,
 *   check_in: string,     // 'YYYY-MM-DD'
 *   check_out: string,    // 'YYYY-MM-DD'
 *   adults?: number,
 *   children?: number,
 *   notes?: string
 * }} params
 * @returns {Promise<object>} the created reservation row
 */
export async function createInquiryReservation({
    unit,
    guest_id,
    channel_id,
    check_in,
    check_out,
    adults = 1,
    children = 0,
    notes = '',
}) {
    const payload = {
        property_id: unit.property_id,
        unit_id: unit.id,
        guest_id,
        channel_id,
        status: 'inquiry',
        check_in,
        check_out,
        adults: adults || 1,
        children: children || 0,
        ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
    }

    const { data, error } = await supabase
        .from('core_reservations')
        .insert(payload)
        .select()
        .single()

    if (error) throw new Error(`createInquiryReservation: ${error.message}`)

    return data
}

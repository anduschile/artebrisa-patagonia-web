import { supabase } from '../../lib/supabaseClient'

/**
 * Fetch all reservations for admin use, with nested guest + unit + channel.
 * Authenticated users only (RLS must allow it).
 */
export async function getAdminReservations({ status = null, from = null, to = null, unit_id = null } = {}) {
    let q = supabase
        .from('core_reservations')
        .select(`
            id,
            created_at,
            status,
            check_in,
            check_out,
            adults,
            children,
            notes,
            unit_id,
            property_id,
            channel_id,
            guest_id,
            core_units ( id, name, code, unit_type ),
            core_guests ( id, full_name, email, phone ),
            core_channels ( id, name )
        `)
        .order('check_in', { ascending: false })
        .limit(100)

    if (status && status !== 'all') q = q.eq('status', status)
    if (unit_id) q = q.eq('unit_id', unit_id)
    if (from) q = q.gte('check_in', from)
    if (to) q = q.lte('check_in', to)

    const { data, error } = await q
    if (error) throw new Error(`getAdminReservations: ${error.message}`)
    return data || []
}

/**
 * Update the status of a single reservation.
 */
export async function updateReservationStatus(id, status) {
    const { error } = await supabase
        .from('core_reservations')
        .update({ status })
        .eq('id', id)
    if (error) throw new Error(`updateReservationStatus: ${error.message}`)
}

/**
 * Create a manual block reservation.
 * Uses the find_or_create_guest RPC with a SYSTEM guest.
 */
export async function createBlock({ unit_id, property_id, check_in, check_out, notes = '', channel_id }) {
    // Get or create a SYSTEM guest
    const { data: guestId, error: guestErr } = await supabase.rpc('find_or_create_guest', {
        p_full_name: 'SISTEMA',
        p_email: null,
        p_phone: null,
    })
    if (guestErr) throw new Error(`createBlock guest: ${guestErr.message}`)

    const { data, error } = await supabase
        .from('core_reservations')
        .insert({
            property_id,
            unit_id,
            guest_id: guestId,
            channel_id: channel_id || null,
            status: 'blocked',
            check_in,
            check_out,
            adults: 0,
            children: 0,
            notes: notes || 'Bloqueo manual',
        })
        .select()
        .single()

    if (error) throw new Error(`createBlock insert: ${error.message}`)
    return data
}

/**
 * Check for confirmed conflicts before blocking.
 */
export async function getBlockConflicts({ unit_id, check_in, check_out }) {
    const { data, error } = await supabase
        .from('core_reservations')
        .select('id, check_in, check_out, status')
        .eq('unit_id', unit_id)
        .in('status', ['confirmed', 'blocked'])
        .lt('check_in', check_out)
    if (error) throw new Error(`getBlockConflicts: ${error.message}`)
    return (data || []).filter(r => r.check_out > check_in)
}

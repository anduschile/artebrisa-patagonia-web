import { supabase } from '../lib/supabaseClient'

/**
 * Find or create a guest via the `find_or_create_guest` Supabase RPC.
 * This avoids the need for public SELECT/INSERT on core_guests.
 *
 * @param {{ full_name: string, email?: string, phone?: string }} params
 * @returns {Promise<string>} guest id (uuid)
 */
export async function findOrCreateGuest({ full_name, email, phone }) {
    if (!full_name || full_name.trim() === '') {
        throw new Error('full_name es obligatorio para crear un huésped')
    }

    const { data, error } = await supabase.rpc('find_or_create_guest', {
        p_full_name: full_name.trim(),
        p_email: email?.trim()?.toLowerCase() || null,
        p_phone: phone?.trim() || null,
    })

    if (error) throw new Error(`find_or_create_guest RPC: ${error.message}`)

    return data // the RPC returns the guest uuid directly
}

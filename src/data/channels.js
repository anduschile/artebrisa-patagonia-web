import { supabase } from '../lib/supabaseClient'

/** In-memory cache so we only query once per session */
let cachedChannelId = null

/**
 * Returns the id of the channel with code='WEB' from core_channels.
 * Creates the channel if it doesn't exist (requires INSERT permission).
 * Cached in memory.
 */
export async function getWebChannelId() {
    if (cachedChannelId) return cachedChannelId

    const { data, error } = await supabase
        .from('core_channels')
        .select('id')
        .eq('code', 'WEB')
        .maybeSingle()

    if (error) throw new Error(`getWebChannelId: ${error.message}`)

    if (data) {
        cachedChannelId = data.id
        return cachedChannelId
    }

    // Channel doesn't exist — insert it
    const { data: inserted, error: insertError } = await supabase
        .from('core_channels')
        .insert({ code: 'WEB', name: 'Web Directa' })
        .select('id')
        .single()

    if (insertError) throw new Error(`getWebChannelId insert: ${insertError.message}`)

    cachedChannelId = inserted.id
    return cachedChannelId
}

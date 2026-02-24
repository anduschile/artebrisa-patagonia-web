import { supabase } from '../../lib/supabaseClient'

/** Fetch all units (skip is_active filter) for admin dropdowns. */
export async function getAllUnits() {
    const { data, error } = await supabase
        .from('core_units')
        .select('id, name, code, unit_type, property_id, is_active')
        .eq('is_active', true)
        .order('unit_type')
        .order('name')
    if (error) throw new Error(`getAllUnits: ${error.message}`)
    return data || []
}

/** Fetch all channels for block form. */
export async function getAllChannels() {
    const { data, error } = await supabase
        .from('core_channels')
        .select('id, name')
        .order('name')
    if (error) throw new Error(`getAllChannels: ${error.message}`)
    return data || []
}

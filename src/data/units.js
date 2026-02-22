import { supabase } from '../lib/supabaseClient'

/**
 * Obtiene unidades activas filtradas por tipo desde core_units.
 * @param {'cabana' | 'departamento'} type
 * @returns {Promise<Array>}
 */
export async function getUnitsByType(type) {
    const { data, error } = await supabase
        .from('core_units')
        .select('id,name,code,unit_type,capacity_total,description,is_active,property_id')
        .eq('is_active', true)
        .eq('unit_type', type)
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching units:', error)
        return []
    }

    return data || []
}

/**
 * Obtiene hasta N unidades destacadas (mix de tipos) para la home.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getFeaturedUnits(limit = 4) {
    const { data, error } = await supabase
        .from('core_units')
        .select(`
      id,
      name,
      code,
      unit_type,
      capacidad_total,
      imagen_url,
      price_from,
      is_active
    `)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(limit)

    if (error) {
        console.error('Error fetching featured units:', error)
        return []
    }

    return data || []
}

/**
 * Obtiene una unidad por ID.
 * @param {string | number} id
 * @returns {Promise<Object|null>}
 */
export async function getUnitById(id) {
    const { data, error } = await supabase
        .from('core_units')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching unit:', error)
        return null
    }

    return data
}

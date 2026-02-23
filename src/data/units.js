import { supabase } from '../lib/supabaseClient'

/**
 * Obtiene unidades activas filtradas por tipo desde core_units.
 * @param {'cabana' | 'departamento'} type
 * @returns {Promise<Array>}
 */
export async function getUnitsByType(type) {
    const { data, error } = await supabase
        .from('core_units')
        .select('id,name,code,unit_type,capacity_total,description,is_active,property_id,base_price')
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
      base_price,
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

/**
 * Obtiene tarifa override para una unidad y fecha específica.
 * @param {string} unitId
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<number|null>}
 */
export async function getDailyRateOverride(unitId, date) {
    const { data, error } = await supabase
        .from('core_unit_daily_rates')
        .select('price')
        .eq('unit_id', unitId)
        .eq('date', date)
        .maybeSingle()

    if (error) {
        console.error('Error fetching rate override:', error)
        return null
    }

    return data?.price || null
}

/**
 * Obtiene tarifas override para una unidad en un rango de fechas.
 * @param {string} unitId
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} endDate 'YYYY-MM-DD' (última noche inclusive)
 * @returns {Promise<Object>} Map de { date: price }
 */
export async function getDailyRatesForRange(unitId, startDate, endDate) {
    const { data, error } = await supabase
        .from('core_unit_daily_rates')
        .select('date, price')
        .eq('unit_id', unitId)
        .gte('date', startDate)
        .lte('date', endDate)

    if (error) {
        console.error('Error fetching rates for range:', error)
        return {}
    }

    const ratesMap = {}
    data?.forEach(r => {
        ratesMap[r.date] = r.price
    })
    return ratesMap
}

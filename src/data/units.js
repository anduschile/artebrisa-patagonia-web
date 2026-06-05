import { supabase } from '../lib/supabaseClient'

/**
 * Obtiene unidades activas filtradas por tipo desde core_units.
 * @param {'cabana' | 'departamento'} type
 * @returns {Promise<Array>}
 */
export async function getUnitsByType(type) {
    const { data, error } = await supabase
        .from('core_units')
        .select('id, name, code, unit_type, capacity_total, description, base_price, is_active')
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
        .select('id, name, code, unit_type, capacity_total, base_price, is_active')
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

/**
 * Devuelve las unidades disponibles para un rango de fechas y cantidad de personas.
 * No modifica getConflicts — usa queries independientes en paralelo.
 *
 * @param {{ check_in: string, check_out: string, guests: number }} params  (fechas YYYY-MM-DD)
 * @returns {Promise<Array>} unidades disponibles, ordenadas por capacidad más ajustada primero
 */
export async function getAvailableUnits({ check_in, check_out, guests }) {
    const ACTIVE_STATUSES = ['inquiry', 'confirmed', 'blocked']

    const [unitsRes, conflictsRes] = await Promise.all([
        supabase
            .from('core_units')
            .select('id, name, code, unit_type, capacity_total, bed_config, description, base_price, is_active')
            .eq('is_active', true),
        supabase
            .from('core_reservations')
            .select('unit_id, check_out')
            .in('status', ACTIVE_STATUSES)
            .lt('check_in', check_out),
    ])

    if (unitsRes.error) throw new Error(`getAvailableUnits: ${unitsRes.error.message}`)
    if (conflictsRes.error) throw new Error(`getAvailableUnits: ${conflictsRes.error.message}`)

    const conflictingIds = new Set(
        (conflictsRes.data || [])
            .filter(r => r.check_out > check_in)
            .map(r => r.unit_id)
    )

    return (unitsRes.data || [])
        .filter(unit => {
            const cap = unit.capacity_total ?? 0
            return !conflictingIds.has(unit.id) && cap >= guests
        })
        .sort((a, b) => {
            const capA = a.capacity_total ?? 0
            const capB = b.capacity_total ?? 0
            return (capA - guests) - (capB - guests)
        })
}

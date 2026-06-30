import { supabase } from '../../lib/supabaseClient'

export async function getRateRules() {
    const { data, error } = await supabase
        .from('core_rate_rules')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
    if (error) throw new Error(`getRateRules: ${error.message}`)
    return data || []
}

export async function createRateRule(rule) {
    const { data, error } = await supabase
        .from('core_rate_rules')
        .insert(rule)
        .select()
        .single()
    if (error) throw new Error(`createRateRule: ${error.message}`)
    return data
}

export async function updateRateRule(id, patch) {
    const { data, error } = await supabase
        .from('core_rate_rules')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
    if (error) throw new Error(`updateRateRule: ${error.message}`)
    return data
}

export async function deleteRateRule(id) {
    const { error } = await supabase
        .from('core_rate_rules')
        .delete()
        .eq('id', id)
    if (error) throw new Error(`deleteRateRule: ${error.message}`)
}

export async function updateUnitBasePrice(unitId, basePrice) {
    const { data, error } = await supabase
        .from('core_units')
        .update({ base_price: basePrice })
        .eq('id', unitId)
        .select()
    if (error) throw new Error(`updateUnitBasePrice: ${error.message}`)
    if (!data || data.length === 0) {
        throw new Error('No se pudo guardar el precio: sin permisos o la unidad no existe')
    }
}

export async function upsertDailyRates(upserts) {
    const { data, error } = await supabase
        .from('core_unit_daily_rates')
        .upsert(upserts, { onConflict: 'unit_id,date' })
        .select()
    if (error) throw new Error(`upsertDailyRates: ${error.message}`)
    if (!data || data.length === 0) {
        throw new Error('No se pudo guardar las tarifas: sin permisos o datos inválidos')
    }
    return data
}

/**
 * Compute the effective price for a unit on a specific date, applying active rules.
 * Returns { price, source: 'override' | 'rules' | 'base' }.
 * Clamps at 0.
 *
 * @param {number} basePrice
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} unitId
 * @param {string} unitType - e.g. 'cabana', 'departamento'
 * @param {Array}  rules    - full list from getRateRules()
 * @param {object} overridesMap - { 'unitId_YYYY-MM-DD': price }
 */
export function computeEffectivePrice(basePrice, dateStr, unitId, unitType, rules, overridesMap) {
    const overrideKey = `${unitId}_${dateStr}`
    if (overridesMap[overrideKey] !== undefined) {
        return { price: overridesMap[overrideKey], source: 'override' }
    }

    const applicable = rules.filter(r => {
        if (!r.is_active) return false
        if (dateStr < r.date_from || dateStr > r.date_to) return false
        if (r.unit_scope === 'all') return true
        if (r.unit_scope === 'cabana') return (unitType || '').toLowerCase().startsWith('cab')
        if (r.unit_scope === 'departamento') return (unitType || '').toLowerCase().startsWith('dep') || (unitType || '').toLowerCase().startsWith('apart')
        if (r.unit_scope === 'manual') return (r.unit_ids || []).map(String).includes(String(unitId))
        return false
    })

    if (!applicable.length) {
        return { price: basePrice, source: 'base' }
    }

    let price = basePrice
    for (const rule of applicable) {
        if (rule.adj_type === 'percent') {
            price = price * (1 + rule.adj_value / 100)
        } else {
            price = price + rule.adj_value
        }
    }
    price = Math.max(0, Math.round(price))
    return { price, source: 'rules' }
}

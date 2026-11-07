// Cotización de una estadía con las tarifas reales de cada noche. Funciones puras, sin red ni
// zonas horarias: las fechas son 'YYYY-MM-DD' y se recorren con aritmética UTC.
// Regla (la misma del cobro): tarifa del día si es > 0; si no, core_units.base_price; si ninguna
// es válida la noche NO tiene precio y la estadía completa queda sin cotizar (null), nunca en 0.
const ISO = /^\d{4}-\d{2}-\d{2}$/
const MAX_NIGHTS = 60

function toUtc(iso) {
    if (!ISO.test(iso)) return NaN
    const [y, m, d] = iso.split('-').map(Number)
    const t = Date.UTC(y, m - 1, d)
    const dt = new Date(t)
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? t : NaN
}

/** Noches [checkIn, checkOut). [] si las fechas no son válidas o exceden el máximo. */
export function nightDates(checkIn, checkOut) {
    const a = toUtc(checkIn), b = toUtc(checkOut)
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return []
    const n = Math.round((b - a) / 86400000)
    if (n > MAX_NIGHTS) return []
    return Array.from({ length: n }, (_, i) => new Date(a + i * 86400000).toISOString().slice(0, 10))
}

function positive(v) {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
}

/** Precio CLP de una noche, o null si no hay ninguna tarifa válida. */
export function effectiveNightPrice(date, overrides, basePrice) {
    return positive(overrides?.[date]) ?? positive(basePrice)
}

/**
 * @returns {{ total: number, nights: number, perNight: number[] } | null}
 */
export function stayTotal({ overrides, basePrice, checkIn, checkOut }) {
    const dates = nightDates(checkIn, checkOut)
    if (dates.length === 0) return null
    const perNight = dates.map(d => effectiveNightPrice(d, overrides, basePrice))
    if (perNight.some(p => p === null)) return null
    return { total: perNight.reduce((s, p) => s + p, 0), nights: perNight.length, perNight }
}

/** Estimación en USD (entero). null si falta alguno de los datos. */
export function toUsd(clp, rate, step = 1) {
    if (!(clp > 0) || !(rate > 0)) return null
    return Math.round(clp / rate / step) * step
}

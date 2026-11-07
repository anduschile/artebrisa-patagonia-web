// Reglas para aceptar un tipo de cambio. Se usan en el servidor (api/fx.js) y en el navegador
// (src/data/fx.js): ninguna tasa fija ni vencida llega a pantalla.
// El rango de cordura solo detecta datos corruptos; no es una tasa.
export const FX_MAX_AGE_DAYS = 7
export const FX_SANE_MIN = 300
export const FX_SANE_MAX = 3000
const ISO = /^\d{4}-\d{2}-\d{2}$/

/** @returns {{rate:number, asOf:string, source:string} | null} */
export function validateFx(fx, now = Date.now()) {
    if (!fx || typeof fx !== 'object') return null
    const rate = Number(fx.rate)
    if (!Number.isFinite(rate) || rate < FX_SANE_MIN || rate > FX_SANE_MAX) return null
    if (typeof fx.asOf !== 'string' || !ISO.test(fx.asOf)) return null
    const asOfMs = Date.parse(fx.asOf + 'T12:00:00Z')
    if (Number.isNaN(asOfMs)) return null
    const ageDays = (now - asOfMs) / 86400000
    if (ageDays > FX_MAX_AGE_DAYS || ageDays < -1) return null
    return { rate, asOf: fx.asOf, source: String(fx.source || '') }
}

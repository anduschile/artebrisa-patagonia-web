// Regla de visibilidad y formato del USD referencial. Solo en los idiomas de visitantes del exterior
// (en/de/pt) y solo con una tasa válida y vigente (validateFx ya descartó tasas inexistentes, absurdas o
// con más de 7 días). Devuelve null => no se muestra nada y la pantalla queda solo en CLP (es incluido).
import { toUsd } from './stayQuote'

export const USD_LANGS = ['en', 'de', 'pt']
// Mismos locales que usa el sitio para fechas (ReservationWidget: en-US, de-DE, pt-BR).
const LOCALES = { en: 'en-US', de: 'de-DE', pt: 'pt-BR' }

/** @returns {number | null} importe en US$ (entero) o null si no corresponde mostrarlo */
export function approxUsd(lang, clp, fx) {
    if (!USD_LANGS.includes(lang)) return null
    return toUsd(clp, fx?.rate)
}

/** Entero con separador de miles del idioma (216 → '216'; 1234 → '1,234' / '1.234'). */
export function formatUsdAmount(n, lang) {
    return Number(n).toLocaleString(LOCALES[lang] || 'en-US')
}

/** CLP por 1 US$ con hasta 2 decimales según el idioma (970.94 → '970.94' / '970,94'). */
export function formatFxRate(rate, lang) {
    return Number(rate).toLocaleString(LOCALES[lang] || 'en-US', { maximumFractionDigits: 2 })
}

/** '2026-11-06' → 'Nov 6, 2026' / '6. Nov. 2026' / '6 de nov. de 2026'. Entrada inválida → la misma cadena. */
export function formatFxDate(iso, lang = 'en') {
    const t = Date.parse(`${iso}T12:00:00Z`)
    if (Number.isNaN(t)) return String(iso)
    return new Date(t).toLocaleDateString(LOCALES[lang] || 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const MINDICADOR = {
    en: 'Observed dollar rate (Central Bank of Chile) via mindicador.cl',
    de: 'Beobachteter Dollarkurs (Zentralbank von Chile) über mindicador.cl',
    pt: 'Dólar observado (Banco Central do Chile) via mindicador.cl',
}

/** Descripción de la fuente en el idioma de la página; fuentes desconocidas se muestran tal cual. */
export function fxSourceLabel(source, lang) {
    const s = String(source || '')
    if (/mindicador/i.test(s)) return MINDICADOR[lang] || MINDICADOR.en
    return s
}

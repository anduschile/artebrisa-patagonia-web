/**
 * Idiomas soportados por el sitio. 'es' es el default y no lleva prefijo
 * de ruta (/, /cabanas, ...). Los demás sí (/en/cabanas, /de/cabanas).
 *
 * Fase actual: solo infraestructura de rutas + <head> dinámico. El
 * contenido de /en/* y /de/* sigue en español (placeholder) hasta que
 * se traduzca en una fase posterior.
 */
export const DEFAULT_LANG = 'es'
export const SUPPORTED_LANGS = ['es', 'en', 'de']
// Idiomas que sí llevan prefijo de ruta (todos menos el default)
export const PREFIXED_LANGS = SUPPORTED_LANGS.filter(l => l !== DEFAULT_LANG)

export const LANG_LABELS = {
    es: 'Español',
    en: 'English',
    de: 'Deutsch',
}

/** Antepone el prefijo de idioma a una ruta absoluta ('/cabanas' -> '/en/cabanas'). */
export function withLang(lang, path) {
    if (lang === DEFAULT_LANG) return path
    return path === '/' ? `/${lang}` : `/${lang}${path}`
}

/**
 * Dado un pathname actual (con o sin prefijo de idioma) y un idioma destino,
 * devuelve la misma página en el idioma destino. Usado por el selector de
 * idioma del header para no perder la página actual al cambiar de idioma.
 */
export function switchLangPath(pathname, targetLang) {
    const segments = pathname.split('/').filter(Boolean)
    const hasLangPrefix = PREFIXED_LANGS.includes(segments[0])
    const rest = hasLangPrefix ? segments.slice(1) : segments
    const restPath = rest.length ? `/${rest.join('/')}` : '/'
    return withLang(targetLang, restPath)
}

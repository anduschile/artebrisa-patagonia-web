import { useLocation } from 'react-router-dom'
import { PREFIXED_LANGS, DEFAULT_LANG } from './languages'

/**
 * Deriva el idioma actual directamente del pathname del navegador, sin
 * depender de la posición del componente dentro del árbol de rutas
 * (a diferencia de useParams().lang, que solo existe dentro de las
 * rutas anidadas bajo LangLayout). Layout usa esto para que Navbar
 * (que vive fuera de esa rama del árbol) también tenga el idioma correcto.
 */
export function useLangFromPath() {
    const { pathname } = useLocation()
    const firstSegment = pathname.split('/').filter(Boolean)[0]
    return PREFIXED_LANGS.includes(firstSegment) ? firstSegment : DEFAULT_LANG
}

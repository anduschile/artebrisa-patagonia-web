import { useParams, Outlet, Navigate } from 'react-router-dom'
import { PREFIXED_LANGS } from '../i18n/languages'

/**
 * Layout de las rutas prefijadas por idioma (/en/*, /de/*). Valida que
 * ':lang' sea uno de los idiomas soportados con prefijo — cualquier otro
 * valor (ej. /fr/cabanas) redirige al equivalente en español por defecto
 * en vez de renderizar contenido incorrecto o crashear.
 *
 * El LangContext en sí lo provee Layout.jsx (derivado directo de la URL)
 * — Layout es ancestro tanto de esta rama como de Navbar, así que el
 * idioma queda disponible para toda la página, no solo para el <Outlet/>
 * de acá.
 */
export default function LangLayout() {
    const { lang } = useParams()

    if (!PREFIXED_LANGS.includes(lang)) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

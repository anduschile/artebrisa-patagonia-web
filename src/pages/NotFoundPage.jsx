import { Link } from 'react-router-dom'
import { useLang } from '../i18n/LangContext'
import { withLang } from '../i18n/languages'

/**
 * Catch-all para rutas que no matchean nada (ej. un idioma no soportado
 * después del redirect de LangLayout ya se resolvió antes de llegar acá;
 * esto cubre cualquier otra ruta inexistente, como /unidad/codigo-invalido
 * a nivel de ruta general, no de unidad).
 *
 * Se renderiza como hijo directo de Layout (no de LangLayout), pero Layout
 * ya provee LangContext derivado de la URL, así que /en/ruta-inexistente
 * también tiene lang disponible acá.
 */
export default function NotFoundPage() {
    const lang = useLang()
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 pt-20">
            <div className="text-center">
                <div className="text-5xl mb-4">🧭</div>
                <h1 className="text-xl font-black text-slate-900 mb-2">Página no encontrada</h1>
                <p className="text-slate-500 mb-5">La página que buscas no existe.</p>
                <Link to={withLang(lang, '/')} className="px-5 py-2 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors">
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    )
}

import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildWaUrl } from '../config/contact'
import { trackWhatsappClick } from '../lib/analytics'
import { PREFIXED_LANGS } from '../i18n/languages'

// Botón principal de la barra según la página. Las rutas que no están acá
// (Cabañas, Departamentos, confirmación de pago, 404…) mantienen solo el botón
// de WhatsApp, igual que antes. `target` es el valor del atributo
// data-cta-target de la sección a la que lleva el botón.
const PRIMARY_BY_KIND = {
    home: { labelKey: 'stickyCta.checkAvailability', target: 'search' },
    trek: { labelKey: 'stickyCta.checkAvailability', target: 'search' },
    unit: { labelKey: 'stickyCta.checkDates', target: 'reservation' },
}

function getPageKind(pathname) {
    const segments = pathname.split('/').filter(Boolean)
    // /en/trek es una landing propia en inglés, fuera de la rama /:lang.
    if (segments.length === 2 && segments[0] === 'en' && segments[1] === 'trek') return 'trek'
    if (PREFIXED_LANGS.includes(segments[0])) segments.shift()
    if (segments.length === 0) return 'home'
    if (segments.length === 2 && segments[0] === 'unidad') return 'unit'
    return 'other'
}

// Varias secciones pueden compartir el mismo data-cta-target (ej. un widget
// distinto para escritorio y móvil); se elige la que está visible.
function findVisibleTarget(name) {
    return Array.from(document.querySelectorAll(`[data-cta-target="${name}"]`))
        .find(el => el.getClientRects().length > 0) || null
}

// Ubica la sección de destino (puede aparecer tarde, tras cargar datos) y
// avisa si ya está a la vista, para que la barra no ofrezca ir a algo que el
// visitante ya está mirando.
function useCtaTarget(name, routeKey) {
    const [state, setState] = useState({ found: false, inView: false })

    useEffect(() => {
        setState({ found: false, inView: false })
        if (!name) return undefined
        let io, mo, giveUp
        const attach = () => {
            const el = findVisibleTarget(name)
            if (!el) return false
            // Cuenta como "a la vista" solo cuando el destino ya subió a la mitad
            // superior de la pantalla (así se ven sus campos); si apenas asoma por
            // abajo, la barra sigue ofreciendo ir hasta él.
            io = new IntersectionObserver(
                ([entry]) => setState({ found: true, inView: entry.isIntersecting }),
                { rootMargin: '0px 0px -50% 0px' }
            )
            io.observe(el)
            return true
        }
        if (!attach()) {
            mo = new MutationObserver(() => {
                if (attach()) { mo.disconnect(); clearTimeout(giveUp) }
            })
            mo.observe(document.body, { childList: true, subtree: true })
            giveUp = setTimeout(() => mo.disconnect(), 15000)
        }
        return () => { io?.disconnect(); mo?.disconnect(); clearTimeout(giveUp) }
    }, [name, routeKey])

    const goTo = useCallback(() => {
        const el = name && findVisibleTarget(name)
        if (!el) {
            // El destino desapareció (ej. la ficha se recargó): vuelve al modo solo WhatsApp.
            setState({ found: false, inView: false })
            return
        }
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }, [name])

    return { ...state, goTo }
}

const TYPING_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select'

function isTypingTarget(el) {
    return Boolean(el) && (el.tagName === 'IFRAME' || Boolean(el.matches?.(TYPING_FIELD)))
}

// Oculta la barra mientras el visitante escribe o elige una fecha: en móvil el
// teclado y la barra fija compiten por el mismo espacio y taparían el campo.
// Los campos de pago viven en un iframe y ahí no se dispara focusin en esta
// página: el único aviso es que la ventana pierde el foco (blur) y el iframe
// pasa a ser document.activeElement.
function useFieldFocus() {
    const [typing, setTyping] = useState(false)

    useEffect(() => {
        let timer
        function sync() {
            clearTimeout(timer)
            timer = setTimeout(() => setTyping(isTypingTarget(document.activeElement)), 120)
        }
        function onFocusIn(e) {
            clearTimeout(timer)
            if (isTypingTarget(e.target)) setTyping(true)
            else sync()
        }
        document.addEventListener('focusin', onFocusIn)
        document.addEventListener('focusout', sync)
        window.addEventListener('blur', sync)
        window.addEventListener('focus', sync)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('focusin', onFocusIn)
            document.removeEventListener('focusout', sync)
            window.removeEventListener('blur', sync)
            window.removeEventListener('focus', sync)
        }
    }, [])

    return typing
}

export default function StickyCTA() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const kind = getPageKind(pathname)
    const primary = PRIMARY_BY_KIND[kind]
    const target = useCtaTarget(primary?.target, pathname)
    const typing = useFieldFocus()
    const showPrimary = Boolean(primary) && target.found && !target.inView

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe ${typing ? 'hidden' : ''}`}>
            <div className="px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="flex items-stretch gap-2">
                    {showPrimary && (
                        <button
                            type="button"
                            onClick={target.goTo}
                            className="flex-1 min-w-0 px-3 py-3.5 bg-primary-700 hover:bg-primary-800 active:bg-primary-900 text-white font-bold text-base rounded-xl transition-colors shadow-lg truncate"
                        >
                            {t(primary.labelKey)}
                        </button>
                    )}
                    {/* Botón de WhatsApp: ocupa toda la barra cuando no hay un destino
                        al que llevar; si lo hay, queda como acción secundaria (solo ícono). */}
                    <a
                        href={buildWaUrl(t(kind === 'trek' ? 'whatsapp.prefillTrek' : 'whatsapp.prefill'))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('stickyCta.label')}
                        onClick={() => trackWhatsappClick('floating')}
                        className={`flex items-center justify-center gap-2 py-3.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-base rounded-xl transition-colors shadow-lg ${showPrimary ? 'w-[52px] shrink-0' : 'w-full'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        {!showPrimary && t('stickyCta.label')}
                    </a>
                </div>
            </div>
        </div>
    )
}

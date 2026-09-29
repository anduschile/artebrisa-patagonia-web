// ─── Analytics (GA4 + Google Ads vía gtag.js, sin Google Tag Manager) ───────
// Inerte por completo mientras VITE_GA4_ID no esté definida: no se inyecta
// ningún script, no se llama a gtag(), no se toca localStorage de consentimiento.
// Fuera de producción (npm run dev / preview) solo se activa si además está
// VITE_ANALYTICS_DEBUG=true, para poder probar localmente contra GA4 DebugView.
//
// Variables de entorno (Vite):
//   VITE_GA4_ID            — obligatoria para activar cualquier cosa (ej: G-XXXXXXX)
//   VITE_GADS_ID           — opcional; agrega gtag('config', ID) de Google Ads,
//                            sin eventos de conversión propios (se agregan después)
//   VITE_ANALYTICS_DEBUG   — 'true' para loguear cada evento en consola y para
//                            poder probar fuera de producción
// ─────────────────────────────────────────────────────────────────────────────

const GA4_ID = import.meta.env.VITE_GA4_ID
const GADS_ID = import.meta.env.VITE_GADS_ID
const DEBUG = import.meta.env.VITE_ANALYTICS_DEBUG === 'true'
const IS_PROD = import.meta.env.PROD

/** true si hay un ID de GA4 configurado — controla si el aviso de cookies se muestra. */
export const ANALYTICS_CONFIGURED = Boolean(GA4_ID)

/** true si además puede ejecutar (producción, o debug explícito fuera de ella). */
const ENABLED = ANALYTICS_CONFIGURED && (IS_PROD || DEBUG)

const CONSENT_KEY = 'ab_consent_v1'
const PURCHASE_KEY = 'ab_purchase_reported_v1'

// EEE (27 UE + Islandia/Liechtenstein/Noruega) + Reino Unido + Suiza:
// consentimiento denegado por defecto ahí; otorgado en el resto del mundo.
const RESTRICTED_REGIONS = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO', 'GB', 'CH',
]

function log(...args) {
    if (!DEBUG) return
    try { console.log('[analytics]', ...args) } catch (e) { /* noop */ }
}

function gtag() {
    try {
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push(arguments)
    } catch (e) { /* noop */ }
}

function readConsent() {
    try {
        const raw = localStorage.getItem(CONSENT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch (e) {
        return null
    }
}

function writeConsent(value) {
    try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify(value))
    } catch (e) { /* noop */ }
}

function injectGtagScript() {
    try {
        if (document.getElementById('ab-gtag-js')) return
        const script = document.createElement('script')
        script.id = 'ab-gtag-js'
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
        document.head.appendChild(script)
    } catch (e) { /* noop */ }
}

let initialized = false

/**
 * Debe llamarse una sola vez, al montar el sitio público (Layout).
 * No hace nada si VITE_GA4_ID no está definida.
 */
export function initAnalytics() {
    if (initialized) return
    initialized = true

    if (!ENABLED) {
        log('inactivo (falta VITE_GA4_ID o estamos fuera de producción sin VITE_ANALYTICS_DEBUG)')
        return
    }

    try {
        window.dataLayer = window.dataLayer || []
        window.gtag = gtag

        // Consent Mode v2 — se declara ANTES de cargar gtag.js.
        gtag('consent', 'default', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
            analytics_storage: 'granted',
            wait_for_update: 500,
        })
        gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            region: RESTRICTED_REGIONS,
        })

        // Elección previa del visitante (si existe) se respeta de inmediato.
        const saved = readConsent()
        if (saved) {
            const state = saved.granted ? 'granted' : 'denied'
            gtag('consent', 'update', {
                ad_storage: state,
                ad_user_data: state,
                ad_personalization: state,
                analytics_storage: state,
            })
        }

        gtag('js', new Date())
        gtag('config', GA4_ID, { send_page_view: false })
        if (GADS_ID) {
            gtag('config', GADS_ID)
        }

        injectGtagScript()
        log('initAnalytics', { GA4_ID, GADS_ID: GADS_ID || null, savedConsent: saved })
    } catch (e) { /* noop */ }
}

/** true/false si el visitante ya eligió antes; null si el aviso debe mostrarse. */
export function getStoredConsent() {
    try {
        const saved = readConsent()
        return saved ? saved.granted : null
    } catch (e) {
        return null
    }
}

/** Aplica y persiste la elección del visitante (aceptar o rechazar cookies). */
export function setConsent(granted) {
    try {
        writeConsent({ granted, ts: Date.now() })
        if (!ENABLED) { log('(inactivo) setConsent', granted); return }
        const state = granted ? 'granted' : 'denied'
        gtag('consent', 'update', {
            ad_storage: state,
            ad_user_data: state,
            ad_personalization: state,
            analytics_storage: state,
        })
        log('setConsent', granted)
    } catch (e) { /* noop */ }
}

function track(name, params = {}) {
    if (!ENABLED) { log('(inactivo)', name, params); return }
    try {
        gtag('event', name, params)
        log(name, params)
    } catch (e) { /* noop */ }
}

/** SPA: llamar en cada cambio de ruta (send_page_view está en false en config). */
export function trackPageView({ path, title }) {
    try {
        track('page_view', {
            page_path: path,
            page_title: title,
            page_location: `${window.location.origin}${path}`,
        })
    } catch (e) { /* noop */ }
}

export function trackViewItem({ id, name }) {
    track('view_item', { items: [{ item_id: id, item_name: name }] })
}

export function trackBeginCheckout({ value, items }) {
    track('begin_checkout', { currency: 'CLP', value, items })
}

function alreadyReportedPurchase(transactionId) {
    try {
        const raw = localStorage.getItem(PURCHASE_KEY)
        const ids = raw ? JSON.parse(raw) : []
        return Array.isArray(ids) && ids.includes(transactionId)
    } catch (e) {
        return false
    }
}

function markPurchaseReported(transactionId) {
    try {
        const raw = localStorage.getItem(PURCHASE_KEY)
        const ids = raw ? JSON.parse(raw) : []
        const next = Array.isArray(ids) ? ids : []
        if (!next.includes(transactionId)) next.push(transactionId)
        localStorage.setItem(PURCHASE_KEY, JSON.stringify(next.slice(-50)))
    } catch (e) { /* noop */ }
}

/**
 * purchase — SOLO cuando el pago queda definitivamente aprobado.
 * Deduplicado por reservation_id vía localStorage: se reporta una sola vez
 * aunque el huésped recargue la página.
 */
export function trackPurchaseOnce({ transactionId, value, items }) {
    if (!ENABLED) { log('(inactivo) purchase', { transactionId, value, items }); return }
    try {
        if (!transactionId || alreadyReportedPurchase(transactionId)) return
        markPurchaseReported(transactionId)
        track('purchase', { transaction_id: transactionId, currency: 'CLP', value, items })
    } catch (e) { /* noop */ }
}

export function trackWhatsappClick(location) {
    track('whatsapp_click', { location })
}

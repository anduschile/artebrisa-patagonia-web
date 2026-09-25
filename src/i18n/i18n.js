import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'

/**
 * Solo 'es' y 'en' tienen diccionario real por ahora. '/de/*' sigue
 * mostrando español (fallbackLng) hasta la fase de alemán — no es un bug,
 * es la decisión explícita de esta fase (ver languages.js).
 *
 * El idioma inicial se detecta directo del pathname (no de i18next-browser-languagedetector)
 * porque ya existe esa misma lógica en useLangFromPath — evita divergencias
 * entre "de qué idioma cree el LangContext que estamos" y "en qué idioma
 * arrancó i18next". Layout.jsx mantiene ambos sincronizados en cada
 * cambio de ruta vía i18n.changeLanguage().
 */
function detectInitialLang() {
    if (typeof window === 'undefined') return 'es'
    const firstSegment = window.location.pathname.split('/').filter(Boolean)[0]
    return firstSegment === 'en' ? 'en' : 'es'
}

i18n.use(initReactI18next).init({
    resources: {
        es: { translation: es },
        en: { translation: en },
    },
    lng: detectInitialLang(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
})

export default i18n

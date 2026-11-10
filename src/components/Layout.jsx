import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import StickyCTA from './StickyCTA'
import CookieBanner from './CookieBanner'
import { LangContext } from '../i18n/LangContext'
import { useLangFromPath } from '../i18n/useLangFromPath'
import i18n from '../i18n/i18n'
import { initAnalytics, trackPageView } from '../lib/analytics'

// El chat no es necesario para pintar el hero: su código se descarga aparte y
// se monta cuando el navegador está ocioso (o a los 2,5 s como máximo).
const ChatWidget = lazy(() => import('./ChatWidget'))

function DeferredChat() {
    const [ready, setReady] = useState(false)
    useEffect(() => {
        const go = () => setReady(true)
        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(go, { timeout: 2500 })
            return () => window.cancelIdleCallback(id)
        }
        const id = setTimeout(go, 1500)
        return () => clearTimeout(id)
    }, [])
    return ready ? <Suspense fallback={null}><DeferredChat /></Suspense> : null
}

export default function Layout() {
    const location = useLocation()
    const lang = useLangFromPath()

    useEffect(() => {
        i18n.changeLanguage(lang)
    }, [lang])

    useEffect(() => {
        initAnalytics()
    }, [])

    useEffect(() => {
        // requestAnimationFrame: espera a que react-helmet-async actualice
        // document.title (ocurre en un efecto posterior al render) antes de
        // reportar el page_view con el título correcto de la página nueva.
        const id = requestAnimationFrame(() => {
            trackPageView({ path: location.pathname + location.search, title: document.title })
        })
        return () => cancelAnimationFrame(id)
    }, [location.pathname])

    return (
        <LangContext.Provider value={lang}>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                    <Outlet />
                </main>
                <Footer />
                <StickyCTA />
                <DeferredChat />
                <CookieBanner />
            </div>
        </LangContext.Provider>
    )
}


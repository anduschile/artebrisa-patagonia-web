import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import StickyCTA from './StickyCTA'
import ChatWidget from './ChatWidget'
import CookieBanner from './CookieBanner'
import { LangContext } from '../i18n/LangContext'
import { useLangFromPath } from '../i18n/useLangFromPath'
import i18n from '../i18n/i18n'
import { initAnalytics, trackPageView } from '../lib/analytics'

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
            trackPageView({ path: location.pathname, title: document.title })
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
                <ChatWidget />
                <CookieBanner />
            </div>
        </LangContext.Provider>
    )
}


import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import StickyCTA from './StickyCTA'
import ChatWidget from './ChatWidget'
import { LangContext } from '../i18n/LangContext'
import { useLangFromPath } from '../i18n/useLangFromPath'
import i18n from '../i18n/i18n'

export default function Layout() {
    const location = useLocation()
    const lang = useLangFromPath()

    // Solo 'es'/'en' tienen diccionario real — '/de/*' mantiene español
    // (fallbackLng) a propósito, ver i18n/i18n.js.
    useEffect(() => {
        i18n.changeLanguage(lang === 'en' ? 'en' : 'es')
    }, [lang])

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
            </div>
        </LangContext.Provider>
    )
}


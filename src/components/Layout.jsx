import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import StickyCTA from './StickyCTA'
import ChatWidget from './ChatWidget'
import { LangContext } from '../i18n/LangContext'
import { useLangFromPath } from '../i18n/useLangFromPath'

export default function Layout() {
    const location = useLocation()
    const lang = useLangFromPath()

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


import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import StickyCTA from './StickyCTA'
import ChatWidget from './ChatWidget'

export default function Layout() {
    const location = useLocation()

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <StickyCTA />
            <ChatWidget />
        </div>
    )
}


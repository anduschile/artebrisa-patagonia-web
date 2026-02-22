import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const SECTION_ITEMS = [
    { hash: '#alojamientos', label: 'Alojamientos' },
    { hash: '#servicios', label: 'Servicios' },
    { hash: '#tarifas', label: 'Tarifas' },
    { hash: '#ubicacion', label: 'Ubicación' },
    { hash: '#galeria', label: 'Galería' },
    { hash: '#faq', label: 'FAQ' },
    { hash: '#contacto', label: 'Contacto' },
]

function SectionLinks({ base, textClass, onClick }) {
    return SECTION_ITEMS.map(({ hash, label }) => (
        <a
            key={hash}
            href={`${base}${hash}`}
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/20 ${textClass}`}
        >
            {label}
        </a>
    ))
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => { setMenuOpen(false) }, [location])

    const isHome = location.pathname === '/'
    const isCabanas = location.pathname === '/cabanas'
    const isDeptos = location.pathname === '/departamentos'
    const showSections = isCabanas || isDeptos
    const sectionBase = isCabanas ? '/cabanas' : '/departamentos'

    const navBg = scrolled || menuOpen
        ? 'bg-white/95 backdrop-blur-sm shadow-md'
        : isHome
            ? 'bg-transparent'
            : 'bg-slate-900/80 backdrop-blur-sm'

    const textColor = scrolled || menuOpen ? 'text-slate-700' : 'text-white/90'
    const activeStyle = 'bg-primary-500 text-white'

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <span className={`font-black text-lg tracking-tight transition-colors ${(scrolled || menuOpen) ? 'text-slate-900' : 'text-white'}`}>
                        Arte<span className="text-primary-500">Brisa</span>
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-0.5 flex-wrap justify-end">
                    {/* Main links */}
                    <NavLink to="/" end className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        Inicio
                    </NavLink>
                    <NavLink to="/cabanas" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        Cabañas
                    </NavLink>
                    <NavLink to="/departamentos" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        Departamentos
                    </NavLink>

                    {/* Section links (only on /cabanas or /departamentos) */}
                    {showSections && (
                        <>
                            <span className={`mx-1 text-sm ${textColor} opacity-30`}>|</span>
                            <SectionLinks base={sectionBase} textClass={textColor} />
                        </>
                    )}

                    {/* WhatsApp CTA */}
                    <a
                        href={`https://wa.me/${import.meta.env.VITE_WHATSAPP || '56950921745'}?text=Hola%2C%20quiero%20consultar%20disponibilidad`}
                        target="_blank" rel="noopener noreferrer"
                        className="ml-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                        WhatsApp
                    </a>
                </nav>

                {/* Mobile hamburger */}
                <button
                    className={`md:hidden p-2 rounded-lg transition-colors ${(scrolled || menuOpen) ? 'text-slate-700' : 'text-white'}`}
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label="Menú"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        {menuOpen ? (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
                    >
                        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
                            {[
                                { to: '/', label: 'Inicio', end: true },
                                { to: '/cabanas', label: 'Cabañas', end: false },
                                { to: '/departamentos', label: 'Departamentos', end: false },
                            ].map(link => (
                                <NavLink key={link.to} to={link.to} end={link.end}
                                    className={({ isActive }) => `px-4 py-3 rounded-lg text-sm font-semibold ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                                    {link.label}
                                </NavLink>
                            ))}

                            {/* Section anchor links for mobile */}
                            {showSections && (
                                <div className="mt-1 pt-2 border-t border-slate-100">
                                    <p className="px-4 text-xs text-slate-400 font-semibold uppercase mb-2">Secciones</p>
                                    {SECTION_ITEMS.map(({ hash, label }) => (
                                        <a key={hash} href={`${sectionBase}${hash}`} onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                                            {label}
                                        </a>
                                    ))}
                                </div>
                            )}

                            <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP || '56912345678'}?text=Hola%2C%20quiero%20consultar%20disponibilidad`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2 px-4 py-3 bg-green-500 text-white text-sm font-bold rounded-lg text-center">
                                💬 Consultar por WhatsApp
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}

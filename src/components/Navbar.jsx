import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CL, GB, DE } from 'country-flag-icons/react/3x2'
import { buildWaUrl } from '../config/contact'
import { useLang } from '../i18n/LangContext'
import { SUPPORTED_LANGS, LANG_LABELS, withLang, switchLangPath } from '../i18n/languages'

// Banderas SVG en vez de emoji: en Windows, los emoji de bandera se
// renderizan como el código de país en texto plano dentro de una caja
// (ej. "GB") porque el sistema no trae los glifos de bandera en su fuente
// de emojis — no es un problema del navegador, pasa en Chrome/Edge/Firefox
// por igual ahí. country-flag-icons da un componente SVG chico por país
// (tree-shakeable, solo se importan los 3 que se usan) que se ve igual en
// cualquier SO.
const FLAG_COMPONENTS = { es: CL, en: GB, de: DE }

function FlagIcon({ lang, className = '' }) {
    const Flag = FLAG_COMPONENTS[lang]
    return <Flag className={`w-5 h-[14px] rounded-[2px] object-cover shadow-sm ring-1 ring-black/10 flex-shrink-0 ${className}`} title={LANG_LABELS[lang]} />
}

function ChevronDown({ className = '' }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

function LanguageSwitcher({ lang, pathname, variant = 'desktop', onNavigate }) {
    const [open, setOpen] = useState(false)
    const { t } = useTranslation()

    if (variant === 'mobile') {
        return (
            <div className="px-4">
                <p className="text-xs text-slate-400 font-semibold uppercase mb-2">{t('nav.language')}</p>
                <div className="flex items-center gap-2">
                    {SUPPORTED_LANGS.map(l => (
                        <Link
                            key={l}
                            to={switchLangPath(pathname, l)}
                            onClick={onNavigate}
                            aria-current={l === lang ? 'true' : undefined}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${l === lang
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <FlagIcon lang={l} />
                            {l.toUpperCase()}
                        </Link>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="relative ml-2">
            <button
                onClick={() => setOpen(o => !o)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className="pl-2.5 pr-3 py-2 rounded-lg text-sm font-bold bg-primary-500 hover:bg-primary-600 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                aria-label={t('nav.changeLanguage')}
                aria-haspopup="true"
                aria-expanded={open}
            >
                <FlagIcon lang={lang} />
                {lang.toUpperCase()}
                <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1.5 min-w-[180px] z-50"
                    >
                        {SUPPORTED_LANGS.map(l => (
                            <Link
                                key={l}
                                to={switchLangPath(pathname, l)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${l === lang
                                    ? 'bg-primary-50 text-primary-700 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <FlagIcon lang={l} />
                                <span className="flex-1">{LANG_LABELS[l]}</span>
                                {l === lang && <CheckIcon />}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const SECTION_ITEMS = [
    { hash: '#alojamientos', key: 'alojamientos' },
    { hash: '#servicios', key: 'servicios' },
    { hash: '#tarifas', key: 'tarifas' },
    { hash: '#ubicacion', key: 'ubicacion' },
    { hash: '#galeria', key: 'galeria' },
    { hash: '#faq', key: 'faq' },
    { hash: '#contacto', key: 'contacto' },
]

function SectionLinks({ base, onClick }) {
    const { t } = useTranslation()
    return SECTION_ITEMS.map(({ hash, key }) => (
        <a
            key={hash}
            href={`${base}${hash}`}
            onClick={onClick}
            className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
            {t(`nav.sections.${key}`)}
        </a>
    ))
}

// Menú de anclas (Alojamientos, Servicios, Tarifas...) como dropdown en vez
// de pills en línea: en español entraban en una fila junto al resto del
// header, pero en inglés ("Accommodations", "Amenities"...) el total ya no
// cabía y el selector de idioma se caía a una segunda línea, descolgado del
// header. Un dropdown de ancho fijo (como el de idioma) resuelve el
// problema de raíz en vez de depender de cuánto texto tenga cada idioma.
function SectionsDropdown({ base, textColor }) {
    const [open, setOpen] = useState(false)
    const { t } = useTranslation()
    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 hover:bg-white/15 ${textColor}`}
                aria-haspopup="true"
                aria-expanded={open}
            >
                {t('nav.sectionsLabel')}
                <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1.5 min-w-[180px] z-50"
                    >
                        <SectionLinks base={base} onClick={() => setOpen(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()
    const lang = useLang()
    const { t } = useTranslation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => { setMenuOpen(false) }, [location])

    const homeHref = withLang(lang, '/')
    const cabanasHref = withLang(lang, '/cabanas')
    const deptosHref = withLang(lang, '/departamentos')

    const isHome = location.pathname === homeHref
    const isCabanas = location.pathname === cabanasHref
    const isDeptos = location.pathname === deptosHref
    const showSections = isCabanas || isDeptos
    const sectionBase = isCabanas ? cabanasHref : deptosHref

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
                <Link to={homeHref} className="flex items-center gap-2 group flex-shrink-0">
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
                    <NavLink to={homeHref} end className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        {t('nav.home')}
                    </NavLink>
                    <NavLink to={cabanasHref} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        {t('nav.cabanas')}
                    </NavLink>
                    <NavLink to={deptosHref} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? activeStyle : `${textColor} hover:bg-white/15`}`}>
                        {t('nav.departamentos')}
                    </NavLink>

                    {/* Section links (only on /cabanas or /departamentos) — dropdown de ancho fijo, ver SectionsDropdown */}
                    {showSections && (
                        <SectionsDropdown base={sectionBase} textColor={textColor} />
                    )}

                    {/* WhatsApp CTA — solo ícono entre md y lg (texto completo desde lg)
                        para dejar margen real al resto del nav en vez de competir al
                        límite por el ancho disponible; "WhatsApp" era el ítem más ancho
                        después de "Departamentos" y no aporta a la jerarquía de navegación. */}
                    <a
                        href={buildWaUrl('Hola! Quisiera consultar disponibilidad y valores. 😊')}
                        target="_blank" rel="noopener noreferrer"
                        aria-label={t('nav.whatsapp')}
                        className="ml-2 px-2.5 lg:px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                        <span className="hidden lg:inline">{t('nav.whatsapp')}</span>
                    </a>

                    {/* Selector de idioma */}
                    <LanguageSwitcher lang={lang} pathname={location.pathname} />
                </nav>

                {/* Mobile hamburger */}
                <button
                    className={`md:hidden p-2 rounded-lg transition-colors ${(scrolled || menuOpen) ? 'text-slate-700' : 'text-white'}`}
                    onClick={() => setMenuOpen(o => !o)}
                    aria-label={t('nav.menu')}
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
                                { to: homeHref, key: 'home', end: true },
                                { to: cabanasHref, key: 'cabanas', end: false },
                                { to: deptosHref, key: 'departamentos', end: false },
                            ].map(link => (
                                <NavLink key={link.to} to={link.to} end={link.end}
                                    className={({ isActive }) => `px-4 py-3 rounded-lg text-sm font-semibold ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                                    {t(`nav.${link.key}`)}
                                </NavLink>
                            ))}

                            {/* Section anchor links for mobile */}
                            {showSections && (
                                <div className="mt-1 pt-2 border-t border-slate-100">
                                    <p className="px-4 text-xs text-slate-400 font-semibold uppercase mb-2">{t('nav.sectionsLabel')}</p>
                                    {SECTION_ITEMS.map(({ hash, key }) => (
                                        <a key={hash} href={`${sectionBase}${hash}`} onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                                            {t(`nav.sections.${key}`)}
                                        </a>
                                    ))}
                                </div>
                            )}

                            <a href={buildWaUrl('Hola! Quisiera consultar disponibilidad y valores. 😊')}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-2 px-4 py-3 bg-green-500 text-white text-sm font-bold rounded-lg text-center">
                                {t('nav.whatsappMobile')}
                            </a>

                            {/* Selector de idioma (mobile) */}
                            <div className="mt-2 pt-2 border-t border-slate-100">
                                <LanguageSwitcher lang={lang} pathname={location.pathname} variant="mobile" onNavigate={() => setMenuOpen(false)} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}

import { Link, useLocation } from 'react-router-dom'
import { CONTACT, LOCATIONS } from '../data/subsiteSections'

const FACEBOOK_URL = 'https://www.facebook.com/p/Caba%C3%B1as-Arte-Brisa-Patagonia-100033325578398/'
const INSTAGRAM_URL = 'https://www.instagram.com/cabanas_artebrisa_patagonia/'

function IconFacebook() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )
}

function IconInstagram() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    )
}

export default function Footer() {
    const { pathname } = useLocation()
    const isHome = pathname === '/'
    const isDepto = pathname.startsWith('/departamentos')

    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">

                    {/* ── Col 1: Brand + Socials ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <span className="font-black text-white text-lg">Arte<span className="text-primary-400">Brisa</span> Patagonia</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed mb-5">
                            Puerto Natales, Chile
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href={FACEBOOK_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-primary-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <IconFacebook />
                            </a>
                            <a
                                href={INSTAGRAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-pink-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <IconInstagram />
                            </a>
                        </div>
                    </div>

                    {/* ── Col 2: Contact ── */}
                    <div>
                        <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Contacto</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <a href={CONTACT.telHref} className="flex items-start gap-2 hover:text-primary-400 transition-colors">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.08a16 16 0 006 6l.55-.55a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
                                    </svg>
                                    {CONTACT.phone}
                                </a>
                            </li>
                            <li>
                                <a href={`mailto:${CONTACT.email}`} className="flex items-start gap-2 hover:text-primary-400 transition-colors break-all">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    {CONTACT.email}
                                </a>
                            </li>
                            <li className="flex items-start gap-2 text-slate-400">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                {isHome ? (
                                    <div className="space-y-2">
                                        <div>
                                            <span className="font-bold text-white block mb-0.5">Cabañas:</span>
                                            <span className="text-slate-400">{LOCATIONS.cabana.address}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-white block mb-0.5">Departamentos:</span>
                                            <span className="text-slate-400">{LOCATIONS.departamento.address}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span>{isDepto ? LOCATIONS.departamento.address : LOCATIONS.cabana.address}</span>
                                )}
                            </li>
                        </ul>
                    </div>

                    {/* ── Col 3: Links ── */}
                    <div>
                        <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Enlaces</h3>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link to="/" className="hover:text-primary-400 transition-colors">Inicio</Link>
                            </li>
                            <li>
                                <Link to="/cabanas" className="hover:text-primary-400 transition-colors">Cabañas</Link>
                            </li>
                            <li>
                                <Link to="/departamentos" className="hover:text-primary-400 transition-colors">Departamentos</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* ── Bottom bar ── */}
                <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
                    © 2026 Arte Brisa Patagonia. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    )
}

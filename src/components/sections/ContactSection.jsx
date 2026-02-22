import { useState } from 'react'
import { motion } from 'framer-motion'
import { CONTACT, LOCATIONS } from '../../data/subsiteSections'
import { DEFAULT_WA_MESSAGE } from '../../config/contact'

export default function ContactSection({ variant = 'cabana' }) {
    const label = variant === 'cabana' ? 'cabaña' : 'departamento'
    const loc = LOCATIONS[variant] ?? LOCATIONS.cabana
    const waUrl = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(DEFAULT_WA_MESSAGE)}`

    const [form, setForm] = useState({ name: '', email: '', phone: '', checkIn: '', checkOut: '', guests: '', message: '' })
    const [sent, setSent] = useState(false)

    function handleSubmit(e) {
        e.preventDefault()
        const msg = [
            'Hola! Consulta desde el sitio web.',
            '',
            `Nombre: ${form.name}`,
            `Email: ${form.email}`,
            form.phone ? `Teléfono: ${form.phone}` : null,
            form.checkIn ? `Entrada: ${form.checkIn}` : null,
            form.checkOut ? `Salida: ${form.checkOut}` : null,
            form.guests ? `Huéspedes: ${form.guests}` : null,
            form.message ? `\n${form.message}` : null,
        ].filter(Boolean).join('\n')
        window.open(`${waUrl}?text=${encodeURIComponent(msg)}`, '_blank')
        setSent(true)
    }

    const INFO_ROWS = [
        {
            icon: 'phone',
            label: 'Teléfono',
            value: CONTACT.phone,
            href: CONTACT.telHref,
        },
        {
            icon: 'mail',
            label: 'Email',
            value: CONTACT.email,
            href: `mailto:${CONTACT.email}`,
        },
        {
            icon: 'map',
            label: 'Dirección',
            value: loc.address,
            href: loc.mapsUrl,
            external: true,
        },
        {
            icon: 'whatsapp',
            label: 'WhatsApp',
            value: CONTACT.phone,
            href: waUrl,
            external: true,
        },
    ]

    return (
        <section id="contacto" className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Contacto</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        Estamos aquí para ayudarte a planificar tu estadía perfecta en la Patagonia
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* ── Info column ── */}
                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
                        {INFO_ROWS.map(({ icon, label: lbl, value, href, external }) => (
                            <div key={lbl} className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm">
                                <div className="bg-primary-100 p-2.5 rounded-lg flex-shrink-0 text-primary-600">
                                    {icon === 'phone' && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.08a16 16 0 006 6l.55-.55a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                                    )}
                                    {icon === 'mail' && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                    )}
                                    {icon === 'map' && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    )}
                                    {icon === 'whatsapp' && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{lbl}</p>
                                    <a
                                        href={href}
                                        target={external ? '_blank' : undefined}
                                        rel={external ? 'noopener noreferrer' : undefined}
                                        className="text-slate-700 text-sm hover:text-primary-600 transition-colors"
                                    >
                                        {value}
                                    </a>
                                </div>
                            </div>
                        ))}

                        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-6 text-white">
                            <p className="font-bold text-lg mb-1">Horario de atención</p>
                            <p className="text-white/80 text-sm">{CONTACT.hours}</p>
                            <p className="text-white/70 text-xs mt-1">{CONTACT.hoursNote}</p>
                        </div>
                    </motion.div>

                    {/* ── Form column ── */}
                    <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white rounded-2xl shadow-sm p-8">
                        {sent ? (
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="font-bold text-slate-800 text-lg mb-2">¡Consulta enviada por WhatsApp!</h3>
                                <p className="text-slate-500 text-sm mb-5">Te responderemos en breve.</p>
                                <button onClick={() => setSent(false)} className="text-sm text-primary-600 underline">Enviar otra consulta</button>
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold text-slate-800 text-lg mb-5">Envíanos un mensaje</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <input required type="text" placeholder="Nombre completo *"
                                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none" />
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <input required type="email" placeholder="Email *"
                                            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none" />
                                        <input type="tel" placeholder="Teléfono"
                                            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <input type="date" value={form.checkIn}
                                            onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none" />
                                        <input type="date" value={form.checkOut}
                                            onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none" />
                                    </div>
                                    <select value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none text-slate-600">
                                        <option value="">Número de huéspedes</option>
                                        {['1', '2', '3', '4', '5', '6+'].map(n => <option key={n} value={n}>{n} persona{n !== '1' ? 's' : ''}</option>)}
                                    </select>
                                    <textarea rows={4} placeholder={`Cuéntanos sobre tu estadía ideal en ${label}...`}
                                        value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none" />
                                    <button type="submit"
                                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                        Enviar por WhatsApp
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

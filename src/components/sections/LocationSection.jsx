import { motion } from 'framer-motion'
import { LOCATIONS, NEARBY } from '../../data/subsiteSections'

function getOsmSrc(lat, lng) {
    const pad = 0.012
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - pad},${lat - 0.008},${lng + pad},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`
}

export default function LocationSection({ variant = 'cabana' }) {
    const loc = LOCATIONS[variant] ?? LOCATIONS.cabana
    const osmSrc = getOsmSrc(loc.lat, loc.lng)

    return (
        <section id="ubicacion" className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Ubicación</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        {variant === 'cabana'
                            ? 'Cabañas en el sector Huertos Familiares, a minutos del centro de Puerto Natales'
                            : 'Departamentos en el corazón de Puerto Natales, a pasos de todo'}
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8 mb-10">
                    {/* Info col */}
                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-slate-50 rounded-2xl p-8 space-y-6">

                        {/* Address block */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-2">Dirección</h3>
                            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                <svg className="flex-shrink-0 mt-0.5 text-primary-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <p className="text-slate-700 text-sm leading-relaxed">{loc.address}</p>
                            </div>
                        </div>

                        {/* How to get there */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1.5">Cómo llegar</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{loc.howToGet}</p>
                        </div>

                        {/* Airport note */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1.5">Desde el aeropuerto</h3>
                            {loc.airportNote.split('\n').map((line, i) => (
                                <p key={i} className="text-slate-600 text-sm">{line}</p>
                            ))}
                        </div>

                        {/* Google Maps CTA */}
                        <a
                            href={loc.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            Abrir en Google Maps
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </a>
                    </motion.div>

                    {/* Map col — OSM embed */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                        className="rounded-2xl overflow-hidden shadow-md relative"
                        style={{ minHeight: '360px' }}
                    >
                        <iframe
                            key={variant}   /* remount when variant changes */
                            src={osmSrc}
                            width="100%"
                            height="100%"
                            style={{ border: 0, minHeight: '360px', display: 'block' }}
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                            loading="lazy"
                            title={`Mapa ${variant === 'cabana' ? 'Cabañas' : 'Departamentos'} Arte Brisa Patagonia`}
                        />
                        {/* Overlay caption */}
                        <a
                            href={loc.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm shadow px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 flex items-center gap-1.5 hover:bg-white transition-colors whitespace-nowrap"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            {loc.shortAddress}
                        </a>
                    </motion.div>
                </div>

                {/* Nearby */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-slate-50 rounded-2xl p-8">
                    <h3 className="font-bold text-slate-800 text-lg mb-5">Lugares de interés cercanos</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {NEARBY.map(p => (
                            <div key={p.name} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500 flex-shrink-0 mt-0.5">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.distance}</p>
                                    <p className="text-xs text-primary-500">{p.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

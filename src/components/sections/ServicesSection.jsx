import { motion } from 'framer-motion'
import { SERVICES } from '../../data/subsiteSections'

// Inline SVG icon set (no external deps)
function Icon({ name, size = 28 }) {
    const icons = {
        wifi: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" /><path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" /></svg>,
        heat: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6m0 0c0 2.5-2 4-2 6s2 3.5 2 6" /><path d="M7 4v4m0 0c0 2-1.5 3-1.5 5s1.5 2.5 1.5 5" /><path d="M17 4v4m0 0c0 2 1.5 3 1.5 5s-1.5 2.5-1.5 5" /></svg>,
        kitchen: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>,
        parking: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 010 6H9" /></svg>,
        tv: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2" /><polyline points="17 2 12 7 7 2" /></svg>,
        bed: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 012 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
        host: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
        view: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
        location: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
        key: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></svg>,
    }
    return icons[name] ?? icons.bed
}

export default function ServicesSection({ variant = 'cabana' }) {
    const services = SERVICES[variant] ?? SERVICES.cabana
    return (
        <section id="servicios" className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Servicios incluidos</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        Todas las comodidades que necesitas para una estadía perfecta en la Patagonia
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {services.map((svc, i) => (
                        <motion.div
                            key={svc.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-slate-50 rounded-2xl p-5 hover:shadow-md transition-shadow text-center"
                        >
                            <div className="text-primary-500 flex justify-center mb-3">
                                <Icon name={svc.icon} size={30} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">{svc.title}</h3>
                            <p className="text-xs text-slate-500 leading-snug">{svc.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

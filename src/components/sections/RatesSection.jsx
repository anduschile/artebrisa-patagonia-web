import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { INCLUDED, INCLUDED_DEPTO } from '../../data/subsiteSections'
import { getUnitsByType } from '../../data/units'
import { formatCLP } from '../../data/unitDefaults'

export default function RatesSection({ variant = 'cabana' }) {
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(true)

    const included = variant === 'cabana' ? INCLUDED : INCLUDED_DEPTO

    useEffect(() => {
        getUnitsByType(variant).then(data => {
            setUnits(data)
            setLoading(false)
        })
    }, [variant])

    return (
        <section id="tarifas" className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Nuestras Tarifas</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        Precios por noche (aprox.) · Consulta por WhatsApp para ofertas especiales y estadías prolongadas
                    </p>
                </motion.div>

                {/* Price table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-primary-600 text-white text-xs font-semibold uppercase tracking-wide">
                                    <th className="text-left px-5 py-4">Unidad</th>
                                    <th className="text-center px-4 py-4">Capacidad</th>
                                    <th className="text-right px-5 py-4 whitespace-nowrap">Tarifa base / noche (aprox.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" className="py-10 text-center text-slate-400">Cargando tarifas...</td></tr>
                                ) : units.map((u, i) => (
                                    <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-5 py-4 font-bold text-slate-800">{u.name}</td>
                                        <td className="px-4 py-4 text-center text-slate-600">{u.capacity_total || u.capacidad_total} personas</td>
                                        <td className="px-5 py-4 text-right font-black text-primary-700 text-lg">
                                            {formatCLP(u.base_price)} <span className="text-[10px] text-slate-400 font-normal">(aprox.)</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Included items */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7"
                >
                    <h3 className="text-base font-bold text-slate-800 mb-4">Incluido en todas las unidades</h3>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {included.map(item => (
                            <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                                <span className="w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                                {item}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

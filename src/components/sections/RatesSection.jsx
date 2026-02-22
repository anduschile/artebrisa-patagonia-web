import { motion } from 'framer-motion'
import { SEASONS, INCLUDED, INCLUDED_DEPTO } from '../../data/subsiteSections'
import { PRICES_BY_CODE, formatCLP } from '../../data/unitDefaults'

// Build table rows from PRICES_BY_CODE filtered by variant
const UNIT_LABELS = {
    // Cabañas
    'CAB-CIRUELILLO': { name: 'Cabaña Ciruelillo', cap: '6 personas' },
    'CAB-LUPINO': { name: 'Cabaña Lupino', cap: '4 personas' },
    'CAB-CHILCO': { name: 'Cabaña Chilco', cap: '4 personas' },
    'CAB-FLOR-DE-NOTRO': { name: 'Cabaña Flor de Notro', cap: '4 personas' },
    'TINY-CALAFATE': { name: 'Tiny Calafate', cap: '2 personas' },
    'TINY-MARGARITA': { name: 'Tiny Margarita', cap: '2 personas' },
    'TINY-NIRRE': { name: 'Tiny Ñirre', cap: '2 personas' },
    'TINY-VIOLETA': { name: 'Tiny Violeta', cap: '2 personas' },
    // Departamentos
    'DEP-1': { name: 'Departamento 1', cap: '4 personas' },
    'DEP-2': { name: 'Departamento 2', cap: '2 personas' },
    'DEP-3': { name: 'Departamento 3', cap: '3 personas' },
    'DEP-4': { name: 'Departamento 4', cap: '4 personas' },
}

const CABANA_CODES = ['CAB-CIRUELILLO', 'CAB-LUPINO', 'CAB-CHILCO', 'CAB-FLOR-DE-NOTRO', 'TINY-CALAFATE', 'TINY-MARGARITA', 'TINY-NIRRE', 'TINY-VIOLETA']
const DEPTO_CODES = ['DEP-1', 'DEP-2', 'DEP-3', 'DEP-4']

export default function RatesSection({ variant = 'cabana' }) {
    const included = variant === 'cabana' ? INCLUDED : INCLUDED_DEPTO
    const codes = variant === 'cabana' ? CABANA_CODES : DEPTO_CODES

    return (
        <section id="tarifas" className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Tarifas por temporada</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto">
                        Precios en pesos chilenos (CLP) por noche · Todas las temporadas incluyen los mismos servicios
                    </p>
                </motion.div>

                {/* Season pills */}
                <div className="grid md:grid-cols-3 gap-5 mb-10">
                    {SEASONS.map((s, i) => (
                        <motion.div
                            key={s.name}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100"
                        >
                            <h3 className="text-base font-bold text-slate-800 mb-1">{s.name}</h3>
                            <p className="text-primary-600 font-semibold text-sm mb-1">{s.period}</p>
                            <p className="text-slate-400 text-xs">{s.desc}</p>
                        </motion.div>
                    ))}
                </div>

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
                                    <th className="text-left px-5 py-3.5">Unidad</th>
                                    <th className="text-center px-4 py-3.5">Capacidad</th>
                                    <th className="text-right px-5 py-3.5">Temp. Alta</th>
                                    <th className="text-right px-5 py-3.5">Temp. Media</th>
                                    <th className="text-right px-5 py-3.5">Temp. Baja</th>
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map((code, i) => {
                                    const p = PRICES_BY_CODE[code]
                                    const lbl = UNIT_LABELS[code]
                                    return (
                                        <tr key={code} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-5 py-3 font-medium text-slate-800">{lbl?.name ?? code}</td>
                                            <td className="px-4 py-3 text-center text-slate-500">{lbl?.cap ?? '—'}</td>
                                            <td className="px-5 py-3 text-right font-bold text-primary-700">{p ? formatCLP(p.alta) : '—'}</td>
                                            <td className="px-5 py-3 text-right font-bold text-slate-700">{p ? formatCLP(p.media) : '—'}</td>
                                            <td className="px-5 py-3 text-right font-semibold text-slate-500">{p ? formatCLP(p.baja) : '—'}</td>
                                        </tr>
                                    )
                                })}
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
                    <h3 className="text-base font-bold text-slate-800 mb-4">Incluido en todas las tarifas</h3>
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
                    <p className="text-xs text-slate-400 mt-5">
                        * Descuentos especiales para estadías de 7 noches o más · Precios en CLP, sujetos a disponibilidad
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

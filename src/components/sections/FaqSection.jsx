import { useState } from 'react'
import { motion } from 'framer-motion'
import { FAQS } from '../../data/subsiteSections'

export default function FaqSection({ variant = 'cabana' }) {
    const faqs = FAQS[variant] ?? FAQS.cabana
    const [open, setOpen] = useState(null)
    return (
        <section id="faq" className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Preguntas Frecuentes</h2>
                    <p className="text-slate-500">Respuestas a las preguntas más comunes</p>
                </motion.div>

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <button
                                onClick={() => setOpen(open === i ? null : i)}
                                className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl px-5 py-4 text-left transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                                    <svg
                                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                                        className={`flex-shrink-0 text-primary-500 transition-transform ${open === i ? 'rotate-180' : ''}`}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                                {open === i && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 text-slate-600 text-sm leading-relaxed"
                                    >
                                        {faq.a}
                                    </motion.p>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

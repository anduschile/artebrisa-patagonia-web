import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GALLERY } from '../../data/subsiteSections'

export default function GallerySection({ variant = 'cabana' }) {
    const images = GALLERY[variant] ?? GALLERY.cabana
    const [lightbox, setLightbox] = useState(null)

    return (
        <section id="galeria" className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Galería</h2>
                    <p className="text-slate-500">Una mirada a nuestros espacios</p>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((src, i) => (
                        <motion.button
                            key={src}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setLightbox(i)}
                            className="aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                        >
                            <img
                                src={src}
                                alt={`Foto ${i + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                onError={e => { e.target.onerror = null; e.target.src = '/images/common/hero_cabanasa_artebrisa.png' }}
                            />
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightbox !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setLightbox(null)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') setLightbox(null)
                            if (e.key === 'ArrowRight') setLightbox(p => (p + 1) % images.length)
                            if (e.key === 'ArrowLeft') setLightbox(p => (p - 1 + images.length) % images.length)
                        }}
                        tabIndex={0}
                    >
                        <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <button className="absolute left-4 text-white/80 hover:text-white top-1/2 -translate-y-1/2"
                            onClick={e => { e.stopPropagation(); setLightbox(p => (p - 1 + images.length) % images.length) }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <img
                            src={images[lightbox]}
                            alt="Vista ampliada"
                            className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                            onError={e => { e.target.onerror = null; e.target.src = '/images/common/hero_cabanasa_artebrisa.png' }}
                        />
                        <button className="absolute right-4 text-white/80 hover:text-white top-1/2 -translate-y-1/2"
                            onClick={e => { e.stopPropagation(); setLightbox(p => (p + 1) % images.length) }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                        <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">{lightbox + 1} / {images.length}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

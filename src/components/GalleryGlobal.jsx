import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { unitImages, FALLBACK_IMAGE_CABANA, FALLBACK_IMAGE_DEPTO } from '../data/unitImages'

const PAGE_SIZE = 24

/** Derive base folder from unitImages map, then generate n.jpg paths */
function buildPhotos(units) {
    const photos = []
    for (const unit of units) {
        const hero = unit.imagen_url || unitImages[unit.code]
        if (!hero) continue
        // strip trailing /1.jpg (or any /N.jpg) to get base folder
        const base = hero.replace(/\/\d+\.jpg$/, '')
        for (let i = 1; i <= 8; i++) {
            photos.push({
                src: `${base}/${i}.jpg`,
                unitCode: unit.code,
                unitName: unit.name || unit.code,
                unitType: unit.unit_type,
                idx: i,
            })
        }
    }
    return photos
}

function ChevLeft() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg> }
function ChevRight() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg> }

/** A single img that hides itself on 404 */
function SafeImg({ src, alt, className, onClick, fallback }) {
    const [hidden, setHidden] = useState(false)
    if (hidden) return null
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            className={className}
            onError={() => setHidden(true)}
            onClick={onClick}
        />
    )
}

export default function GalleryGlobal({ units = [], variant = 'cabana' }) {
    const fallback = variant === 'cabana' ? FALLBACK_IMAGE_CABANA : FALLBACK_IMAGE_DEPTO
    const allPhotos = useMemo(() => buildPhotos(units), [units])

    // Unit filter state — null = "Todas"
    const [filterCode, setFilterCode] = useState(null)
    const [shown, setShown] = useState(PAGE_SIZE)
    const [lightbox, setLightbox] = useState(null) // index into filtered

    // Unique units for filter chips
    const unitOptions = useMemo(() =>
        units.map(u => ({ code: u.code, name: u.name || u.code }))
        , [units])

    const filtered = useMemo(() =>
        filterCode ? allPhotos.filter(p => p.unitCode === filterCode) : allPhotos
        , [allPhotos, filterCode])

    const visible = filtered.slice(0, shown)
    const hasMore = shown < filtered.length

    function selectFilter(code) {
        setFilterCode(code)
        setShown(PAGE_SIZE)
        setLightbox(null)
    }

    const openLightbox = useCallback((idx) => setLightbox(idx), [])
    const closeLightbox = useCallback(() => setLightbox(null), [])
    const prevPhoto = useCallback(() => setLightbox(i => (i - 1 + filtered.length) % filtered.length), [filtered.length])
    const nextPhoto = useCallback(() => setLightbox(i => (i + 1) % filtered.length), [filtered.length])

    const lbPhoto = lightbox !== null ? filtered[lightbox] : null

    if (allPhotos.length === 0) {
        return (
            <section id="galeria" className="py-16 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl font-black text-slate-900 mb-3">Galería</h2>
                    <p className="text-slate-400">Las fotos se cargarán pronto.</p>
                </div>
            </section>
        )
    }

    return (
        <section id="galeria" className="py-16 bg-slate-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Heading */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Galería</h2>
                    <p className="text-slate-500">Conocé nuestros espacios en detalle</p>
                </motion.div>

                {/* Unit filter chips */}
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                    <button
                        onClick={() => selectFilter(null)}
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${filterCode === null
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                            }`}
                    >
                        Todas ({allPhotos.length})
                    </button>
                    {unitOptions.map(u => (
                        <button
                            key={u.code}
                            onClick={() => selectFilter(u.code)}
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${filterCode === u.code
                                    ? 'bg-primary-500 text-white border-primary-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                                }`}
                        >
                            {u.name}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {visible.map((photo, i) => (
                        <motion.button
                            key={`${photo.unitCode}-${photo.idx}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: Math.min(i, 8) * 0.03 }}
                            onClick={() => openLightbox(filterCode ? i : allPhotos.indexOf(photo))}
                            className="aspect-square rounded-xl overflow-hidden bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-400 relative group"
                        >
                            <SafeImg
                                src={photo.src}
                                alt={`${photo.unitName} - foto ${photo.idx}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                fallback={fallback}
                            />
                            {/* Unit name chip on hover */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200 px-2.5 pb-2 pt-4">
                                <p className="text-white text-xs font-semibold truncate">{photo.unitName}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Load more */}
                {hasMore && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShown(s => s + PAGE_SIZE)}
                            className="px-6 py-2.5 border border-primary-400 text-primary-600 font-semibold text-sm rounded-xl hover:bg-primary-50 transition-colors"
                        >
                            Ver más fotos ({filtered.length - shown} restantes)
                        </button>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lbPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4"
                        onClick={closeLightbox}
                        onKeyDown={e => {
                            if (e.key === 'Escape') closeLightbox()
                            if (e.key === 'ArrowLeft') prevPhoto()
                            if (e.key === 'ArrowRight') nextPhoto()
                        }}
                        tabIndex={0}
                    >
                        {/* Header */}
                        <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
                            <p className="text-white/70 text-sm font-semibold">{lbPhoto.unitName}</p>
                            <span className="text-white/50 text-xs">{lightbox + 1} / {filtered.length}</span>
                        </div>

                        {/* Image */}
                        <div className="relative flex items-center justify-center w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                            <button className="absolute left-0 -translate-x-2 sm:-translate-x-10 bg-white/10 hover:bg-white/25 text-white rounded-full p-2.5 z-10 transition-colors"
                                onClick={e => { e.stopPropagation(); prevPhoto() }}>
                                <ChevLeft />
                            </button>

                            <motion.img
                                key={lbPhoto.src}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                src={lbPhoto.src}
                                alt={`${lbPhoto.unitName} - foto ${lbPhoto.idx}`}
                                className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl"
                                onError={e => { e.target.src = fallback }}
                            />

                            <button className="absolute right-0 translate-x-2 sm:translate-x-10 bg-white/10 hover:bg-white/25 text-white rounded-full p-2.5 z-10 transition-colors"
                                onClick={e => { e.stopPropagation(); nextPhoto() }}>
                                <ChevRight />
                            </button>
                        </div>

                        {/* Close */}
                        <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={closeLightbox}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

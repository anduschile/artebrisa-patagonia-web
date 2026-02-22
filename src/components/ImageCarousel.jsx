import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** Single image that hides itself on 404 */
function SafeImg({ src, alt, className, onClick }) {
    const [hidden, setHidden] = useState(false)
    if (hidden) return null
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setHidden(true)}
            onClick={onClick}
        />
    )
}

function ChevronLeft() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    )
}
function ChevronRight() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    )
}

export default function ImageCarousel({ images = [], altBase = 'Imagen' }) {
    const [current, setCurrent] = useState(0)
    const [lightbox, setLightbox] = useState(false)
    // track which thumb indices failed to load
    const [failed, setFailed] = useState(new Set())
    const stripRef = useRef(null)

    const visible = images.filter((_, i) => !failed.has(i))
    const totalVisible = visible.length

    const markFailed = useCallback((src) => {
        const idx = images.indexOf(src)
        if (idx !== -1) setFailed(prev => new Set([...prev, idx]))
    }, [images])

    // If current image failed, move to first non-failed
    const safeIndex = failed.has(current)
        ? images.findIndex((_, i) => !failed.has(i))
        : current

    function goTo(i) {
        setCurrent(i)
        // scroll thumbnail strip
        if (stripRef.current) {
            const btn = stripRef.current.children[i]
            btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
    }

    function prev() {
        // find previous non-failed
        let i = safeIndex - 1
        while (i >= 0 && failed.has(i)) i--
        if (i >= 0) goTo(i)
    }

    function next() {
        let i = safeIndex + 1
        while (i < images.length && failed.has(i)) i++
        if (i < images.length) goTo(i)
    }

    if (images.length === 0) return null

    const mainSrc = images[safeIndex] ?? images[0]

    return (
        <div className="select-none">
            {/* ── Main image ── */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/9] cursor-zoom-in"
                onClick={() => setLightbox(true)}>
                <AnimatePresence mode="wait">
                    <motion.img
                        key={mainSrc}
                        src={mainSrc}
                        alt={`${altBase} — foto ${safeIndex + 1}`}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onError={() => markFailed(mainSrc)}
                    />
                </AnimatePresence>

                {/* Counter badge */}
                {totalVisible > 1 && (
                    <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {visible.findIndex(s => s === mainSrc) + 1} / {totalVisible}
                    </span>
                )}

                {/* Zoom hint */}
                <span className="absolute top-3 right-3 bg-black/40 text-white/80 text-xs px-2.5 py-1 rounded-full backdrop-blur-sm hidden sm:inline-flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Ampliar
                </span>

                {/* Prev / Next */}
                {totalVisible > 1 && (
                    <>
                        <button
                            onClick={e => { e.stopPropagation(); prev() }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                            aria-label="Anterior"
                        >
                            <ChevronLeft />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); next() }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                            aria-label="Siguiente"
                        >
                            <ChevronRight />
                        </button>
                    </>
                )}
            </div>

            {/* ── Thumbnail strip ── */}
            {totalVisible > 1 && (
                <div
                    ref={stripRef}
                    className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                >
                    {images.map((src, i) => {
                        if (failed.has(i)) return null
                        const isActive = i === safeIndex
                        return (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all ${isActive ? 'border-primary-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-90'
                                    }`}
                                aria-label={`Ver foto ${i + 1}`}
                            >
                                <SafeImg
                                    src={src}
                                    alt={`Miniatura ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ── Lightbox ── */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
                        onClick={() => setLightbox(false)}
                    >
                        <motion.img
                            initial={{ scale: 0.92 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.92 }}
                            src={mainSrc}
                            alt={`${altBase} — ampliada`}
                            className="max-w-full max-h-full rounded-xl object-contain"
                            onClick={e => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setLightbox(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
                            aria-label="Cerrar"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        {/* Lightbox prev/next */}
                        {totalVisible > 1 && (
                            <>
                                <button onClick={e => { e.stopPropagation(); prev() }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                                    aria-label="Anterior"><ChevronLeft /></button>
                                <button onClick={e => { e.stopPropagation(); next() }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                                    aria-label="Siguiente"><ChevronRight /></button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

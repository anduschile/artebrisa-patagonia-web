import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HeroSection from '../components/HeroSection'
import UnitCard from '../components/UnitCard'
import FilterBar from '../components/FilterBar'
import ServicesSection from '../components/sections/ServicesSection'
import RatesSection from '../components/sections/RatesSection'
import LocationSection from '../components/sections/LocationSection'
import GalleryGlobal from '../components/GalleryGlobal'
import FaqSection from '../components/sections/FaqSection'
import ContactSection from '../components/sections/ContactSection'
import { getUnitsByType } from '../data/units'
import { SERVICES_BY_TYPE } from '../data/unitDefaults'
import { buildWaUrl } from '../config/contact'

// Service labels available for the filter bar (subset most relevant for cabañas)
const FILTER_SERVICES = SERVICES_BY_TYPE.cabana
    .filter(s => ['wifi', 'kitchen', 'heat', 'parking', 'washer'].includes(s.icon))
    .map(s => s.label)

const EMPTY_FILTERS = { capacity: null, services: [] }

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse">
                    <div className="h-52 bg-slate-200" />
                    <div className="p-5 space-y-3">
                        <div className="h-5 bg-slate-200 rounded w-3/4" />
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                        <div className="h-9 bg-slate-100 rounded-xl mt-4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function CabanasPage() {
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filters, setFilters] = useState(EMPTY_FILTERS)

    function load() {
        setLoading(true)
        setError(null)
        getUnitsByType('cabana')
            .then(data => { setUnits(data); setLoading(false) })
            .catch(() => { setError('No se pudo cargar la información. Inténtalo más tarde.'); setLoading(false) })
    }

    useEffect(() => { load() }, [])

    // ── Filtering ──
    const filtered = useMemo(() => {
        return units.filter(unit => {
            const cap = unit.capacidad_total ?? unit.capacity_total ?? unit.capacity ?? 0
            if (filters.capacity !== null && Number(cap) < filters.capacity) return false
            // Services are fixed per type; a cabaña always has all of them
            // so any service filter is always satisfied for cabana type
            return true
        })
    }, [units, filters])

    const total = filtered.length
    const showing = !loading && !error

    return (
        <div className="pb-16 md:pb-0">
            <HeroSection
                type="cabanas"
                title="Cabañas en la Patagonia"
                subtitle="Naturaleza, silencio y vistas a la cordillera. La experiencia auténtica de Puerto Natales."
            />

            <section id="alojamientos" className="py-10 px-4 sm:px-6 max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        {loading
                            ? 'Cargando cabañas…'
                            : `${total} cabaña${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''}`
                        }
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Todas con equipamiento completo · A minutos del centro</p>
                </div>

                {/* Filters */}
                {showing && units.length > 0 && (
                    <FilterBar
                        capacities={[2, 3, 4, 5, 6]}
                        services={FILTER_SERVICES}
                        filters={filters}
                        onChange={setFilters}
                    />
                )}

                {/* Loading */}
                {loading && <SkeletonGrid />}

                {/* Error */}
                {error && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">⚠️</div>
                        <p className="text-slate-600 mb-4">{error}</p>
                        <button onClick={load} className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors">
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Grid */}
                {showing && filtered.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
                    >
                        <AnimatePresence>
                            {filtered.map((unit, i) => (
                                <motion.div
                                    key={unit.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="flex"
                                >
                                    <UnitCard unit={unit} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* No results after filter */}
                {showing && units.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">🔍</div>
                        <p className="text-slate-600 mb-4">Ninguna cabaña cumple los filtros seleccionados.</p>
                        <button onClick={() => setFilters(EMPTY_FILTERS)} className="px-5 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors">
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {/* Empty state (no units in DB) */}
                {showing && units.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🏡</div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Próximamente</h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                            Las cabañas se están preparando. Contáctanos directamente para consultar disponibilidad.
                        </p>
                        <a
                            href={buildWaUrl('Hola, quiero consultar disponibilidad de cabañas en Arte Brisa Patagonia')}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
                        >
                            💬 Consultar por WhatsApp
                        </a>
                    </div>
                )}
            </section>

            <ServicesSection variant="cabana" />
            <RatesSection variant="cabana" />
            <LocationSection />
            <GalleryGlobal units={units} variant="cabana" />
            <FaqSection variant="cabana" />
            <ContactSection variant="cabana" />
        </div>
    )
}

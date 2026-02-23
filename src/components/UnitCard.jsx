import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { getUnitImage } from '../data/unitImages'
import { SERVICES_BY_TYPE, PRICES_BY_CODE } from '../data/unitDefaults'

// ─── Helpers ─────────────────────────────────────────────────
function truncate(str, max = 130) {
    if (!str) return ''
    return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}

// ─── Inline SVG icons ─────────────────────────────────────────
const ICONS = {
    wifi: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" />
            <path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" />
        </svg>
    ),
    kitchen: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
    ),
    heat: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2v6m0 0c0 2.5-2 4-2 6s2 3.5 2 6" />
            <path d="M7 4v4m0 0c0 2-1.5 3-1.5 5s1.5 2.5 1.5 5" />
            <path d="M17 4v4m0 0c0 2 1.5 3 1.5 5s-1.5 2.5-1.5 5" />
        </svg>
    ),
    parking: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17V7h4a3 3 0 010 6H9" />
        </svg>
    ),
    tv: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="7" width="20" height="13" rx="2" /><polyline points="17 2 12 7 7 2" />
        </svg>
    ),
    washer: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M6 6h.01M10 6h.01" />
        </svg>
    ),
    location: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
    bed: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 4v16" /><path d="M2 8h18a2 2 0 012 2v10" />
            <path d="M2 17h20" /><path d="M6 8v9" />
        </svg>
    ),
    towel: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 17l2-11a4 4 0 018 0v11" /><path d="M3 17h10" /><path d="M19 5v16" />
        </svg>
    ),
    bbq: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 11h16" /><path d="M12 11v8" /><path d="M9 19h6" />
            <path d="M6 4l2 7M18 4l-2 7" />
        </svg>
    ),
}

function ServiceStrip({ unitType }) {
    const type = unitType === 'cabana' ? 'cabana' : 'departamento'
    const services = (SERVICES_BY_TYPE[type] ?? []).slice(0, 4)
    if (!services.length) return null
    return (
        <div className="flex items-center gap-3 mb-3">
            {services.map(({ icon, label }) => (
                <span key={label} title={label} className="text-slate-400 hover:text-primary-500 transition-colors">
                    {ICONS[icon] ?? ICONS.bed}
                </span>
            ))}
            {(SERVICES_BY_TYPE[unitType === 'cabana' ? 'cabana' : 'departamento']?.length ?? 0) > 4 && (
                <span className="text-xs text-slate-400">
                    +{(SERVICES_BY_TYPE[unitType === 'cabana' ? 'cabana' : 'departamento']?.length ?? 0) - 4} más
                </span>
            )}
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────
export default function UnitCard({ unit }) {
    const navigate = useNavigate()
    const imageUrl = getUnitImage(unit)
    const capacity = unit.capacidad_total ?? unit.capacity_total ?? unit.capacity
    const typeLabel = unit.unit_type === 'cabana' ? 'Cabaña' : 'Departamento'
    const typeColor = unit.unit_type === 'cabana'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-primary-100 text-primary-700'

    const excerpt = truncate(unit.description, 130)
    const priceNum = PRICES_BY_CODE[unit.code]?.alta ?? null
    const href = `/unidad/${unit.id}`

    function handleCardClick(e) {
        // don't navigate twice if user clicked the Link button itself
        if (e.target.closest('a') || e.target.closest('button')) return
        navigate(href)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            onClick={handleCardClick}
            className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group flex flex-col h-full cursor-pointer"
        >
            {/* ── Image (clickable via card) ── */}
            <div className="relative h-52 overflow-hidden flex-shrink-0">
                <img
                    src={imageUrl}
                    alt={unit.name || typeLabel}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => {
                        e.target.onerror = null
                        e.target.src = unit.unit_type === 'cabana'
                            ? '/images/common/hero_cabanasa_artebrisa.png'
                            : '/images/common/hero_departamentos_patagonia.png'
                    }}
                />
                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${typeColor}`}>
                    {typeLabel}
                </span>
            </div>

            {/* ── Content ── */}
            <div className="p-5 flex flex-col flex-1">

                {/* Title */}
                <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                    {unit.name || `${typeLabel} ${unit.code}`}
                </h3>

                {/* Capacity · bed_config */}
                {capacity && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                        Hasta {capacity} personas
                        {unit.bed_config && <><span className="text-slate-200">·</span>{unit.bed_config}</>}
                    </div>
                )}

                {/* Description excerpt — grows to fill space */}
                <p className="text-slate-500 text-xs leading-relaxed mb-3 flex-1">
                    {excerpt || <span className="italic text-slate-300">Descripción próximamente</span>}
                </p>

                {/* Service icons */}
                <ServiceStrip unitType={unit.unit_type} />

                {/* Price */}
                <div className="mb-3">
                    <span className="text-xs text-slate-400">Desde </span>
                    {priceNum
                        ? <span className="text-primary-600 font-bold text-base">${priceNum.toLocaleString('es-CL')} <span className="text-xs text-slate-400 font-normal">(aprox.)</span> <span className="text-xs font-normal text-slate-400">/ noche</span></span>
                        : <span className="text-slate-400 font-semibold text-sm">— / noche</span>
                    }
                </div>

                {/* CTA — stays at bottom */}
                <Link
                    to={href}
                    onClick={e => e.stopPropagation()} // prevent double navigation
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver detalles y reservar
                </Link>
            </div>
        </motion.div>
    )
}

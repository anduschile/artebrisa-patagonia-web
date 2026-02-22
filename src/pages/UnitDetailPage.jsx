import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUnitById } from '../data/units'
import { getUnitImage, unitImages } from '../data/unitImages'
import { SERVICES_BY_TYPE, POLICIES, PRICES_BY_CODE, formatCLP } from '../data/unitDefaults'
import ImageCarousel from '../components/ImageCarousel'
import ReservationWidget from '../components/ReservationWidget'
import { WHATSAPP_NUMBER } from '../config/contact'

// ─── Derive gallery folder from mapping ─────────────────────
function getGalleryBase(unit) {
    const mapped = unit.code && unitImages[unit.code]
    if (mapped) return mapped.replace(/\/\d+\.jpg$/, '')
    return null
}

// ─── Service icons (inline SVG; no extra deps) ───────────────
const SERVICE_ICONS = {
    wifi: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" />
            <path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" />
        </svg>
    ),
    kitchen: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" /><path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
        </svg>
    ),
    heat: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v6m0 0c0 2.5-2 4-2 6s2 3.5 2 6" />
            <path d="M7 4v4m0 0c0 2-1.5 3-1.5 5s1.5 2.5 1.5 5" />
            <path d="M17 4v4m0 0c0 2 1.5 3 1.5 5s-1.5 2.5-1.5 5" />
        </svg>
    ),
    parking: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17V7h4a3 3 0 010 6H9" />
        </svg>
    ),
    tv: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="13" rx="2" /><polyline points="17 2 12 7 7 2" />
        </svg>
    ),
    washer: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M6 6h.01M10 6h.01" />
        </svg>
    ),
    bed: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4v16" /><path d="M2 8h18a2 2 0 012 2v10" />
            <path d="M2 17h20" /><path d="M6 8v9" />
        </svg>
    ),
    bbq: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11h16" /><path d="M12 11v8" /><path d="M9 19h6" />
            <path d="M6 4l2 7M18 4l-2 7" />
        </svg>
    ),
    location: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
    ),
    towel: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l2-11a4 4 0 018 0v11" /><path d="M3 17h10" /><path d="M19 5v16" />
        </svg>
    ),
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pt-24 animate-pulse space-y-6">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="aspect-[16/9] bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
                <div className="space-y-4">
                    <div className="h-8 bg-slate-200 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-40" />
                    <div className="h-24 bg-slate-100 rounded" />
                    <div className="h-40 bg-slate-100 rounded-2xl" />
                </div>
                <div className="h-80 bg-slate-100 rounded-2xl" />
            </div>
        </div>
    )
}

// ─── Section wrapper ─────────────────────────────────────────
function Section({ title, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-100 pt-6 mb-6"
        >
            <h2 className="text-base font-bold text-slate-800 mb-4">{title}</h2>
            {children}
        </motion.div>
    )
}

// ─── Servicios ───────────────────────────────────────────────
function ServicesBlock({ unitType }) {
    const services = SERVICES_BY_TYPE[unitType] ?? SERVICES_BY_TYPE.departamento
    return (
        <Section title="Servicios incluidos">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-primary-500 flex-shrink-0">
                            {SERVICE_ICONS[icon] ?? SERVICE_ICONS.bed}
                        </span>
                        {label}
                    </div>
                ))}
            </div>
        </Section>
    )
}

// ─── Políticas ───────────────────────────────────────────────
const POLICY_ICONS = {
    'Check-in': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    'Check-out': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    'Cancelación': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>,
    'Mascotas': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 015 5v3.5a3.5 3.5 0 01-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 018 13.5V13a5 5 0 011-3" /></svg>,
    'Niños': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    'Mínimo': <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
}

function PoliciesBlock() {
    const items = [
        { label: 'Check-in', value: POLICIES.check_in },
        { label: 'Check-out', value: POLICIES.check_out },
        { label: 'Cancelación', value: POLICIES.cancelacion },
        { label: 'Mascotas', value: POLICIES.mascotas },
        { label: 'Niños', value: POLICIES.ninos },
        { label: 'Mínimo', value: POLICIES.minimo },
    ]
    return (
        <Section title="Políticas de la estadía">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
                        <span className="text-primary-400 mt-0.5 flex-shrink-0">
                            {POLICY_ICONS[label]}
                        </span>
                        <div>
                            <span className="text-xs text-slate-400 block">{label}</span>
                            <span className="text-sm text-slate-700 font-medium">{value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    )
}

// ─── Precios por temporada ────────────────────────────────────
function PricesBlock({ code }) {
    const prices = PRICES_BY_CODE[code]
    if (!prices) return null
    const rows = [
        { label: 'Temporada alta', key: 'alta', note: 'Dic–Feb, Semana Santa' },
        { label: 'Temporada media', key: 'media', note: 'Oct–Nov, Mar–Abr' },
        { label: 'Temporada baja', key: 'baja', note: 'May–Sep' },
    ]
    return (
        <Section title="Precios por temporada">
            <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <th className="text-left px-4 py-2.5 font-semibold">Temporada</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Precio / noche</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ label, key, note }, i) => (
                            <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-4 py-3">
                                    <span className="font-medium text-slate-700">{label}</span>
                                    <span className="text-slate-400 text-xs block">{note}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`font-bold ${prices[key] ? 'text-primary-600' : 'text-slate-400'}`}>
                                        {formatCLP(prices[key])}
                                    </span>
                                    {prices[key] && <span className="text-slate-400 text-xs ml-1">CLP</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
                * Precios referenciales. La tarifa final puede variar según disponibilidad.
            </p>
        </Section>
    )
}

// ─── Main page ────────────────────────────────────────────────
export default function UnitDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [unit, setUnit] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (!id) { setNotFound(true); setLoading(false); return }
        getUnitById(id).then(data => {
            if (!data) setNotFound(true)
            else setUnit(data)
            setLoading(false)
        })
    }, [id])

    if (loading) return <Skeleton />

    if (notFound) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 pt-20">
                <div className="text-center">
                    <div className="text-5xl mb-4">🔍</div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Unidad no encontrada</h1>
                    <p className="text-slate-500 mb-5">La unidad con ID #{id} no existe o no está disponible.</p>
                    <Link to="/" className="px-5 py-2 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors">
                        ← Volver al inicio
                    </Link>
                </div>
            </div>
        )
    }

    // ── Derived data ──
    const typeLabel = unit.unit_type === 'cabana' ? 'Cabaña' : 'Departamento'
    const unitType = unit.unit_type === 'cabana' ? 'cabana' : 'departamento'
    const capacity = unit.capacidad_total ?? unit.capacity_total ?? unit.capacity
    const galleryBase = getGalleryBase(unit)
    const galleryImages = galleryBase
        ? Array.from({ length: 8 }, (_, i) => `${galleryBase}/${i + 1}.jpg`)
        : [getUnitImage(unit)] // fallback: just hero

    const waMsg = encodeURIComponent(
        `Hola, quiero consultar disponibilidad para ${typeLabel.toLowerCase()} *${unit.name || unit.code}* en Arte Brisa Patagonia.`
    )

    return (
        <div className="pb-16 md:pb-0">

            {/* ── Narrow top bar (breadcrumb / back) ── */}
            <div className="bg-white border-b border-slate-100 pt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-10 flex items-center gap-2 text-sm text-slate-500">
                    <button
                        onClick={() => navigate(-1)}
                        className="hover:text-primary-600 transition-colors flex items-center gap-1"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Volver
                    </button>
                    <span className="text-slate-300">/</span>
                    <Link to={unitType === 'cabana' ? '/cabanas' : '/departamentos'}
                        className="hover:text-primary-600 transition-colors capitalize"
                    >
                        {unitType === 'cabana' ? 'Cabañas' : 'Departamentos'}
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800 font-medium truncate max-w-[180px]">{unit.name || unit.code}</span>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

                {/* ── Full-width title row (above grid) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-6"
                >
                    <span className={`inline-block mb-2 px-3 py-0.5 rounded-full text-xs font-bold ${unitType === 'cabana' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                        }`}>{typeLabel}</span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                        {unit.name || `${typeLabel} ${unit.code}`}
                    </h1>
                    {capacity && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                            Hasta {capacity} personas
                        </div>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

                    {/* ── LEFT: carousel + content ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        {/* Carrusel — starts flush at top of grid row */}
                        <div className="mb-8">
                            <ImageCarousel images={galleryImages} altBase={unit.name || typeLabel} />
                        </div>

                        {/* Mobile widget */}
                        <div className="lg:hidden mb-6">
                            <ReservationWidget unit={unit} />
                        </div>

                        {/* ── Descripción ── */}
                        <Section title="Descripción">
                            <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                                {unit.description?.trim() || 'Descripción próximamente. Consultá por WhatsApp para más detalles.'}
                            </p>
                        </Section>

                        {/* ── Servicios ── */}
                        <ServicesBlock unitType={unitType} />

                        {/* ── Precios ── */}
                        <PricesBlock code={unit.code} />

                        {/* ── Políticas ── */}
                        <PoliciesBlock />

                        {/* ── WhatsApp fallback ── */}
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-700">¿Tienes preguntas?</p>
                                <p className="text-xs text-slate-500">Te respondemos por WhatsApp en minutos.</p>
                            </div>
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-colors flex-shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                                Consultar por WhatsApp
                            </a>
                        </div>
                    </motion.div>

                    {/* ── RIGHT: sticky widget (desktop only) ── */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24">
                            <ReservationWidget unit={unit} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

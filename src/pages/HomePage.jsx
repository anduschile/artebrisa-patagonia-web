import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import HeroSection from '../components/HeroSection'
import UnitCard from '../components/UnitCard'
import { getFeaturedUnits } from '../data/units'

const WHATSAPP = import.meta.env.VITE_WHATSAPP || '56912345678'

function CategoryCard({ to, title, description, imageClass, color }) {
    return (
        <Link to={to} className="group block relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
            <div className={`h-64 sm:h-72 ${imageClass} bg-cover bg-center`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${color}`}>
                        Ver todos
                    </div>
                    <h3 className="text-white font-black text-2xl leading-tight">{title}</h3>
                    <p className="text-white/80 text-sm mt-1">{description}</p>
                </div>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </Link>
    )
}

function TrustBar() {
    return (
        <div className="bg-white border-b border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span className="text-yellow-400 text-base">⭐</span>
                        <strong className="text-slate-800">9.4/10</strong> valoración promedio
                    </span>
                    <span className="hidden sm:block text-slate-300">|</span>
                    <span className="flex items-center gap-1.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Cabañas y departamentos
                    </span>
                    <span className="hidden sm:block text-slate-300">|</span>
                    <span className="flex items-center gap-1.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        Puerto Natales, Patagonia
                    </span>
                </div>
            </div>
        </div>
    )
}

export default function HomePage() {
    const [featured, setFeatured] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getFeaturedUnits(4).then(data => {
            setFeatured(data)
            setLoading(false)
        })
    }, [])

    return (
        <div className="pb-16 md:pb-0">
            {/* Hero */}
            <HeroSection
                type="home"
                title="Tu refugio en la Patagonia"
                subtitle="Complejo de cabañas familiares a 5 km y departamentos equipados en pleno Puerto Natales. Dos experiencias distintas, la misma hospitalidad."
            >
                <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                        to="/cabanas"
                        className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-lg text-sm"
                    >
                        🏡 Ver Cabañas
                    </Link>
                    <Link
                        to="/departamentos"
                        className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
                    >
                        🏙️ Ver Departamentos
                    </Link>
                </div>
            </HeroSection>

            {/* Trust bar */}
            <TrustBar />

            {/* Category section */}
            <section className="py-14 px-4 sm:px-6 max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Elige cómo vivir tu estadía</h2>
                    <p className="text-slate-500 max-w-lg mx-auto">Naturaleza y aventura o comodidad urbana — ambas opciones a minutos de los grandes atractivos patagonicos.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CategoryCard
                        to="/cabanas"
                        title="Cabañas"
                        description="Vista a la cordillera, silencio y naturaleza"
                        imageClass="hero-cabanas"
                        color="bg-amber-400/90 text-amber-900"
                    />
                    <CategoryCard
                        to="/departamentos"
                        title="Departamentos"
                        description="Ubicación estratégica en el centro de Natales"
                        imageClass="hero-departamentos"
                        color="bg-primary-400/90 text-primary-900"
                    />
                </div>
            </section>

            {/* Featured units */}
            {(loading || featured.length > 0) && (
                <section className="pb-14 px-4 sm:px-6 max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Destacados de temporada</h2>
                            <p className="text-slate-500 text-sm mt-1">Nuestros alojamientos más consultados</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse">
                                    <div className="h-52 bg-slate-200" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-5 bg-slate-200 rounded w-3/4" />
                                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                                        <div className="h-9 bg-slate-100 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {featured.map(unit => (
                                <UnitCard key={unit.id} unit={unit} />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* WhatsApp section */}
            <section className="py-14 bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
                    <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">¿Preguntas? Estamos en WhatsApp</h2>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                        Consulta disponibilidad, precios y todo lo que necesitas saber antes de reservar. Te respondemos en minutos.
                    </p>
                    <a
                        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quiero consultar disponibilidad en Arte Brisa Patagonia')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg text-base"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        Consultar ahora
                    </a>
                </div>
            </section>
        </div>
    )
}

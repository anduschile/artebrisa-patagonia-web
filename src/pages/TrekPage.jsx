import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import HeroSection from '../components/HeroSection'
import SearchWidget from '../components/SearchWidget'
import SeoHead from '../components/SeoHead'
import { getUnitsByType } from '../data/units'
import { formatCLP } from '../data/unitDefaults'
import { buildWaUrl } from '../config/contact'
import { trackWhatsappClick } from '../lib/analytics'
import { PAGE_META } from '../seo/pageMeta'

// Página exclusiva en inglés para tráfico de Google Ads del grupo "Base
// para el trek" — no tiene versión /es ni /de, por eso todo el copy va
// hardcodeado (no por i18n) salvo los componentes reusados (SearchWidget)
// que sí traducen por su cuenta según el idioma activo.

function minPrice(units) {
    const prices = units
        .map(u => Number(u.base_price))
        .filter(p => p > 0)
    return prices.length ? Math.min(...prices) : null
}

// ─── "Everything you need" bullets ──────────────────────────
// Solo servicios comunes a Tiny Houses, Cabins y Apartments (ver
// SERVICES_BY_TYPE en unitDefaults.js): "washer" y "parking" existen
// únicamente en unit_type 'cabana' (Tiny Houses + Cabins), no en
// 'departamento' (Apartments) — se excluyen de esta lista para no
// prometer algo que los apartamentos no tienen.
const NEEDS = [
    { title: 'Hot showers & heating', desc: 'Warm up after days on the trail' },
    { title: 'Full kitchen', desc: 'Prepare your own meals before or after the trek' },
    { title: 'Comfortable beds', desc: 'Real rest before an early start into the park' },
    { title: 'Free WiFi', desc: 'Plan your route, stay connected' },
]

const WHY_DIRECT = [
    { title: 'Direct communication', desc: 'Talk directly with the property before and during your stay.' },
    { title: 'Flexible cancellation', desc: 'Free cancellation up to 5 days before arrival.' },
    { title: 'Simple reservation process', desc: 'Check availability and book directly with Arte Brisa Patagonia.' },
]

const FAQS = [
    {
        q: 'How far is Arte Brisa Patagonia from Puerto Natales?',
        a: 'Our cabins and tiny houses are about 5 km from downtown Puerto Natales, in the Huertos Familiares area — close to the road out to the park. Our apartments are right in the city center, within walking distance of restaurants and shops.',
    },
    {
        q: 'Can I stay before and after the W Trek?',
        a: 'Yes — many guests book a night before starting the trek to organize gear and supplies, and another night after finishing to rest before heading back. You can check availability for both stays at once below.',
    },
    {
        q: 'Do the accommodations have kitchens and heating?',
        a: 'Yes. All cabins, tiny houses and apartments include a full kitchen and heating, so you can cook your own meals and warm up after the trail.',
    },
]

function WaButton({ location, className, children }) {
    return (
        <a
            href={buildWaUrl('Hola! Vengo de la página del trek W, quiero consultar disponibilidad y valores. 😊')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsappClick(location)}
            className={className}
        >
            {children}
        </a>
    )
}

function FaqAccordion() {
    const [open, setOpen] = useState(null)
    return (
        <div className="space-y-3">
            {FAQS.map((faq, i) => (
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
                                className="mt-3 text-slate-600 text-sm leading-relaxed"
                            >
                                {faq.a}
                            </motion.p>
                        )}
                    </button>
                </motion.div>
            ))}
        </div>
    )
}

function BaseCard({ image, title, guests, price, location, cta, href }) {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow flex flex-col">
            <div className="h-48 overflow-hidden flex-shrink-0">
                <img src={image} alt={title} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 text-lg mb-1">{title}</h3>
                <p className="text-slate-500 text-sm mb-1">{guests}</p>
                <p className="text-slate-400 text-xs mb-3">{location}</p>
                <div className="mb-4">
                    <span className="text-xs text-slate-400">From </span>
                    {price != null
                        ? <span className="text-primary-600 font-bold text-base">{formatCLP(price, 'en')} <span className="text-xs text-slate-400 font-normal">/ night</span></span>
                        : <span className="text-slate-400 font-semibold text-sm">— / night</span>
                    }
                </div>
                <a
                    href={href}
                    className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                    {cta}
                </a>
            </div>
        </div>
    )
}

export default function TrekPage() {
    const meta = PAGE_META.en.trek
    const [prices, setPrices] = useState({ tiny: null, cabins: null, apartments: null })

    useEffect(() => {
        Promise.all([getUnitsByType('cabana'), getUnitsByType('departamento')]).then(([cabanaUnits, deptoUnits]) => {
            const tiny = cabanaUnits.filter(u => u.code?.startsWith('TINY'))
            const cabins = cabanaUnits.filter(u => u.code?.startsWith('CAB'))
            setPrices({
                tiny: minPrice(tiny),
                cabins: minPrice(cabins),
                apartments: minPrice(deptoUnits),
            })
        })
    }, [])

    return (
        <div className="pb-16 md:pb-0">
            <SeoHead path="/trek" title={meta.title} description={meta.description} noAlternates />

            {/* ── Hero ── */}
            <HeroSection
                type="trek"
                title="Your Base Before and After the W Trek"
                subtitle="Private cabins, tiny houses and apartments to rest, recharge, and get ready for Torres del Paine."
            >
                <p className="text-white/80 text-sm sm:text-base mt-3 max-w-xl">
                    Book direct and stay in touch with the property throughout your trip.
                </p>

                <div className="flex items-center gap-2 mt-4 text-white/90 text-sm">
                    <span className="text-yellow-400 text-base">⭐</span>
                    <strong>9.4/10</strong> average rating
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <a
                        href="#availability"
                        className="inline-flex items-center justify-center px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        Check Availability
                    </a>
                    <WaButton
                        location="trek_hero"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                        Message Us on WhatsApp
                    </WaButton>
                </div>
            </HeroSection>

            {/* ── Availability / SearchWidget ── */}
            <section id="availability" className="py-10 px-4 sm:px-6 max-w-6xl mx-auto">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 text-center mb-4">
                    Check Availability for Your Trek Dates
                </h2>
                <SearchWidget />
            </section>

            {/* ── Everything you need ── */}
            <section className="py-16 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-10">
                        Everything You Need Before and After the Trail
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {NEEDS.map(item => (
                            <div key={item.title} className="bg-slate-50 rounded-2xl p-5 text-center">
                                <h3 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h3>
                                <p className="text-xs text-slate-500 leading-snug">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Choose Your Base ── */}
            <section className="py-16 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-10">
                        Choose Your Base
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <BaseCard
                            image="/images/cabanas/tiny-calafate/1.jpg"
                            title="Tiny Houses"
                            guests="For 2 guests"
                            location="5 km from town, near the park entrance road"
                            price={prices.tiny}
                            cta="View Tiny Houses"
                            href="/en/cabanas"
                        />
                        <BaseCard
                            image="/images/departamentos/cuadruple/1.jpg"
                            title="Apartments"
                            guests="For 3–5 guests"
                            location="Downtown Puerto Natales, walking distance to restaurants and shops"
                            price={prices.apartments}
                            cta="View Apartments"
                            href="/en/departamentos"
                        />
                        <BaseCard
                            image="/images/cabanas/ciruelillo/1.jpg"
                            title="Cabins"
                            guests="For 4–6 guests"
                            location="5 km from town, near the park entrance road"
                            price={prices.cabins}
                            cta="View Cabins"
                            href="/en/cabanas"
                        />
                    </div>
                    <p className="text-center text-slate-400 text-xs mt-6">Rates vary by unit and dates.</p>
                </div>
            </section>

            {/* ── Why Book Direct ── */}
            <section className="py-16 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-10">
                        Why Book Direct
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {WHY_DIRECT.map(item => (
                            <div key={item.title} className="bg-slate-50 rounded-2xl p-5">
                                <h3 className="font-bold text-slate-800 text-sm mb-1.5">{item.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="py-16 bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 text-center mb-10">
                        Frequently Asked Questions
                    </h2>
                    <FaqAccordion />
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="py-16 bg-primary-600">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">
                        Ready to book your base for the W Trek?
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="#availability"
                            className="inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-slate-100 text-primary-700 font-bold rounded-xl transition-colors text-sm"
                        >
                            Check Availability
                        </a>
                        <WaButton
                            location="trek_final_cta"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors text-sm"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                            Message Us on WhatsApp
                        </WaButton>
                    </div>
                </div>
            </section>
        </div>
    )
}

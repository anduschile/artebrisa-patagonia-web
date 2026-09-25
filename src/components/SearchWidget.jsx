import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAvailableUnits } from '../data/units'
import { getUnitImage } from '../data/unitImages'
import { unitSlug } from '../data/unitSlug'
import { PRICES_BY_CODE } from '../data/unitDefaults'
import { useLang } from '../i18n/LangContext'
import { withLang } from '../i18n/languages'

function formatDate(isoDate, lang) {
    return new Date(isoDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CL', {
        day: 'numeric', month: 'long',
    })
}

function ResultCard({ unit }) {
    const lang = useLang()
    const { t } = useTranslation()
    const imageUrl = getUnitImage(unit)
    const capacity = unit.capacity_total ?? 0
    const typeLabel = unit.unit_type === 'cabana' ? t('common.typeCabana') : t('common.typeDepartamento')
    const typeColor = unit.unit_type === 'cabana'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-primary-100 text-primary-700'
    const priceNum = unit.base_price || PRICES_BY_CODE[unit.code]?.alta || null
    const displayDescription = lang === 'en'
        ? (unit.description_en?.trim() || unit.description)
        : unit.description

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow flex flex-col sm:flex-row">
            <div className="relative sm:w-52 h-48 sm:h-auto flex-shrink-0 overflow-hidden">
                <img
                    src={imageUrl}
                    alt={unit.name || typeLabel}
                    className="w-full h-full object-cover"
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

            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight mb-2">
                    {unit.name}
                </h3>

                <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    {t('common.capacity', { count: capacity })}
                    {unit.bed_config && <span className="text-slate-300 mx-0.5">·</span>}
                    {unit.bed_config && <span>{unit.bed_config}</span>}
                </div>

                {displayDescription && (
                    <p className="text-slate-500 text-sm leading-relaxed mb-3 flex-1 line-clamp-2">
                        {displayDescription}
                    </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <div>
                        <span className="text-xs text-slate-400">{t('common.from')} </span>
                        {priceNum
                            ? <span className="text-primary-600 font-bold text-base">
                                ${Number(priceNum).toLocaleString('es-CL')}
                                <span className="text-xs text-slate-400 font-normal"> {t('common.perNight')}</span>
                              </span>
                            : <span className="text-slate-400 font-semibold text-sm">— {t('common.perNight')}</span>
                        }
                    </div>
                    <Link
                        to={withLang(lang, `/unidad/${unitSlug(unit)}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors"
                    >
                        {t('search.viewAndBook')}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function SearchWidget() {
    const today = new Date().toISOString().split('T')[0]
    const { t } = useTranslation()
    const lang = useLang()

    const [checkIn, setCheckIn]     = useState('')
    const [checkOut, setCheckOut]   = useState('')
    const [guests, setGuests]       = useState(2)
    const [results, setResults]     = useState(null)
    const [loading, setLoading]     = useState(false)
    const [apiError, setApiError]   = useState(null)
    const [formError, setFormError] = useState(null)

    const nights = checkIn && checkOut && checkOut > checkIn
        ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
        : null

    async function handleSearch(e) {
        e.preventDefault()

        if (!checkIn || !checkOut) {
            setFormError(t('search.errorDates'))
            return
        }
        if (checkOut <= checkIn) {
            setFormError(t('search.errorOrder'))
            return
        }

        setFormError(null)
        setApiError(null)
        setResults(null)
        setLoading(true)

        try {
            const available = await getAvailableUnits({ check_in: checkIn, check_out: checkOut, guests })
            setResults(available)
            setTimeout(() => {
                document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 80)
        } catch {
            setApiError(t('search.errorApi'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="bg-gradient-to-b from-primary-50 to-white py-8 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">

                {/* ── Formulario ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
                    <div className="bg-primary-600 px-6 py-4">
                        <h2 className="text-white font-black text-xl sm:text-2xl">
                            {t('search.title')}
                        </h2>
                        <p className="text-primary-100 text-sm mt-0.5">
                            {t('search.subtitle')}
                        </p>
                    </div>

                    <form onSubmit={handleSearch} className="p-5 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    {t('search.checkIn')}
                                </label>
                                <input
                                    type="date"
                                    min={today}
                                    value={checkIn}
                                    onChange={e => {
                                        setCheckIn(e.target.value)
                                        if (checkOut && checkOut <= e.target.value) setCheckOut('')
                                    }}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    {t('search.checkOut')}
                                </label>
                                <input
                                    type="date"
                                    min={checkIn || today}
                                    value={checkOut}
                                    onChange={e => setCheckOut(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    {t('search.guests')}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={guests}
                                    onChange={e => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-5 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm"
                                >
                                    {loading ? t('search.searching') : t('search.submit')}
                                </button>
                            </div>
                        </div>

                        {nights && (
                            <p className="mt-3 text-xs text-primary-600 font-semibold">
                                {t('search.nights', { count: nights })}
                            </p>
                        )}

                        {formError && (
                            <p className="mt-3 text-sm text-red-500 font-medium">{formError}</p>
                        )}
                    </form>
                </div>

                {/* ── Resultados ── */}
                <div id="search-results">
                    {loading && (
                        <div className="mt-8 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl shadow-md h-40 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {apiError && !loading && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                            {apiError}
                        </div>
                    )}

                    {results !== null && !loading && (
                        <div className="mt-6">
                            {results.length === 0 ? (
                                <div className="text-center py-12 px-4 bg-white rounded-2xl shadow-md border border-slate-100">
                                    <p className="text-4xl mb-3">😔</p>
                                    <h3 className="font-bold text-slate-800 text-lg mb-2">
                                        {t('search.noResultsTitle')}
                                    </h3>
                                    <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                        {t('search.noResultsPrefix')}{' '}
                                        <strong>{t('search.guestsCount', { count: guests })}</strong>{' '}
                                        {t('search.noResultsBetween')}{' '}
                                        <strong>{formatDate(checkIn, lang)}</strong>{' '}
                                        {t('search.noResultsAnd')}{' '}
                                        <strong>{formatDate(checkOut, lang)}</strong>.{' '}
                                        {t('search.noResultsSuffix')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-black text-slate-900 text-lg">
                                            {t('search.resultsCount', { count: results.length })}
                                        </h3>
                                        <span className="text-sm text-slate-500">
                                            {t('search.nights', { count: nights })} · {t('search.guestsCount', { count: guests })}
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        {results.map(unit => (
                                            <ResultCard key={unit.id} unit={unit} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </section>
    )
}

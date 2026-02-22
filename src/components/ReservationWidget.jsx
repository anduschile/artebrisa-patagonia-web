import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWebChannelId } from '../data/channels'
import { findOrCreateGuest } from '../data/guests'
import { getConflicts, createInquiryReservation } from '../data/reservations'
import { WHATSAPP_NUMBER } from '../config/contact'

// ─── helpers ────────────────────────────────────────────────
function todayStr() {
    return new Date().toISOString().slice(0, 10)
}
function tomorrowStr() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
}
function nightCount(ci, co) {
    if (!ci || !co) return 0
    const diff = (new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24)
    return Math.max(0, diff)
}
function formatDate(str) {
    if (!str) return ''
    const [y, m, d] = str.split('-')
    return `${d}/${m}/${y}`
}
function buildWhatsAppMsg({ unit, reservation, guest }) {
    const lines = [
        `Hola, acabo de solicitar una reserva en *Arte Brisa Patagonia*:`,
        ``,
        `🏠 *Unidad:* ${unit.name || unit.code || unit.id}`,
        `📅 *Check-in:* ${formatDate(reservation.check_in)}`,
        `📅 *Check-out:* ${formatDate(reservation.check_out)}`,
        `🌙 *Noches:* ${nightCount(reservation.check_in, reservation.check_out)}`,
        `👤 *Huéspedes:* ${reservation.adults} adulto${reservation.adults !== 1 ? 's' : ''}${reservation.children ? `, ${reservation.children} niño${reservation.children !== 1 ? 's' : ''}` : ''}`,
        ``,
        `*Contacto:*`,
        `Nombre: ${guest.full_name}`,
        ...(guest.phone ? [`Tel: ${guest.phone}`] : []),
        ...(guest.email ? [`Email: ${guest.email}`] : []),
        ``,
        `🔑 *ID reserva:* #${reservation.id}`,
    ]
    return encodeURIComponent(lines.join('\n'))
}

// ─── Step indicator ──────────────────────────────────────────
function StepDot({ n, active, done }) {
    return (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${done ? 'bg-green-500 border-green-500 text-white' :
            active ? 'bg-primary-500 border-primary-500 text-white' :
                'bg-white border-slate-300 text-slate-400'
            }`}>
            {done ? '✓' : n}
        </div>
    )
}

// ─── Confirmation screen ─────────────────────────────────────
function ConfirmationScreen({ reservation, unit, guest }) {
    const waMsg = buildWhatsAppMsg({ unit, reservation, guest })

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
        >
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">¡Solicitud enviada!</h3>
            <p className="text-slate-500 text-sm mb-1">
                Tu consulta fue registrada con el ID:
            </p>
            <p className="font-mono text-primary-600 font-bold text-base mb-4">#{reservation.id}</p>

            <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-1.5 mb-5 border border-slate-200">
                <div className="flex justify-between"><span className="text-slate-500">Unidad</span><span className="font-semibold text-slate-800">{unit.name || unit.code}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Check-in</span><span className="font-semibold">{formatDate(reservation.check_in)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Check-out</span><span className="font-semibold">{formatDate(reservation.check_out)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Noches</span><span className="font-semibold">{nightCount(reservation.check_in, reservation.check_out)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Huéspedes</span><span className="font-semibold">{reservation.adults}a {reservation.children > 0 ? `+ ${reservation.children}n` : ''}</span></div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
                Te contactaremos para confirmar. Para agilizar, escríbenos por WhatsApp:
            </p>
            <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                Confirmar por WhatsApp
            </a>
        </motion.div>
    )
}

// ─── Main widget ─────────────────────────────────────────────
export default function ReservationWidget({ unit }) {
    const [step, setStep] = useState(1) // 1=dates, 2=guest
    const [checkIn, setCheckIn] = useState(tomorrowStr())
    const [checkOut, setCheckOut] = useState('')
    const [adults, setAdults] = useState(1)
    const [children, setChildren] = useState(0)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [conflictMsg, setConflictMsg] = useState(null)
    const [done, setDone] = useState(null) // { reservation, guest }

    const nights = nightCount(checkIn, checkOut)

    // Step 1 validation
    function validateDates() {
        if (!checkIn) return 'Selecciona fecha de check-in'
        if (!checkOut) return 'Selecciona fecha de check-out'
        if (checkOut <= checkIn) return 'Check-out debe ser posterior al check-in'
        if (adults < 1) return 'Al menos 1 adulto requerido'
        return null
    }

    async function handleCheckAvailability(e) {
        e.preventDefault()
        const err = validateDates()
        if (err) { setError(err); return }
        setError(null)
        setConflictMsg(null)
        setLoading(true)
        try {
            const conflicts = await getConflicts({ unit_id: unit.id, check_in: checkIn, check_out: checkOut })
            if (conflicts.length > 0) {
                setConflictMsg('Lo sentimos, esas fechas no están disponibles. Por favor elige otras.')
            } else {
                setStep(2)
            }
        } catch (e) {
            setError('Error verificando disponibilidad: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!fullName.trim()) { setError('El nombre es obligatorio'); return }
        setError(null)
        setLoading(true)
        try {
            const [channel_id, guest_id] = await Promise.all([
                getWebChannelId(),
                findOrCreateGuest({ full_name: fullName, email, phone }),
            ])

            // Double-check availability before inserting
            const conflicts = await getConflicts({ unit_id: unit.id, check_in: checkIn, check_out: checkOut })
            if (conflicts.length > 0) {
                setConflictMsg('Esas fechas acaban de quedar ocupadas. Elige otras.')
                setStep(1)
                setLoading(false)
                return
            }

            const reservation = await createInquiryReservation({
                unit,
                guest_id,
                channel_id,
                check_in: checkIn,
                check_out: checkOut,
                adults,
                children,
                notes,
            })

            setDone({ reservation, guest: { full_name: fullName, email, phone } })
        } catch (e) {
            setError('Error al crear la reserva: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                <ConfirmationScreen reservation={done.reservation} unit={unit} guest={done.guest} />
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
                <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider mb-0.5">Reserva directa</p>
                <h3 className="text-white font-black text-lg leading-tight">{unit.name || unit.code}</h3>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                <StepDot n={1} active={step === 1} done={step > 1} />
                <div className="flex-1 h-0.5 bg-slate-200">
                    <div className={`h-full bg-primary-400 transition-all duration-300 ${step > 1 ? 'w-full' : 'w-0'}`} />
                </div>
                <StepDot n={2} active={step === 2} done={false} />
            </div>
            <div className="flex justify-between px-6 pb-3 text-[11px] text-slate-400 font-medium">
                <span>Fechas y huéspedes</span>
                <span>Tus datos</span>
            </div>

            {/* Error / conflict banner */}
            <AnimatePresence>
                {(error || conflictMsg) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mx-6 mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                    >
                        {error || conflictMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Step 1: Dates ── */}
            {step === 1 && (
                <form onSubmit={handleCheckAvailability} className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Check-in</label>
                            <input
                                type="date"
                                value={checkIn}
                                min={todayStr()}
                                onChange={e => { setCheckIn(e.target.value); setConflictMsg(null) }}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Check-out</label>
                            <input
                                type="date"
                                value={checkOut}
                                min={checkIn || todayStr()}
                                onChange={e => { setCheckOut(e.target.value); setConflictMsg(null) }}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {nights > 0 && (
                        <p className="text-xs text-primary-600 font-semibold text-center bg-primary-50 rounded-lg py-1.5">
                            {nights} noche{nights !== 1 ? 's' : ''}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Adultos</label>
                            <input
                                type="number"
                                value={adults}
                                min={1}
                                max={unit.capacidad_total || unit.capacity || 20}
                                onChange={e => setAdults(parseInt(e.target.value) || 1)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Niños</label>
                            <input
                                type="number"
                                value={children}
                                min={0}
                                max={20}
                                onChange={e => setChildren(parseInt(e.target.value) || 0)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                    >
                        {loading ? 'Verificando...' : 'Verificar disponibilidad →'}
                    </button>
                </form>
            )}

            {/* ── Step 2: Guest data ── */}
            {step === 2 && (
                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex justify-between border border-slate-200">
                        <span>{formatDate(checkIn)} → {formatDate(checkOut)}</span>
                        <span className="font-semibold text-primary-600">{nights} noche{nights !== 1 ? 's' : ''} · {adults}a{children > 0 ? ` ${children}n` : ''}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo *</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Tu nombre y apellido"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono / WhatsApp</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="+56 9 XXXX XXXX"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Notas (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Llegada tardía, necesidades especiales, etc."
                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(null) }}
                            className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            ← Atrás
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !fullName.trim()}
                            className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
                        >
                            {loading ? 'Enviando...' : 'Enviar solicitud'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}

import { useState, useEffect, useMemo } from 'react'
import { getCalendarReservations } from '../../data/admin/reservations'

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
    inquiry: 'bg-amber-100 border-amber-200 text-amber-800',
    confirmed: 'bg-green-100 border-green-200 text-green-800',
    blocked: 'bg-gray-100 border-gray-200 text-gray-600',
    cancelled: 'bg-red-100 border-red-200 text-red-700',
}
const STATUS_DOT = {
    inquiry: 'bg-amber-500',
    confirmed: 'bg-green-500',
    blocked: 'bg-gray-400',
    cancelled: 'bg-red-400',
}
const STATUS_LABEL = {
    inquiry: 'Consulta', confirmed: 'Confirmada', blocked: 'Bloqueada', cancelled: 'Cancelada',
}

function isoDate(d) { return d.toISOString().slice(0, 10) }
function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d)
}
function dayKey(dateStr) { return dateStr }   // 'YYYY-MM-DD'

/** Get first day (Monday) of the ISO week containing `dateStr` */
function weekStart(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day   // shift so Monday = 0
    d.setDate(d.getDate() + diff)
    return isoDate(d)
}

/** Build calendar grid: 6 rows × 7 cols starting from Monday of the first week of the month */
function buildCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1)
    const firstStr = isoDate(firstDay)
    const gridStart = weekStart(firstStr)
    const days = []
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i))
    return days
}

/** Check if reservation spans a given day (check_in ≤ day < check_out) */
function spansDay(r, day) { return r.check_in <= day && r.check_out > day }

/** Truncate text for calendar cell */
function guestName(r) {
    const g = r.core_guests
    if (!g) return r.external_source ? '[iCal]' : '—'
    return (g.full_name || '').split(' ')[0] || '—'
}
function unitName(r) {
    const u = r.core_units
    return u?.code || u?.name?.slice(0, 8) || '?'
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Component ────────────────────────────────────────────────────────────────
export default function MonthCalendar({ units, onSelect, refreshKey = 0 }) {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())       // 0-indexed
    const [selUnit, setSelUnit] = useState('')               // '' = all

    const gridDays = useMemo(() => buildCalendarGrid(year, month), [year, month])

    const [reservations, setReservations] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const from = gridDays[0]
        const to = addDays(gridDays[gridDays.length - 1], 1)
        let cancelled = false
        setLoading(true)
        setError(null)
        getCalendarReservations({ from, to })
            .then(data => { if (!cancelled) setReservations(data) })
            .catch(e => { if (!cancelled) setError(e.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [gridDays, refreshKey])

    const visibleRes = useMemo(() => {
        const active = reservations.filter(r => ['inquiry', 'confirmed', 'blocked'].includes(r.status))
        if (!selUnit) return active
        return active.filter(r => String(r.unit_id) === String(selUnit))
    }, [reservations, selUnit])

    function prevMonth() {
        if (month === 0) { setMonth(11); setYear(y => y - 1) }
        else setMonth(m => m - 1)
    }
    function nextMonth() {
        if (month === 11) { setMonth(0); setYear(y => y + 1) }
        else setMonth(m => m + 1)
    }

    const todayStr = isoDate(now)

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Month navigation */}
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-gray-900 font-bold text-base min-w-36 text-center">
                        {MONTHS_ES[month]} {year}
                    </span>
                    <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {/* Unit filter */}
                <select
                    value={selUnit}
                    onChange={e => setSelUnit(e.target.value)}
                    className="bg-white text-gray-900 text-sm rounded-lg px-3 py-1.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                    <option value="">Todas las unidades</option>
                    {units.map(u => (
                        <option key={u.id} value={String(u.id)}>{u.name || u.code}</option>
                    ))}
                </select>

                {/* Loading / error indicator */}
                {loading && (
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Cargando…
                    </span>
                )}
                {error && <span className="text-xs text-red-500">⚠ {error}</span>}

                {/* Legend */}
                <div className="flex items-center gap-3 ml-auto">
                    {Object.entries(STATUS_LABEL).map(([s, l]) => (
                        <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />{l}
                        </span>
                    ))}
                </div>
            </div>

            {/* Calendar grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS_ES.map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase py-1">{d}</div>
                        ))}
                    </div>

                    {/* 6 rows of days */}
                    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
                        {gridDays.map(day => {
                            const isThisMonth = parseInt(day.slice(5, 7)) - 1 === month
                            const isToday = day === todayStr
                            const dayRes = visibleRes.filter(r => spansDay(r, day))

                            return (
                                <div
                                    key={day}
                                    className={`bg-white min-h-[80px] p-1 ${!isThisMonth ? 'opacity-40' : ''} ${isToday ? 'ring-1 ring-inset ring-primary-500' : ''}`}
                                >
                                    {/* Day number */}
                                    <p className={`text-[11px] font-bold mb-0.5 ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                                        {parseInt(day.slice(8))}
                                    </p>
                                    {/* Reservation chips — show up to 3 */}
                                    <div className="space-y-0.5">
                                        {dayRes.slice(0, 3).map(r => (
                                            <div
                                                key={r.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => onSelect?.(r)}
                                                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect?.(r)}
                                                className={`text-[10px] px-1 py-0.5 rounded truncate border cursor-pointer hover:brightness-95 transition-all ${STATUS_COLOR[r.status] || STATUS_COLOR.blocked}`}
                                                title={`${guestName(r)} · ${r.check_in} → ${r.check_out} · ${STATUS_LABEL[r.status]}`}
                                            >
                                                {selUnit ? guestName(r) : `${unitName(r)} ${guestName(r)}`}
                                            </div>
                                        ))}
                                        {dayRes.length > 3 && (
                                            <p className="text-[10px] text-gray-400 pl-1">+{dayRes.length - 3} más</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

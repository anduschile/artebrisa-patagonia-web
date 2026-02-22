import { useState, useMemo } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
    inquiry: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    confirmed: 'bg-green-900 text-green-300 border-green-700',
    blocked: 'bg-slate-700 text-slate-300 border-slate-600',
    cancelled: 'bg-red-900 text-red-300 border-red-700',
}
const STATUS_LABEL = {
    inquiry: 'Consulta', confirmed: 'Confirmada', blocked: 'Bloqueada', cancelled: 'Cancelada',
}

function isoDate(d) { return d.toISOString().slice(0, 10) }
function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d)
}

const DAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function mondayOfWeek(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return isoDate(d)
}

function fmtDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
}

function guestName(r) {
    const g = r.core_guests
    if (!g) return r.external_source ? '[iCal bloqueo]' : '—'
    return g.full_name || '—'
}
function unitName(r) {
    const u = r.core_units
    return u ? (u.name || u.code || '—') : '—'
}
function nights(r) {
    const n = (new Date(r.check_out) - new Date(r.check_in)) / 86400000
    return n > 0 ? n : 0
}

/** Reservations that START or END within [weekStart, weekEnd) or span across it */
function resInWeek(reservations, weekStartStr) {
    const weekEnd = addDays(weekStartStr, 7)
    return reservations
        .filter(r => ['inquiry', 'confirmed', 'blocked'].includes(r.status))
        .filter(r => r.check_in < weekEnd && r.check_out > weekStartStr)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))
}

/** Group reservations by the day they START (check_in), within the visible week */
function groupByCheckIn(reservations, weekStartStr) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartStr, i))
    const map = Object.fromEntries(days.map(d => [d, []]))

    for (const r of reservations) {
        const startDay = r.check_in >= weekStartStr ? r.check_in : weekStartStr
        if (map[startDay]) map[startDay].push(r)
    }
    return days.map(d => ({ day: d, items: map[d] }))
}

// ── Component ────────────────────────────────────────────────────────────────
export default function WeekAgenda({ reservations, onSelect }) {
    const todayStr = isoDate(new Date())
    const [weekStartStr, setWeekStartStr] = useState(() => mondayOfWeek(todayStr))

    const weekEnd = addDays(weekStartStr, 7)

    const weekRes = useMemo(() => resInWeek(reservations, weekStartStr), [reservations, weekStartStr])
    const grouped = useMemo(() => groupByCheckIn(weekRes, weekStartStr), [weekRes, weekStartStr])

    const hasAny = weekRes.length > 0

    function prevWeek() { setWeekStartStr(d => addDays(d, -7)) }
    function nextWeek() { setWeekStartStr(d => addDays(d, 7)) }
    function goToday() { setWeekStartStr(mondayOfWeek(todayStr)) }

    function fmtWeekRange() {
        const s = new Date(weekStartStr + 'T12:00:00')
        const e = new Date(addDays(weekStartStr, 6) + 'T12:00:00')
        const ms = MONTHS_SHORT[s.getMonth()]
        const me = MONTHS_SHORT[e.getMonth()]
        if (ms === me) return `${s.getDate()}–${e.getDate()} ${ms}.`
        return `${s.getDate()} ${ms}. – ${e.getDate()} ${me}.`
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center gap-3">
                <button onClick={prevWeek} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-white font-bold text-base min-w-44 text-center">
                    Semana del {fmtWeekRange()}
                </span>
                <button onClick={nextWeek} className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
                {weekStartStr !== mondayOfWeek(todayStr) && (
                    <button onClick={goToday} className="text-xs text-emerald-400 hover:text-emerald-300 underline ml-1 transition-colors">
                        Esta semana
                    </button>
                )}
                <span className="ml-auto text-xs text-slate-500">{weekRes.length} reserva{weekRes.length !== 1 ? 's' : ''} esta semana</span>
            </div>

            {/* 7-day list */}
            {!hasAny ? (
                <p className="text-slate-500 text-sm py-6 text-center">Sin reservas activas esta semana.</p>
            ) : (
                <div className="space-y-2">
                    {grouped.map(({ day, items }) => {
                        const isToday = day === todayStr
                        const isPast = day < todayStr
                        const dayDate = new Date(day + 'T12:00:00')
                        const dayName = DAYS_ES[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]

                        return (
                            <div key={day} className={`rounded-xl overflow-hidden border ${isToday ? 'border-emerald-600' : 'border-slate-700'}`}>
                                {/* Day header */}
                                <div className={`px-4 py-2 flex items-center gap-3 ${isToday ? 'bg-emerald-900/50' : 'bg-slate-800'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-center shrink-0 ${isToday ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                        <span className="text-[10px] text-white/70 leading-none">{dayName.slice(0, 3)}</span>
                                        <span className="text-sm font-bold text-white leading-tight">{dayDate.getDate()}</span>
                                    </div>
                                    <span className={`text-sm font-semibold ${isToday ? 'text-emerald-300' : isPast ? 'text-slate-500' : 'text-slate-200'}`}>
                                        {dayName} {fmtDate(day)}
                                        {isToday && <span className="ml-2 text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">Hoy</span>}
                                    </span>
                                    {items.length > 0 && (
                                        <span className="ml-auto text-xs text-slate-500">{items.length} arribo{items.length !== 1 ? 's' : ''}</span>
                                    )}
                                </div>

                                {/* Reservations for this day */}
                                {items.length > 0 && (
                                    <div className="divide-y divide-slate-700/50">
                                        {items.map(r => (
                                            <div
                                                key={r.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => onSelect?.(r)}
                                                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect?.(r)}
                                                className="px-4 py-3 flex items-start gap-3 hover:bg-slate-700/50 transition-colors cursor-pointer"
                                            >
                                                {/* Status dot */}
                                                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${r.status === 'confirmed' ? 'bg-green-400' :
                                                    r.status === 'inquiry' ? 'bg-yellow-400' :
                                                        r.status === 'blocked' ? 'bg-slate-400' : 'bg-red-400'
                                                    }`} />

                                                {/* Main info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-medium text-slate-100 truncate">{guestName(r)}</p>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}>
                                                            {STATUS_LABEL[r.status]}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {unitName(r)} · {fmtDate(r.check_in)} → {fmtDate(r.check_out)} · {nights(r)} noche{nights(r) !== 1 ? 's' : ''}
                                                    </p>
                                                    {r.notes && (
                                                        <p className="text-xs text-slate-600 mt-0.5 truncate" title={r.notes}>{r.notes}</p>
                                                    )}
                                                </div>

                                                {/* Arrival / departure indicators */}
                                                <div className="flex gap-1 shrink-0 mt-0.5">
                                                    {r.check_in === day && (
                                                        <span className="text-[10px] bg-blue-900 text-blue-300 border border-blue-700 rounded px-1.5 py-0.5">↓ IN</span>
                                                    )}
                                                    {r.check_out === day && (
                                                        <span className="text-[10px] bg-orange-900 text-orange-300 border border-orange-700 rounded px-1.5 py-0.5">↑ OUT</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty day — only show for today/future */}
                                {items.length === 0 && !isPast && (
                                    <div className="px-4 py-2 text-xs text-slate-600 italic">Sin llegadas</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

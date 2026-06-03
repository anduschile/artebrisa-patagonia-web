import { useState, useEffect, useMemo } from 'react'
import { getReservationsForGantt } from '../../data/admin/reservations'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const COL_W = 36   // px por columna de día
const ROW_H = 48   // px por fila de unidad
const LEFT_W = 160 // px columna izquierda fija

const GROUP_ORDER = ['Cabañas', 'Tiny Houses', 'Departamentos']

function getGroupLabel(unitType) {
    const t = (unitType || '').toLowerCase()
    if (t.includes('cabin') || t.startsWith('cab')) return 'Cabañas'
    if (t.includes('tiny')) return 'Tiny Houses'
    if (t.includes('apart') || t.startsWith('dep')) return 'Departamentos'
    return 'Otras'
}

function pad2(n) { return String(n).padStart(2, '0') }

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
}

// Returns day-of-month (1..N) if dateStr is within this month,
// 0 if before month start, N+1 if after month end (used for block clipping).
function dayNumInMonth(dateStr, year, month) {
    if (!dateStr) return 0
    const [y, m, d] = dateStr.split('-').map(Number)
    if (y < year || (y === year && m < month + 1)) return 0
    if (y > year || (y === year && m > month + 1)) return daysInMonth(year, month) + 1
    return d
}

function getBlockColors(r) {
    const ch = (r.core_channels?.name || '').toLowerCase()
    if (ch.includes('airbnb')) return { backgroundColor: '#F5C4B3', color: '#4A1B0C' }
    if (ch.includes('booking')) return { backgroundColor: '#B5D4F4', color: '#042C53' }
    if (r.status === 'blocked') return { backgroundColor: '#D3D1C7', color: '#2C2C2A' }
    if (r.status === 'inquiry') return { backgroundColor: '#FAC775', color: '#412402' }
    return { backgroundColor: '#9FE1CB', color: '#085041' }
}

function normalizeReservation(r) {
    return {
        ...r,
        guest: r.core_guests || r.guest || null,
        channel: r.core_channels || r.channel || null,
        unit: r.core_units || r.unit || null,
    }
}

export default function GanttCalendar({ units, onSelectReservation, onNewReservation, refreshKey = 0 }) {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())
    const [reservations, setReservations] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showCancelled, setShowCancelled] = useState(false)

    const totalDays = daysInMonth(year, month)
    const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays])

    const todayDay = (() => {
        const t = new Date()
        return (t.getFullYear() === year && t.getMonth() === month) ? t.getDate() : null
    })()

    const groups = useMemo(() => {
        const map = {}
        for (const u of (units || [])) {
            const label = getGroupLabel(u.unit_type)
            if (!map[label]) map[label] = []
            map[label].push(u)
        }
        return [
            ...GROUP_ORDER.filter(g => map[g]).map(g => ({ label: g, units: map[g] })),
            ...Object.keys(map).filter(g => !GROUP_ORDER.includes(g)).map(g => ({ label: g, units: map[g] })),
        ]
    }, [units])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        getReservationsForGantt(year, month)
            .then(data => { if (!cancelled) setReservations(data) })
            .catch(e => { if (!cancelled) setError(e.message) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [year, month, refreshKey])

    const resByUnit = useMemo(() => {
        const filtered = showCancelled
            ? reservations
            : reservations.filter(r => r.status !== 'cancelled')
        const map = {}
        for (const r of filtered) {
            const key = String(r.unit_id)
            if (!map[key]) map[key] = []
            map[key].push(r)
        }
        return map
    }, [reservations, showCancelled])

    function prevMonth() {
        setYear(y => month === 0 ? y - 1 : y)
        setMonth(m => m === 0 ? 11 : m - 1)
    }
    function nextMonth() {
        setYear(y => month === 11 ? y + 1 : y)
        setMonth(m => m === 11 ? 0 : m + 1)
    }
    function goToday() {
        const t = new Date()
        setYear(t.getFullYear())
        setMonth(t.getMonth())
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                    onClick={prevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-lg transition-colors"
                >‹</button>
                <span className="text-gray-900 font-bold text-base min-w-[140px] text-center">
                    {MONTHS_ES[month]} {year}
                </span>
                <button
                    onClick={nextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-lg transition-colors"
                >›</button>
                <button
                    onClick={goToday}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-primary-600 transition-colors"
                >
                    Hoy
                </button>
                {loading && (
                    <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />
                )}
                <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-gray-500 font-medium">Mostrar canceladas</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={showCancelled}
                        onClick={() => setShowCancelled(v => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showCancelled ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showCancelled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                </label>
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            {/* Gantt scrollable */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <div style={{ minWidth: LEFT_W + totalDays * COL_W }}>

                    {/* Day header row */}
                    <div className="flex bg-gray-50 border-b border-gray-200">
                        <div
                            style={{ width: LEFT_W, minWidth: LEFT_W }}
                            className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 sticky left-0 bg-gray-50 z-10"
                        >
                            Unidad
                        </div>
                        {days.map(day => {
                            const dow = new Date(year, month, day).getDay()
                            const isWeekend = dow === 0 || dow === 6
                            return (
                                <div
                                    key={day}
                                    style={{ width: COL_W, minWidth: COL_W }}
                                    className={`flex flex-col items-center justify-center py-1.5 border-r border-gray-200/70 ${
                                        day === todayDay
                                            ? 'text-primary-600 bg-primary-50'
                                            : isWeekend
                                            ? 'text-gray-600 bg-gray-100'
                                            : 'text-gray-400'
                                    }`}
                                >
                                    <span className="text-[9px] uppercase font-semibold opacity-70 leading-none mb-0.5">
                                        {['D','L','M','X','J','V','S'][dow]}
                                    </span>
                                    <span className="text-xs font-bold leading-none">{day}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Unit groups */}
                    {!loading && groups.map(group => (
                        <div key={group.label}>
                            {/* Group separator */}
                            <div className="flex bg-gray-50 border-b border-gray-200">
                                <div
                                    style={{ width: LEFT_W, minWidth: LEFT_W }}
                                    className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-200 sticky left-0 bg-gray-50 z-10"
                                >
                                    {group.label}
                                </div>
                                <div className="flex-1" />
                            </div>

                            {/* Unit rows */}
                            {group.units.map(unit => {
                                const unitResv = resByUnit[String(unit.id)] || []
                                return (
                                    <div key={unit.id} className="flex border-b border-gray-200">
                                        {/* Left: unit name */}
                                        <div
                                            style={{ width: LEFT_W, minWidth: LEFT_W, height: ROW_H }}
                                            className="flex flex-col justify-center px-3 border-r border-gray-200 sticky left-0 bg-white z-10"
                                        >
                                            <div className="text-xs font-semibold text-gray-900 truncate">{unit.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono truncate">{unit.code}</div>
                                        </div>

                                        {/* Day cells + reservation blocks */}
                                        <div className="relative flex" style={{ height: ROW_H }}>
                                            {days.map(day => {
                                                const dow = new Date(year, month, day).getDay()
                                                const isWeekend = dow === 0 || dow === 6
                                                return (
                                                <div
                                                    key={day}
                                                    style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}
                                                    className={`border-r border-gray-100 cursor-pointer hover:bg-primary-50/30 transition-colors ${
                                                        day === todayDay ? 'bg-primary-50/40' : isWeekend ? 'bg-gray-50/60' : ''
                                                    }`}
                                                    onClick={() => onNewReservation?.({
                                                        unitId: unit.id,
                                                        unitCode: unit.code,
                                                        date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
                                                    })}
                                                />
                                                )
                                            })}

                                            {unitResv.map(r => {
                                                const startDay = Math.max(1, dayNumInMonth(r.check_in, year, month))
                                                const endDay = Math.min(totalDays + 1, dayNumInMonth(r.check_out, year, month))
                                                if (endDay <= startDay) return null
                                                const blockLeft = (startDay - 1) * COL_W + 1
                                                const blockWidth = Math.max(4, (endDay - startDay) * COL_W - 2)
                                                const label = r.core_guests?.full_name || r.core_channels?.name || '—'
                                                return (
                                                    <div
                                                        key={r.id}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 6,
                                                            height: ROW_H - 12,
                                                            left: blockLeft,
                                                            width: blockWidth,
                                                            borderRadius: 5,
                                                            cursor: 'pointer',
                                                            overflow: 'hidden',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            paddingLeft: 6,
                                                            paddingRight: 4,
                                                            zIndex: 5,
                                                            ...getBlockColors(r),
                                                        }}
                                                        onClick={e => { e.stopPropagation(); onSelectReservation?.(normalizeReservation(r)) }}
                                                        title={label}
                                                    >
                                                        <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

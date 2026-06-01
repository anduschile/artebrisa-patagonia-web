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

export default function GanttCalendar({ units, onSelectReservation, onNewReservation, refreshKey = 0 }) {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth())
    const [reservations, setReservations] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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
        const map = {}
        for (const r of reservations) {
            const key = String(r.unit_id)
            if (!map[key]) map[key] = []
            map[key].push(r)
        }
        return map
    }, [reservations])

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
            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={prevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition-colors"
                >‹</button>
                <span className="text-white font-bold text-base min-w-[140px] text-center">
                    {MONTHS_ES[month]} {year}
                </span>
                <button
                    onClick={nextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-lg transition-colors"
                >›</button>
                <button
                    onClick={goToday}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors"
                >
                    Hoy
                </button>
                {loading && (
                    <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin inline-block" />
                )}
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            {/* Gantt scrollable */}
            <div className="overflow-x-auto rounded-xl border border-slate-700">
                <div style={{ minWidth: LEFT_W + totalDays * COL_W }}>

                    {/* Day header row */}
                    <div className="flex bg-slate-800 border-b border-slate-700">
                        <div
                            style={{ width: LEFT_W, minWidth: LEFT_W }}
                            className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-r border-slate-700 sticky left-0 bg-slate-800 z-10"
                        >
                            Unidad
                        </div>
                        {days.map(day => (
                            <div
                                key={day}
                                style={{ width: COL_W, minWidth: COL_W }}
                                className={`flex items-center justify-center text-xs font-semibold py-2 border-r border-slate-700/50 ${day === todayDay ? 'text-blue-300 bg-blue-900/40' : 'text-slate-400'}`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Unit groups */}
                    {!loading && groups.map(group => (
                        <div key={group.label}>
                            {/* Group separator */}
                            <div className="flex bg-slate-800/60 border-b border-slate-700/40">
                                <div
                                    style={{ width: LEFT_W, minWidth: LEFT_W }}
                                    className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-700 sticky left-0 bg-slate-800/60 z-10"
                                >
                                    {group.label}
                                </div>
                                <div className="flex-1" />
                            </div>

                            {/* Unit rows */}
                            {group.units.map(unit => {
                                const unitResv = resByUnit[String(unit.id)] || []
                                return (
                                    <div key={unit.id} className="flex border-b border-slate-800">
                                        {/* Left: unit name */}
                                        <div
                                            style={{ width: LEFT_W, minWidth: LEFT_W, height: ROW_H }}
                                            className="flex flex-col justify-center px-3 border-r border-slate-700 sticky left-0 bg-slate-900 z-10"
                                        >
                                            <div className="text-xs font-semibold text-slate-200 truncate">{unit.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono truncate">{unit.code}</div>
                                        </div>

                                        {/* Day cells + reservation blocks */}
                                        <div className="relative flex" style={{ height: ROW_H }}>
                                            {days.map(day => (
                                                <div
                                                    key={day}
                                                    style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}
                                                    className={`border-r border-slate-800/50 cursor-pointer hover:bg-slate-700/20 transition-colors ${day === todayDay ? 'bg-blue-900/10' : ''}`}
                                                    onClick={() => onNewReservation?.({
                                                        unitId: unit.id,
                                                        unitCode: unit.code,
                                                        date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
                                                    })}
                                                />
                                            ))}

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
                                                        onClick={e => { e.stopPropagation(); onSelectReservation?.(r) }}
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

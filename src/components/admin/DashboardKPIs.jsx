import { useMemo } from 'react'

const today = () => new Date().toISOString().slice(0, 10)
const tomorrow = () => {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
}

/** Count nights a reservation occupies within [rangeStart, rangeEnd] */
function occupiedNightsInRange(r, rangeStart, rangeEnd) {
    const s = r.check_in > rangeStart ? r.check_in : rangeStart
    const e = r.check_out < rangeEnd ? r.check_out : rangeEnd
    if (e <= s) return 0
    return (new Date(e) - new Date(s)) / 86400000
}

/** Occupancy % for a set of reservations over N days across U units */
function calcOccupancy(reservations, days, unitCount) {
    if (!unitCount || !days) return 0
    const rangeStart = today()
    const rangeEnd = (() => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) })()
    const active = reservations.filter(r => ['confirmed', 'blocked'].includes(r.status))
    const totalNights = active.reduce((acc, r) => acc + occupiedNightsInRange(r, rangeStart, rangeEnd), 0)
    return Math.round((totalNights / (days * unitCount)) * 100)
}

const KPI_CARD_CLS = 'bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 flex flex-col gap-1'

function KpiCard({ label, value, sub, color = 'text-white' }) {
    return (
        <div className={KPI_CARD_CLS}>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-slate-500 text-xs">{sub}</p>}
        </div>
    )
}

export default function DashboardKPIs({ reservations, units }) {
    const t = today()
    const tm = tomorrow()
    const unitCount = units.length || 1

    const stats = useMemo(() => {
        const active = reservations.filter(r => ['inquiry', 'confirmed', 'blocked'].includes(r.status))
        return {
            inquiries: reservations.filter(r => r.status === 'inquiry').length,
            checkInToday: active.filter(r => r.check_in === t).length,
            checkInTmrw: active.filter(r => r.check_in === tm).length,
            checkOutToday: active.filter(r => r.check_out === t).length,
            checkOutTmrw: active.filter(r => r.check_out === tm).length,
            occ7: calcOccupancy(reservations, 7, unitCount),
            occ14: calcOccupancy(reservations, 14, unitCount),
            occ30: calcOccupancy(reservations, 30, unitCount),
        }
    }, [reservations, units, t, tm])

    return (
        <div className="mb-5">
            {/* Row 1: Occupancy */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ocupación (próximos días)</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
                <KpiCard label="7 días" value={`${stats.occ7}%`} color={stats.occ7 > 70 ? 'text-emerald-400' : 'text-white'} />
                <KpiCard label="14 días" value={`${stats.occ14}%`} color={stats.occ14 > 70 ? 'text-emerald-400' : 'text-white'} />
                <KpiCard label="30 días" value={`${stats.occ30}%`} color={stats.occ30 > 70 ? 'text-emerald-400' : 'text-white'} />
            </div>

            {/* Row 2: Operations */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Operaciones</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                    label="Consultas pendientes"
                    value={stats.inquiries}
                    color={stats.inquiries > 0 ? 'text-yellow-400' : 'text-white'}
                />
                <KpiCard
                    label="Check-in hoy / mañana"
                    value={`${stats.checkInToday} / ${stats.checkInTmrw}`}
                    sub="llegadas"
                    color="text-blue-400"
                />
                <KpiCard
                    label="Check-out hoy / mañana"
                    value={`${stats.checkOutToday} / ${stats.checkOutTmrw}`}
                    sub="salidas"
                    color="text-orange-400"
                />
                <KpiCard
                    label="Unidades totales"
                    value={unitCount}
                    sub="en el sistema"
                />
            </div>
        </div>
    )
}

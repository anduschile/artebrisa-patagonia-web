import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAdminReservations } from '../../data/admin/reservations'
import { getAllUnits } from '../../data/admin/units'
import DashboardKPIs from '../../components/admin/DashboardKPIs'

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
}

function occupiedNightsInRange(r, rangeStart, rangeEnd) {
    const s = r.check_in > rangeStart ? r.check_in : rangeStart
    const e = r.check_out < rangeEnd ? r.check_out : rangeEnd
    if (e <= s) return 0
    return (new Date(e) - new Date(s)) / 86400000
}

export default function AdminDashboardPage() {
    const [reservations, setReservations] = useState([])
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const future = addDays(new Date().toISOString().slice(0, 10), 90)
            const [{ rows }, fetchedUnits] = await Promise.all([
                getAdminReservations({ from: null, to: future, offset: 0, limit: 500 }),
                getAllUnits(),
            ])
            setReservations(rows)
            setUnits(fetchedUnits)
            setLoading(false)
        }
        load().catch(console.error)
    }, [])

    const weeklyOccupancy = useMemo(() => {
        if (!units.length) return []
        const today = new Date().toISOString().slice(0, 10)
        const active = reservations.filter(r => ['confirmed', 'blocked'].includes(r.status))
        return Array.from({ length: 8 }, (_, i) => {
            const weekStart = addDays(today, i * 7)
            const weekEnd = addDays(today, (i + 1) * 7)
            const nights = active.reduce((acc, r) => acc + occupiedNightsInRange(r, weekStart, weekEnd), 0)
            const pct = Math.min(100, Math.round((nights / (7 * units.length)) * 100))
            const d = new Date(weekStart + 'T12:00:00')
            return {
                label: `${d.getDate()}/${d.getMonth() + 1}`,
                pct,
            }
        })
    }, [reservations, units])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-0.5">Resumen operativo — Arte Brisa Patagonia</p>
            </div>

            {/* KPIs */}
            <DashboardKPIs reservations={reservations} units={units} />

            {/* Weekly occupancy chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-5">
                    Ocupación próximas 8 semanas
                </h2>
                <div className="flex items-end gap-2" style={{ height: 100 }}>
                    {weeklyOccupancy.map((w, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold text-gray-600">{w.pct}%</span>
                            <div className="w-full bg-gray-100 rounded-t relative" style={{ height: 64 }}>
                                <div
                                    className={`absolute bottom-0 w-full rounded-t transition-all ${
                                        w.pct > 70
                                            ? 'bg-emerald-500'
                                            : w.pct > 40
                                            ? 'bg-primary-500'
                                            : 'bg-primary-200'
                                    }`}
                                    style={{ height: `${Math.max(w.pct, 2)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-gray-400">{w.label}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary-200 inline-block" />
                        Baja (&lt;40%)
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary-500 inline-block" />
                        Media
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                        Alta (&gt;70%)
                    </span>
                </div>
            </div>

            {/* Quick access */}
            <div className="grid sm:grid-cols-2 gap-4">
                <Link
                    to="/admin/reservas"
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-primary-300 hover:bg-primary-50/50 transition-colors group"
                >
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div className="text-sm font-bold text-gray-800 group-hover:text-primary-700">Reservas</div>
                    <div className="text-xs text-gray-400 mt-0.5">Gantt, lista, calendario, agenda</div>
                </Link>
                <Link
                    to="/admin/tarifas"
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-primary-300 hover:bg-primary-50/50 transition-colors group"
                >
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    <div className="text-sm font-bold text-gray-800 group-hover:text-primary-700">Tarifas diarias</div>
                    <div className="text-xs text-gray-400 mt-0.5">Precios por unidad y día</div>
                </Link>
            </div>
        </div>
    )
}

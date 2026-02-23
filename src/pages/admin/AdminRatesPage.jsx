import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import RateEditModal from '../../components/admin/RateEditModal'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function AdminRatesPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [units, setUnits] = useState([])
    const [dailyRates, setDailyRates] = useState({}) // { 'unitId_YYYY-MM-DD': price }
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('all') // all, cabana, departamento
    const [selectedCell, setSelectedCell] = useState(null) // { unit, date }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Days in current month
    const daysInMonth = useMemo(() => {
        const date = new Date(year, month + 1, 0)
        return date.getDate()
    }, [year, month])

    const daysArray = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => i + 1)
    }, [daysInMonth])

    useEffect(() => {
        fetchData()
    }, [year, month])

    async function fetchData() {
        setLoading(true)
        try {
            // 1. Fetch units
            const { data: unitsData } = await supabase
                .from('core_units')
                .select('*')
                .order('name', { ascending: true })
            setUnits(unitsData || [])

            // 2. Fetch overrides for the current month
            const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
            const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`

            const { data: ratesData } = await supabase
                .from('core_unit_daily_rates')
                .select('*')
                .gte('date', firstDay)
                .lte('date', lastDay)

            const ratesMap = {}
            ratesData?.forEach(r => {
                ratesMap[`${r.unit_id}_${r.date}`] = r.price
            })
            setDailyRates(ratesMap)
        } catch (err) {
            console.error('Error fetching rates data:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredUnits = units.filter(u => {
        if (typeFilter === 'all') return true
        return u.unit_type === typeFilter
    })

    function handlePrevMonth() {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    function handleNextMonth() {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    function handleToday() {
        setCurrentDate(new Date())
    }

    function getEffectivePrice(unitId, day) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const override = dailyRates[`${unitId}_${dateStr}`]
        const unit = units.find(u => u.id === unitId)
        return {
            price: override ?? unit?.base_price ?? 0,
            isOverride: override !== undefined
        }
    }

    if (loading && units.length === 0) {
        return <div className="p-8 text-center text-slate-400">Cargando unidades y tarifas...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white">Tarifas Diarias</h1>
                    <p className="text-slate-400 text-sm">Gestiona precios por noche y unidad</p>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleToday} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">HOY</button>
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-1">
                        <button onClick={handlePrevMonth} className="p-1 px-2 hover:bg-slate-800 rounded transition-colors">&lt;</button>
                        <span className="px-4 text-sm font-bold min-w-[140px] text-center">
                            {MONTHS_ES[month]} {year}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 px-2 hover:bg-slate-800 rounded transition-colors">&gt;</button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <FilterButton active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Todas</FilterButton>
                <FilterButton active={typeFilter === 'cabana'} onClick={() => setTypeFilter('cabana')}>Cabañas</FilterButton>
                <FilterButton active={typeFilter === 'departamento'} onClick={() => setTypeFilter('departamento')}>Departamentos</FilterButton>
            </div>

            {/* Grid Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50">
                                <th className="sticky left-0 z-20 bg-slate-800 py-3 px-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 min-w-[200px]">
                                    Unidad
                                </th>
                                {daysArray.map(day => {
                                    const date = new Date(year, month, day)
                                    const dayName = DAYS_ES[date.getDay()]
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                    return (
                                        <th key={day} className={`py-2 px-1 text-center border-b border-slate-700 min-w-[60px] ${isWeekend ? 'bg-slate-800/30' : ''}`}>
                                            <div className="text-[10px] text-slate-500 uppercase">{dayName}</div>
                                            <div className={`text-sm font-black ${isWeekend ? 'text-primary-400' : 'text-slate-300'}`}>{day}</div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUnits.map(unit => (
                                <tr key={unit.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="sticky left-0 z-10 bg-slate-900 py-3 px-4 border-b border-slate-800">
                                        <div className="text-sm font-bold text-white truncate">{unit.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{unit.code}</div>
                                    </td>
                                    {daysArray.map(day => {
                                        const { price, isOverride } = getEffectivePrice(unit.id, day)
                                        return (
                                            <td
                                                key={day}
                                                onClick={() => setSelectedCell({ unit, date: new Date(year, month, day) })}
                                                className={`py-3 px-1 text-center border-b border-r border-slate-800 cursor-pointer transition-all hover:bg-primary-500/10 ${isOverride ? 'bg-primary-950/20' : ''}`}
                                            >
                                                <div className={`text-[11px] font-bold ${isOverride ? 'text-primary-400 underline decoration-primary-500/50 underline-offset-4' : 'text-slate-400'}`}>
                                                    ${(price / 1000).toFixed(0)}k
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500 px-2 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-800" /> Tarifa base
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary-900/40 border border-primary-800" /> Tarifa personalizada
                </div>
            </div>

            {selectedCell && (
                <RateEditModal
                    unit={selectedCell.unit}
                    initialDate={selectedCell.date}
                    currentMonth={month}
                    currentYear={year}
                    onClose={() => setSelectedCell(null)}
                    onSaved={fetchData}
                />
            )}
        </div>
    )
}

function FilterButton({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${active
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
        >
            {children}
        </button>
    )
}

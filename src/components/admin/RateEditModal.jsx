import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function RateEditModal({ unit, initialDate, currentMonth, currentYear, onClose, onSaved }) {
    const [price, setPrice] = useState(unit.base_price || 0)
    const [mode, setMode] = useState('single') // single, range, weekdays
    const [dateFrom, setDateFrom] = useState(formatDate(initialDate))
    const [dateTo, setDateTo] = useState(formatDate(initialDate))
    const [selectedDays, setSelectedDays] = useState([true, true, true, true, true, true, true]) // Sun-Sat
    const [loading, setLoading] = useState(false)

    function formatDate(date) {
        return date.toISOString().split('T')[0]
    }

    async function handleSave() {
        setLoading(true)
        try {
            const datesToUpdate = []

            if (mode === 'single') {
                datesToUpdate.push(dateFrom)
            } else {
                let current = new Date(dateFrom + 'T12:00:00')
                const end = new Date(dateTo + 'T12:00:00')

                while (current <= end) {
                    if (mode === 'range' || selectedDays[current.getDay()]) {
                        datesToUpdate.push(current.toISOString().split('T')[0])
                    }
                    current.setDate(current.getDate() + 1)
                }
            }

            // Batch upsert
            const upserts = datesToUpdate.map(d => ({
                unit_id: unit.id,
                date: d,
                price: Number(price),
                currency: 'CLP'
            }))

            const { error } = await supabase
                .from('core_unit_daily_rates')
                .upsert(upserts, { onConflict: 'unit_id,date' })

            if (error) throw error
            onSaved()
            onClose()
        } catch (err) {
            console.error('Error saving rates:', err)
            alert('Error al guardar las tarifas')
        } finally {
            setLoading(false)
        }
    }

    async function handleReset() {
        if (!confirm('¿Estás seguro de revertir a la tarifa base? Se borrarán los precios personalizados para los días seleccionados.')) return

        setLoading(true)
        try {
            const datesToDelete = []
            if (mode === 'single') {
                datesToDelete.push(dateFrom)
            } else {
                let current = new Date(dateFrom + 'T12:00:00')
                const end = new Date(dateTo + 'T12:00:00')
                while (current <= end) {
                    if (mode === 'range' || selectedDays[current.getDay()]) {
                        datesToDelete.push(current.toISOString().split('T')[0])
                    }
                    current.setDate(current.getDate() + 1)
                }
            }

            const { error } = await supabase
                .from('core_unit_daily_rates')
                .delete()
                .eq('unit_id', unit.id)
                .in('date', datesToDelete)

            if (error) throw error
            onSaved()
            onClose()
        } catch (err) {
            console.error('Error resetting rates:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-black text-lg">Editar Tarifa</h3>
                        <p className="text-slate-400 text-xs">{unit.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Price */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Precio por noche (CLP)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                            <input
                                type="number"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Mode */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                        <ModeTab active={mode === 'single'} onClick={() => setMode('single')}>Día</ModeTab>
                        <ModeTab active={mode === 'range'} onClick={() => setMode('range')}>Rango</ModeTab>
                        <ModeTab active={mode === 'weekdays'} onClick={() => setMode('weekdays')}>Días</ModeTab>
                    </div>

                    {/* Dates */}
                    <div className="space-y-3">
                        {mode === 'single' ? (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Weekdays */}
                    {mode === 'weekdays' && (
                        <div className="flex justify-between gap-1">
                            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const next = [...selectedDays]
                                        next[i] = !next[i]
                                        setSelectedDays(next)
                                    }}
                                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${selectedDays[i]
                                            ? 'bg-primary-600 text-white border-primary-500'
                                            : 'bg-slate-950 text-slate-500 border-slate-800'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-800/20 grid grid-cols-2 gap-4">
                    <button
                        onClick={handleReset}
                        disabled={loading}
                        className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                    >
                        Reset a base
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ModeTab({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
        >
            {children}
        </button>
    )
}

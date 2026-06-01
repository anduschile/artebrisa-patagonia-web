import { useState } from 'react'
import toast from 'react-hot-toast'
import { confirmToast } from '../../lib/confirmToast'
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
            toast.success('Tarifas guardadas')
        } catch (err) {
            console.error('Error saving rates:', err)
            toast.error('Error al guardar las tarifas')
        } finally {
            setLoading(false)
        }
    }

    async function handleReset() {
        const ok = await confirmToast('¿Revertir a la tarifa base? Se borrarán los precios personalizados de los días seleccionados.')
        if (!ok) return

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
            toast.success('Tarifas restablecidas')
        } catch (err) {
            console.error('Error resetting rates:', err)
            toast.error('Error al restablecer las tarifas')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-900 font-black text-lg">Editar Tarifa</h3>
                        <p className="text-gray-500 text-xs">{unit.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Price */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Precio por noche (CLP)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input
                                type="number"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-8 pr-4 text-gray-900 font-bold focus:outline-none focus:border-primary-500 transition-colors"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Mode */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
                        <ModeTab active={mode === 'single'} onClick={() => setMode('single')}>Día</ModeTab>
                        <ModeTab active={mode === 'range'} onClick={() => setMode('range')}>Rango</ModeTab>
                        <ModeTab active={mode === 'weekdays'} onClick={() => setMode('weekdays')}>Días</ModeTab>
                    </div>

                    {/* Dates */}
                    <div className="space-y-3">
                        {mode === 'single' ? (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={e => setDateFrom(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Desde</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={e => setDateFrom(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hasta</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={e => setDateTo(e.target.value)}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm text-gray-900"
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
                                            : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 grid grid-cols-2 gap-4">
                    <button
                        onClick={handleReset}
                        disabled={loading}
                        className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-500 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 border border-gray-200"
                    >
                        Reset a base
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
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
            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {children}
        </button>
    )
}

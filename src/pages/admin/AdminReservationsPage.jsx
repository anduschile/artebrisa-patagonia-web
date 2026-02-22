import { useState, useEffect, useCallback } from 'react'
import {
    getAdminReservations,
    updateReservationStatus,
    createBlock,
    getBlockConflicts,
} from '../../data/admin/reservations'
import { getAllUnits, getAllChannels } from '../../data/admin/units'

const STATUS_COLORS = {
    inquiry: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    confirmed: 'bg-green-900 text-green-300 border-green-700',
    cancelled: 'bg-red-900 text-red-300 border-red-700',
    blocked: 'bg-slate-700 text-slate-300 border-slate-600',
}
const STATUS_LABELS = {
    inquiry: 'Consulta',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    blocked: 'Bloqueada',
}

function nights(ci, co) {
    if (!ci || !co) return '—'
    const d = (new Date(co) - new Date(ci)) / 86400000
    return d > 0 ? d : '—'
}

/** Format a date-only string 'YYYY-MM-DD' → DD/MM/YY (append noon to avoid DST shift) */
function fmtDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T12:00:00')
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Format a full ISO timestamptz string → DD/MM/YY HH:mm */
function fmtTs(isoStr) {
    if (!isoStr) return '—'
    const d = new Date(isoStr)
    if (isNaN(d)) return isoStr
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => { })
}

function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {STATUS_LABELS[status] || status}
        </span>
    )
}

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState([])
    const [units, setUnits] = useState([])
    const [channels, setChannels] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fallback lookup map in case PostgREST join returns null
    const unitsMap = Object.fromEntries(units.map(u => [String(u.id), u]))

    // Filters
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterUnit, setFilterUnit] = useState('')
    const [filterFrom, setFilterFrom] = useState('')
    const [filterTo, setFilterTo] = useState('')

    // Block form
    const [showBlock, setShowBlock] = useState(false)
    const [blockState, setBlockState] = useState({ unit_id: '', check_in: '', check_out: '', notes: '', channel_id: '' })
    const [blockError, setBlockError] = useState(null)
    const [blockSaving, setBlockSaving] = useState(false)

    // Status change per row
    const [changingId, setChangingId] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getAdminReservations({
                status: filterStatus === 'all' ? null : filterStatus,
                from: filterFrom || null,
                to: filterTo || null,
                unit_id: filterUnit || null,
            })
            setReservations(data)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [filterStatus, filterUnit, filterFrom, filterTo])

    useEffect(() => {
        getAllUnits().then(setUnits).catch(() => { })
        getAllChannels().then(setChannels).catch(() => { })
    }, [])

    useEffect(() => { load() }, [load])

    async function handleStatusChange(id, newStatus) {
        setChangingId(id)
        try {
            await updateReservationStatus(id, newStatus)
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
        } catch (e) {
            alert(`Error: ${e.message}`)
        } finally {
            setChangingId(null)
        }
    }

    async function handleCreateBlock(e) {
        e.preventDefault()
        setBlockError(null)
        const { unit_id, check_in, check_out, notes, channel_id } = blockState
        if (!unit_id || !check_in || !check_out) { setBlockError('Seleccioná unidad, entrada y salida.'); return }
        if (check_out <= check_in) { setBlockError('Salida debe ser posterior a entrada.'); return }

        const unit = units.find(u => u.id === unit_id || String(u.id) === unit_id)
        if (!unit) { setBlockError('Unidad no encontrada.'); return }

        setBlockSaving(true)
        try {
            const conflicts = await getBlockConflicts({ unit_id, check_in, check_out })
            if (conflicts.length > 0) {
                setBlockError(`Conflicto con ${conflicts.length} reserva(s) activa(s) en esas fechas.`)
                setBlockSaving(false)
                return
            }
            await createBlock({ unit_id, property_id: unit.property_id, check_in, check_out, notes, channel_id: channel_id || null })
            setBlockState({ unit_id: '', check_in: '', check_out: '', notes: '', channel_id: '' })
            setShowBlock(false)
            await load()
        } catch (e) {
            setBlockError(e.message)
        } finally {
            setBlockSaving(false)
        }
    }

    function buildCopySummary(r) {
        const guest = r.core_guests
        const unit = r.core_units || unitsMap[String(r.unit_id)]
        return [
            `Reserva ID: ${r.id}`,
            `Estado: ${STATUS_LABELS[r.status] || r.status}`,
            `Unidad: ${unit?.name || r.unit_id} ${unit?.code ? '(' + unit.code + ')' : ''}`.trim(),
            `Check-in: ${fmtDate(r.check_in)}`,
            `Check-out: ${fmtDate(r.check_out)}`,
            `Noches: ${nights(r.check_in, r.check_out)}`,
            guest ? `Huésped: ${guest.full_name || '—'}` : null,
            guest?.phone ? `Tel: ${guest.phone}` : null,
            guest?.email ? `Email: ${guest.email}` : null,
            r.notes ? `Notas: ${r.notes}` : null,
        ].filter(Boolean).join('\n')
    }

    const inputCls = "bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
    const labelCls = "block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide"

    return (
        <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-xl font-black text-white">Reservas</h1>
                <button
                    onClick={() => setShowBlock(v => !v)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo bloqueo
                </button>
            </div>

            {/* ── Block form ── */}
            {showBlock && (
                <form onSubmit={handleCreateBlock} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-6">
                    <h2 className="text-base font-bold text-white mb-4">Crear bloqueo manual</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className={labelCls}>Unidad *</label>
                            <select value={blockState.unit_id} onChange={e => setBlockState(s => ({ ...s, unit_id: e.target.value }))} className={inputCls} required>
                                <option value="">— Seleccionar —</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Entrada *</label>
                            <input type="date" value={blockState.check_in} onChange={e => setBlockState(s => ({ ...s, check_in: e.target.value }))} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Salida *</label>
                            <input type="date" value={blockState.check_out} onChange={e => setBlockState(s => ({ ...s, check_out: e.target.value }))} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Canal</label>
                            <select value={blockState.channel_id} onChange={e => setBlockState(s => ({ ...s, channel_id: e.target.value }))} className={inputCls}>
                                <option value="">— Sin canal —</option>
                                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className={labelCls}>Notas</label>
                        <input type="text" value={blockState.notes} onChange={e => setBlockState(s => ({ ...s, notes: e.target.value }))} className={inputCls} placeholder="Motivo del bloqueo..." />
                    </div>
                    {blockError && <p className="text-red-400 text-sm mb-3">{blockError}</p>}
                    <div className="flex gap-3">
                        <button type="submit" disabled={blockSaving} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                            {blockSaving ? 'Guardando…' : 'Crear bloqueo'}
                        </button>
                        <button type="button" onClick={() => setShowBlock(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {/* ── Filters ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div>
                    <label className={labelCls}>Estado</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
                        <option value="all">Todos</option>
                        <option value="inquiry">Consulta</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="blocked">Bloqueada</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Unidad</label>
                    <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className={inputCls}>
                        <option value="">Todas</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Desde</label>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Hasta</label>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputCls} />
                </div>
                <button onClick={() => { setFilterStatus('all'); setFilterUnit(''); setFilterFrom(''); setFilterTo('') }}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-xl transition-colors">
                    Limpiar
                </button>
            </div>

            {/* ── Table ── */}
            {loading && (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            )}
            {error && <p className="text-red-400 text-sm text-center py-10">{error}</p>}
            {!loading && !error && (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    <th className="px-4 py-3 text-left">Creada</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                    <th className="px-4 py-3 text-left">Unidad</th>
                                    <th className="px-4 py-3 text-left">Entrada</th>
                                    <th className="px-4 py-3 text-left">Salida</th>
                                    <th className="px-4 py-3 text-center">Noches</th>
                                    <th className="px-4 py-3 text-left">Huésped</th>
                                    <th className="px-4 py-3 text-left">Contacto</th>
                                    <th className="px-4 py-3 text-left">Canal</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {reservations.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                                            No hay reservas con esos filtros
                                        </td>
                                    </tr>
                                )}
                                {reservations.map(r => {
                                    const guest = r.core_guests
                                    const unit = r.core_units || unitsMap[String(r.unit_id)]
                                    const channel = r.core_channels
                                    const isChanging = changingId === r.id
                                    return (
                                        <tr key={r.id} className="bg-slate-900 hover:bg-slate-800/60 transition-colors">
                                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                {fmtTs(r.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={r.status} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {unit ? (
                                                    <>
                                                        <span className="text-white font-medium">{unit.name}</span>
                                                        <span className="block text-xs text-slate-500">{unit.code}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-500 text-xs font-mono">{r.unit_id}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(r.check_in)}</td>
                                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtDate(r.check_out)}</td>
                                            <td className="px-4 py-3 text-center text-slate-300">{nights(r.check_in, r.check_out)}</td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {guest?.full_name || <span className="text-slate-600">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">
                                                {guest?.phone && <div>{guest.phone}</div>}
                                                {guest?.email && <div className="break-all">{guest.email}</div>}
                                                {!guest?.phone && !guest?.email && <span className="text-slate-600">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                                                {channel?.name || <span className="text-slate-600">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 justify-end flex-wrap">
                                                    {/* Status change */}
                                                    <select
                                                        disabled={isChanging}
                                                        value={r.status}
                                                        onChange={e => handleStatusChange(r.id, e.target.value)}
                                                        className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                                                    >
                                                        <option value="inquiry">Consulta</option>
                                                        <option value="confirmed">Confirmar</option>
                                                        <option value="cancelled">Cancelar</option>
                                                        <option value="blocked">Bloquear</option>
                                                    </select>
                                                    {/* Copy */}
                                                    <button
                                                        onClick={() => copyText(buildCopySummary(r))}
                                                        title="Copiar resumen"
                                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-600 mt-3 text-right">
                        {reservations.length} resultado(s) · máx. 100 por carga
                    </p>
                </>
            )}
        </div>
    )
}

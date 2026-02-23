import { useEffect, useCallback } from 'react'
import { updateReservationStatus } from '../../data/admin/reservations'

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
    inquiry: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    confirmed: 'bg-green-900 text-green-300 border-green-700',
    blocked: 'bg-slate-700 text-slate-300 border-slate-600',
    cancelled: 'bg-red-900 text-red-300 border-red-700',
}
const STATUS_LABEL = {
    inquiry: 'Consulta pendiente', confirmed: 'Confirmada', blocked: 'Bloqueada', cancelled: 'Cancelada',
}

function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTs(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatCLP(value) {
    if (value == null) return '—'
    return `$${Number(value).toLocaleString('es-CL')}`
}

function nights(ci, co) {
    const n = (new Date(co) - new Date(ci)) / 86400000
    return n > 0 ? n : 0
}

function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => { })
}

function buildSummary(r) {
    const g = r.core_guests
    const u = r.core_units
    return [
        `Reserva ID: ${r.id}`,
        `Estado: ${STATUS_LABEL[r.status] || r.status}`,
        `Unidad: ${u?.name || '—'}${u?.code ? ` (${u.code})` : ''}`,
        `Check-in: ${fmtDate(r.check_in)}`,
        `Check-out: ${fmtDate(r.check_out)}`,
        `Noches: ${nights(r.check_in, r.check_out)}`,
        g?.full_name ? `Huésped: ${g.full_name}` : null,
        g?.phone ? `Tel: ${g.phone}` : null,
        g?.email ? `Email: ${g.email}` : null,
        r.adults ? `Adultos: ${r.adults}` : null,
        r.children ? `Niños: ${r.children}` : null,
        r.notes ? `Notas: ${r.notes}` : null,
    ].filter(Boolean).join('\n')
}

// ── Field row ─────────────────────────────────────────────────────────────────
function Field({ label, value, mono }) {
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={`text-sm text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</p>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * @param {{ open: boolean, onClose: () => void, reservation: object|null, onStatusChange?: (id, status) => void }} props
 */
export default function ReservationDetailDrawer({ open, onClose, reservation: r, onStatusChange }) {

    // ESC key to close
    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    const handleStatusChange = useCallback(async (newStatus) => {
        if (!r) return
        try {
            await updateReservationStatus(r.id, newStatus)
            onStatusChange?.(r.id, newStatus)
        } catch (e) {
            alert(`Error: ${e.message}`)
        }
    }, [r, onStatusChange])

    if (!open || !r) return null

    const guest = r.core_guests
    const unit = r.core_units
    const n = nights(r.check_in, r.check_out)
    const statusCls = STATUS_COLORS[r.status] || STATUS_COLORS.blocked

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Detalle de reserva"
                className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col bg-slate-900 shadow-2xl border-l border-slate-700 overflow-hidden"
            >
                {/* ── Header ── */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-start gap-3 shrink-0 bg-slate-900">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 font-mono mb-1 truncate">ID {r.id?.slice(0, 8)}…</p>
                        <h2 className="text-lg font-bold text-white leading-tight">
                            {unit?.name || 'Sin unidad'}
                            {unit?.code && <span className="text-slate-500 font-normal text-sm ml-2">({unit.code})</span>}
                        </h2>
                        <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCls}`}>
                            {STATUS_LABEL[r.status] || r.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors mt-0.5"
                        aria-label="Cerrar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                    {/* Dates */}
                    <section>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Fechas</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Check-in</p>
                                <p className="text-sm font-bold text-blue-300">{fmtDate(r.check_in)}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Noches</p>
                                <p className="text-2xl font-black text-white">{n}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Check-out</p>
                                <p className="text-sm font-bold text-orange-300">{fmtDate(r.check_out)}</p>
                            </div>
                        </div>
                    </section>

                    {/* Quoted Price */}
                    {r.quoted_total !== null && (
                        <section>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Monto estimado</p>
                            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 shadow-inner">
                                <div className="flex items-baseline justify-between mb-1">
                                    <span className="text-xs text-slate-500 font-medium">Total estimado</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        {formatCLP(r.quoted_total)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px]">
                                    <span className="text-slate-500">Noches cotizadas: <span className="text-slate-300 font-bold">{r.quoted_nights || n}</span></span>
                                    {(r.quoted_nights || n) > 0 && r.quoted_total > 0 && (
                                        <span className="text-slate-500">Promedio: <span className="text-slate-300 font-bold">{formatCLP(r.quoted_total / (r.quoted_nights || n))}</span>/noche</span>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Guest */}
                    <section>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Huésped</p>
                        {guest ? (
                            <div className="bg-slate-800 rounded-xl p-4 space-y-2.5">
                                <Field label="Nombre" value={guest.full_name} />
                                <Field label="Teléfono" value={guest.phone ? (
                                    <a href={`tel:${guest.phone}`} className="text-emerald-400 hover:underline">{guest.phone}</a>
                                ) : null} />
                                <Field label="Email" value={guest.email ? (
                                    <a href={`mailto:${guest.email}`} className="text-emerald-400 hover:underline break-all">{guest.email}</a>
                                ) : null} />
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm italic bg-slate-800 rounded-xl p-4">
                                {r.external_source ? `Bloqueo externo vía ${r.external_source}` : 'Sin huésped registrado'}
                            </p>
                        )}
                    </section>

                    {/* Details */}
                    <section>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Detalles</p>
                        <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3">
                            <Field label="Adultos" value={r.adults ?? '—'} />
                            <Field label="Niños" value={r.children ?? '—'} />
                            <Field label="Canal" value={r.core_channels?.name || '—'} />
                            <Field label="Fuente ext." value={r.external_source || '—'} />
                        </div>
                    </section>

                    {/* Notes */}
                    {r.notes && (
                        <section>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Notas</p>
                            <p className="text-sm text-slate-300 bg-slate-800 rounded-xl p-4 whitespace-pre-wrap">{r.notes}</p>
                        </section>
                    )}

                    {/* Meta */}
                    <section className="border-t border-slate-800 pt-4">
                        <Field label="Creada el" value={fmtTs(r.created_at)} />
                        {r.external_uid && <div className="mt-2"><Field label="UID externo" value={r.external_uid} mono /></div>}
                    </section>
                </div>

                {/* ── Footer actions ── */}
                <div className="px-5 py-4 border-t border-slate-800 space-y-3 shrink-0 bg-slate-900">
                    {/* Status change */}
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500 shrink-0">Cambiar estado:</p>
                        <select
                            value={r.status}
                            onChange={e => handleStatusChange(e.target.value)}
                            className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="inquiry">Consulta</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="blocked">Bloqueada</option>
                        </select>
                    </div>

                    {/* Copy summary */}
                    <button
                        onClick={() => copyText(buildSummary(r))}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copiar resumen
                    </button>
                </div>
            </div>
        </>
    )
}

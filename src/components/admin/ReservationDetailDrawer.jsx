import { useEffect, useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { confirmToast } from '../../lib/confirmToast'
import { updateReservationStatus } from '../../data/admin/reservations'

const STATUS_COLORS = {
    inquiry: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    confirmed: 'bg-green-900 text-green-300 border-green-700',
    blocked: 'bg-slate-700 text-slate-300 border-slate-600',
    cancelled: 'bg-red-900 text-red-300 border-red-700',
}
const STATUS_LABEL = {
    inquiry: 'Consulta pendiente', confirmed: 'Confirmada',
    blocked: 'Bloqueada', cancelled: 'Cancelada',
}

function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function nights(ci, co) {
    const n = (new Date(co) - new Date(ci)) / 86400000
    return n > 0 ? n : 0
}

function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => {})
}

function buildSummary(r) {
    const guest = r.guest || r.core_guests
    const unit = r.unit || r.core_units
    const channel = r.channel || r.core_channels
    return [
        `Unidad: ${unit?.name || '—'}${unit?.code ? ` (${unit.code})` : ''}`,
        `Estado: ${STATUS_LABEL[r.status] || r.status}`,
        `Huésped: ${guest?.full_name || 'Sin huésped'}`,
        `Check-in: ${fmtDate(r.check_in)}`,
        `Check-out: ${fmtDate(r.check_out)}`,
        `Noches: ${nights(r.check_in, r.check_out)}`,
        `Canal: ${channel?.name || '—'}`,
    ].join('\n')
}

export default function ReservationDetailDrawer({ open, onClose, reservation: r, onStatusChange }) {
    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    const [saving, setSaving] = useState(false)

    const handleStatusChange = useCallback(async (newStatus) => {
        if (!r) return
        if (newStatus === 'cancelled') {
            const ok = await confirmToast('¿Cancelar esta reserva? El huésped quedará sin la reserva activa.', {
                confirmLabel: 'Cancelar reserva',
                cancelLabel: 'Volver',
            })
            if (!ok) return
        }
        setSaving(true)
        try {
            await updateReservationStatus(r.id, newStatus)
            onStatusChange?.(r.id, newStatus)
            toast.success('Estado actualizado')
            onClose()
        } catch (e) {
            toast.error(`Error: ${e.message}`)
        } finally {
            setSaving(false)
        }
    }, [r, onStatusChange, onClose])

    if (!open || !r) return null

    const guest = r.guest || r.core_guests
    const unit = r.unit || r.core_units
    const channel = r.channel || r.core_channels
    const n = nights(r.check_in, r.check_out)
    const statusCls = STATUS_COLORS[r.status] || STATUS_COLORS.blocked

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Detalle de reserva"
                className="fixed right-0 top-0 h-full w-full max-w-[380px] z-50 flex flex-col bg-slate-900 shadow-2xl border-l border-slate-700 overflow-hidden"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-start gap-3 shrink-0">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-white leading-tight truncate">
                            {unit?.name || 'Sin unidad'}
                        </h2>
                        {unit?.code && (
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{unit.code}</p>
                        )}
                        <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCls}`}>
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

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                    {/* Huésped */}
                    <section>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Huésped</p>
                        {guest?.full_name ? (
                            <div className="space-y-2">
                                <p className="text-base font-bold text-white">{guest.full_name}</p>
                                {guest.phone && (
                                    <a
                                        href={`tel:${guest.phone}`}
                                        className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                        </svg>
                                        {guest.phone}
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">
                                {r.external_source ? `Bloqueo externo vía ${r.external_source}` : 'Sin huésped registrado'}
                            </p>
                        )}
                    </section>

                    {/* Fechas */}
                    <section>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Fechas</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Check-in</p>
                                <p className="text-xs font-bold text-blue-300 leading-snug">{fmtDate(r.check_in)}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Noches</p>
                                <p className="text-2xl font-black text-white">{n}</p>
                            </div>
                            <div className="bg-slate-800 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-1">Check-out</p>
                                <p className="text-xs font-bold text-orange-300 leading-snug">{fmtDate(r.check_out)}</p>
                            </div>
                        </div>
                    </section>

                    {/* Canal y fuente */}
                    {(channel?.name || r.external_source) && (
                        <section>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Canal y fuente</p>
                            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
                                {channel?.name && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Canal</span>
                                        <span className="text-sm font-semibold text-slate-200">{channel.name}</span>
                                    </div>
                                )}
                                {r.external_source && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Fuente externa</span>
                                        <span className="text-xs text-slate-300 font-mono">{r.external_source}</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Notas */}
                    {r.notes && (
                        <section>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Notas</p>
                            <div className="bg-slate-800 rounded-xl p-4 flex gap-2">
                                <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">{r.notes}</p>
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer acciones */}
                <div className="px-5 py-4 border-t border-slate-800 space-y-2.5 shrink-0">
                    {r.status === 'inquiry' && (
                        <button
                            onClick={() => handleStatusChange('confirmed')}
                            disabled={saving}
                            className="w-full px-3 py-2.5 text-sm font-bold rounded-xl bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
                        >
                            Confirmar reserva
                        </button>
                    )}
                    {(r.status === 'inquiry' || r.status === 'confirmed') && (
                        <button
                            onClick={() => handleStatusChange('cancelled')}
                            disabled={saving}
                            className="w-full px-3 py-2.5 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                        >
                            Cancelar reserva
                        </button>
                    )}
                    <button
                        onClick={() => { copyText(buildSummary(r)); toast.success('Resumen copiado') }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
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

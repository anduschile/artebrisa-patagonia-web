import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { getWebChannelId } from '../../data/channels'

export default function NewReservationModal({ isOpen, onClose, initialData, onSuccess, channels = [] }) {
    const [type, setType] = useState('direct')
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [channelId, setChannelId] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setType('direct')
        setCheckIn(initialData?.date || '')
        setCheckOut('')
        setFirstName('')
        setLastName('')
        setPhone('')
        setChannelId('')
        setNotes('')
    }, [isOpen]) // eslint-disable-line

    useEffect(() => {
        if (!isOpen) return
        const handler = e => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    const directChannels = channels.filter(c => {
        const n = c.name.toLowerCase()
        return !n.includes('airbnb') && !n.includes('booking')
    })

    async function handleSubmit(e) {
        e.preventDefault()
        if (!checkOut) { toast.error('Seleccioná check-out'); return }
        if (checkOut <= checkIn) { toast.error('Check-out debe ser posterior al check-in'); return }
        if (type === 'direct' && !firstName.trim()) { toast.error('El nombre del huésped es obligatorio'); return }

        setSaving(true)
        try {
            let guestId = null
            if (type === 'direct') {
                const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
                const { data, error } = await supabase.rpc('find_or_create_guest', {
                    p_full_name: fullName,
                    p_email: null,
                    p_phone: phone.trim() || null,
                })
                if (error) throw new Error(`find_or_create_guest: ${error.message}`)
                guestId = data
            }

            let finalChannelId = channelId || null
            if (type === 'block') {
                finalChannelId = await getWebChannelId()
            }

            const { error } = await supabase.from('core_reservations').insert({
                unit_id: initialData?.unitId,
                property_id: initialData?.propertyId || null,
                guest_id: guestId,
                channel_id: finalChannelId,
                status: type === 'direct' ? 'confirmed' : 'blocked',
                check_in: checkIn,
                check_out: checkOut,
                adults: 0,
                children: 0,
                notes: type === 'block' ? (notes.trim() || 'Bloqueo manual') : (notes.trim() || null),
            })
            if (error) throw new Error(error.message)

            toast.success(type === 'direct' ? 'Reserva creada' : 'Bloqueo creado')
            onClose()
            onSuccess?.()
        } catch (err) {
            toast.error(`Error: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const inputCls = "bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
    const labelCls = "block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide"

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl pointer-events-auto">
                    <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Nueva reserva</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {initialData?.unitName} <span className="text-gray-400 font-mono">({initialData?.unitCode})</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        <div>
                            <label className={labelCls}>Tipo</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'direct', label: 'Reserva directa' },
                                    { value: 'block', label: 'Bloqueo manual' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setType(opt.value)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                            type === opt.value
                                                ? opt.value === 'direct' ? 'bg-primary-600 text-white' : 'bg-gray-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Check-in *</label>
                                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={inputCls} required />
                            </div>
                            <div>
                                <label className={labelCls}>Check-out *</label>
                                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className={inputCls} required min={checkIn || undefined} />
                            </div>
                        </div>

                        {type === 'direct' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelCls}>Nombre *</label>
                                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="Nombre" required />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Apellido</label>
                                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Apellido" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Teléfono</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+56 9 ..." />
                                </div>
                                {directChannels.length > 0 && (
                                    <div>
                                        <label className={labelCls}>Canal</label>
                                        <select value={channelId} onChange={e => setChannelId(e.target.value)} className={inputCls}>
                                            <option value="">— Sin canal —</option>
                                            {directChannels.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {type === 'block' && (
                            <div>
                                <label className={labelCls}>Notas</label>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Motivo del bloqueo..." />
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
                            >
                                {saving ? 'Guardando…' : type === 'direct' ? 'Crear reserva' : 'Crear bloqueo'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}

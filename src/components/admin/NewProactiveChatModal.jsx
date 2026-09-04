import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { startProactiveConversation } from '../../data/admin/chat'

// E.164 genérico: '+' seguido de 8 a 15 dígitos (huéspedes de Chile, Argentina,
// Brasil y otros países — no restringido al formato chileno).
const E164_RE = /^\+\d{8,15}$/

function normalizePhone(raw) {
    return raw.replace(/[\s\-()]/g, '')
}

export default function NewProactiveChatModal({ isOpen, onClose, onSent, onGoToConversation }) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [message, setMessage] = useState('')
    const [phoneError, setPhoneError] = useState('')
    const [saving, setSaving] = useState(false)
    const [alreadyActive, setAlreadyActive] = useState(null)

    useEffect(() => {
        if (!isOpen) return
        setName('')
        setPhone('')
        setMessage('')
        setPhoneError('')
        setAlreadyActive(null)
    }, [isOpen])

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

    async function handleSubmit(e) {
        e.preventDefault()
        if (!name.trim()) { toast.error('El nombre del huésped es obligatorio'); return }
        if (!message.trim()) { toast.error('El motivo / mensaje es obligatorio'); return }

        const normalizedPhone = normalizePhone(phone)
        if (!E164_RE.test(normalizedPhone)) {
            setPhoneError('Formato inválido. Usá +[código país][número], ej: +56912345678')
            return
        }
        setPhoneError('')

        setSaving(true)
        try {
            const result = await startProactiveConversation({
                name: name.trim(),
                phone: normalizedPhone,
                message: message.trim(),
            })

            if (result?.alreadyActive) {
                setAlreadyActive(result)
            } else {
                toast.success('Plantilla enviada')
                onSent?.(result?.conversationId)
                onClose()
            }
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
                            <h2 className="text-base font-bold text-gray-900">Iniciar conversación</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Contacto proactivo vía plantilla de WhatsApp</p>
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

                    {alreadyActive ? (
                        <div className="px-6 py-5 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-amber-800 font-medium">
                                    Ya existe una conversación activa con este número
                                </p>
                                <p className="text-xs text-amber-700 mt-1.5">
                                    El huésped escribió hace {alreadyActive.hoursSinceLastMessage}{' '}
                                    {alreadyActive.hoursSinceLastMessage === 1 ? 'hora' : 'horas'}, dentro de la
                                    ventana de 24h de WhatsApp. Podés escribirle directo como mensaje de texto
                                    normal desde la conversación — no hace falta enviar la plantilla.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onGoToConversation?.(alreadyActive.conversationId)
                                        onClose()
                                    }}
                                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-sm transition-colors"
                                >
                                    Ir a la conversación
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            <div>
                                <label className={labelCls}>Nombre del huésped *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Nombre" required />
                            </div>
                            <div>
                                <label className={labelCls}>Teléfono *</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                                    className={inputCls}
                                    placeholder="+56 9 1234 5678"
                                    required
                                />
                                {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Motivo / mensaje *</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className={inputCls}
                                    rows={3}
                                    placeholder="Ej: quería confirmar tu hora de llegada mañana"
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-400">
                                Se enviará como plantilla aprobada: "Hola {name || '[nombre]'}, te escribe Karina de
                                Arte Brisa Patagonia. {message || '[mensaje]'} Quedo atenta a tu respuesta."
                            </p>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
                                >
                                    {saving ? 'Enviando…' : 'Enviar plantilla'}
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
                    )}
                </div>
            </div>
        </>
    )
}

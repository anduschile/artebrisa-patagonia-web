import { useState, useEffect, useCallback } from 'react'
import { getConversations } from '../../data/admin/chat'

function formatPhone(phone) {
    if (!phone) return '—'
    const d = phone.replace(/\D/g, '')
    if (d.length === 11 && d.startsWith('56'))
        return `+56 ${d[2]} ${d.slice(3, 7)} ${d.slice(7)}`
    return `+${d}`
}

function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

const STATUS_META = {
    bot:    { label: 'Bot',     cls: 'bg-gray-100 text-gray-500' },
    human:  { label: 'Humano',  cls: 'bg-amber-100 text-amber-700' },
    closed: { label: 'Cerrado', cls: 'bg-green-100 text-green-700' },
}

export default function ChatConversationList({ selectedId, onSelect, onConversationsLoad }) {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            const data = await getConversations()
            setConversations(data)
            onConversationsLoad?.(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [onConversationsLoad])

    useEffect(() => {
        load()
        const interval = setInterval(load, 5000)
        return () => clearInterval(interval)
    }, [load])

    return (
        <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 shrink-0">
                <h2 className="font-semibold text-gray-900 text-sm">Conversaciones</h2>
                <p className="text-xs text-gray-400 mt-0.5">{conversations.length} total</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <span className="text-sm text-gray-400">Cargando...</span>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-sm text-gray-400">Sin conversaciones aún</p>
                    </div>
                ) : (
                    conversations.map(conv => {
                        const isSelected = selectedId === conv.id
                        const isHuman = conv.status === 'human'
                        const meta = STATUS_META[conv.status] || { label: conv.status, cls: 'bg-gray-100 text-gray-500' }

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`
                                    w-full text-left px-4 py-3 border-b border-gray-100
                                    hover:bg-gray-50 transition-colors border-l-2
                                    ${isSelected
                                        ? 'bg-primary-50 border-l-primary-600'
                                        : isHuman
                                        ? 'bg-amber-50 border-l-amber-400'
                                        : 'border-l-transparent'
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm text-gray-900 truncate">
                                        {conv.contact_name?.trim() || formatPhone(conv.phone)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-2 shrink-0">
                                        {formatTime(conv.last_message_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-gray-500 truncate flex-1">
                                        {conv.last_message?.content || '—'}
                                    </p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${meta.cls}`}>
                                        {meta.label}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

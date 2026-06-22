import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { getMessages, sendMessage, updateConversationStatus } from '../../data/admin/chat'
import toast from 'react-hot-toast'

function formatTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function getDateInChile(ts) {
    if (!ts) return '1970-01-01'
    const d = new Date(ts)
    const formatter = new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Santiago'
    })
    const parts = formatter.formatToParts(d)
    const year = parts.find(p => p.type === 'year').value
    const month = parts.find(p => p.type === 'month').value
    const day = parts.find(p => p.type === 'day').value
    return `${year}-${month}-${day}`
}

function formatDateSeparator(ts) {
    if (!ts) return ''

    const msgDate = getDateInChile(ts)
    const today = getDateInChile(new Date().toISOString())
    // Restar 1 día al string YYYY-MM-DD
    const todayDate = new Date(today)
    const yesterdayDate = new Date(todayDate)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayString = yesterdayDate.toISOString().split('T')[0]

    if (msgDate === today) {
        return 'Hoy'
    } else if (msgDate === yesterdayString) {
        return 'Ayer'
    } else {
        return new Date(ts).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long'
        })
    }
}

function EmptyState() {
    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-sm text-gray-400">Selecciona una conversación</p>
            </div>
        </div>
    )
}

export default function ChatMessageView({ conversation, onStatusChange }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef(null)
    const textareaRef = useRef(null)
    const isAtBottomRef = useRef(true)

    const load = useCallback(async () => {
        if (!conversation?.id) return
        try {
            const data = await getMessages(conversation.id)
            setMessages(data)
        } catch (e) {
            console.error(e)
        }
    }, [conversation?.id])

    // Reset and reload when conversation changes
    useEffect(() => {
        setMessages([])
        setInput('')
        load()
    }, [conversation?.id])

    // Polling: reload messages every 3 seconds
    useEffect(() => {
        if (!conversation?.id) return
        const interval = setInterval(load, 3000)
        return () => clearInterval(interval)
    }, [conversation?.id, load])

    // Auto-scroll only if the user was already at the bottom
    useEffect(() => {
        if (isAtBottomRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    function handleMessagesScroll(e) {
        const el = e.currentTarget
        isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    }

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return
        setSending(true)
        try {
            await sendMessage(conversation.id, conversation.phone, text)
            setInput('')
            textareaRef.current?.focus()
            // If bot was handling it, notify parent of status change
            if (conversation.status === 'bot') {
                onStatusChange?.({ ...conversation, status: 'human' })
            }
        } catch (e) {
            toast.error('Error al enviar: ' + e.message)
        } finally {
            setSending(false)
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    async function handleStatusChange(status) {
        try {
            await updateConversationStatus(conversation.id, status)
            onStatusChange?.({ ...conversation, status })
            const labels = { bot: 'Devuelto al bot', closed: 'Conversación cerrada', human: 'Conversación reabierta' }
            toast.success(labels[status] || 'Estado actualizado')
        } catch (e) {
            toast.error(e.message)
        }
    }

    if (!conversation) return <EmptyState />

    const isClosed = conversation.status === 'closed'

    return (
        <div className="flex-1 flex flex-col bg-white min-w-0 h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                        {conversation.contact_name || conversation.phone}
                    </p>
                    {conversation.contact_name && (
                        <p className="text-xs text-gray-400">{conversation.phone}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                    {conversation.status !== 'bot' && !isClosed && (
                        <button
                            onClick={() => handleStatusChange('bot')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Devolver al bot
                        </button>
                    )}
                    {!isClosed && (
                        <button
                            onClick={() => handleStatusChange('closed')}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            Cerrar conversación
                        </button>
                    )}
                    {isClosed && (
                        <button
                            onClick={() => handleStatusChange('human')}
                            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        >
                            Reabrir
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" onScroll={handleMessagesScroll}>
                {messages.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">Sin mensajes aún</p>
                )}
                {messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                    const shouldShowSeparator = !prevMsg ||
                        getDateInChile(msg.created_at) !== getDateInChile(prevMsg.created_at)

                    return (
                        <Fragment key={`group-${msg.id}`}>
                            {shouldShowSeparator && (
                                <div className="flex justify-center py-3 mb-2">
                                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                                        {formatDateSeparator(msg.created_at)}
                                    </span>
                                </div>
                            )}
                            <div
                                className={`flex ${msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`
                                        max-w-[75%] px-3 py-2 rounded-2xl text-sm
                                        ${msg.role === 'assistant'
                                            ? 'bg-primary-600 text-white rounded-br-sm'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                        }
                                    `}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${msg.role === 'assistant' ? 'text-primary-200' : 'text-gray-400'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        </Fragment>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
                {isClosed ? (
                    <p className="text-center text-xs text-gray-400 py-1">
                        Conversación cerrada —{' '}
                        <button
                            onClick={() => handleStatusChange('human')}
                            className="text-primary-600 hover:underline"
                        >
                            reabrir
                        </button>
                    </p>
                ) : (
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter nueva línea)"
                            rows={2}
                            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || sending}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            {sending ? '…' : 'Enviar'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

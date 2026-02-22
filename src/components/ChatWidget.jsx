import { useState, useEffect, useRef, useCallback } from 'react'
import { CHAT_ENABLED, CHAT_PROVIDER, TAWK_PROPERTY_ID, TAWK_WIDGET_ID, CRISP_WEBSITE_ID } from '../config/chatWidget'
import {
    CHAT_MODE,
    BOT_MIN_DELAY_MS, BOT_MAX_DELAY_MS, MAX_QUICK_REPLIES,
    BOT_TONE_VARIANTS, BOT_FOLLOWUP_VARIANTS,
    WHATSAPP_TRIGGER_KEYWORDS, ALLOWED_KEYWORDS,
} from '../config/chatBot'
import { buildWaUrl } from '../config/contact'
import { FAQ_CATEGORIES, QUICK_REPLIES } from '../content/faq_es'

// ─── Third-party script injectors ────────────────────────────────────────────
function injectTawk() {
    if (window.Tawk_API) return
    window.Tawk_API = {}; window.Tawk_LoadStart = new Date()
    const s = document.createElement('script')
    s.async = true
    s.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`
    s.charset = 'UTF-8'; s.setAttribute('crossorigin', '*')
    document.head.appendChild(s)
}
function injectCrisp() {
    if (window.$crisp) return
    window.$crisp = []; window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID
    const s = document.createElement('script')
    s.src = 'https://client.crisp.chat/l.js'; s.async = true
    document.head.appendChild(s)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randDelay() { return BOT_MIN_DELAY_MS + Math.random() * (BOT_MAX_DELAY_MS - BOT_MIN_DELAY_MS) }
function lower(s) { return s.toLowerCase() }

/** Returns true if the text matches a WhatsApp-trigger keyword */
function needsWhatsApp(text) {
    const t = lower(text)
    return WHATSAPP_TRIGGER_KEYWORDS.some(kw => t.includes(kw))
}

/** Returns true if the text matches at least one allowed/in-topic keyword */
function isInTopic(text) {
    const t = lower(text)
    // Also check against FAQ labels
    const faqKeywords = FAQ_CATEGORIES.flatMap(f => [f.id, lower(f.label)])
    return [...ALLOWED_KEYWORDS, ...faqKeywords].some(kw => t.includes(kw))
}

/** Build WhatsApp URL with the user's original query embedded */
function buildContextualWaUrl(userText) {
    const msg = userText
        ? `Hola, vengo desde la web Arte Brisa. Quisiera consultar disponibilidad/precios. Mi consulta: "${userText}"`
        : 'Hola, vengo desde la web Arte Brisa. Quisiera consultar disponibilidad y precios.'
    return buildWaUrl(msg)
}

/** Markdown-lite: **bold** */
function renderLine(text, key) {
    const parts = text.split(/\*\*(.+?)\*\*/g)
    return (
        <p key={key} className="leading-snug">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
        </p>
    )
}

// ─── Follow-up questions per FAQ id (open mode only) ────────────────────────
// In CHAT_MODE='closed' these are NEVER sent as chat messages to avoid
// the user typing a free answer that would trigger the off-topic fallback.
const FAQ_FOLLOWUP_OPEN = {
    checkin: '¿Llegas en auto o en bus?',
    ubicacion: '¿Necesitas información de cómo llegar desde la terminal?',
    estacionamiento: '¿Vienes en auto propio?',
    mascotas: '¿Qué tipo de mascota traes?',
    fumadores: null,
    cancelacion: '¿Tienes fechas tentativas en mente?',
    torres: '¿Quieres que te recomiende un operador para el parque?',
    tours: null,   // handled via sub-reply buttons in closed mode
    wifi: null,
}

/**
 * Tours sub-replies — 3 quick-reply buttons shown after the tours answer.
 * Each carries a predefined `closedAnswer` so no free input is needed.
 */
const TOURS_SUBREPLIES = [
    {
        id: 'tours_pareja',
        label: '👫 En pareja',
        closedAnswer: [
            '¡Perfecto para una escapada romántica! 💑',
            'En pareja les recomendamos el **Glaciar Balmaceda y Serrano** (navegación + trekking ligero) y el atardecer en la costanera.',
            'Si tienen 2-3 días, Torres del Paine es un must — los paisajes son increíbles.',
            '¿Quieren fechas o precios? Consúltenos por WhatsApp. 👇',
        ],
    },
    {
        id: 'tours_familia',
        label: '👨‍👩‍👧 En familia',
        closedAnswer: [
            '¡Excelente, hay mucho para disfrutar en familia! 👨‍👩‍👧',
            'Les recomendamos la **Cueva del Milodón** (24 km, muy accesible) y un paseo por la costanera de Puerto Natales.',
            'Torres del Paine también es perfecto si los niños son grandes: hay rutas cortas para todos los niveles.',
            '¿Les ayudamos con disponibilidad y precios? Contáctenos por WhatsApp. 👇',
        ],
    },
    {
        id: 'tours_solo',
        label: '🧍 Solo/a',
        closedAnswer: [
            '¡Patagonia es espectacular para viajar solo/a! 🏔',
            'Les recomendamos el **Sendero Mirador Dorotea** (trekking accesible con vista al seno de Última Esperanza) y el kayak en el fiordo.',
            'Para Torres del Paine, van muchos viajeros solos y se forma buena comunidad en los refugios.',
            '¿Quieres más info o ayuda con fechas? Escríbenos por WhatsApp. 👇',
        ],
    },
]

// Quick replies to restore after any answer
const TOPIC_REPLIES = [
    ...FAQ_CATEGORIES.map(f => ({ id: f.id, label: `${f.icon} ${f.label}`, faqId: f.id })),
    { id: 'humano', label: '💬 Hablar con alguien', whatsapp: true },
]

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="flex justify-start mb-2">
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs mr-2 shrink-0 mt-0.5">🏔</span>
            <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
                    />
                ))}
            </div>
        </div>
    )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }) {
    const isBot = msg.role === 'bot'
    return (
        <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-2`}>
            {isBot && (
                <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs mr-2 shrink-0 mt-0.5">🏔</span>
            )}
            <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${isBot ? 'bg-slate-700 text-slate-100 rounded-tl-sm' : 'bg-emerald-600 text-white rounded-tr-sm'
                }`}>
                {Array.isArray(msg.text)
                    ? <div className="space-y-0.5">{msg.text.map((l, i) => renderLine(l, i))}</div>
                    : renderLine(msg.text, 0)
                }
                {/* WhatsApp CTA */}
                {msg.waUrl && (
                    <a
                        href={msg.waUrl}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl w-fit transition-colors"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.855L.057 23.886a.5.5 0 0 0 .611.61l6.083-1.461A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.874 9.874 0 0 1-5.031-1.378l-.36-.214-3.733.897.934-3.65-.235-.375A9.859 9.859 0 0 1 2.106 12C2.106 6.533 6.533 2.106 12 2.106S21.894 6.533 21.894 12 17.467 21.894 12 21.894z" />
                        </svg>
                        Abrir WhatsApp
                    </a>
                )}
            </div>
        </div>
    )
}

// ─── Quick-reply pills ────────────────────────────────────────────────────────
function QuickReplies({ replies, onSelect, showAll, onToggleAll }) {
    const visible = showAll ? replies : replies.slice(0, MAX_QUICK_REPLIES)
    const hasMore = !showAll && replies.length > MAX_QUICK_REPLIES
    return (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {visible.map(r => (
                <button
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className="text-xs bg-slate-700 hover:bg-emerald-700 text-slate-200 px-2.5 py-1.5 rounded-full transition-colors border border-slate-600 hover:border-emerald-500"
                >
                    {r.label}
                </button>
            ))}
            {hasMore && (
                <button
                    onClick={onToggleAll}
                    className="text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-full border border-slate-600 transition-colors"
                >
                    Ver más temas →
                </button>
            )}
        </div>
    )
}

// ─── Custom Chat Widget ───────────────────────────────────────────────────────
function CustomChatWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES)
    const [showAllReplies, setShowAllReplies] = useState(false)
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [unread, setUnread] = useState(1)
    const bottomRef = useRef(null)
    const pendingTimers = useRef([])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])
    useEffect(() => { if (open) setUnread(0) }, [open])

    useEffect(() => {
        if (open && messages.length === 0) {
            scheduleBot([
                '¡Hola! 👋 Bienvenido/a a **Arte Brisa Patagonia**.',
                'Por aquí respondo consultas sobre hospedaje, check-in, mascotas, tours y más. ¿En qué te puedo orientar?',
            ])
        }
    }, [open])

    useEffect(() => () => pendingTimers.current.forEach(clearTimeout), [])

    function addUser(text) {
        setMessages(prev => [...prev, { role: 'user', text }])
    }

    const scheduleBot = useCallback((text, waUrl) => {
        setIsTyping(true)
        const delay = randDelay()
        const t = setTimeout(() => {
            setIsTyping(false)
            setMessages(prev => [...prev, { role: 'bot', text, waUrl }])
        }, delay)
        pendingTimers.current.push(t)
    }, [])

    const scheduleFollowUp = useCallback((text, extraDelay = 500) => {
        const t = setTimeout(() => scheduleBot(text), extraDelay)
        pendingTimers.current.push(t)
    }, [scheduleBot])

    function restoreReplies(delay = BOT_MAX_DELAY_MS + 900) {
        const t = setTimeout(() => {
            setShowAllReplies(false)
            setQuickReplies(TOPIC_REPLIES)
        }, delay)
        pendingTimers.current.push(t)
    }

    function handleQuickReply(reply) {
        addUser(reply.label)
        setQuickReplies([])
        setShowAllReplies(false)

        // ── Tours sub-reply (predefined text, no free input) ──
        if (reply.closedAnswer) {
            scheduleBot(reply.closedAnswer,
                reply.id !== 'tours_solo' ? undefined : undefined
            )
            restoreReplies()
            return
        }

        if (reply.whatsapp) {
            scheduleBot(
                `${pick(BOT_TONE_VARIANTS)} Para ${reply.id === 'disponibilidad' ? 'disponibilidad' :
                    reply.id === 'precios' ? 'precios' : 'consultas directas'
                }, lo más rápido es contactar al equipo por WhatsApp. 👇`,
                buildContextualWaUrl(reply.label)
            )
        } else if (reply.faqId) {
            const faq = FAQ_CATEGORIES.find(f => f.id === reply.faqId)
            if (!faq) return
            const lines = Array.isArray(faq.answer) ? faq.answer : [faq.answer]
            scheduleBot([pick(BOT_TONE_VARIANTS), ...lines])

            if (CHAT_MODE === 'closed') {
                // In closed mode: never send open-ended follow-up questions.
                // For tours: show 3 predefined sub-reply buttons.
                // For all others: silently restore topic list.
                if (reply.faqId === 'tours') {
                    const toursDelay = BOT_MAX_DELAY_MS + 600
                    const t = setTimeout(() => {
                        setShowAllReplies(false)
                        setQuickReplies(TOURS_SUBREPLIES)
                    }, toursDelay)
                    pendingTimers.current.push(t)
                    return  // skip restoreReplies — tours sub-replies handle that
                }
                // All other topics: restore silently
            } else {
                // Open mode: send the follow-up question if defined
                const followup = FAQ_FOLLOWUP_OPEN[reply.faqId]
                if (followup) scheduleFollowUp(followup, BOT_MAX_DELAY_MS + 200)
            }
        }

        restoreReplies()
    }

    function handleSend() {
        const text = input.trim()
        if (!text) return
        addUser(text)
        setInput('')
        setQuickReplies([])
        setShowAllReplies(false)

        const t = lower(text)

        // 1. WhatsApp trigger — always overrides closed mode
        if (needsWhatsApp(t)) {
            scheduleBot(
                `${pick(BOT_TONE_VARIANTS)} Para precios y disponibilidad lo más rápido es hablar con el equipo directamente. Te conectamos con un mensaje listo: 👇`,
                buildContextualWaUrl(text)
            )
            scheduleFollowUp('¿Tienes alguna otra consulta?', BOT_MAX_DELAY_MS + 300)
            restoreReplies()
            return
        }

        // 2. FAQ keyword matching (always available in closed mode too)
        const faq = FAQ_CATEGORIES.find(f =>
            t.includes(f.id) ||
            ALLOWED_KEYWORDS.filter(kw => f.id === kw || lower(f.label).includes(kw))
                .some(kw => t.includes(kw))
        )
        if (faq) {
            const lines = Array.isArray(faq.answer) ? faq.answer : [faq.answer]
            scheduleBot([pick(BOT_TONE_VARIANTS), ...lines])

            if (CHAT_MODE !== 'closed') {
                // Only send open follow-up in open mode
                const followup = FAQ_FOLLOWUP_OPEN[faq.id]
                if (followup) scheduleFollowUp(followup, BOT_MAX_DELAY_MS + 200)
            }
            restoreReplies()
            return
        }

        // 3. Closed mode — off-topic message
        if (CHAT_MODE === 'closed') {
            scheduleBot(
                'Por aquí respondemos consultas rápidas sobre estos temas 👇 Para otras preguntas, el equipo te atiende por WhatsApp.',
                buildContextualWaUrl(text)
            )
            restoreReplies(BOT_MAX_DELAY_MS + 400)
            return
        }

        // 4. Open mode fallback (only reached if CHAT_MODE !== 'closed')
        scheduleBot(
            `${pick(BOT_TONE_VARIANTS)} Para esa consulta, lo mejor es contactar al equipo directamente. 👇`,
            buildContextualWaUrl(text)
        )
        scheduleFollowUp('¿Hay algo más en lo que te pueda orientar?', BOT_MAX_DELAY_MS + 200)
        restoreReplies()
    }

    return (
        <>
            {/* ── Bubble button ── */}
            <button
                onClick={() => setOpen(v => !v)}
                className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Abrir chat"
            >
                {open ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                    </svg>
                )}
                {!open && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                        {unread}
                    </span>
                )}
            </button>

            {/* ── Chat window ── */}
            {open && (
                <div className="fixed bottom-24 right-5 z-50 w-80 max-h-[540px] flex flex-col rounded-2xl shadow-2xl border border-slate-700 bg-slate-800 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-4 py-3 flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🏔</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight">Arte Brisa Patagonia</p>
                            <p className="text-emerald-200 text-xs">Consultas rápidas · Siempre disponible</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="En línea" />
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
                        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                        {isTyping && <TypingIndicator />}
                        <div ref={bottomRef} />
                    </div>

                    {/* Quick replies */}
                    {!isTyping && quickReplies.length > 0 && (
                        <QuickReplies
                            replies={quickReplies}
                            onSelect={handleQuickReply}
                            showAll={showAllReplies}
                            onToggleAll={() => setShowAllReplies(v => !v)}
                        />
                    )}

                    {/* Input row */}
                    <div className="border-t border-slate-700 flex items-center gap-2 px-3 py-2 shrink-0">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !isTyping && handleSend()}
                            placeholder="Escribe tu consulta…"
                            disabled={isTyping}
                            className="flex-1 bg-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors shrink-0"
                            aria-label="Enviar"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    </div>

                    {/* Response-time disclaimer */}
                    <div className="shrink-0 px-3 py-1.5 bg-slate-900/50 border-t border-slate-700/50">
                        <p className="text-[10px] text-slate-600 text-center leading-tight">
                            Respondemos lo antes posible · Para precios y disponibilidad, WhatsApp es lo más rápido.
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Main export — handles provider switching ─────────────────────────────────
export default function ChatWidget() {
    useEffect(() => {
        if (!CHAT_ENABLED) return
        if (CHAT_PROVIDER === 'tawk') injectTawk()
        if (CHAT_PROVIDER === 'crisp') injectCrisp()
    }, [])

    if (!CHAT_ENABLED) return null
    if (CHAT_PROVIDER === 'tawk' || CHAT_PROVIDER === 'crisp') return null

    return <CustomChatWidget />
}

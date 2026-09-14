import { useState, useCallback } from 'react'
import ChatStatsBar from '../../components/admin/ChatStatsBar'
import ChatConversationList from '../../components/admin/ChatConversationList'
import ChatMessageView from '../../components/admin/ChatMessageView'

export default function AdminChatPage() {
    const [selected, setSelected] = useState(null)
    // Mobile: show list by default, switch to view when a conv is selected
    const [showList, setShowList] = useState(true)

    function handleSelect(conv) {
        setSelected(conv)
        setShowList(false)
    }

    // Keep `selected` in sync when the polling loop refreshes the list
    const handleConversationsLoad = useCallback((convs) => {
        setSelected(prev => {
            if (!prev) return prev
            const fresh = convs.find(c => c.id === prev.id)
            return fresh ?? prev
        })
    }, [])

    return (
        // Break out of AdminLayout's px-6 py-8 wrapper and fill the full viewport height.
        // h-dvh (dynamic viewport height) en vez de 100vh: en mobile, 100vh se calcula contra
        // el viewport "grande" (con la barra de direcciones del navegador oculta), mientras el
        // area realmente visible es mas chica cuando esa barra esta presente — dvh se ajusta a
        // la altura visible real.
        // Sin overflow-hidden (ya no hace falta: min-h-0 en ChatMessageView evita que su
        // contenido se desborde de este contenedor): un overflow no-visible aca haria que el
        // "sticky" del boton Volver se resuelva contra ESTE div en vez de contra la pagina,
        // rompiendo el stick (mismo comportamiento que ya usa la barra del hamburguesa en
        // AdminLayout.jsx, que no tiene ningun ancestro con overflow de por medio).
        <div className="-mx-6 -my-8 flex h-dvh">
            {/* ── Conversation list — hidden on mobile when a conv is open ── */}
            <div className={`${showList ? 'flex' : 'hidden'} md:flex flex-col`}>
                <ChatStatsBar />
                <ChatConversationList selectedId={selected?.id} onSelect={handleSelect} onConversationsLoad={handleConversationsLoad} />
            </div>

            {/* ── Message view ── */}
            <div className={`${!showList ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
                {/* Mobile back button */}
                {!showList && (
                    // sticky top-[59px]: 59px es la altura exacta (medida) de la barra mobile
                    // del hamburguesa en AdminLayout.jsx (sticky top-0, py-3 + boton 22px + borde 1px).
                    // Si esa barra cambia de alto en el futuro, este valor debe actualizarse a mano
                    // (no hay forma de derivarlo sin tocar AdminLayout.jsx).
                    <div className="md:hidden sticky top-[59px] z-10 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
                        <button
                            onClick={() => setShowList(true)}
                            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Conversaciones
                        </button>
                    </div>
                )}

                <ChatMessageView
                    conversation={selected}
                    onStatusChange={updated => setSelected(updated)}
                />
            </div>
        </div>
    )
}

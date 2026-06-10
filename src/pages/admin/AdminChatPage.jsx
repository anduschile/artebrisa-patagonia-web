import { useState } from 'react'
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

    return (
        // Break out of AdminLayout's px-6 py-8 wrapper and fill the full viewport height
        <div className="-mx-6 -my-8 flex overflow-hidden" style={{ height: '100vh' }}>
            {/* ── Conversation list — hidden on mobile when a conv is open ── */}
            <div className={`${showList ? 'flex' : 'hidden'} md:flex flex-col`}>
                <ChatConversationList selectedId={selected?.id} onSelect={handleSelect} />
            </div>

            {/* ── Message view ── */}
            <div className={`${!showList ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
                {/* Mobile back button */}
                {!showList && (
                    <div className="md:hidden px-3 py-2 border-b border-gray-200 bg-white shrink-0">
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

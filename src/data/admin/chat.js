import { supabase } from '../../lib/supabaseClient'

/**
 * Fetch all conversations ordered by last_message_at desc,
 * each enriched with its most recent message.
 */
export async function getConversations() {
    const { data: convs, error } = await supabase
        .from('core_chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
    if (error) throw new Error(`getConversations: ${error.message}`)
    if (!convs?.length) return []

    const ids = convs.map(c => c.id)
    const { data: msgs } = await supabase
        .from('core_chat_messages')
        .select('conversation_id, content, role, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(500)

    const lastMsg = {}
    for (const msg of msgs || []) {
        if (!lastMsg[msg.conversation_id]) lastMsg[msg.conversation_id] = msg
    }

    return convs.map(c => ({ ...c, last_message: lastMsg[c.id] || null }))
}

/**
 * Fetch all messages for a conversation, oldest first.
 */
export async function getMessages(conversationId) {
    const { data, error } = await supabase
        .from('core_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    if (error) throw new Error(`getMessages: ${error.message}`)
    return data || []
}

/**
 * Insert an admin message in the DB and send it to the tourist via WhatsApp.
 * Sets conversation status to 'human' only if it was 'bot' (Karina takes over).
 */
export async function sendMessage(conversationId, phone, content) {
    const { error: insertErr } = await supabase
        .from('core_chat_messages')
        .insert({ conversation_id: conversationId, role: 'assistant', content })
    if (insertErr) throw new Error(`sendMessage insert: ${insertErr.message}`)

    // Always update timestamp
    await supabase
        .from('core_chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

    // Take over from bot only when status was 'bot'
    await supabase
        .from('core_chat_conversations')
        .update({ status: 'human' })
        .eq('id', conversationId)
        .eq('status', 'bot')

    const { error: fnErr } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone, message: content },
    })
    if (fnErr) throw new Error(`sendMessage twilio: ${fnErr.message}`)
}

/**
 * Update the status of a conversation (bot | human | closed).
 */
export async function updateConversationStatus(conversationId, status) {
    const { error } = await supabase
        .from('core_chat_conversations')
        .update({ status })
        .eq('id', conversationId)
    if (error) throw new Error(`updateConversationStatus: ${error.message}`)
}

/**
 * Count conversations that need a human agent (status = 'human').
 */
export async function getUnreadCount() {
    const { count, error } = await supabase
        .from('core_chat_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'human')
    if (error) return 0
    return count ?? 0
}

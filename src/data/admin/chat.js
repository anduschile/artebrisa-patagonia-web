import { supabase } from '../../lib/supabaseClient'

/**
 * Fetch all conversations ordered by last_message_at desc,
 * each enriched with its most recent message.
 */
export async function getConversations() {
    const { data: convs, error } = await supabase
        .from('core_chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
    if (error) {
        console.error('getConversations query error:', error)
        throw new Error(`getConversations: ${error.message}`)
    }
    if (!convs?.length) return []

    const ids = convs.map(c => c.id)
    const { data: msgs, error: msgError } = await supabase
        .from('core_chat_messages')
        .select('conversation_id, content, role, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(500)

    if (msgError) console.error('getConversations messages error:', msgError)

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

/**
 * Get conversation statistics for a given period.
 * Uses RPC get_conversation_start_dates() for efficient MIN(created_at) aggregation.
 */
export async function getConversationStats(period = 'week') {
    const now = new Date()
    let startDate = new Date()

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
        const dayOfWeek = now.getDay()
        const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        startDate.setDate(now.getDate() - daysBack)
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'all') {
        startDate = null
    }

    try {
        // Call RPC to get conversation start dates efficiently
        const { data: startDates, error: rpcError } = await supabase
            .rpc('get_conversation_start_dates')

        if (rpcError || !startDates?.length) return { total: 0, period }

        // Count conversations that started in the period
        let count = 0
        for (const row of startDates) {
            const date = new Date(row.started_at)
            if (period === 'all' || date >= startDate) {
                count++
            }
        }

        return { total: count, period }
    } catch (e) {
        console.error(`getConversationStats(${period}) error:`, e)
        return { total: 0, period }
    }
}

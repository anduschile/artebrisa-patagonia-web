-- ─── Chat Conversation Lock Migration ──────────────────────────────────────
-- Date: 2026-10-27
-- Purpose: lock pesimista con timeout de seguridad para evitar que mensajes de
--          WhatsApp casi simultáneos (el huésped escribe en varias líneas
--          seguidas) disparen invocaciones paralelas e independientes del
--          Edge Function whatsapp-bot sobre la misma conversación — cada una
--          armaba su propio system prompt, llamaba a Claude por su cuenta y
--          respondía sin saber de la otra, produciendo respuestas duplicadas o
--          contradictorias (incidentes Gladys 20-oct, Geraldine 21-oct, prueba
--          José 27-oct con 6+ pares de respuestas duplicadas en 6 minutos).
--          No reemplaza el UNIQUE(twilio_sid) existente (ese deduplica
--          REINTENTOS del mismo mensaje; este lock serializa el PROCESAMIENTO
--          de mensajes DISTINTOS que llegan casi al mismo tiempo).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE core_chat_conversations
    ADD COLUMN IF NOT EXISTS processing_lock_until timestamptz NULL;

COMMENT ON COLUMN core_chat_conversations.processing_lock_until IS
    'NULL = conversación libre. Si tiene fecha futura, una invocación del whatsapp-bot ya está procesando un turno para esta conversación hasta ese instante (timeout de seguridad ante una invocación caída a mitad de camino). Se libera (set a NULL) al terminar el turno, en un finally.';

-- Adquisición atómica del lock: usa el reloj del propio Postgres (now()), no el
-- del Edge Function, para evitar que un desfase de reloj entre Deno Deploy y la
-- base de datos reduzca o alargue el timeout de 30s de forma impredecible.
-- Devuelve true si esta llamada adquirió el lock, false si ya estaba tomado por
-- otra invocación y aún no expiró.
CREATE OR REPLACE FUNCTION acquire_chat_conversation_lock(
    p_conversation_id uuid,
    p_lock_seconds integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows integer;
BEGIN
    UPDATE core_chat_conversations
    SET processing_lock_until = now() + make_interval(secs => p_lock_seconds)
    WHERE id = p_conversation_id
      AND (processing_lock_until IS NULL OR processing_lock_until < now());

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;

COMMENT ON FUNCTION acquire_chat_conversation_lock IS
    'Adquiere de forma atómica el lock de procesamiento de una conversación (whatsapp-bot). Ver columna core_chat_conversations.processing_lock_until.';

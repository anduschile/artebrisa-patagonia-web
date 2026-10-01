-- Agrega restricción UNIQUE sobre core_chat_messages.twilio_sid
-- Date: 2026-10-01
-- Purpose: Cerrar la ventana de carrera en la deduplicación de reintentos de Twilio
--          en whatsapp-bot. El webhook ya chequea twilio_sid contra la tabla antes
--          de insertar (SELECT-antes-de-INSERT), pero sin esta restricción, dos
--          requests casi simultáneos con el mismo MessageSid podrían pasar ambos
--          ese chequeo antes de que cualquiera termine su propio INSERT, causando
--          doble procesamiento del mismo mensaje entrante.
--
--          Verificado antes de esta migración (solo lectura, vía Supabase MCP):
--          0 valores duplicados entre los twilio_sid no nulos (1002 filas role='user',
--          todas con valor), y los 907 NULL corresponden exclusivamente a mensajes
--          role='assistant' (el bot nunca guarda su propio twilio_sid). Un UNIQUE
--          estándar de Postgres permite múltiples NULL sin conflicto, así que esto
--          no requiere limpieza previa de datos.

ALTER TABLE core_chat_messages
  ADD CONSTRAINT core_chat_messages_twilio_sid_key UNIQUE (twilio_sid);

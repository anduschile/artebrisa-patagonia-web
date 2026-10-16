# Incidentes — whatsapp-bot (Arte Brisa Patagonia)

## 2026-08-10 — Confirmación de disponibilidad con año mal calculado
**Síntoma:** el bot confirmaba disponibilidad para fechas ya pasadas (ej. "15 de junio"
interpretado con el año incorrecto).
**Causa raíz:** sin validación del año que el modelo usaba internamente al confirmar/negar
disponibilidad.
**Fix:** commit fb01716 — marcador interno `<!--FECHA_MENCIONADA:YYYY-MM-DD-->` validado
contra hoy + 18 meses.

## 2026-08-11 / corregido 2026-10-05 — Marcador crudo visible al huésped
**Síntoma:** el huésped recibía texto literal tipo "##COTIZAR##" en vez del precio calculado.
**Causa raíz:** el guard anti-marcador-crudo (paso 12b) usaba una regex sin guion bajo,
que no detectaba marcadores como ##VERIFICAR_DISPONIBILIDAD## o ##LISTAR_PRECIOS##.
**Fix:** commit 9f26456 — regex corregida a /##[A-ZÁÉÍÓÚÑ_]+##/.

## 2026-10-01 / corregido 2026-10-14 — Derivación innecesaria a humano
**Síntoma:** el bot derivaba conversaciones a Karina de forma inesperada, y en un caso
le dijo a un huésped real que "no puede enviar fotografías" (función que sí existe).
**Origen:** se creó el Guardián de promesa sin marcador (commit c3a7e99) tras una venta
perdida real (huésped Melisa Gabriela Llaurado, 30-sept-2026) — pero el propio guardián
introdujo un bug nuevo: trataba como fallo técnico cualquier respuesta sin marcador,
incluso cuando el propio prompt de corrección le pedía a Claude responder así
legítimamente.
**Causa raíz:** desajuste entre lo que el prompt autorizaba al modelo y lo que el código
aceptaba como éxito.
**Fix:** commit be4fc4c — distingue "sin marcador y sin lenguaje de promesa" (éxito, no
deriva) de "sin marcador pero con promesa repetida" (fallo real, sí deriva).

<!-- Plantilla para el próximo incidente:
## YYYY-MM-DD — [título corto]
**Síntoma:**
**Causa raíz:**
**Fix:** commit [hash]
-->

## 2026-10-14 — Falta de visibilidad sobre fallos técnicos silenciosos
**Contexto:** tras corregir el bug del Guardián de promesa, se detectó que existían
4 bloques adicionales (COTIZAR, LISTAR_PRECIOS, VERIFICAR_DISPONIBILIDAD con
unit_code inválido, y el guard anti-marcador-crudo 12b) que derivaban a humano por
fallo técnico sin notificar a nadie — ni a Karina ni a José.
**Causa raíz:** no era un bug de lógica, sino ausencia total de observabilidad en
esos 5 puntos de fallo.
**Fix:** función enviarAlertaTecnicaAJose() (index.ts) agregada a los 5 bloques —
envía correo (Resend) y WhatsApp (Twilio, sujeto a ventana de 24h) a José cada vez
que ocurre una derivación por fallo técnico, separado de las notificaciones
normales a Karina.

## Incidente: Guardián de promesa — timeout en llamada de corrección (15-oct-2026)
Síntoma: derivación a humano con motivo "timeout_8s" en la llamada de corrección del
guardián de promesa sin marcador (conversation_id efafe30d-...).
Causa raíz: el AbortController de la llamada de corrección tenía un timeout fijo de
8000ms, pero la primera llamada a Claude con el system prompt actual ya tarda ~10s en
promedio — el presupuesto de 8s nunca tuvo margen real. No es el mismo bug del
14-oct (be4fc4c): el guardián funcionó correctamente, fue la llamada de red la que
no alcanzó a completar a tiempo.
Fix: commit [completar con el hash real tras el deploy] — timeout subido a 15000ms
en los 4 lugares que reutilizan el system prompt completo, vía constante
CLAUDE_RETRY_TIMEOUT_MS.
Pendiente relacionado: el system prompt (bloque DISPONIBILIDAD ACTUAL) es grande y es
la causa de fondo de la latencia — reducirlo bajaría el riesgo en todas las llamadas,
no solo esta. No se abordó en este fix.

## Incidente: derivaciones silenciosas — conversación en modo humano sin aviso a Karina (13-oct-2026)
Síntoma: huésped de EE.UU. (grupo de 11 personas) recibió "Ya te contacto directamente" y esperó
40 minutos; Karina no recibió notificación.
Causa raíz: 6 rutas dejan status 'human' sin notificar a Karina por WhatsApp (unit_code inválido en
COTIZAR/LISTAR_PRECIOS/VERIFICAR_DISPONIBILIDAD, guard 12b, y dos fallos de RESERVA_LISTA que solo
mandaban email). Solo el paso 11 (##DERIVAR##) notificaba. Desencadenante observado: una segunda
llamada a Claude emitió un marcador cuando no puede (grupo que requiere varias unidades).
Fix: commit 60856b0 — nueva función notificarDerivacionAKarina, llamada desde las 6 rutas. Paso 11
sin cambios.
Pendiente relacionado: grupos que requieren varias unidades siguen cayendo en esta ruta
(ahora con aviso a Karina, pero sin resolverse solos).

## Actualización 15-oct-2026 — grupos que requieren varias unidades
Resuelto en parte: instrucción 6c del prompt (commit 2bef042, versión 75 del bot). Los grupos que
no caben en ninguna unidad se derivan de inmediato con resumen. Pruebas A1-A5 aprobadas.

## Incidente abierto: el bot ofrece unidades ocupadas al explorar disponibilidad (15-oct-2026)
Síntoma: en pruebas para el 20-22 de noviembre, 6 de 10 unidades ofrecidas estaban ocupadas según
la base de datos (Dep. 2, Lupino, Ciruelillo, Tiny House Ñirre). En 2 casos el bot ofreció una
unidad que el sistema acababa de verificar como ocupada.
Sin riesgo de doble reserva: ##RESERVA_LISTA## revalida. Daño: credibilidad.
Causa: sin confirmar. Hipótesis: el modelo calcula mal superposiciones de fechas sobre el bloque
DISPONIBILIDAD ACTUAL.
Solución propuesta: calcular disponibilidad por rango en el servidor y quitar el bloque del prompt
(también reduce latencia). Requiere staging y pruebas.

## Resuelto 15-oct-2026 — el bot ofrecía unidades ocupadas (caminos con marcador)
Fix: commit b9e287b (el servidor consulta la base y filtra unidades ocupadas en ##LISTAR_PRECIOS##,
##VERIFICAR_DISPONIBILIDAD## y ##COTIZAR##) y commit fd31c96 (se quitó una nota que hacía que el
modelo emitiera un marcador crudo y derivara a humano). Versión 78 del bot.
Verificado en conversaciones nuevas contra la base de datos: 0 unidades ocupadas ofrecidas.
Pendiente: el camino de texto directo (sin marcador) no está cubierto; medir con el script de
evaluación y evaluar sacar el bloque DISPONIBILIDAD ACTUAL del prompt. También pendiente: fechas en
formato técnico en el mensaje de ##COTIZAR## ocupada, y reforzar las notas de segunda llamada para
que prohíban todos los marcadores.
Lección: probar siempre en una conversación nueva; el modelo copia respuestas del historial.
// ─── ChatBot Behavior Configuration ──────────────────────────────────────────
// All the "personality" knobs for the custom chat widget.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 'closed' — bot only answers predefined topics; off-topic messages are
 *            redirected to quick replies and/or WhatsApp.
 * 'open'   — bot attempts keyword matching then falls back to generic WA CTA.
 */
export const CHAT_MODE = 'closed'

/** Minimum typing delay before each bot response (ms). */
export const BOT_MIN_DELAY_MS = 700

/** Maximum typing delay before each bot response (ms). */
export const BOT_MAX_DELAY_MS = 1800

/** Max quick-reply chips shown before "Ver más temas" button appears. */
export const MAX_QUICK_REPLIES = 3

/**
 * Tone openers prepended before FAQ answers.
 * One is picked at random on each reply.
 */
export const BOT_TONE_VARIANTS = [
    '¡Perfecto! Te cuento:',
    'Mira, te explico:',
    'Buena pregunta, esto es lo principal:',
    'Claro, te detallo:',
    '¡Con gusto! Aquí va:',
]

/**
 * Tone closers used after an FAQ answer that has no specific follow-up.
 * All in español neutral/chileno — sin voseo.
 */
export const BOT_FOLLOWUP_VARIANTS = [
    '¿En qué más te puedo ayudar?',
    '¿Hay algo más que quieras saber?',
    '¿Tienes alguna otra consulta?',
]

/** Keywords that trigger WhatsApp derivation (case-insensitive). */
export const WHATSAPP_TRIGGER_KEYWORDS = [
    'precio', 'valor', 'tarifa', 'costo', 'cuánto', 'cuanto',
    'disponib', 'fecha', 'reservar', 'reserva', 'cotizar', 'cotizacion',
    'abonar', 'pagar', 'seña', 'deposito', 'depósito',
]

/**
 * All keywords that correspond to a known FAQ topic.
 * In CLOSED mode, any user message that does NOT match one of these (or a
 * WHATSAPP_TRIGGER_KEYWORD) is considered off-topic and gets the redirect response.
 */
export const ALLOWED_KEYWORDS = [
    // checkin
    'check-in', 'checkin', 'check in', 'llegada', 'llegadas',
    'check-out', 'checkout', 'check out', 'salida', 'salidas', 'horario',
    // ubicacion
    'ubicacion', 'ubicación', 'direccion', 'dirección', 'llegar', 'como llego', 'donde', 'mapa',
    'terminal', 'bus', 'aeropuerto',
    // estacionamiento
    'estacionamiento', 'estacionar', 'auto', 'parking', 'vehiculo', 'vehículo',
    // mascotas
    'mascota', 'mascotas', 'perro', 'gato', 'animal',
    // fumadores
    'fumar', 'fumadores', 'cigarro', 'cigarrillo', 'tabaco', 'humo',
    // cancelacion
    'cancelar', 'cancelacion', 'cancelación', 'reembolso', 'politica', 'política',
    // torres
    'torres', 'paine', 'parque', 'patagonia',
    // tours
    'tour', 'tours', 'excursion', 'excursión', 'paseo', 'trekking', 'kayak',
    'milodon', 'milodón', 'balmaceda', 'serrano', 'dorotea', 'costanera', 'pesca',
    // wifi / amenidades
    'wifi', 'internet', 'cocina', 'calefaccion', 'calefacción', 'amenidad', 'servicio',
    'television', 'televisión', 'cama', 'ropa', 'toalla',
]

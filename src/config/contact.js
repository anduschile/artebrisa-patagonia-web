// ─── WhatsApp & Contact Config ───────────────────────────────
// El número debe estar en formato internacional SIN "+", sin espacios ni guiones.
// Chile: 569XXXXXXXX  → país (56) + 9 (móvil) + 8 dígitos del número.
//
// Cómo cambiar el número:
//   1. Edita WHATSAPP_NUMBER aquí (o setea la variable VITE_WHATSAPP en .env)
//   2. Guarda. El cambio aplica a TODA la web automáticamente.
//
// Cómo cambiar el mensaje por defecto:
//   1. Edita DEFAULT_WA_MESSAGE aquí.

export const WHATSAPP_NUMBER =
    import.meta.env.VITE_WHATSAPP || '56950921745'

export const DEFAULT_WA_MESSAGE =
    'Hola! Quisiera consultar disponibilidad y valores. 😊'

/**
 * Construye una URL wa.me segura.
 * @param {string} [msg]  Texto opcional (raw, sin encode).
 * @returns {string}  URL lista para usar en href o window.open.
 */
export function buildWaUrl(msg = DEFAULT_WA_MESSAGE) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

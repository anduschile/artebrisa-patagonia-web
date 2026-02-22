// ─── Chat Widget Configuration ────────────────────────────────────────────────
// Swap CHAT_PROVIDER to 'tawk' or 'crisp' to use a third-party SaaS widget.
// When CHAT_PROVIDER = 'custom', the built-in ChatWidget component is used —
// no external account, no API key, full control over design and FAQ flow.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 'custom' → use the built-in ChatWidget.jsx (default, no setup required)
 * 'tawk'   → inject Tawk.to script (set TAWK_PROPERTY_ID + TAWK_WIDGET_ID)
 * 'crisp'  → inject Crisp script (set CRISP_WEBSITE_ID)
 */
export const CHAT_PROVIDER = 'custom'

/** Set to false to completely hide the chat bubble site-wide. */
export const CHAT_ENABLED = true

// ── Tawk.to (only used when CHAT_PROVIDER = 'tawk') ──────────────────────────
// Get these values from https://dashboard.tawk.to → Settings → Chat Widget
export const TAWK_PROPERTY_ID = 'REPLACE_WITH_TAWK_PROPERTY_ID'
export const TAWK_WIDGET_ID = '1default'

// ── Crisp (only used when CHAT_PROVIDER = 'crisp') ───────────────────────────
// Get this value from https://app.crisp.chat → Settings → Website Settings
export const CRISP_WEBSITE_ID = 'REPLACE_WITH_CRISP_WEBSITE_ID'

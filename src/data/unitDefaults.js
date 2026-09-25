/**
 * unitDefaults.js
 * Datos estáticos de servicios, políticas y precios por temporada.
 * No requiere cambios en Supabase; se fusionan en UnitDetailPage.
 */

// ─── Servicios por tipo de unidad ────────────────────────────
// Solo íconos — el label de cada uno vive en i18n
// (namespace "unitServices.<type>.<icon>"), consultado por los
// consumidores (UnitDetailPage, UnitCard, Cabanas/DepartamentosPage).
export const SERVICES_BY_TYPE = {
    cabana: [
        { icon: 'wifi' },
        { icon: 'kitchen' },
        { icon: 'heat' },
        { icon: 'parking' },
        { icon: 'tv' },
        { icon: 'washer' },
        { icon: 'bed' },
        { icon: 'bbq' },
    ],
    departamento: [
        { icon: 'wifi' },
        { icon: 'kitchen' },
        { icon: 'heat' },
        { icon: 'tv' },
        { icon: 'location' },
        { icon: 'bed' },
        { icon: 'towel' },
    ],
}

// Las políticas (check-in/out, cancelación, mascotas, niños, mínimo) viven
// en i18n (namespace "unitPolicies"), consultado directo por
// UnitDetailPage.jsx — no queda export acá porque no hay valores que no
// dependan del idioma.

// ─── Precios por temporada y código de unidad ─────────────────
// Valores en CLP. Fuente: artebrisapatagonia.com
export const PRICES_BY_CODE = {
    // Cabañas
    'CAB-CIRUELILLO': { alta: 115000, media: 115000, baja: 115000 },
    'CAB-LUPINO': { alta: 90000, media: 90000, baja: 90000 },
    'CAB-CHILCO': { alta: 90000, media: 90000, baja: 90000 },
    'CAB-FLOR-DE-NOTRO': { alta: 90000, media: 90000, baja: 90000 },
    'TINY-CALAFATE': { alta: 70000, media: 70000, baja: 70000 },
    'TINY-MARGARITA': { alta: 70000, media: 70000, baja: 70000 },
    'TINY-NIRRE': { alta: 70000, media: 70000, baja: 70000 },
    'TINY-VIOLETA': { alta: 70000, media: 70000, baja: 70000 },

    // Departamentos
    'DEP-1': { alta: 70000, media: 70000, baja: 70000 },
    'DEP-2': { alta: 50000, media: 50000, baja: 50000 },
    'DEP-3': { alta: 60000, media: 60000, baja: 60000 },
    'DEP-4': { alta: 70000, media: 70000, baja: 70000 },
}

// Helper: format CLP
export function formatCLP(value) {
    if (value == null) return '—'
    return `$${Number(value).toLocaleString('es-CL')}`
}

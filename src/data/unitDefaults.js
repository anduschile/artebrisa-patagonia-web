/**
 * unitDefaults.js
 * Datos estáticos de servicios, políticas y precios por temporada.
 * No requiere cambios en Supabase; se fusionan en UnitDetailPage.
 */

// ─── Servicios por tipo de unidad ────────────────────────────
export const SERVICES_BY_TYPE = {
    cabana: [
        { icon: 'wifi', label: 'Wi-Fi gratuito' },
        { icon: 'kitchen', label: 'Cocina equipada' },
        { icon: 'heat', label: 'Calefacción leña/eléctrica' },
        { icon: 'parking', label: 'Estacionamiento' },
        { icon: 'tv', label: 'TV cable/streaming' },
        { icon: 'washer', label: 'Lavadora' },
        { icon: 'bed', label: 'Ropa de cama' },
        { icon: 'bbq', label: 'Parrilla / fogón' },
    ],
    departamento: [
        { icon: 'wifi', label: 'Wi-Fi gratuito' },
        { icon: 'kitchen', label: 'Cocina equipada' },
        { icon: 'heat', label: 'Calefacción eléctrica' },
        { icon: 'tv', label: 'TV cable/streaming' },
        { icon: 'location', label: 'Ubicación céntrica' },
        { icon: 'bed', label: 'Ropa de cama' },
        { icon: 'towel', label: 'Toallas incluidas' },
    ],
}

// ─── Políticas globales ───────────────────────────────────────
export const POLICIES = {
    check_in: '14:00 hs',
    check_out: '11:00 hs',
    cancelacion: 'Cancelación gratuita hasta 48 horas antes del check-in',
    mascotas: 'Consultar disponibilidad',
    ninos: 'Aceptamos niños',
    minimo: '2 noches mínimo en temporada alta',
}

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

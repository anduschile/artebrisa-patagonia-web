/**
 * Mapping local de imágenes por código de unidad.
 * Rutas relativas a /public/images/ (deploy estático).
 *
 * Prioridad en getUnitImage:
 *   1. unit.imagen_url  (si la BD lo provee)
 *   2. unitImages[unit.code]
 *   3. fallback por unit_type
 */
export const unitImages = {
    // ── Cabañas ─────────────────────────────────────────────
    'CAB-CIRUELILLO': '/images/cabanas/ciruelillo/1.jpg',
    'CAB-LUPINO': '/images/cabanas/lupino/1.jpg',
    'CAB-CHILCO': '/images/cabanas/chilco/1.jpg',
    'CAB-FLOR-DE-NOTRO': '/images/cabanas/flor-de-notro/1.jpg',
    'TINY-CALAFATE': '/images/cabanas/tiny-calafate/1.jpg',
    'TINY-MARGARITA': '/images/cabanas/tiny-margarita/1.jpg',
    'TINY-NIRRE': '/images/cabanas/tiny-nirre/1.jpg',
    'TINY-VIOLETA': '/images/cabanas/tiny-violeta/1.jpg',

    // Departamentos (orden corregido)
    "DEP-3": "/images/departamentos/matrimonial/1.jpg",
    "DEP-2": "/images/departamentos/cuadruple-familiar/1.jpg",
    "DEP-4": "/images/departamentos/triple/1.jpg",
    "DEP-1": "/images/departamentos/cuadruple/1.jpg",
}

/** Fallback si no hay mapeo ni imagen_url en BD */
export const FALLBACK_IMAGE_CABANA = '/images/common/hero_cabanasa_artebrisa.png'
export const FALLBACK_IMAGE_DEPTO = '/images/common/hero_departamentos_patagonia.png'

/**
 * Devuelve la URL de imagen para una unidad.
 * Prioridad: BD (imagen_url) → mapping local (code) → fallback por tipo
 *
 * @param {object} unit  — fila de core_units
 * @returns {string}     — URL pública de la imagen
 */
export function getUnitImage(unit) {
    if (unit.imagen_url) return unit.imagen_url
    if (unit.code && unitImages[unit.code]) return unitImages[unit.code]
    return unit.unit_type === 'cabana' ? FALLBACK_IMAGE_CABANA : FALLBACK_IMAGE_DEPTO
}

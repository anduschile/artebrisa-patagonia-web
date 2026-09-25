/**
 * Título y meta description por página y por idioma.
 *
 * IMPORTANTE: 'en' y 'de' están en español a propósito por ahora — es
 * contenido placeholder mientras no se hace la traducción real (fase
 * posterior). Lo que sí es real ya es la infraestructura: cada página
 * recibe su propio <title>/<meta description> en vez del genérico
 * compartido de index.html, y cada idioma tiene su propia entrada acá
 * lista para traducirse sin tocar el mecanismo de head dinámico.
 */
export const SITE_URL = 'https://artebrisapatagonia.com'

const ES = {
    home: {
        title: 'Arte Brisa Patagonia — Cabañas y Departamentos en Puerto Natales',
        description: 'Cabañas con vista a la cordillera y departamentos en el centro de Puerto Natales. Reserva tu estadía en la Patagonia con Arte Brisa.',
    },
    cabanas: {
        title: 'Cabañas en Puerto Natales — Arte Brisa Patagonia',
        description: 'Cabañas familiares con vista a la cordillera, a minutos del centro de Puerto Natales. Wifi, cocina equipada y calefacción incluidos.',
    },
    departamentos: {
        title: 'Departamentos en el centro de Puerto Natales — Arte Brisa Patagonia',
        description: 'Departamentos totalmente equipados en pleno centro de Puerto Natales, a pasos de todo. Ideal para estadías cortas y largas.',
    },
}

// TODO(i18n-fase-2): traducir estos títulos/descripciones al inglés real.
const EN = ES

// TODO(i18n-fase-2): traducir estos títulos/descripciones al alemán real.
const DE = ES

export const PAGE_META = { es: ES, en: EN, de: DE }

/** Título/description para /unidad/:slug — dinámico según los datos de la unidad. */
export function unitPageMeta(unit) {
    const typeLabel = unit.unit_type === 'cabana' ? 'Cabaña' : 'Departamento'
    const name = unit.name || `${typeLabel} ${unit.code}`
    const description = unit.description?.trim()
        ? unit.description.trim().slice(0, 155)
        : `${name} en Arte Brisa Patagonia, Puerto Natales. Consulta disponibilidad y reserva directo.`
    return {
        title: `${name} — Arte Brisa Patagonia`,
        description,
    }
}

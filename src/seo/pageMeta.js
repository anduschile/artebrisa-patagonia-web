/**
 * Título y meta description por página y por idioma.
 *
 * 'en', 'de' y 'pt' tienen traducción real. Cada página recibe su propio
 * <title>/<meta description> en vez del genérico compartido de index.html.
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

const EN = {
    home: {
        title: 'Arte Brisa Patagonia — Cabins and Apartments in Puerto Natales',
        description: 'Cabins with mountain views and fully equipped apartments in downtown Puerto Natales. Book your stay in Patagonia with Arte Brisa.',
    },
    cabanas: {
        title: 'Cabins in Puerto Natales — Arte Brisa Patagonia',
        description: 'Cabins and tiny houses in Puerto Natales, Patagonia. Mountain views, fully equipped, free Wi-Fi and heating. Book direct, no fees.',
    },
    departamentos: {
        title: 'Apartments in Downtown Puerto Natales — Arte Brisa Patagonia',
        description: 'Fully equipped apartments right in downtown Puerto Natales, steps from everything. Ideal for short and long stays.',
    },
}

const DE = {
    home: {
        title: 'Arte Brisa Patagonia — Hütten und Apartments in Puerto Natales',
        description: 'Hütten mit Bergblick und voll ausgestattete Apartments im Zentrum von Puerto Natales. Buchen Sie Ihren Aufenthalt in Patagonien bei Arte Brisa.',
    },
    cabanas: {
        title: 'Hütten in Puerto Natales — Arte Brisa Patagonia',
        description: 'Familienfreundliche Hütten mit Bergblick, nur wenige Minuten vom Zentrum von Puerto Natales. WLAN, voll ausgestattete Küche und Heizung inklusive.',
    },
    departamentos: {
        title: 'Apartments im Zentrum von Puerto Natales — Arte Brisa Patagonia',
        description: 'Voll ausgestattete Apartments mitten in Puerto Natales, alles in Laufweite. Ideal für kurze und lange Aufenthalte.',
    },
}

const PT = {
    home: {
        title: 'Arte Brisa Patagonia — Cabanas e Apartamentos em Puerto Natales',
        description: 'Cabanas com vista para as montanhas e apartamentos totalmente equipados no centro de Puerto Natales. Reserve sua estadia na Patagônia com a Arte Brisa.',
    },
    cabanas: {
        title: 'Cabanas em Puerto Natales — Arte Brisa Patagonia',
        description: 'Cabanas para toda a família com vista para as montanhas, a poucos minutos do centro de Puerto Natales. Wi-Fi, cozinha equipada e aquecimento incluídos.',
    },
    departamentos: {
        title: 'Apartamentos no centro de Puerto Natales — Arte Brisa Patagonia',
        description: 'Apartamentos totalmente equipados no coração de Puerto Natales, a poucos passos de tudo. Ideais para estadias curtas e longas.',
    },
}

export const PAGE_META = { es: ES, en: EN, de: DE, pt: PT }

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

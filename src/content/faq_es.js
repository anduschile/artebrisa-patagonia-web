// ─── FAQ Content — es-CL ──────────────────────────────────────────────────────
// Used by ChatWidget.jsx for the built-in FAQ flow.
// Each entry has: id, label (short, for quick-reply buttons), answer (string or array of strings).
// ─────────────────────────────────────────────────────────────────────────────

export const FAQ_CATEGORIES = [
    {
        id: 'checkin',
        icon: '🕐',
        label: 'Check-in / Check-out',
        answer: [
            'El **check-in** es a partir de las **15:00 hrs**.',
            'El **check-out** es hasta las **11:00 hrs**.',
            'Si llegas antes o sales después, avísanos por WhatsApp y lo coordinamos según disponibilidad.',
        ],
    },
    {
        id: 'ubicacion',
        icon: '📍',
        label: 'Ubicación y llegada',
        answer: [
            '**Arte Brisa Patagonia** está en **Puerto Natales**, Magallanes, Chile.',
            'Estamos a pasos de la costanera y a 15 minutos de la Terminal de Buses.',
            'Al confirmar reserva te enviamos dirección exacta y accesos por WhatsApp.',
        ],
    },
    {
        id: 'estacionamiento',
        icon: '🚗',
        label: 'Estacionamiento',
        answer: [
            'Contamos con **estacionamiento gratuito** disponible para huéspedes.',
            'Consultanos disponibilidad al reservar para asignarte un espacio.',
        ],
    },
    {
        id: 'mascotas',
        icon: '🐾',
        label: 'Mascotas',
        answer: [
            'Algunas de nuestras cabañas **aceptan mascotas**.',
            'Consultanos antes de reservar indicando especie y tamaño de tu mascota.',
            'Los departamentos por el momento **no admiten mascotas**.',
        ],
    },
    {
        id: 'fumadores',
        icon: '🚭',
        label: 'Política de fumadores',
        answer: [
            'Nuestras instalaciones son **100 % libres de humo** en interiores.',
            'Hay áreas exteriores habilitadas para fumadores.',
        ],
    },
    {
        id: 'cancelacion',
        icon: '📋',
        label: 'Cancelación y políticas',
        answer: [
            'Aceptamos cancelaciones con **al menos 48 hrs de anticipación** sin cargo.',
            'Cancelaciones dentro de las 48 hrs pueden tener retención de una noche.',
            'Para condiciones exactas consultanos por WhatsApp al momento de reservar.',
        ],
    },
    {
        id: 'torres',
        icon: '⛰️',
        label: 'Torres del Paine',
        answer: [
            '**Torres del Paine** es a ~115 km de Puerto Natales (aprox. 1:45 hs).',
            'Se puede visitar en excursión de día completo o alojando dentro del parque.',
            'Recomendamos reservar traslado o entrada con anticipación (alta demanda en temporada).',
            'Podemos orientarte con operadores locales — consultanos por WhatsApp.',
        ],
    },
    {
        id: 'tours',
        icon: '🗺️',
        label: 'Tours y excursiones',
        answer: [
            '**Recomendaciones desde Puerto Natales:**',
            '• ⛰️ Torres del Paine — icónico parque nacional',
            '• 🦣 Cueva del Milodón — monumento natural a 24 km',
            '• 🚢 Glaciar Balmaceda y Serrano — navegación por fiordos',
            '• 🌊 Costanera de Puerto Natales — paseo al atardecer',
            '• 🏔️ Sendero Mirador Dorotea — trekking con vista al seno de Última Esperanza',
            '• 🛶 Kayak en Seno Última Esperanza',
            '• 🎣 Pesca deportiva en ríos y lagos locales',
            '• 🍷 Gastronomía patagónica — restaurantes de centolla y cordero',
            'Consultanos para recomendarte operadores de confianza.',
        ],
    },
    {
        id: 'wifi',
        icon: '📶',
        label: 'WiFi y amenidades',
        answer: [
            'Todas las unidades incluyen **WiFi gratuito**.',
            'Las cabañas cuentan con cocina equipada, calefacción y ropa de cama.',
            'Los departamentos incluyen cocina americana, calefacción y todos los servicios básicos.',
        ],
    },
]

/** Quick-reply shortcuts shown before the user selects a topic. */
export const QUICK_REPLIES = [
    { id: 'disponibilidad', label: '📅 Disponibilidad', whatsapp: true, waMsg: 'Hola! Quisiera consultar disponibilidad. 😊' },
    { id: 'precios', label: '💰 Precios', whatsapp: true, waMsg: 'Hola! Quisiera consultar precios y tarifas. 😊' },
    { id: 'checkin', label: '🕐 Check-in/out', faqId: 'checkin' },
    { id: 'ubicacion', label: '📍 Ubicación', faqId: 'ubicacion' },
    { id: 'tours', label: '🗺️ Tours', faqId: 'tours' },
]

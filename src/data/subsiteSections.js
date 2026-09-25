// ─── Contact info ────────────────────────────────────────────
// phone/telHref/email/whatsapp NO se traducen (datos de contacto, no
// contenido lingüístico). hours/hoursNote se movieron a i18n
// (namespace "contact"), único consumidor era ContactSection.jsx.
export const CONTACT = {
    phone: '+56 9 5092 1745',
    telHref: 'tel:+56950921745',
    email: 'reservasartebrisa@gmail.com',
    whatsapp: '56950921745',
}

// ─── Location data by variant ─────────────────────────────────
// address/shortAddress/mapsUrl/lat/lng NO se traducen — son direcciones
// físicas (nombres de calle, coordenadas), no contenido lingüístico. El
// resto de los textos vive en el diccionario i18n (namespace "location"),
// consultado directamente por variant en LocationSection.jsx.
export const LOCATIONS = {
    cabana: {
        address: 'Huertos Familiares - Clodomiro Rosas (CAMINO 2) 164 D, Camino 2, Puerto Natales, Chile',
        shortAddress: 'Clodomiro Rosas 164 D, Puerto Natales',
        mapsUrl: 'https://maps.app.goo.gl/gBeKvzMKfSmvTrHK6',
        // coords exactas
        lat: -51.705227,
        lng: -72.472337,
    },
    departamento: {
        address: 'Guacolda 1615, Puerto Natales, Magallanes y la Antártica Chilena, Chile',
        shortAddress: 'Guacolda 1615, Puerto Natales',
        mapsUrl: 'https://maps.app.goo.gl/LUBzsLtxDqS3jNo16',
        // coords exactas
        lat: -51.7358056,
        lng: -72.4885278,
    },
}

// ─── Services ────────────────────────────────────────────────
// Solo íconos + orden — título/descripción de cada uno viven en el
// diccionario i18n (namespace "services.items.<variant>.<icon>").
export const SERVICES = {
    cabana: ['wifi', 'heat', 'kitchen', 'parking', 'tv', 'bed', 'host', 'view'],
    departamento: ['wifi', 'heat', 'kitchen', 'location', 'tv', 'bed', 'host', 'key'],
}

// ─── Seasons ─────────────────────────────────────────────────
export const SEASONS = [
    { name: 'Temporada Alta', period: 'Diciembre – Febrero', desc: 'Verano patagónico, clima ideal para explorar' },
    { name: 'Temporada Media', period: 'Mar–May / Sep–Nov + Semana Santa', desc: 'Clima agradable, menos turistas' },
    { name: 'Temporada Baja', period: 'Junio – Agosto', desc: 'Invierno patagónico, paisajes nevados' },
]

// Solo claves — el texto vive en i18n (namespace "rates.included.<key>").
export const INCLUDED = ['wifi', 'heating', 'linens', 'kitchen', 'parking', 'tv', 'cleaning', 'hostAttention']

// *estacionamiento solo en cabañas — en deptos se reemplaza por ubicación céntrica
export const INCLUDED_DEPTO = INCLUDED.map(k => k === 'parking' ? 'location' : k)

// ─── FAQ ─────────────────────────────────────────────────────
// Solo claves — las preguntas/respuestas viven en i18n (namespace "faq").
// FAQ_COMMON_KEYS se muestran en ambas variantes; cada variant array trae
// además sus preguntas propias (se muestran primero, mismo orden que antes).
export const FAQ_COMMON_KEYS = [
    'checkinCheckout', 'cancellation', 'payment', 'breakfast',
    'distanceTorres', 'supermarkets', 'airportTransfer',
]

export const FAQS = {
    cabana: ['pets', 'parking', 'heating', 'kitchen', 'wifi'],
    departamento: ['pets', 'kitchen', 'wifi', 'parking', 'access24'],
}

// ─── Nearby places ───────────────────────────────────────────
// distance (km) es universal, no se traduce. name/time viven en i18n
// (namespace "location.nearby.<key>").
export const NEARBY = [
    { key: 'plaza', distance: '2 km' },
    { key: 'costanera', distance: '1,5 km' },
    { key: 'terminal', distance: '3 km' },
    { key: 'supermercados', distance: '1 km' },
    { key: 'restaurantes', distance: '1,5 km' },
    { key: 'torresDelPaine', distance: '112 km' },
]

// ─── Gallery image folders (one per unit type) ───────────────
export const GALLERY = {
    cabana: [
        '/images/cabanas/triple-familiar/1.jpg',
        '/images/cabanas/triple-familiar/2.jpg',
        '/images/cabanas/triple-familiar/3.jpg',
        '/images/cabanas/doble-pareja/1.jpg',
        '/images/cabanas/doble-pareja/2.jpg',
        '/images/cabanas/doble-pareja/3.jpg',
        '/images/common/hero_cabanasa_artebrisa.png',
    ],
    departamento: [
        '/images/departamentos/doble-vista-lago/1.jpg',
        '/images/departamentos/doble-vista-lago/2.jpg',
        '/images/departamentos/cuadruple-familiar/1.jpg',
        '/images/departamentos/cuadruple-familiar/2.jpg',
        '/images/departamentos/twin/1.jpg',
        '/images/departamentos/twin/2.jpg',
        '/images/common/hero_departamentos_patagonia.png',
    ],
}

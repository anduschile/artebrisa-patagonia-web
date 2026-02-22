// ─── Contact info ────────────────────────────────────────────
export const CONTACT = {
    phone: '+56 9 5092 1745',
    telHref: 'tel:+56950921745',
    email: 'reservasartebrisa@gmail.com',
    whatsapp: '56950921745',
    hours: 'Lunes a Domingo: 9:00 – 21:00 hrs',
    hoursNote: 'Respondemos consultas por WhatsApp 24/7',
}

// ─── Location data by variant ─────────────────────────────────
export const LOCATIONS = {
    cabana: {
        address: 'Huertos Familiares - Clodomiro Rosas (CAMINO 2) 164 D, Camino 2, Puerto Natales, Chile',
        shortAddress: 'Clodomiro Rosas 164 D, Puerto Natales',
        mapsUrl: 'https://maps.app.goo.gl/gBeKvzMKfSmvTrHK6',
        // coords exactas
        lat: -51.705227,
        lng: -72.472337,
        howToGet: 'Desde el centro de Puerto Natales, toma la ruta Sur, hacia el sector de Huertos Familiares. Nuestras cabañas están claramente señalizadas.',
        airportNote: 'Aeropuerto Teniente Julio Gallardo (Puerto Natales): 15 min en auto.\nAeropuerto Presidente Carlos Ibáñez (Punta Arenas): ~3 hs en auto.',
    },
    departamento: {
        address: 'Guacolda 1615, Puerto Natales, Magallanes y la Antártica Chilena, Chile',
        shortAddress: 'Guacolda 1615, Puerto Natales',
        mapsUrl: 'https://maps.app.goo.gl/LUBzsLtxDqS3jNo16',
        // coords exactas
        lat: -51.7358056,
        lng: -72.4885278,
        howToGet: 'Fácilmente accesibles a pie desde el terminal de buses y desde los principales puntos de la ciudad.',
        airportNote: 'Aeropuerto Teniente Julio Gallardo (Puerto Natales): 10 min en auto.\nAeropuerto Presidente Carlos Ibáñez (Punta Arenas): ~3 hs en auto.',
    },
}

// ─── Services ────────────────────────────────────────────────
export const SERVICES = {
    cabana: [
        { icon: 'wifi', title: 'Wi-Fi Gratuito', desc: 'Internet de alta velocidad en todas las cabañas' },
        { icon: 'heat', title: 'Calefacción Eficiente', desc: 'Sistema de calefacción para tu comodidad en invierno' },
        { icon: 'kitchen', title: 'Cocina Equipada', desc: 'Cocina completa con utensilios y electrodomésticos' },
        { icon: 'parking', title: 'Estacionamiento', desc: 'Espacio privado de estacionamiento incluido' },
        { icon: 'tv', title: 'TV Cable', desc: 'Televisión con canales por cable' },
        { icon: 'bed', title: 'Ropa de Cama', desc: 'Sábanas, frazadas y toallas incluidas' },
        { icon: 'host', title: 'Atención Personalizada', desc: 'Dueños en el lugar para ayudarte toda tu estadía' },
        { icon: 'view', title: 'Vista Panorámica', desc: 'Vistas espectaculares de la cordillera patagónica' },
    ],
    departamento: [
        { icon: 'wifi', title: 'Wi-Fi Gratuito', desc: 'Internet de alta velocidad en todos los deptos' },
        { icon: 'heat', title: 'Calefacción', desc: 'Sistema de calefacción para el clima patagónico' },
        { icon: 'kitchen', title: 'Cocina Equipada', desc: 'Cocina completa con utensilios y electrodomésticos' },
        { icon: 'location', title: 'Ubicación Céntrica', desc: 'A pasos del centro de Puerto Natales' },
        { icon: 'tv', title: 'TV Cable', desc: 'Televisión con canales por cable' },
        { icon: 'bed', title: 'Ropa de Cama', desc: 'Sábanas, frazadas y toallas incluidas' },
        { icon: 'host', title: 'Atención Personalizada', desc: 'Atención directa de los dueños' },
        { icon: 'key', title: 'Acceso 24 horas', desc: 'Ingresa y sal a cualquier hora' },
    ],
}

// ─── Seasons ─────────────────────────────────────────────────
export const SEASONS = [
    { name: 'Temporada Alta', period: 'Diciembre – Febrero', desc: 'Verano patagónico, clima ideal para explorar' },
    { name: 'Temporada Media', period: 'Mar–May / Sep–Nov + Semana Santa', desc: 'Clima agradable, menos turistas' },
    { name: 'Temporada Baja', period: 'Junio – Agosto', desc: 'Invierno patagónico, paisajes nevados' },
]

export const INCLUDED = [
    'Wi-Fi gratuito', 'Calefacción', 'Ropa de cama y toallas',
    'Cocina equipada', 'Estacionamiento privado*', 'TV por cable',
    'Limpieza final', 'Atención personalizada',
]

// *estacionamiento solo en cabañas
export const INCLUDED_DEPTO = INCLUDED.map(s => s === 'Estacionamiento privado*' ? 'Ubicación céntrica' : s)

// ─── FAQ ─────────────────────────────────────────────────────
const FAQ_COMMON = [
    {
        q: '¿Cuál es el horario de check-in y check-out?',
        a: 'El check-in es a partir de las 14:00 hrs y el check-out hasta las 11:00 hrs. Contacta con anticipación si necesitas horarios especiales.'
    },
    {
        q: '¿Cuál es la política de cancelación?',
        a: 'Cancelación gratuita hasta 48 horas antes de la llegada. Cancelaciones posteriores tienen un cargo del 50% de la primera noche.'
    },
    {
        q: '¿Qué formas de pago aceptan?',
        a: 'Efectivo, transferencias bancarias y tarjetas de crédito/débito. También puedes reservar a través de Booking.com.'
    },
    {
        q: '¿El desayuno está incluido?',
        a: 'No, las tarifas no incluyen desayuno. La cocina equipada te permite preparar tus alimentos; en los alrededores hay cafeterías y panaderías.'
    },
    {
        q: '¿Qué tan lejos están de Torres del Paine?',
        a: 'Estamos a aprox. 112 km (1,5 horas en auto) de la entrada del Parque Nacional Torres del Paine.'
    },
    {
        q: '¿Hay supermercados cerca?',
        a: 'Sí, hay supermercados a menos de 1 km de distancia, a solo 2 minutos en auto.'
    },
    {
        q: '¿Ofrecen traslado desde el aeropuerto?',
        a: 'Podemos coordinar traslados desde el aeropuerto con cargo adicional. Contáctanos para más información.'
    },
]

export const FAQS = {
    cabana: [
        {
            q: '¿Aceptan mascotas?',
            a: 'Sí, aceptamos mascotas pequeñas en algunas cabañas con un cargo adicional. Por favor, infórmanos al momento de reservar.'
        },
        {
            q: '¿Hay estacionamiento?',
            a: 'Sí, todas las cabañas incluyen estacionamiento privado gratuito.'
        },
        {
            q: '¿Las cabañas tienen calefacción?',
            a: 'Todas nuestras cabañas cuentan con sistemas de calefacción eficientes para garantizar tu comodidad durante todo el año.'
        },
        {
            q: '¿Las cabañas tienen cocina equipada?',
            a: 'Sí, todas cuentan con cocina completa: utensilios, refrigerador, cocina y microondas.'
        },
        {
            q: '¿Hay Wi-Fi disponible?',
            a: 'Sí, ofrecemos Wi-Fi gratuito de alta velocidad en todas nuestras cabañas.'
        },
        ...FAQ_COMMON,
    ],
    departamento: [
        {
            q: '¿Aceptan mascotas?',
            a: 'Lamentablemente, no se admiten mascotas para garantizar un ambiente hipoalergénico para todos nuestros huéspedes.'
        },
        {
            q: '¿Los departamentos tienen cocina equipada?',
            a: 'Sí, todos cuentan con cocina completa: utensilios, refrigerador, cocina y microondas.'
        },
        {
            q: '¿Hay Wi-Fi disponible?',
            a: 'Sí, Wi-Fi gratuito de alta velocidad en todos los departamentos.'
        },
        {
            q: "¿Hay estacionamiento disponible?",
            a: "Sí, contamos con estacionamiento incluido para nuestros huéspedes."
        },
        {
            q: '¿El edificio tiene acceso 24 horas?',
            a: 'Sí, el acceso es libre las 24 horas.'
        },
        ...FAQ_COMMON,
    ],
}

// ─── Nearby places ───────────────────────────────────────────
export const NEARBY = [
    { name: 'Plaza de Armas', distance: '2 km', time: '5 min en auto' },
    { name: 'Costanera de Puerto Natales', distance: '1,5 km', time: '3 min en auto' },
    { name: 'Terminal de Buses', distance: '3 km', time: '7 min en auto' },
    { name: 'Supermercados', distance: '1 km', time: '2 min en auto' },
    { name: 'Restaurantes y cafeterías', distance: '1,5 km', time: '3 min en auto' },
    { name: 'Parque Nacional Torres del Paine', distance: '112 km', time: '1,5 hrs en auto' },
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

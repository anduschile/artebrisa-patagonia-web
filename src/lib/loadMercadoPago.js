// Carga el SDK de Mercado Pago solo cuando se necesita (widget de reserva /
// página de prueba), en vez de un <script> síncrono en index.html que
// retrasaba el arranque de React en todas las páginas. Mismo SDK, misma URL;
// solo cambia CUÁNDO se descarga.
const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2'
let pending = null

export function loadMercadoPago() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no-window'))
    if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
    if (pending) return pending
    pending = new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = MP_SDK_URL
        s.async = true
        s.onload = () => (window.MercadoPago ? resolve(window.MercadoPago) : (pending = null, reject(new Error('mp-missing'))))
        s.onerror = () => { pending = null; s.remove(); reject(new Error('mp-load-failed')) }
        document.head.appendChild(s)
    })
    return pending
}

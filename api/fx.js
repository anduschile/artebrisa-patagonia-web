// GET /api/fx → { rate, asOf, source } con CLP por 1 USD. Caché de CDN 1 h (+ 24 h si el
// proveedor falla). Si ningún proveedor entrega un dato válido responde 503 y el sitio
// muestra solo CLP. Solo informativo: nada de aquí interviene en el cobro.
import { getUsdClp } from './_fxCore.js'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ error: 'method_not_allowed' })
    }
    const fx = await getUsdClp()
    if (!fx) {
        res.setHeader('Cache-Control', 'no-store')
        return res.status(503).json({ error: 'fx_unavailable' })
    }
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(fx)
}

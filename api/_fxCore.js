// Obtiene el tipo de cambio CLP por 1 USD: proveedor principal y respaldo. Sin tasa fija.
import { validateFx } from '../src/data/fxRules.js'

const TIMEOUT_MS = 8000

async function getJson(url, fetchImpl) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    try {
        const r = await fetchImpl(url, { signal: ctl.signal, headers: { accept: 'application/json' } })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return await r.json()
    } finally {
        clearTimeout(timer)
    }
}

// Dólar observado, Banco Central de Chile (vía mindicador.cl).
async function fromMindicador(fetchImpl) {
    const j = await getJson('https://mindicador.cl/api/dolar', fetchImpl)
    const last = j?.serie?.[0]
    return { rate: last?.valor, asOf: String(last?.fecha || '').slice(0, 10), source: 'Dólar observado (Banco Central de Chile) vía mindicador.cl' }
}

// Respaldo: ExchangeRate-API (requiere atribución en sus términos).
async function fromErApi(fetchImpl) {
    const j = await getJson('https://open.er-api.com/v6/latest/USD', fetchImpl)
    const asOf = new Date((j?.time_last_update_unix || 0) * 1000).toISOString().slice(0, 10)
    return { rate: j?.rates?.CLP, asOf, source: 'ExchangeRate-API (open.er-api.com)' }
}

// El Banco Central vía mindicador.cl a veces tarda ~6 s; el respaldo responde en <1 s. Se consultan en
// paralelo: si el principal no llega dentro de PRIMARY_GRACE_MS de tener el respaldo, se usa el respaldo.
const PRIMARY_GRACE_MS = 1500

/** @returns {Promise<{rate:number, asOf:string, source:string} | null>} */
export async function getUsdClp({ fetchImpl = fetch, now = Date.now(), log = console.error, graceMs = PRIMARY_GRACE_MS } = {}) {
    const run = async provider => {
        try {
            const fx = validateFx(await provider(fetchImpl), now)
            if (!fx) log(`[fx] ${provider.name}: dato inválido o vencido`)
            return fx
        } catch (e) {
            log(`[fx] ${provider.name}: ${e.message}`)
            return null
        }
    }
    const primary = run(fromMindicador)
    const backup = await run(fromErApi)
    if (!backup) return primary
    const timeout = new Promise(r => setTimeout(() => r(null), graceMs))
    return (await Promise.race([primary, timeout])) ?? backup
}

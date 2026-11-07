// Tipo de cambio referencial USD/CLP desde /api/fx (servidor, con caché). Una consulta por visita.
// Si falla, está vencido o es absurdo, devuelve null y la interfaz muestra solo CLP.
import { useEffect, useState } from 'react'
import { validateFx } from './fxRules'

const KEY = 'ab_fx_v1'
const TTL_MS = 60 * 60 * 1000
let inflight = null

function readCache() {
    try {
        const c = JSON.parse(sessionStorage.getItem(KEY) || 'null')
        if (c && Date.now() - c.at < TTL_MS) return validateFx(c.fx)
    } catch { /* sin caché */ }
    return null
}

export function loadUsdRate() {
    const cached = readCache()
    if (cached) return Promise.resolve(cached)
    if (!inflight) {
        inflight = fetch('/api/fx', { headers: { accept: 'application/json' } })
            .then(r => (r.ok ? r.json() : null))
            .then(raw => {
                const fx = validateFx(raw)
                if (fx) { try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), fx })) } catch { /* noop */ } }
                return fx
            })
            .catch(() => null)
            .finally(() => { inflight = null })
    }
    return inflight
}

/** @returns {{rate:number, asOf:string, source:string} | null} */
export function useUsdRate() {
    const [fx, setFx] = useState(() => readCache())
    useEffect(() => {
        let alive = true
        if (!fx) loadUsdRate().then(v => { if (alive) setFx(v) })
        return () => { alive = false }
    }, [])
    return fx
}

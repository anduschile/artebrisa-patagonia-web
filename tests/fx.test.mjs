import test from 'node:test'
import assert from 'node:assert/strict'
import { toUsd } from '../src/data/stayQuote.js'
import { validateFx } from '../src/data/fxRules.js'
import { getUsdClp } from '../api/_fxCore.js'
import { approxUsd, formatUsdAmount, formatFxRate, formatFxDate, fxSourceLabel, USD_LANGS } from '../src/data/usdDisplay.js'

const NOW = Date.parse('2026-11-03T15:00:00Z')

test('USD: redondeo y entradas inválidas', () => {
    assert.equal(toUsd(510000, 993.22), 513)
    assert.equal(toUsd(70000, 993.22, 5), 70)
    assert.equal(toUsd(0, 993.22), null)
    assert.equal(toUsd(1000, null), null)
})

test('FX: acepta dato fresco; rechaza viejo, absurdo, sin fecha o futuro', () => {
    assert.ok(validateFx({ rate: 993.22, asOf: '2026-10-30', source: 'x' }, NOW))
    assert.equal(validateFx({ rate: 993.22, asOf: '2026-10-20' }, NOW), null)
    assert.equal(validateFx({ rate: 12, asOf: '2026-11-03' }, NOW), null)
    assert.equal(validateFx({ rate: 99999, asOf: '2026-11-03' }, NOW), null)
    assert.equal(validateFx({ rate: 993 }, NOW), null)
    assert.equal(validateFx({ rate: 993, asOf: '2026-12-25' }, NOW), null)
    assert.equal(validateFx(null, NOW), null)
})

const ok = body => async () => ({ ok: true, json: async () => body })
const MIND = { serie: [{ valor: 993.22, fecha: '2026-11-02T03:00:00.000Z' }] }
const ER = { time_last_update_unix: Date.parse('2026-11-03T00:00:00Z') / 1000, rates: { CLP: 950.5 } }
const route = (m, e) => async url => (url.includes('mindicador') ? m() : e())

test('proveedor principal responde → se usa', async () => {
    const fx = await getUsdClp({ now: NOW, log() {}, graceMs: 50, fetchImpl: route(ok(MIND), ok(ER)) })
    assert.equal(fx.rate, 993.22); assert.match(fx.source, /mindicador/)
})
test('principal caído → respaldo', async () => {
    const fx = await getUsdClp({ now: NOW, log() {}, fetchImpl: route(async () => { throw new Error('down') }, ok(ER)) })
    assert.equal(fx.rate, 950.5); assert.match(fx.source, /ExchangeRate/)
})
test('principal con dato vencido → respaldo', async () => {
    const old = { serie: [{ valor: 990, fecha: '2026-09-01T03:00:00.000Z' }] }
    const fx = await getUsdClp({ now: NOW, log() {}, fetchImpl: route(ok(old), ok(ER)) })
    assert.equal(fx.rate, 950.5)
})
test('ambos caídos → null (el sitio muestra solo CLP)', async () => {
    const down = async () => { throw new Error('down') }
    assert.equal(await getUsdClp({ now: NOW, log() {}, fetchImpl: route(down, down) }), null)
})

test('principal lento (más que la gracia) → se usa el respaldo sin esperarlo', async () => {
    const slow = () => new Promise(r => setTimeout(() => r({ ok: true, json: async () => MIND }), 300))
    const t0 = Date.now()
    const fx = await getUsdClp({ now: NOW, log() {}, graceMs: 50, fetchImpl: route(slow, ok(ER)) })
    assert.equal(fx.rate, 950.5); assert.ok(Date.now() - t0 < 250)
})
test('respaldo caído y principal lento pero válido → se espera al principal', async () => {
    const slow = () => new Promise(r => setTimeout(() => r({ ok: true, json: async () => MIND }), 100))
    const down = async () => { throw new Error('down') }
    const fx = await getUsdClp({ now: NOW, log() {}, graceMs: 20, fetchImpl: route(slow, down) })
    assert.equal(fx.rate, 993.22)
})

test('handler /api/fx: sin tasa confiable responde 503 sin caché; con tasa, 200 con caché de CDN; solo GET', async () => {
    const { default: handler } = await import('../api/fx.js')
    const mk = method => { const r = { h: {}, setHeader(k, v) { this.h[k] = v }, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }; return [{ method }, r] }
    const realFetch = globalThis.fetch, realErr = console.error
    console.error = () => {}
    try {
        globalThis.fetch = async () => { throw new Error('down') }
        let [req, res] = mk('GET'); await handler(req, res)
        assert.equal(res.code, 503); assert.equal(res.h['Cache-Control'], 'no-store'); assert.deepEqual(res.body, { error: 'fx_unavailable' })
        globalThis.fetch = async u => ({ ok: true, json: async () => (String(u).includes('mindicador') ? { serie: [] } : { time_last_update_unix: Math.floor(Date.now() / 1000), rates: { CLP: 950 } }) })
        ;[req, res] = mk('GET'); await handler(req, res)
        assert.equal(res.code, 200); assert.match(res.h['Cache-Control'], /s-maxage=3600/); assert.equal(res.body.rate, 950)
        ;[req, res] = mk('POST'); await handler(req, res)
        assert.equal(res.code, 405)
    } finally { globalThis.fetch = realFetch; console.error = realErr }
})

test('fecha, tasa e importe formateados según el idioma', () => {
    assert.equal(formatFxDate('2026-11-06', 'en'), 'Nov 6, 2026')
    assert.equal(formatFxDate('2026-11-06', 'de'), '6. Nov. 2026')
    assert.match(formatFxDate('2026-11-06', 'pt'), /^6 de nov\.? de 2026$/)
    assert.equal(formatFxDate('xx', 'de'), 'xx')
    assert.equal(formatFxRate(970.94, 'en'), '970.94')
    assert.equal(formatFxRate(970.94, 'de'), '970,94')
    assert.equal(formatFxRate(970.94, 'pt'), '970,94')
    assert.equal(formatUsdAmount(1234, 'en'), '1,234')
    assert.equal(formatUsdAmount(1234, 'de'), '1.234')
    assert.equal(formatUsdAmount(1234, 'pt'), '1.234')
})

test('fuente descrita en el idioma, sin inventar', () => {
    const src = 'Dólar observado (Banco Central de Chile) vía mindicador.cl'
    assert.match(fxSourceLabel(src, 'en'), /Central Bank of Chile.*mindicador\.cl/)
    assert.match(fxSourceLabel(src, 'de'), /Zentralbank von Chile.*mindicador\.cl/)
    assert.match(fxSourceLabel(src, 'pt'), /Banco Central do Chile.*mindicador\.cl/)
    assert.equal(fxSourceLabel('ExchangeRate-API (open.er-api.com)', 'de'), 'ExchangeRate-API (open.er-api.com)')
})

test('approxUsd: solo en/de/pt y con tasa válida; es nunca', () => {
    const fx = { rate: 993.22, asOf: '2026-11-03', source: 'x' }
    assert.deepEqual(USD_LANGS, ['en', 'de', 'pt'])
    for (const l of ['en', 'de', 'pt']) assert.equal(approxUsd(l, 510000, fx), 513)
    for (const l of ['es', 'fr', 'EN', undefined, null]) assert.equal(approxUsd(l, 510000, fx), null)
    for (const l of USD_LANGS) {
        assert.equal(approxUsd(l, 510000, null), null)
        assert.equal(approxUsd(l, 510000, { rate: 0 }), null)
        assert.equal(approxUsd(l, 0, fx), null)
        assert.equal(approxUsd(l, NaN, fx), null)
    }
})

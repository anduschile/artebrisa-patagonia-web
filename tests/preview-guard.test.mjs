// Vista previa de solo lectura: con VITE_READ_ONLY=true toda escritura se rechaza ANTES de enviar
// una petición. Se carga el código real con Vite (SSR) y se espía fetch; el control (sin la variable)
// demuestra que el espía sí ve las escrituras.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createServer } from 'vite'

const READ_RESPONSE = () => new Response(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }), { status: 406, headers: { 'content-type': 'application/json' } })

async function withEnv(readOnly, fn) {
    const calls = []
    const realFetch = globalThis.fetch
    globalThis.fetch = async (url, init = {}) => {
        const method = (init.method || (url?.method) || 'GET').toUpperCase()
        calls.push(method)
        return method === 'GET' ? READ_RESPONSE() : new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const saved = { ...process.env }
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-test'
    if (readOnly) process.env.VITE_READ_ONLY = 'true'; else delete process.env.VITE_READ_ONLY
    const server = await createServer({ configFile: false, envDir: false, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } })
    try { return await fn(server, calls) } finally {
        await server.close(); globalThis.fetch = realFetch
        for (const k of ['VITE_READ_ONLY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) { if (k in saved) process.env[k] = saved[k]; else delete process.env[k] }
    }
}

const WRITE = m => m !== 'GET' && m !== 'HEAD'
const resParams = { unit: { id: 'u', property_id: 'p' }, guest_id: 'g', channel_id: 'c', check_in: '2027-04-12', check_out: '2027-04-15', quoted_total: 210000 }

test('solo lectura: huésped, reserva y canal se rechazan sin ninguna petición de escritura', async () => {
    await withEnv(true, async (server, calls) => {
        const guests = await server.ssrLoadModule('/src/data/guests.js')
        const reservations = await server.ssrLoadModule('/src/data/reservations.js')
        const channels = await server.ssrLoadModule('/src/data/channels.js')
        await assert.rejects(guests.findOrCreateGuest({ full_name: 'Test', email: 'a@b.c', phone: '1' }), /solo lectura/)
        assert.equal(calls.length, 0, 'findOrCreateGuest no debe enviar nada')
        await assert.rejects(reservations.createInquiryReservation(resParams), /solo lectura/)
        assert.equal(calls.length, 0, 'createInquiryReservation no debe enviar nada')
        // canal: la lectura previa (GET) es válida; el INSERT debe quedar bloqueado
        await assert.rejects(channels.getWebChannelId(), /solo lectura/)
        assert.ok(calls.length >= 1 && !calls.some(WRITE), `solo lecturas, recibido: ${calls}`)
    })
})

test('control (sin VITE_READ_ONLY): las mismas funciones sí envían escrituras', async () => {
    await withEnv(false, async (server, calls) => {
        const guests = await server.ssrLoadModule('/src/data/guests.js')
        const reservations = await server.ssrLoadModule('/src/data/reservations.js')
        const channels = await server.ssrLoadModule('/src/data/channels.js')
        await guests.findOrCreateGuest({ full_name: 'Test', email: 'a@b.c', phone: '1' }).catch(() => {})
        await reservations.createInquiryReservation(resParams).catch(() => {})
        await channels.getWebChannelId().catch(() => {})
        assert.equal(calls.filter(WRITE).length, 3, `esperaba 3 escrituras, recibido: ${calls}`)
    })
})

test('puntos de pago: el guard precede a cualquier petición de cobro', () => {
    const w = fs.readFileSync(new URL('../src/components/ReservationWidget.jsx', import.meta.url), 'utf8')
    const i = w.indexOf('assertWritable() //'), j = w.indexOf('/functions/v1/process-payment')
    assert.ok(i > 0 && j > i, 'ReservationWidget: assertWritable antes de process-payment')
    const t = fs.readFileSync(new URL('../src/pages/TestPaymentPage.jsx', import.meta.url), 'utf8')
    const a = t.indexOf('assertWritable() //'), b = t.indexOf('/functions/v1/test-payment')
    assert.ok(a > 0 && b > a, 'TestPaymentPage: assertWritable antes de test-payment')
    assert.ok(t.indexOf('assertWritable()\n') > 0 || /initializeBrick[\s\S]{0,120}assertWritable\(\)/.test(t), 'TestPaymentPage: no inicia el Brick en solo lectura')
})

// scripts/mapa-huecos/index.mjs
//
// Mapa de huecos del calendario de reservas — SOLO LECTURA.
//
// Objetivo: para cada unidad, encontrar huecos de 1 a 3 noches entre reservas
// dentro de los próximos 120 días, y marcar como "candidato" aquellos huecos
// donde al menos uno de los dos lados (la reserva antes o después del hueco)
// es una reserva propia movible (status 'confirmed'), para evaluar con Karina
// si mover esas reservas entre unidades equivalentes libera rangos más largos.
//
// Este script NO modifica ni inserta nada en la base. No hace falta — y no se
// agrega ningún .insert/.update/.delete bajo ninguna circunstancia.
//
// Uso (PowerShell, desde D:\2026\Paginas Webs 2026\artebrisa-patagonia):
//
//   1. Copiar scripts/mapa-huecos/.env.eval.example como
//      scripts/mapa-huecos/.env.eval y completar SUPABASE_URL y
//      SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).
//   2. node scripts/mapa-huecos/index.mjs
//
// scripts/mapa-huecos/.env.eval y scripts/mapa-huecos/output/ están en
// .gitignore — ni las credenciales ni los CSV generados se suben al repo.

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(SCRIPT_DIR, '.env.eval') })

const VENTANA_DIAS = 120
const HUECO_MIN_NOCHES = 1
const HUECO_MAX_NOCHES = 3

const CANALES_OTA_FIJA = ['Booking.com', 'Airbnb']
const CANALES_BLOQUEO_MANUAL = ['Sitio web propio', 'WhatsApp']

function todayStr() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function toDateUTC(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

function addDaysStr(dateStr, days) {
    const d = toDateUTC(dateStr)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}

function diffDays(dateStrA, dateStrB) {
    return Math.round((toDateUTC(dateStrA) - toDateUTC(dateStrB)) / 86400000)
}

// Clasifica una reserva que está a un lado de un hueco (o null si es el
// borde de la ventana de 120 días).
function clasificarLado(reserva) {
    if (!reserva) {
        return { tipo: 'borde_ventana', canal: null }
    }
    if (reserva.status === 'confirmed') {
        return { tipo: 'propia_movible', canal: reserva.canal }
    }
    if (reserva.status === 'blocked') {
        if (CANALES_OTA_FIJA.includes(reserva.canal)) {
            return { tipo: 'ota_fija', canal: reserva.canal }
        }
        if (CANALES_BLOQUEO_MANUAL.includes(reserva.canal)) {
            return { tipo: 'bloqueo_manual', canal: reserva.canal }
        }
        // Canal no contemplado explícitamente en la lógica validada — se deja
        // visible en vez de forzarlo a una de las categorías de arriba.
        return { tipo: `blocked_canal_desconocido(${reserva.canal ?? 'sin canal'})`, canal: reserva.canal }
    }
    // status === 'inquiry': no está definido como categoría en la lógica
    // validada (no es ni propia_movible, ni ota_fija, ni bloqueo_manual).
    // Se muestra con su propio status para no perder la info, y no cuenta
    // como "propia_movible" en la marca de candidato.
    return { tipo: 'inquiry', canal: reserva.canal }
}

async function main() {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
        console.error(`Completa scripts/mapa-huecos/.env.eval (copia .env.eval.example) o exporta las variables antes de correr el script.`)
        process.exit(1)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    })

    const today = todayStr()
    const ventanaFin = addDaysStr(today, VENTANA_DIAS)

    console.log(`Mapa de huecos — ventana ${today} a ${ventanaFin} (${VENTANA_DIAS} días)\n`)

    const { data: reservas, error } = await supabase
        .from('core_reservations')
        .select(`
            id,
            unit_id,
            check_in,
            check_out,
            status,
            core_units ( code ),
            core_channels ( name )
        `)
        .in('status', ['inquiry', 'confirmed', 'blocked'])
        .lt('check_in', ventanaFin)
        .gt('check_out', today)
        .order('check_in', { ascending: true })

    if (error) {
        console.error('Error consultando core_reservations:', error.message)
        process.exit(1)
    }

    // Agrupar por unidad.
    const porUnidad = new Map() // unit_id -> { code, reservas: [] }
    for (const r of reservas) {
        const code = r.core_units?.code ?? r.unit_id
        if (!porUnidad.has(r.unit_id)) {
            porUnidad.set(r.unit_id, { code, reservas: [] })
        }
        porUnidad.get(r.unit_id).reservas.push({
            check_in: r.check_in,
            check_out: r.check_out,
            status: r.status,
            canal: r.core_channels?.name ?? null,
        })
    }

    const huecosCandidatos = []
    let totalHuecos1a3 = 0

    for (const [, unidad] of porUnidad) {
        const lista = [...unidad.reservas].sort((a, b) => a.check_in.localeCompare(b.check_in))

        let cursor = today
        let reservaAnterior = null

        const marcarHueco = (inicio, fin, antes, despues) => {
            const noches = diffDays(fin, inicio)
            if (noches < HUECO_MIN_NOCHES || noches > HUECO_MAX_NOCHES) return

            totalHuecos1a3 += 1

            const ladoAntes = clasificarLado(antes)
            const ladoDespues = clasificarLado(despues)
            const esCandidato = ladoAntes.tipo === 'propia_movible' || ladoDespues.tipo === 'propia_movible'
            const ambosPropios = ladoAntes.tipo === 'propia_movible' && ladoDespues.tipo === 'propia_movible'

            if (esCandidato) {
                huecosCandidatos.push({
                    unidad: unidad.code,
                    hueco_inicio: inicio,
                    hueco_fin: fin,
                    noches,
                    antes,
                    ladoAntes,
                    despues,
                    ladoDespues,
                    ambosPropios,
                })
            }
        }

        for (const reserva of lista) {
            marcarHueco(cursor, reserva.check_in, reservaAnterior, reserva)
            if (reserva.check_out > cursor) cursor = reserva.check_out
            reservaAnterior = reserva
        }
        // Hueco final: desde la última reserva hasta el borde de la ventana.
        marcarHueco(cursor, ventanaFin, reservaAnterior, null)
    }

    // ── Salida en consola ────────────────────────────────────────────────────
    const fmtLado = (reserva, lado) => {
        if (!reserva) return 'borde de ventana (sin reserva)'
        return `${reserva.check_in} → ${reserva.check_out} | status=${reserva.status} | canal=${reserva.canal ?? 'sin canal'} | ${lado.tipo}`
    }

    if (huecosCandidatos.length === 0) {
        console.log('No se encontraron huecos candidatos (1-3 noches con al menos un lado propio movible).\n')
    } else {
        for (const h of huecosCandidatos) {
            console.log(`── Unidad ${h.unidad} — hueco ${h.hueco_inicio} → ${h.hueco_fin} (${h.noches} noche${h.noches === 1 ? '' : 's'})${h.ambosPropios ? '  [AMBOS LADOS PROPIOS]' : ''}`)
            console.log(`   Antes:    ${fmtLado(h.antes, h.ladoAntes)}`)
            console.log(`   Después:  ${fmtLado(h.despues, h.ladoDespues)}`)
            console.log('')
        }
    }

    const totalCandidatos = huecosCandidatos.length
    const totalAmbosPropios = huecosCandidatos.filter(h => h.ambosPropios).length
    const nochesLiberables = huecosCandidatos.reduce((sum, h) => sum + h.noches, 0)

    console.log('── Resumen ──────────────────────────────────────────────')
    console.log(`Huecos de 1-3 noches encontrados (todas las unidades): ${totalHuecos1a3}`)
    console.log(`Huecos candidatos (al menos un lado propio movible):    ${totalCandidatos}`)
    console.log(`  de los cuales con ambos lados propios:                ${totalAmbosPropios}`)
    console.log(`Noches que se liberarían si se resuelven todos:         ${nochesLiberables}`)

    // ── CSV opcional ─────────────────────────────────────────────────────────
    const outputDir = path.join(SCRIPT_DIR, 'output')
    fs.mkdirSync(outputDir, { recursive: true })
    const fechaArchivo = today
    const csvPath = path.join(outputDir, `mapa-huecos-${fechaArchivo}.csv`)

    const csvHeader = [
        'unidad', 'hueco_inicio', 'hueco_fin', 'noches',
        'antes_check_in', 'antes_check_out', 'antes_status', 'antes_canal', 'antes_tipo',
        'despues_check_in', 'despues_check_out', 'despues_status', 'despues_canal', 'despues_tipo',
        'ambos_propios',
    ]
    const csvRows = huecosCandidatos.map(h => [
        h.unidad, h.hueco_inicio, h.hueco_fin, h.noches,
        h.antes?.check_in ?? '', h.antes?.check_out ?? '', h.antes?.status ?? '', h.antes?.canal ?? '', h.ladoAntes.tipo,
        h.despues?.check_in ?? '', h.despues?.check_out ?? '', h.despues?.status ?? '', h.despues?.canal ?? '', h.ladoDespues.tipo,
        h.ambosPropios,
    ])
    const csvContent = [csvHeader, ...csvRows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')

    fs.writeFileSync(csvPath, csvContent, 'utf-8')
    console.log(`\nCSV generado: ${csvPath}`)
}

main()

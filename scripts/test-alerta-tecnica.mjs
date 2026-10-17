// scripts/test-alerta-tecnica.mjs
//
// Prueba standalone del mecanismo de enviarAlertaTecnicaAJose() (Resend + Twilio),
// sin depender de lograr que el modelo dispare alguno de los 5 casos de fallo
// reales en una conversación. NO importa ni toca
// supabase/functions/whatsapp-bot/index.ts — es una copia de la misma lógica,
// de un solo uso, pensada para correr localmente y borrar después.
//
// Nota: el original está escrito para Deno (edge function de Supabase), pero
// Deno no está instalado en este entorno. Como la función solo usa fetch()
// y Deno.env.get() — sin ninguna otra API específica de Deno — este script
// es la misma lógica en Node.js (ya instalado, v25) usando process.env y el
// fetch nativo. El comportamiento de red que se está probando es idéntico.
//
// Uso (PowerShell, desde D:\2026\Paginas Webs 2026\artebrisa-patagonia):
//
//   $env:RESEND_API_KEY      = "..."
//   $env:JOSE_ALERT_EMAIL    = "..."
//   $env:JOSE_ALERT_PHONE    = "+56..."
//   $env:TWILIO_ACCOUNT_SID  = "..."
//   $env:TWILIO_AUTH_TOKEN   = "..."
//   $env:TWILIO_WHATSAPP_FROM = "whatsapp:+1415..."
//   node scripts/test-alerta-tecnica.mjs
//
// Esas variables solo quedan en memoria de esa ventana de PowerShell — se
// pierden al cerrarla, no tocan ningún archivo del repo.

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Arte Brisa Patagonia <reservas@artebrisapatagonia.com>'

async function testResend(alertText) {
    const resendKey = process.env.RESEND_API_KEY ?? ''
    const joseAlertEmail = process.env.JOSE_ALERT_EMAIL ?? ''

    console.log('\n── Resend (email) ──────────────────────────')
    if (!resendKey || !joseAlertEmail) {
        console.log('SKIP — falta RESEND_API_KEY y/o JOSE_ALERT_EMAIL en el entorno')
        return
    }

    try {
        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: SENDER_EMAIL,
                to: [joseAlertEmail],
                subject: '⚠️ Fallo técnico en whatsapp-bot — revisar (PRUEBA)',
                text: alertText,
            }),
        })

        const bodyText = await resp.text()
        console.log(`Status: ${resp.status} ${resp.ok ? 'OK' : 'ERROR'}`)
        console.log(`Body: ${bodyText}`)
    } catch (err) {
        console.log('EXCEPTION:', err)
    }
}

async function testTwilio(alertText) {
    const joseAlertPhone = process.env.JOSE_ALERT_PHONE ?? ''
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN ?? ''
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? ''

    console.log('\n── Twilio (WhatsApp) ────────────────────────')
    if (!joseAlertPhone || !accountSid || !twilioAuthToken || !fromNumber) {
        console.log('SKIP — falta alguna de JOSE_ALERT_PHONE / TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM en el entorno')
        return
    }

    try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const twilioBody = new URLSearchParams({
            From: fromNumber,
            To: `whatsapp:${joseAlertPhone}`,
            Body: alertText,
        })

        const resp = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${twilioAuthToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: twilioBody.toString(),
        })

        const bodyText = await resp.text()
        console.log(`Status: ${resp.status} ${resp.ok ? 'OK' : 'ERROR'}`)
        console.log(`Body: ${bodyText}`)
    } catch (err) {
        console.log('EXCEPTION:', err)
    }
}

async function main() {
    const contexto = 'Fallo: PRUEBA MANUAL'
    const reason = 'esto es una prueba de conectividad'
    const phone = '+56900000000'
    const conversationId = 'test-conversation-123'
    const timestamp = new Date().toISOString()

    const alertText = `⚠️ Fallo técnico en whatsapp-bot — revisar\n\n${contexto}\nMotivo: ${reason}\nTeléfono: ${phone}\nConversation ID: ${conversationId}\nTimestamp: ${timestamp}`

    console.log('Probando mecanismo de alerta técnica con valores inventados:')
    console.log(alertText)

    await testResend(alertText)
    await testTwilio(alertText)

    console.log('\nListo. Si viste "OK" en ambos bloques, revisa tu correo y WhatsApp.')
}

main()

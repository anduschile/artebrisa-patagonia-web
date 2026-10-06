import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'

// ─── Página de prueba AISLADA del Card Payment Brick ──────────────────────
//
// No enlazada desde ningún menú/navbar/footer, bloqueada a buscadores
// (robots.txt + meta noindex más abajo). Cobra un monto REAL y bajo con la
// tarjeta que se ingrese, a través de una Edge Function separada
// (test-payment) que NO toca core_reservations ni core_guests, y que NO
// dispara el WhatsApp a Karina ni el email de confirmación por Resend.
//
// El monto se define en el backend (supabase/functions/test-payment/index.ts,
// TEST_AMOUNT_CLP) — el valor de acá es solo para mostrarlo en pantalla antes
// de pagar; si alguna vez cambian, hay que actualizar los dos a mano.
const TEST_AMOUNT_CLP = 1500

function formatCLP(value) {
    return `$${Number(value).toLocaleString('es-CL')}`
}

// Traducción breve de los status_detail más comunes de Mercado Pago a texto
// simple en español, para que quien prueba entienda sin tener que buscar el
// código. Si no está en el mapa, se muestra el código tal cual junto al texto
// genérico — no es un error del sistema, solo no tenemos traducción para ese caso puntual.
const STATUS_DETAIL_ES = {
    accredited: 'El pago fue acreditado correctamente.',
    pending_contingency: 'El pago está siendo revisado. Puede demorar hasta 2 días hábiles.',
    pending_review_manual: 'El pago está en revisión manual.',
    cc_rejected_bad_filled_card_number: 'Revisa el número de la tarjeta, tiene un error.',
    cc_rejected_bad_filled_date: 'Revisa la fecha de vencimiento de la tarjeta.',
    cc_rejected_bad_filled_security_code: 'Revisa el código de seguridad (CVV) de la tarjeta.',
    cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta, hay un error.',
    cc_rejected_blacklist: 'La tarjeta fue rechazada por el banco emisor.',
    cc_rejected_call_for_authorize: 'El banco emisor pide autorizar este pago directamente con ellos.',
    cc_rejected_card_disabled: 'La tarjeta está deshabilitada o inactiva.',
    cc_rejected_card_error: 'No se pudo procesar la tarjeta. Intenta de nuevo.',
    cc_rejected_duplicated_payment: 'Ya se hizo un pago con estos mismos datos hace poco.',
    cc_rejected_high_risk: 'El pago fue rechazado por un filtro de seguridad/antifraude.',
    cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
    cc_rejected_invalid_installments: 'La tarjeta no acepta la cantidad de cuotas elegida.',
    cc_rejected_max_attempts: 'Se superó el número de intentos permitidos con esta tarjeta.',
    cc_rejected_other_reason: 'El banco emisor rechazó el pago sin dar un motivo específico.',
}

function statusDetailEs(detail) {
    if (!detail) return null
    return STATUS_DETAIL_ES[detail] || `Motivo informado por Mercado Pago: ${detail}`
}

export default function TestPaymentPage() {
    const [brickReady, setBrickReady] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState(null) // { status, status_detail, payment_id } | null
    const [error, setError] = useState(null)

    useEffect(() => {
        initializeBrick()

        return () => {
            if (window.testPaymentBrickController) {
                try {
                    window.testPaymentBrickController.unmount()
                } catch (e) {
                    console.error('Error unmounting Brick:', e)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function initializeBrick() {
        try {
            const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY
            if (!mpPublicKey) {
                setError('Mercado Pago no está configurado (falta VITE_MP_PUBLIC_KEY).')
                return
            }

            if (!window.MercadoPago) {
                setError('No se pudo cargar el SDK de Mercado Pago.')
                return
            }

            window.mpTest = new window.MercadoPago(mpPublicKey, { locale: 'es-CL' })

            const bricksBuilder = window.mpTest.bricks()
            const brickController = await bricksBuilder.create('cardPayment', 'testPaymentBrick_container', {
                initialization: { amount: TEST_AMOUNT_CLP },
                customization: {
                    paymentMethods: {
                        excludedPaymentTypes: ['ticket', 'atm'],
                        maxInstallments: 1,
                    },
                },
                callbacks: {
                    onReady: () => setBrickReady(true),
                    onError: (err) => {
                        console.error('Brick error:', err)
                    },
                    onSubmit: async (cardFormData) => {
                        setProcessing(true)
                        setError(null)
                        try {
                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

                            const res = await fetch(`${supabaseUrl}/functions/v1/test-payment`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${anonKey}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    token: cardFormData.token,
                                    payment_method_id: cardFormData.payment_method_id,
                                    issuer_id: cardFormData.issuer_id,
                                    installments: cardFormData.installments,
                                    identification_type: cardFormData.payer?.identification?.type || null,
                                    identification_number: cardFormData.payer?.identification?.number || null,
                                }),
                            })

                            if (!res.ok) {
                                const errData = await res.json().catch(() => ({}))
                                setError(errData.error || 'Error desconocido al procesar el pago de prueba.')
                                setProcessing(false)
                                return
                            }

                            const data = await res.json()
                            setResult(data)
                            setProcessing(false)
                        } catch (e) {
                            setError(`No se pudo contactar al servidor: ${e.message}`)
                            setProcessing(false)
                        }
                    },
                },
            })

            window.testPaymentBrickController = brickController
        } catch (e) {
            console.error('Error initializing Brick:', e)
            setError(`No se pudo inicializar el formulario de pago: ${e.message}`)
        }
    }

    function handleRetry() {
        setResult(null)
        setError(null)
        setBrickReady(false)
        initializeBrick()
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-start justify-center px-4 py-10">
            <Helmet>
                <title>Cobro de prueba — uso interno</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-6 py-4">
                    <h1 className="text-white font-black text-lg leading-tight">Cobro de prueba — uso interno</h1>
                    <p className="text-slate-400 text-xs mt-0.5">Arte Brisa Patagonia</p>
                </div>

                <div className="px-6 pt-5 pb-2">
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900 space-y-1">
                        <p className="font-bold">⚠️ Esta página cobra dinero real.</p>
                        <p>
                            Al ingresar los datos de una tarjeta acá se hace un cobro real de{' '}
                            <strong>{formatCLP(TEST_AMOUNT_CLP)} CLP</strong>, no una simulación. No queda asociado
                            a ninguna reserva y <strong>no se reembolsa automáticamente</strong>.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {!result && (
                    <div className="px-6 pb-6 pt-4 space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto a cobrar</span>
                            <span className="text-lg font-black text-slate-900">{formatCLP(TEST_AMOUNT_CLP)} CLP</span>
                        </div>

                        {!brickReady && !error && (
                            <p className="text-xs text-slate-400 text-center animate-pulse">Cargando formulario de pago…</p>
                        )}

                        <div id="testPaymentBrick_container" />

                        {processing && (
                            <p className="text-xs text-slate-500 text-center animate-pulse">Procesando pago, no cierres esta página…</p>
                        )}
                    </div>
                )}

                {result && (
                    <ResultScreen result={result} onRetry={handleRetry} />
                )}
            </div>
        </div>
    )
}

function ResultScreen({ result, onRetry }) {
    const { status, status_detail, payment_id } = result

    const approved = status === 'approved'
    const pending = status === 'pending' || status === 'in_process'
    const rejected = status === 'rejected'

    const emoji = approved ? '✓' : pending ? '⏱' : rejected ? '✕' : '⚠'
    const bgColor = approved ? 'bg-green-100' : pending ? 'bg-blue-100' : 'bg-red-100'
    const textColor = approved ? 'text-green-600' : pending ? 'text-blue-600' : 'text-red-600'
    const title = approved
        ? 'Pago aprobado'
        : pending
            ? 'Pago en revisión'
            : rejected
                ? 'Pago rechazado'
                : 'Resultado desconocido'

    const detailEs = statusDetailEs(status_detail)

    return (
        <div className="text-center py-6 px-6 space-y-4">
            <div className={`w-14 h-14 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <div className={`text-2xl ${textColor}`}>{emoji}</div>
            </div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            {detailEs && <p className="text-slate-600 text-sm">{detailEs}</p>}

            <div className="bg-slate-50 rounded-xl p-3 text-left text-xs text-slate-500 space-y-1 border border-slate-200">
                <div className="flex justify-between"><span>Estado (código MP)</span><span className="font-mono">{status}</span></div>
                {status_detail && <div className="flex justify-between"><span>Detalle (código MP)</span><span className="font-mono">{status_detail}</span></div>}
                {payment_id && <div className="flex justify-between"><span>ID de pago</span><span className="font-mono">{payment_id}</span></div>}
            </div>

            <button
                onClick={onRetry}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-sm"
            >
                Hacer otra prueba
            </button>
        </div>
    )
}

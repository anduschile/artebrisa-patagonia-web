import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { buildWaUrl } from '../config/contact'
import { supabase } from '../lib/supabaseClient'
import { trackPurchaseOnce, trackWhatsappClick } from '../lib/analytics'

// Enlace a WhatsApp con la referencia de la reserva. El mensaje es para el equipo
// (hispanohablante), por eso va en español.
function waLink(reservationId, text) {
  return buildWaUrl(reservationId ? `Hola, ${text} Referencia de reserva: ${reservationId}` : `Hola, ${text}`)
}

export default function PaymentConfirmPage() {
  const location = useLocation()
  const [status, setStatus] = useState(null)
  const [reservationId, setReservationId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ── Extract query params ──────────────────────────────────────────
    const params = new URLSearchParams(location.search)
    const statusParam = params.get('status')
    const reservationIdParam = params.get('reservation_id')

    console.log('[DEBUG-CONFIRM] location.search:', location.search)
    console.log('[DEBUG-CONFIRM] statusParam:', statusParam)
    console.log('[DEBUG-CONFIRM] reservationIdParam:', reservationIdParam)

    setStatus(statusParam)
    setReservationId(reservationIdParam)

    // ── Clean URL immediately (remove sensitive query params from history) ──
    // Use replaceState to replace the current history entry without reloading
    window.history.replaceState({}, document.title, window.location.pathname)

    setLoading(false)
  }, [location.search])

  // purchase — SOLO cuando este redirect confirma un pago aprobado (flujo
  // async del webhook IPN de Mercado Pago; el flujo síncrono del Card
  // Payment Brick se mide aparte, en ReservationWidget). El monto exacto
  // cobrado se lee de la propia reserva (misma tabla/anon key que ya usa
  // el resto del sitio) porque el redirect de Mercado Pago no lo trae.
  useEffect(() => {
    if (status !== 'paid' || !reservationId) return

    let cancelled = false
    supabase
      .from('core_reservations')
      .select('paid_amount, quoted_total, unit_id, core_units ( name )')
      .eq('id', reservationId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const unit = Array.isArray(data.core_units) ? data.core_units[0] : data.core_units
        trackPurchaseOnce({
          transactionId: reservationId,
          value: data.paid_amount || data.quoted_total || 0,
          items: [{ item_id: data.unit_id, item_name: unit?.name }],
        })
      })
      .catch(() => { /* noop — no romper la pantalla de confirmación por esto */ })

    return () => { cancelled = true }
  }, [status, reservationId])

  if (loading) {
    console.log('[DEBUG-CONFIRM] Renderizando bloque: LOADING')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Procesando tu pago...</p>
        </div>
      </div>
    )
  }

  // ── Success: payment was authorized ────────────────────────────────
  if (status === 'paid') {
    console.log('[DEBUG-CONFIRM] Renderizando bloque: PAID')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Pago recibido!</h1>

            <p className="text-gray-600 mb-4">
              Tu pago ha sido procesado exitosamente.
            </p>

            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Referencia de reserva</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{reservationId}</p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    ✓
                  </div>
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  <span className="font-semibold">Pago confirmado</span> — Tu transacción fue aprobada.
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    ✓
                  </div>
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  <span className="font-semibold">En revisión</span> — Nuestro equipo revisará tu reserva y te confirmará a la brevedad por el mismo medio.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">¿Dudas?</span> Contáctanos por WhatsApp y te ayudamos sin problema.
              </p>
            </div>

            <a
              href="/"
              className="inline-block bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Volver al inicio
            </a>
          </div>
        </div>
    )
  }

  // ── Failed: payment was rejected ───────────────────────────────────
  if (status === 'failed') {
    console.log('[DEBUG-CONFIRM] Renderizando bloque: FAILED')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pago no procesado</h1>

            <p className="text-gray-600 mb-6">
              El pago no se pudo procesar. Esto puede deberse a fondos insuficientes, límite de la tarjeta, o un rechazo del banco.
            </p>

            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Referencia de reserva</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{reservationId}</p>
            </div>

            <div className="space-y-3 mb-6 text-left">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">¿Cómo seguir?</span> Para volver a intentarlo necesitas un nuevo enlace de pago: escríbenos por WhatsApp y te lo enviamos. Puedes usar otra tarjeta o medio de pago. Tu información se mantiene segura en nuestro sistema.
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">¿Problemas técnicos?</span> Contáctanos por WhatsApp y te asistimos en forma directa.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={waLink(reservationId, 'mi pago fue rechazado. ¿Me pueden enviar un nuevo enlace de pago?')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsappClick('payment_result_failed')}
                className="block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Pedir nuevo enlace por WhatsApp
              </a>
              <a
                href="/"
                className="block bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
    )
  }

  // ── Pending: payment is being processed (deferred payment methods) ──────────
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tu pago está en proceso</h1>

            <p className="text-gray-600 mb-4">
              Tu pago está siendo procesado y todavía no tenemos la confirmación. Según el medio de pago que hayas usado, puede tardar. No es un error ni fue rechazado.
            </p>

            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Referencia de reserva</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{reservationId}</p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">¿Qué sigue?</span> Cuando el pago se confirme, nuestro equipo te avisará. Puedes escribirnos por WhatsApp para consultar el estado de tu reserva.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Importante:</span> No vuelvas a pagar mientras tu pago esté en proceso, para evitar un doble cobro.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={waLink(reservationId, 'mi pago quedó en proceso. ¿Me pueden confirmar el estado de mi reserva?')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsappClick('payment_result_pending')}
                className="block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Consultar estado por WhatsApp
              </a>
              <a
                href="/"
                className="block bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
    )
  }

  // ── Cancelled: user closed the payment form before completing ──────────────
  if (status === 'cancelled') {
    console.log('[DEBUG-CONFIRM] Renderizando bloque: CANCELLED')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cancelaste el pago</h1>

            <p className="text-gray-600 mb-6">
              No te preocupes: tu solicitud quedó registrada, pero las fechas no quedan reservadas hasta que se confirme el pago.
            </p>

            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Referencia de reserva</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{reservationId}</p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    ✓
                  </div>
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  Tu información está segura — se mantiene en nuestro sistema.
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    ✓
                  </div>
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  Para pagar necesitas un nuevo enlace: escríbenos por WhatsApp y te lo enviamos.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">¿Dudas?</span> Contáctanos por WhatsApp y te ayudamos.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={waLink(reservationId, 'cancelé el pago. ¿Me pueden enviar un nuevo enlace de pago?')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsappClick('payment_result_cancelled')}
                className="block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Pedir nuevo enlace por WhatsApp
              </a>
              <a
                href="/"
                className="block bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
    )
  }

  // ── Unknown: payment result is uncertain (network error) ─────────────────
  if (status === 'unknown') {
    console.log('[DEBUG-CONFIRM] Renderizando bloque: UNKNOWN')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100">
                <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a8 8 0 110 16 8 8 0 010-16z" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Resultado incierto</h1>

            <p className="text-gray-600 mb-4">
              No pudimos confirmar el resultado de tu pago debido a un problema temporal.
            </p>

            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Referencia de reserva</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{reservationId}</p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">¿Qué pasó?</span> Intentamos confirmar tu pago con el procesador de pagos pero no recibimos respuesta. Esto puede ser un error temporal de conexión.
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Próximo paso:</span> Si el cargo aparece en tu cuenta bancaria, tu pago fue procesado y tu reserva está siendo revisada por nuestro equipo. Si tienes dudas, contáctanos por WhatsApp.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Importante:</span> No intentes pagar nuevamente. Espera a que nuestro equipo confirme el estado de tu reserva.
              </p>
            </div>

            <a
              href="/"
              className="inline-block bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Volver al inicio
            </a>
          </div>
        </div>
    )
  }

  // ── Error: unknown status or no params ─────────────────────────────
  console.log('[DEBUG-CONFIRM] Renderizando bloque: ERROR (fallback)')
  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a8 8 0 110 16 8 8 0 010-16z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Algo no está bien</h1>

          <p className="text-gray-600 mb-6">
            No pudimos procesar tu solicitud. Esto puede ser un error temporal del sistema.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-900">
              <span className="font-semibold">Te recomendamos:</span> Contacta a nuestro equipo directamente por WhatsApp para que verifique el estado de tu reserva y pago.
            </p>
          </div>

          <a
            href="/"
            className="inline-block bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )
}

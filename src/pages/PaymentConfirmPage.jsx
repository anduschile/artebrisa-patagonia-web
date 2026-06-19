import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../components/Layout'

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

    setStatus(statusParam)
    setReservationId(reservationIdParam)

    // ── Clean URL immediately (remove sensitive query params from history) ──
    // Use replaceState to replace the current history entry without reloading
    window.history.replaceState({}, document.title, window.location.pathname)

    setLoading(false)
  }, [location.search])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Procesando tu pago...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // ── Success: payment was authorized ────────────────────────────────
  if (status === 'paid') {
    return (
      <Layout>
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
                  <span className="font-semibold">Pago confirmado</span> — Tu transacción fue autorizada por Transbank.
                </p>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                    ✓
                  </div>
                </div>
                <p className="ml-3 text-sm text-gray-600">
                  <span className="font-semibold">En revisión</span> — Karina revisará tu reserva y te confirmará a la brevedad por el mismo medio.
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
      </Layout>
    )
  }

  // ── Failed: payment was rejected ───────────────────────────────────
  if (status === 'failed') {
    return (
      <Layout>
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
                <span className="font-semibold">Puedes reintentar:</span> Completa el formulario de reserva nuevamente para generar un nuevo enlace de pago. Tu información se mantiene segura en nuestro sistema.
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">¿Problemas técnicos?</span> Contáctanos por WhatsApp y te asistimos en forma directa.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href="/cabanas"
                className="block bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-center"
              >
                Reintentar pago
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
      </Layout>
    )
  }

  // ── Unknown: payment result is uncertain (network error) ─────────────────
  if (status === 'unknown') {
    return (
      <Layout>
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
                <span className="font-semibold">¿Qué pasó?</span> Intentamos confirmar tu pago con el banco pero no recibimos respuesta. Esto puede ser un error temporal de conexión.
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Próximo paso:</span> Si el cargo aparece en tu cuenta bancaria, tu pago fue procesado y tu reserva está siendo revisada por Karina. Si tienes dudas, contáctanos por WhatsApp.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Importante:</span> No intentes pagar nuevamente. Espera a que Karina confirme el estado de tu reserva.
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
      </Layout>
    )
  }

  // ── Error: unknown status or no params ─────────────────────────────
  return (
    <Layout>
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
              <span className="font-semibold">Te recomendamos:</span> Contacta a Karina directamente por WhatsApp para que verifique el estado de tu reserva y pago.
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
    </Layout>
  )
}

import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import LangLayout from './components/LangLayout'
import ScrollToTop from './components/ScrollToTop'
import { useAdminPwaTags } from './lib/useAdminPwaTags'
import HomePage from './pages/HomePage'
import CabanasPage from './pages/CabanasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import TrekPage from './pages/TrekPage'

// Página de prueba de pago y panel /admin: code-split aparte del sitio
// público (ver INCIDENTES.md/auditoría de rendimiento) — no las visita el
// 80% del tráfico y no deberían pesar en el bundle de las rutas públicas.
const UnitDetailPage = lazy(() => import('./pages/UnitDetailPage'))
const PaymentConfirmPage = lazy(() => import('./pages/PaymentConfirmPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const TestPaymentPage = lazy(() => import('./pages/TestPaymentPage'))

// Admin
const AdminGuard = lazy(() => import('./components/admin/AdminGuard'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminReservationsPage = lazy(() => import('./pages/admin/AdminReservationsPage'))
const AdminRatesPage = lazy(() => import('./pages/admin/AdminRatesPage'))
const AdminChatPage = lazy(() => import('./pages/admin/AdminChatPage'))

// Fallback neutro mientras carga el chunk de una página lazy.
const LAZY_FALLBACK = <div>Cargando...</div>

export default function App() {
    const location = useLocation()
    useAdminPwaTags(location.pathname.startsWith('/admin'))

    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* ── Public site (español, sin prefijo — idioma por defecto) ── */}
                <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/cabanas" element={<CabanasPage />} />
                    <Route path="/departamentos" element={<DepartamentosPage />} />
                    <Route path="/unidad/:slug" element={<Suspense fallback={LAZY_FALLBACK}><UnitDetailPage /></Suspense>} />
                    <Route path="/reserva/confirmar" element={<Suspense fallback={LAZY_FALLBACK}><PaymentConfirmPage /></Suspense>} />

                    {/* ── Mismas páginas en inglés/alemán (/en/*, /de/*) ──
                        Textos en src/i18n/locales, meta en src/seo/pageMeta.js */}
                    <Route path=":lang" element={<LangLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="cabanas" element={<CabanasPage />} />
                        <Route path="departamentos" element={<DepartamentosPage />} />
                        <Route path="unidad/:slug" element={<Suspense fallback={LAZY_FALLBACK}><UnitDetailPage /></Suspense>} />
                    </Route>

                    {/* ── Landing exclusiva en inglés para Google Ads (grupo
                        "Base para el trek") — NO existe en /es ni /de, por eso
                        va fuera de la rama ":lang" (que acepta cualquier
                        idioma con prefijo). Ruta fija "en/trek" en vez de
                        anidarla ahí. */}
                    <Route path="en/trek" element={<TrekPage />} />

                    <Route path="*" element={<Suspense fallback={LAZY_FALLBACK}><NotFoundPage /></Suspense>} />
                </Route>

                {/* ── Página de prueba de pago, aislada y sin layout — NO enlazar
                    desde ningún menú/navbar/footer (ver robots.txt + meta noindex
                    en TestPaymentPage.jsx) ── */}
                <Route path="/test-pago" element={<Suspense fallback={LAZY_FALLBACK}><TestPaymentPage /></Suspense>} />

                {/* ── Admin ── */}
                <Route path="/admin" element={<Suspense fallback={LAZY_FALLBACK}><AdminLoginPage /></Suspense>} />
                <Route element={<Suspense fallback={LAZY_FALLBACK}><AdminGuard /></Suspense>}>
                    <Route element={<Suspense fallback={LAZY_FALLBACK}><AdminLayout /></Suspense>}>
                        <Route path="/admin/dashboard" element={<Suspense fallback={LAZY_FALLBACK}><AdminDashboardPage /></Suspense>} />
                        <Route path="/admin/reservas" element={<Suspense fallback={LAZY_FALLBACK}><AdminReservationsPage /></Suspense>} />
                        <Route path="/admin/tarifas" element={<Suspense fallback={LAZY_FALLBACK}><AdminRatesPage /></Suspense>} />
                        <Route path="/admin/chat" element={<Suspense fallback={LAZY_FALLBACK}><AdminChatPage /></Suspense>} />
                    </Route>
                </Route>
            </Routes>
        </>
    )
}

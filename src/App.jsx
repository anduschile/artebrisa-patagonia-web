import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import LangLayout from './components/LangLayout'
import ScrollToTop from './components/ScrollToTop'
import { useAdminPwaTags } from './lib/useAdminPwaTags'
import HomePage from './pages/HomePage'
import CabanasPage from './pages/CabanasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import UnitDetailPage from './pages/UnitDetailPage'
import PaymentConfirmPage from './pages/PaymentConfirmPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin
import AdminGuard from './components/admin/AdminGuard'
import AdminLayout from './components/admin/AdminLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminReservationsPage from './pages/admin/AdminReservationsPage'
import AdminRatesPage from './pages/admin/AdminRatesPage'
import AdminChatPage from './pages/admin/AdminChatPage'

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
                    <Route path="/unidad/:slug" element={<UnitDetailPage />} />
                    <Route path="/reserva/confirmar" element={<PaymentConfirmPage />} />

                    {/* ── Mismas páginas en inglés/alemán (/en/*, /de/*) ──
                        Contenido aún en español (placeholder) — ver src/seo/pageMeta.js */}
                    <Route path=":lang" element={<LangLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="cabanas" element={<CabanasPage />} />
                        <Route path="departamentos" element={<DepartamentosPage />} />
                        <Route path="unidad/:slug" element={<UnitDetailPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* ── Admin ── */}
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route element={<AdminGuard />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                        <Route path="/admin/reservas" element={<AdminReservationsPage />} />
                        <Route path="/admin/tarifas" element={<AdminRatesPage />} />
                        <Route path="/admin/chat" element={<AdminChatPage />} />
                    </Route>
                </Route>
            </Routes>
        </>
    )
}

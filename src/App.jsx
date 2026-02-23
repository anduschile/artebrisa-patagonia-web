import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './pages/HomePage'
import CabanasPage from './pages/CabanasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import UnitDetailPage from './pages/UnitDetailPage'

// Admin
import AdminGuard from './components/admin/AdminGuard'
import AdminLayout from './components/admin/AdminLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminReservationsPage from './pages/admin/AdminReservationsPage'
import AdminRatesPage from './pages/admin/AdminRatesPage'

export default function App() {
    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* ── Public site ── */}
                <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/cabanas" element={<CabanasPage />} />
                    <Route path="/departamentos" element={<DepartamentosPage />} />
                    <Route path="/unidad/:id" element={<UnitDetailPage />} />
                </Route>

                {/* ── Admin ── */}
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route element={<AdminGuard />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin/reservas" element={<AdminReservationsPage />} />
                        <Route path="/admin/tarifas" element={<AdminRatesPage />} />
                    </Route>
                </Route>
            </Routes>
        </>
    )
}

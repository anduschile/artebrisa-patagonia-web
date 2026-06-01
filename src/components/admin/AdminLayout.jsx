import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

export default function AdminLayout() {
    const navigate = useNavigate()

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Top nav */}
            <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
                <span className="font-black text-gray-900 text-sm">
                    Arte<span className="text-primary-600">Brisa</span>
                    <span className="text-gray-400 font-normal ml-2">Admin</span>
                </span>
                <div className="flex-1" />
                <Link
                    to="/admin/reservas"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                    Reservas
                </Link>
                <Link
                    to="/admin/tarifas"
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                    Tarifas
                </Link>
                <Link
                    to="/"
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Sitio público
                </Link>
                <button
                    onClick={handleLogout}
                    className="text-sm text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                    Cerrar sesión
                </button>
            </nav>

            {/* Page content */}
            <main className="px-4 sm:px-6 py-8 max-w-screen-2xl mx-auto">
                <Outlet />
            </main>

            <Toaster
                position="top-right"
                toastOptions={{
                    style: { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb' },
                    success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
                }}
            />
        </div>
    )
}

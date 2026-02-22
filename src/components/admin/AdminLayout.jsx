import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function AdminLayout() {
    const navigate = useNavigate()

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Top nav */}
            <nav className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center gap-4">
                <span className="font-black text-white text-sm">
                    Arte<span className="text-primary-400">Brisa</span>
                    <span className="text-slate-500 font-normal ml-2">Admin</span>
                </span>
                <div className="flex-1" />
                <Link
                    to="/admin/reservas"
                    className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                    Reservas
                </Link>
                <Link
                    to="/"
                    className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Sitio público
                </Link>
                <button
                    onClick={handleLogout}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
                >
                    Cerrar sesión
                </button>
            </nav>

            {/* Page content */}
            <main className="px-4 sm:px-6 py-8 max-w-screen-2xl mx-auto">
                <Outlet />
            </main>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { getUnreadCount } from '../../data/admin/chat'

function NavItem({ to, icon, label, badge }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 ${
                    isActive
                        ? 'bg-primary-50 text-primary-700 font-semibold border-primary-600'
                        : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-800 border-transparent'
                }`
            }
        >
            {icon}
            <span className="flex-1">{label}</span>
            {badge > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badge}
                </span>
            )}
        </NavLink>
    )
}

export default function AdminLayout() {
    const navigate = useNavigate()
    const [humanCount, setHumanCount] = useState(0)

    useEffect(() => {
        async function fetchCount() {
            setHumanCount(await getUnreadCount())
        }
        fetchCount()
        const channel = supabase
            .channel('admin-chat-badge')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'core_chat_conversations' }, fetchCount)
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/admin')
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa] flex">
            {/* ── Sidebar ── */}
            <aside className="w-56 shrink-0 bg-[#f1f5f9] border-r border-gray-200 flex flex-col fixed top-0 left-0 h-screen z-20">
                {/* Brand */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-200">
                    <span className="font-black text-gray-900 text-sm tracking-tight">
                        Arte<span className="text-primary-600">Brisa</span>
                    </span>
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-widest mt-0.5">
                        Panel Admin
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    <NavItem
                        to="/admin/dashboard"
                        label="Dashboard"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                            </svg>
                        }
                    />
                    <NavItem
                        to="/admin/reservas"
                        label="Reservas"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        }
                    />
                    <NavItem
                        to="/admin/tarifas"
                        label="Tarifas"
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        }
                    />
                    <NavItem
                        to="/admin/chat"
                        label="Chat"
                        badge={humanCount}
                        icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                    />
                </nav>

                {/* Bottom links */}
                <div className="px-3 py-4 border-t border-gray-200 space-y-0.5">
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-200/70 hover:text-gray-700 transition-colors border-l-2 border-transparent"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Sitio público
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors border-l-2 border-transparent text-left"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ── Main content ── */}
            <main className="flex-1 min-w-0 ml-56">
                <div className="px-6 py-8 max-w-screen-2xl mx-auto">
                    <Outlet />
                </div>
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

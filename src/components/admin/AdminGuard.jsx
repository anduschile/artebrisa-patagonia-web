import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const ALLOWED_ROLES = ['admin', 'superadmin']
const IS_DEV = import.meta.env.DEV

export default function AdminGuard() {
    const [state, setState] = useState('loading') // 'loading'|'ok'|'unauthorized'|'no-session'
    const [debug, setDebug] = useState(null)      // debug info object (DEV only)

    useEffect(() => {
        let cancelled = false

        async function check(session) {
            if (!session) {
                if (!cancelled) setState('no-session')
                return
            }

            const uid = session.user.id

            if (IS_DEV) console.log('[AdminGuard] session.user.id =', uid)

            const { data, error } = await supabase
                .from('core_app_users')
                .select('role, property_id, auth_user_id')
                .eq('auth_user_id', uid)
                .maybeSingle()

            if (IS_DEV) {
                console.log('[AdminGuard] query result → data:', data, '| error:', error)
            }

            if (cancelled) return

            if (error) {
                setDebug({ uid, error: `${error.code}: ${error.message} — ${error.details}`, data: null })
                setState('unauthorized')
                return
            }

            if (!data) {
                setDebug({ uid, error: null, data: null, reason: 'No existe fila en core_app_users para auth_user_id=' + uid })
                setState('unauthorized')
                return
            }

            if (!ALLOWED_ROLES.includes(data.role)) {
                setDebug({ uid, error: null, data, reason: `Rol "${data.role}" no permitido (se requiere admin o superadmin)` })
                setState('unauthorized')
                return
            }

            if (IS_DEV) console.log('[AdminGuard] ✅ acceso OK, role=', data.role)
            setDebug(null)
            setState('ok')
        }

        supabase.auth.getSession().then(({ data: { session } }) => check(session))

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            check(session)
        })

        return () => {
            cancelled = true
            subscription.unsubscribe()
        }
    }, [])

    if (state === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (state === 'no-session') return <Navigate to="/admin" replace />

    if (state === 'unauthorized') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4 gap-4">
                <div className="text-5xl mb-2">🔒</div>
                <h1 className="text-xl font-bold text-white">No autorizado</h1>
                <p className="text-slate-400 text-sm max-w-sm">
                    Tu cuenta no tiene acceso al panel de administración.
                </p>

                {/* Debug panel — only visible in DEV */}
                {IS_DEV && debug && (
                    <div className="mt-4 bg-slate-900 border border-yellow-700 rounded-xl p-4 text-left text-xs max-w-lg w-full">
                        <p className="text-yellow-400 font-bold mb-2">🐛 Debug (solo visible en DEV)</p>
                        <p className="text-slate-300 mb-1">
                            <span className="text-slate-500">session.user.id: </span>
                            <span className="font-mono break-all">{debug.uid}</span>
                        </p>
                        {debug.error && (
                            <p className="text-red-400 mb-1">
                                <span className="text-slate-500">Error de query: </span>
                                {debug.error}
                            </p>
                        )}
                        {debug.data && (
                            <p className="text-slate-300 mb-1">
                                <span className="text-slate-500">Fila encontrada: </span>
                                <span className="font-mono">{JSON.stringify(debug.data)}</span>
                            </p>
                        )}
                        {debug.reason && (
                            <p className="text-yellow-300">
                                <span className="text-slate-500">Motivo: </span>
                                {debug.reason}
                            </p>
                        )}
                        <p className="text-slate-600 mt-2 text-xs">
                            Query: .from("core_app_users").select("role, property_id, auth_user_id").eq("auth_user_id", uid).maybeSingle()
                        </p>
                    </div>
                )}

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="mt-2 text-sm text-primary-400 underline"
                >
                    Cerrar sesión
                </button>
            </div>
        )
    }

    return <Outlet />
}

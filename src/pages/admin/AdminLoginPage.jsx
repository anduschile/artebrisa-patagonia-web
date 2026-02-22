import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function AdminLoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)

    // If already logged in, skip to dashboard
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/admin/reservas', { replace: true })
            else setChecking(false)
        })
    }, [navigate])

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (authError) {
            setError(authError.message.includes('Invalid')
                ? 'Credenciales inválidas. Verificá email y contraseña.'
                : authError.message)
        } else {
            navigate('/admin/reservas', { replace: true })
        }
    }

    if (checking) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500 mb-4">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-black text-white">ArteBrisa <span className="text-slate-400 font-normal">Admin</span></h1>
                    <p className="text-slate-500 text-sm mt-1">Panel de administración</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl p-7 border border-slate-800 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-600"
                            placeholder="admin@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Contraseña</label>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-slate-600"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                        {loading ? 'Ingresando…' : 'Ingresar'}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-600 mt-6">
                    Arte Brisa Patagonia © 2026
                </p>
            </div>
        </div>
    )
}

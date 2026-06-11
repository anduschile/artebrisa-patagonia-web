import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <span className="font-black text-white text-2xl tracking-tight">Arte<span className="text-primary-400">Brisa</span> Patagonia</span>
                    </div>
                    <h1 className="text-white font-bold text-lg">Panel Administrativo</h1>
                    <p className="text-slate-400 text-sm mt-1">Ingresá con tus credenciales</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-7 shadow-2xl space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
                            placeholder="admin@ejemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Contraseña</label>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
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

                <p className="text-center text-xs text-slate-500 mt-6">
                    Arte Brisa Patagonia © 2026
                </p>
            </div>
        </div>
    )
}

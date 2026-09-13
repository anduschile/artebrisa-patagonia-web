import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

const MIN_LENGTH = 6

export default function ChangePasswordModal({ onClose }) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)

        if (password.length < MIN_LENGTH) {
            setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`)
            return
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)
        const { error: updateError } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (updateError) {
            setError(updateError.message)
        } else {
            toast.success('Contraseña actualizada')
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-gray-900 font-black text-lg">Cambiar contraseña</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nueva contraseña</label>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-primary-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-900 focus:outline-none focus:border-primary-500 transition-colors"
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
                        className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar contraseña'}
                    </button>
                </form>
            </div>
        </div>
    )
}

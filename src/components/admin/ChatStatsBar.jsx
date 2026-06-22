import { useState, useEffect } from 'react'
import { getConversationStats } from '../../data/admin/chat'

const PERIODS = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'all', label: 'Todas' },
]

export default function ChatStatsBar() {
    const [period, setPeriod] = useState('week')
    const [stats, setStats] = useState({ total: 0, period: 'week' })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const data = await getConversationStats(period)
                setStats(data)
            } catch (e) {
                console.error('Error loading stats:', e)
                setStats({ total: 0, period })
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [period])

    return (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
            {/* Period buttons */}
            <div className="flex gap-2">
                {PERIODS.map(p => (
                    <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`
                            text-sm px-3 py-1.5 rounded transition-colors font-medium
                            ${period === p.value
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }
                        `}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Stats display */}
            <div className="flex items-center gap-2 text-sm">
                {loading ? (
                    <span className="text-gray-400">Cargando...</span>
                ) : (
                    <>
                        <span className="text-2xl font-bold text-gray-900">
                            {stats.total}
                        </span>
                        <span className="text-gray-600">
                            {stats.total === 1 ? 'conversación' : 'conversaciones'}
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}

/**
 * FilterBar — Capacidad + Servicios
 * Shared by CabanasPage and DepartamentosPage.
 *
 * Props:
 *   capacities: number[]   — available capacity options to show (e.g. [2,3,4,5,6])
 *   services:   string[]   — service labels available to filter by (from SERVICES_BY_TYPE)
 *   filters:    { capacity: number|null, services: string[] }
 *   onChange:   (filters) => void
 */
export default function FilterBar({ capacities = [2, 3, 4, 5, 6], services = [], filters, onChange }) {
    function setCapacity(val) {
        onChange({ ...filters, capacity: val })
    }

    function toggleService(label) {
        const next = filters.services.includes(label)
            ? filters.services.filter(s => s !== label)
            : [...filters.services, label]
        onChange({ ...filters, services: next })
    }

    function clear() {
        onChange({ capacity: null, services: [] })
    }

    const hasActive = filters.capacity !== null || filters.services.length > 0

    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-8 flex flex-wrap gap-4 items-end">

            {/* Capacidad */}
            <div className="flex-shrink-0">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Capacidad
                </label>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setCapacity(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filters.capacity === null
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                            }`}
                    >
                        Todas
                    </button>
                    {capacities.map(n => (
                        <button
                            key={n}
                            onClick={() => setCapacity(n)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filters.capacity === n
                                    ? 'bg-primary-500 text-white border-primary-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                                }`}
                        >
                            {n}+ personas
                        </button>
                    ))}
                </div>
            </div>

            {/* Servicios */}
            {services.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                        Servicios
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {services.map(label => {
                            const active = filters.services.includes(label)
                            return (
                                <button
                                    key={label}
                                    onClick={() => toggleService(label)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active
                                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200'
                                        }`}
                                >
                                    {active ? '✓ ' : ''}{label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Clear */}
            {hasActive && (
                <button
                    onClick={clear}
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2 self-center ml-auto"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    )
}

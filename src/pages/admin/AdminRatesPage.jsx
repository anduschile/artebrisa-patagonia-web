import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { confirmToast } from '../../lib/confirmToast'
import RateEditModal from '../../components/admin/RateEditModal'
import {
    getRateRules,
    createRateRule,
    updateRateRule,
    deleteRateRule,
    updateUnitBasePrice,
    computeEffectivePrice,
} from '../../data/admin/rateRules'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const SCOPE_LABEL = { all: 'Todas', cabana: 'Cabañas', departamento: 'Departamentos', manual: 'Manual' }

const EMPTY_RULE = {
    name: '',
    adj_type: 'percent',
    adj_value: '',
    date_from: '',
    date_to: '',
    unit_scope: 'all',
    unit_ids: [],
    is_active: true,
    sort_order: 0,
}

function fmt(n) {
    if (!n && n !== 0) return '—'
    return `$${Number(n).toLocaleString('es-CL')}`;
}

// ── Price source indicators ──────────────────────────────────
const SOURCE_CLS = {
    override: 'text-primary-700 underline decoration-primary-400/50 underline-offset-4',
    rules:    'text-emerald-700 font-bold',
    base:     'text-gray-500',
}
const SOURCE_TITLE = {
    override: 'Override manual — ignora reglas',
    rules:    'Calculado: precio base + reglas activas',
    base:     'Precio base de la unidad',
}

export default function AdminRatesPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [units, setUnits] = useState([])
    const [dailyRates, setDailyRates] = useState({})
    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('all')
    const [showInactive, setShowInactive] = useState(false)
    const [selectedCell, setSelectedCell] = useState(null)

    // ── Rule form state ──────────────────────────────────────
    const [ruleModal, setRuleModal] = useState(null)   // null | 'new' | rule-object (edit)
    const [ruleForm, setRuleForm] = useState(EMPTY_RULE)
    const [savingRule, setSavingRule] = useState(false)

    // ── Base price inline edit ───────────────────────────────
    const [editingBasePrice, setEditingBasePrice] = useState(null)  // unitId | null
    const [basePriceInput, setBasePriceInput] = useState('')
    const [savingBasePrice, setSavingBasePrice] = useState(false)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])
    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [unitsRes, ratesRes, fetchedRules] = await Promise.all([
                supabase.from('core_units').select('*').order('name'),
                supabase
                    .from('core_unit_daily_rates')
                    .select('*')
                    .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
                    .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`),
                getRateRules(),
            ])
            setUnits(unitsRes.data || [])
            const map = {}
            unitsRes.data?.forEach(u => { map[`bp_${u.id}`] = u.base_price })
            ratesRes.data?.forEach(r => { map[`${r.unit_id}_${r.date}`] = r.price })
            setDailyRates(map)
            setRules(fetchedRules)
        } catch (err) {
            toast.error(`Error cargando datos: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }, [year, month, daysInMonth])

    useEffect(() => { fetchData() }, [fetchData])

    const filteredUnits = useMemo(() =>
        units.filter(u => {
            const matchesType = typeFilter === 'all' || u.unit_type === typeFilter
            const matchesActive = showInactive || u.is_active !== false
            return matchesType && matchesActive
        }),
    [units, typeFilter, showInactive])

    function getEffectivePrice(unit, day) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return computeEffectivePrice(unit.base_price ?? 0, dateStr, unit.id, unit.unit_type, rules, dailyRates)
    }

    // ── Base price editing ───────────────────────────────────
    function startEditBasePrice(unit) {
        setEditingBasePrice(unit.id)
        setBasePriceInput(String(unit.base_price ?? 0))
    }
    async function saveBasePrice(unit) {
        const val = Number(basePriceInput)
        if (isNaN(val) || val < 0) { toast.error('Precio inválido'); return }
        setSavingBasePrice(true)
        try {
            await updateUnitBasePrice(unit.id, val)
            setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, base_price: val } : u))
            setEditingBasePrice(null)
            toast.success('Precio base actualizado')
            fetchData()
        } catch (err) {
            toast.error(`Error: ${err.message}`)
        } finally {
            setSavingBasePrice(false)
        }
    }

    // ── Rule CRUD ────────────────────────────────────────────
    function openNewRule() {
        setRuleForm({ ...EMPTY_RULE })
        setRuleModal('new')
    }
    function openEditRule(rule) {
        setRuleForm({ ...rule })
        setRuleModal(rule)
    }
    async function handleSaveRule(e) {
        e.preventDefault()
        if (!ruleForm.name.trim()) { toast.error('El nombre es obligatorio'); return }
        if (!ruleForm.date_from || !ruleForm.date_to) { toast.error('Las fechas son obligatorias'); return }
        if (ruleForm.date_to < ruleForm.date_from) { toast.error('Fecha fin debe ser igual o posterior a fecha inicio'); return }
        const val = Number(ruleForm.adj_value)
        if (isNaN(val)) { toast.error('El valor de ajuste debe ser un número'); return }

        setSavingRule(true)
        try {
            const payload = { ...ruleForm, adj_value: val, unit_ids: ruleForm.unit_ids || [] }
            delete payload.id; delete payload.created_at; delete payload.updated_at
            if (ruleModal === 'new') {
                await createRateRule(payload)
                toast.success('Regla creada')
            } else {
                await updateRateRule(ruleModal.id, payload)
                toast.success('Regla actualizada')
            }
            setRuleModal(null)
            fetchData()
        } catch (err) {
            toast.error(`Error: ${err.message}`)
        } finally {
            setSavingRule(false)
        }
    }
    async function handleToggleRule(rule) {
        try {
            await updateRateRule(rule.id, { is_active: !rule.is_active })
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
        } catch (err) {
            toast.error(`Error: ${err.message}`)
        }
    }
    async function handleDeleteRule(rule) {
        const ok = await confirmToast(`¿Eliminar la regla "${rule.name}"?`, { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' })
        if (!ok) return
        try {
            await deleteRateRule(rule.id)
            setRules(prev => prev.filter(r => r.id !== rule.id))
            toast.success('Regla eliminada')
        } catch (err) {
            toast.error(`Error: ${err.message}`)
        }
    }

    if (loading && units.length === 0) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Tarifas Diarias</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Gestiona precios base, reglas de ajuste y overrides por día</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold transition-colors">HOY</button>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 px-2 hover:bg-gray-100 text-gray-700 rounded transition-colors">&lt;</button>
                        <span className="px-4 text-sm font-bold text-gray-900 min-w-[140px] text-center">{MONTHS_ES[month]} {year}</span>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 px-2 hover:bg-gray-100 text-gray-700 rounded transition-colors">&gt;</button>
                    </div>
                </div>
            </div>

            {/* ── Precio base por unidad ── */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-700">Precio base por unidad</h2>
                    <span className="text-xs text-gray-400">Clic en el precio para editar</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {filteredUnits.map(unit => (
                        <div key={unit.id} className="flex items-center gap-3 px-5 py-2.5">
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-semibold text-gray-800 truncate">{unit.name}</span>
                                <span className="text-xs text-gray-400 font-mono ml-2">{unit.code}</span>
                            </div>
                            {editingBasePrice === unit.id ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={basePriceInput}
                                        onChange={e => setBasePriceInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveBasePrice(unit); if (e.key === 'Escape') setEditingBasePrice(null) }}
                                        className="w-28 border border-primary-400 rounded-lg px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        autoFocus
                                    />
                                    <button onClick={() => saveBasePrice(unit)} disabled={savingBasePrice} className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
                                        {savingBasePrice ? '…' : 'OK'}
                                    </button>
                                    <button onClick={() => setEditingBasePrice(null)} className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors">✕</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEditBasePrice(unit)}
                                    className="text-sm font-bold text-gray-600 hover:text-primary-700 hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors"
                                    title="Editar precio base"
                                >
                                    {fmt(unit.base_price)}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Reglas de ajuste ── */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-700">Reglas de ajuste</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Se aplican al precio base cuando no hay override manual. El orden importa.</p>
                    </div>
                    <button
                        onClick={openNewRule}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nueva regla
                    </button>
                </div>

                {rules.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-400 text-sm">
                        Sin reglas. Los precios de la grilla muestran el precio base de cada unidad.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {rules.map((rule, idx) => (
                            <div key={rule.id} className={`flex items-center gap-3 px-5 py-3 ${!rule.is_active ? 'opacity-50' : ''}`}>
                                {/* Order badge */}
                                <span className="text-[10px] font-black text-gray-300 w-4 text-center shrink-0">{idx + 1}</span>

                                {/* Toggle */}
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={rule.is_active}
                                    onClick={() => handleToggleRule(rule)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${rule.is_active ? 'bg-primary-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-800">{rule.name}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rule.adj_value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                            {rule.adj_value >= 0 ? '+' : ''}{rule.adj_value}{rule.adj_type === 'percent' ? '%' : ' CLP'}
                                        </span>
                                        <span className="text-xs text-gray-400">{SCOPE_LABEL[rule.unit_scope] || rule.unit_scope}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {rule.date_from} → {rule.date_to}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEditRule(rule)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Editar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                    <button onClick={() => handleDeleteRule(rule)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-x-auto pb-2">
                <div className="flex items-center gap-2">
                    <FilterButton active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Todas</FilterButton>
                    <FilterButton active={typeFilter === 'cabana'} onClick={() => setTypeFilter('cabana')}>Cabañas</FilterButton>
                    <FilterButton active={typeFilter === 'departamento'} onClick={() => setTypeFilter('departamento')}>Departamentos</FilterButton>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group px-1">
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                        <div className={`block w-8 h-5 rounded-full transition-colors ${showInactive ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showInactive ? 'translate-x-3' : ''}`} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">Ver inactivas</span>
                </label>
            </div>

            {/* ── Price grid ── */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-clip">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30">
                            <tr className="bg-gray-50 shadow-[0_1px_0_0_#e5e7eb]">
                                <th className="sticky left-0 z-40 bg-gray-50 py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[200px]">
                                    Unidad
                                </th>
                                {daysArray.map(day => {
                                    const date = new Date(year, month, day)
                                    const dayName = DAYS_ES[date.getDay()]
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                    return (
                                        <th key={day} className={`py-2 px-1 text-center border-b border-gray-200 min-w-[60px] ${isWeekend ? 'bg-gray-100' : ''}`}>
                                            <div className="text-[10px] text-gray-400 uppercase">{dayName}</div>
                                            <div className={`text-sm font-black ${isWeekend ? 'text-primary-600' : 'text-gray-700'}`}>{day}</div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUnits.map(unit => (
                                <tr key={unit.id} className={`hover:bg-gray-50 transition-colors ${unit.is_active === false ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                    <td className="sticky left-0 z-10 bg-white py-3 px-4 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-bold text-gray-900 truncate">{unit.name}</div>
                                            {unit.is_active === false && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase font-black border border-gray-200">Inactiva</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">{unit.code}</div>
                                    </td>
                                    {daysArray.map(day => {
                                        const { price, source } = getEffectivePrice(unit, day)
                                        return (
                                            <td
                                                key={day}
                                                onClick={() => setSelectedCell({ unit, date: new Date(year, month, day) })}
                                                className={`py-3 px-1 text-center border-b border-r border-gray-200 cursor-pointer transition-all hover:bg-primary-50 ${source === 'override' ? 'bg-primary-50' : ''}`}
                                                title={SOURCE_TITLE[source]}
                                            >
                                                <div className={`text-[11px] font-bold ${SOURCE_CLS[source]}`}>
                                                    ${(price / 1000).toFixed(0)}k
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-6 text-xs text-gray-500 px-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                    <span className={SOURCE_CLS.base}>Precio base</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
                    <span className={SOURCE_CLS.rules}>Con regla activa</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary-50 border border-primary-200" />
                    <span className={SOURCE_CLS.override}>Override manual</span>
                </div>
            </div>

            {/* ── Override modal ── */}
            {selectedCell && (
                <RateEditModal
                    unit={selectedCell.unit}
                    initialDate={selectedCell.date}
                    currentMonth={month}
                    currentYear={year}
                    onClose={() => setSelectedCell(null)}
                    onSaved={fetchData}
                />
            )}

            {/* ── Rule modal ── */}
            {ruleModal !== null && (
                <RuleModal
                    form={ruleForm}
                    setForm={setRuleForm}
                    units={units}
                    isNew={ruleModal === 'new'}
                    saving={savingRule}
                    onSave={handleSaveRule}
                    onClose={() => setRuleModal(null)}
                />
            )}
        </div>
    )
}

// ── Sub-components ───────────────────────────────────────────

function FilterButton({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${active
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
        >
            {children}
        </button>
    )
}

function RuleModal({ form, setForm, units, isNew, saving, onSave, onClose }) {
    const inputCls = "bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
    const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"

    function toggleUnit(uid) {
        const ids = form.unit_ids || []
        const str = String(uid)
        setForm(f => ({
            ...f,
            unit_ids: ids.map(String).includes(str)
                ? ids.filter(id => String(id) !== str)
                : [...ids, uid],
        }))
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-gray-900 font-black text-base">{isNew ? 'Nueva regla' : 'Editar regla'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={onSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    {/* Name */}
                    <div>
                        <label className={labelCls}>Nombre *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className={inputCls}
                            placeholder="Ej: Temporada alta, Comisión Airbnb…"
                            required
                        />
                    </div>

                    {/* Adjustment */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Tipo de ajuste *</label>
                            <select value={form.adj_type} onChange={e => setForm(f => ({ ...f, adj_type: e.target.value }))} className={inputCls}>
                                <option value="percent">Porcentaje (%)</option>
                                <option value="fixed">Monto fijo (CLP)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Valor * {form.adj_type === 'percent' ? '(ej: 15 o -10)' : '(ej: 5000 o -3000)'}</label>
                            <input
                                type="number"
                                step="any"
                                value={form.adj_value}
                                onChange={e => setForm(f => ({ ...f, adj_value: e.target.value }))}
                                className={inputCls}
                                placeholder={form.adj_type === 'percent' ? '15' : '5000'}
                                required
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Fecha inicio *</label>
                            <input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha fin *</label>
                            <input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} className={inputCls} required />
                        </div>
                    </div>

                    {/* Scope */}
                    <div>
                        <label className={labelCls}>Aplica a</label>
                        <select value={form.unit_scope} onChange={e => setForm(f => ({ ...f, unit_scope: e.target.value }))} className={inputCls}>
                            <option value="all">Todas las unidades</option>
                            <option value="cabana">Solo cabañas</option>
                            <option value="departamento">Solo departamentos</option>
                            <option value="manual">Selección manual</option>
                        </select>
                    </div>

                    {/* Manual unit selection */}
                    {form.unit_scope === 'manual' && (
                        <div>
                            <label className={labelCls}>Seleccionar unidades</label>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                {units.filter(u => u.is_active !== false).map(unit => {
                                    const checked = (form.unit_ids || []).map(String).includes(String(unit.id))
                                    return (
                                        <label key={unit.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleUnit(unit.id)}
                                                className="accent-primary-600"
                                            />
                                            <span className="text-sm text-gray-700">{unit.name}</span>
                                            <span className="text-xs text-gray-400 font-mono">{unit.code}</span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sort order */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Orden de aplicación</label>
                            <input
                                type="number"
                                value={form.sort_order}
                                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                className={inputCls}
                                min="0"
                            />
                        </div>
                        <div className="flex items-end pb-0.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="accent-primary-600 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-700">Regla activa</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50">
                            {saving ? 'Guardando…' : isNew ? 'Crear regla' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

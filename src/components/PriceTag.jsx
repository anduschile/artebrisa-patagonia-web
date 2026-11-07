import { useTranslation } from 'react-i18next'
import { useLang } from '../i18n/LangContext'
import { useUsdRate } from '../data/fx'
import { approxUsd, formatUsdAmount, formatFxRate, formatFxDate, fxSourceLabel } from '../data/usdDisplay'

// USD referencial, solo en en/de/pt y solo con un tipo de cambio válido y vigente (ver data/fxRules.js
// y data/usdDisplay.js); si no, no renderiza nada y la pantalla queda solo en CLP.
// La nota (tasa, fecha, fuente, "se cobra en CLP") va en un <details> para no saturar el móvil.
// showCharge antepone la línea "se cobra en CLP" (solo aparece junto con el USD).
export function UsdEstimate({ clp, className = '', showCharge = false }) {
    const { t } = useTranslation()
    const lang = useLang()
    const fx = useUsdRate()
    const usd = approxUsd(lang, clp, fx)
    if (usd === null) return null
    return (
        <div className={showCharge ? 'text-right' : undefined}>
            {showCharge && <div className="text-[10px] text-slate-400">{t('price.clpCharge')}</div>}
            <details className={`group text-xs text-slate-500 ${className}`}>
                <summary className="cursor-pointer list-none inline-flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold text-slate-600">{t('price.usdApprox', { amount: formatUsdAmount(usd, lang) })}</span>
                    <span aria-label={t('price.usdEstimate')} className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-[10px] leading-none">i</span>
                </summary>
                <p className="mt-1 leading-snug">
                    {t('price.usdNote', { rate: formatFxRate(fx.rate, lang), date: formatFxDate(fx.asOf, lang), source: fxSourceLabel(fx.source, lang) })}
                </p>
            </details>
        </div>
    )
}

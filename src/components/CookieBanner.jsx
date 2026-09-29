import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ANALYTICS_CONFIGURED, getStoredConsent, setConsent } from '../lib/analytics'

// Otros componentes disparan este evento (ej. el link "Cookies" del footer)
// para reabrir el aviso aunque el visitante ya haya elegido antes.
export const COOKIE_BANNER_REOPEN_EVENT = 'ab-cookie-banner:open'

export default function CookieBanner() {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!ANALYTICS_CONFIGURED) return
        if (getStoredConsent() === null) setVisible(true)
    }, [])

    useEffect(() => {
        function reopen() { setVisible(true) }
        window.addEventListener(COOKIE_BANNER_REOPEN_EVENT, reopen)
        return () => window.removeEventListener(COOKIE_BANNER_REOPEN_EVENT, reopen)
    }, [])

    if (!ANALYTICS_CONFIGURED || !visible) return null

    function choose(granted) {
        setConsent(granted)
        setVisible(false)
    }

    return (
        <div
            role="dialog"
            aria-label={t('cookieBanner.text')}
            className="fixed z-40 bottom-[92px] left-3 right-3 sm:left-4 sm:right-auto sm:bottom-4 sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5"
        >
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">{t('cookieBanner.text')}</p>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => choose(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-slate-700 hover:bg-slate-800 text-white transition-colors"
                >
                    {t('cookieBanner.reject')}
                </button>
                <button
                    type="button"
                    onClick={() => choose(true)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                >
                    {t('cookieBanner.accept')}
                </button>
            </div>
        </div>
    )
}

import { Helmet } from 'react-helmet-async'
import { useLang } from '../i18n/LangContext'
import { SUPPORTED_LANGS, DEFAULT_LANG, withLang } from '../i18n/languages'
import { SITE_URL } from '../seo/pageMeta'

/**
 * <head> dinámico por página: title, meta description, canonical y
 * hreflang hacia las 3 versiones de idioma de la misma página. Reemplaza
 * el <title>/<meta description> único y compartido de index.html.
 *
 * @param {string} path     — ruta SIN prefijo de idioma, ej. '/cabanas' o '/unidad/dep-1'
 * @param {string} title
 * @param {string} description
 */
export default function SeoHead({ path, title, description }) {
    const lang = useLang()
    const canonicalUrl = `${SITE_URL}${withLang(lang, path)}`

    return (
        <Helmet>
            <html lang={lang} />
            <title>{title}</title>
            <meta name="description" content={description} />

            <link rel="canonical" href={canonicalUrl} />
            {SUPPORTED_LANGS.map(l => (
                <link key={l} rel="alternate" hrefLang={l} href={`${SITE_URL}${withLang(l, path)}`} />
            ))}
            <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${withLang(DEFAULT_LANG, path)}`} />

            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
        </Helmet>
    )
}

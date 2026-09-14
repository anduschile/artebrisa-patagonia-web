import { useEffect } from 'react'

// Etiquetas del <head> específicas del panel admin (PWA "agregar a inicio" en iPhone).
// index.html es único para todo el sitio (SPA), así que estas etiquetas NO pueden vivir
// ahí como estáticas sin afectar también al sitio público — se inyectan/retiran acá según
// la ruta actual, solo mientras el usuario está en /admin/*.
const ADMIN_META_TAGS = [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'ArteBrisa' },
    { name: 'theme-color', content: '#2563ff' },
]

const ADMIN_APPLE_TOUCH_ICON = '/apple-touch-icon.png'

/**
 * Inyecta el manifest.json, el apple-touch-icon del panel admin y las meta tags de PWA
 * en el <head> solo mientras `isAdminRoute` es true. Al salir de /admin, restaura el
 * apple-touch-icon original del sitio público (logo de cabañas) y quita todo lo demás.
 */
export function useAdminPwaTags(isAdminRoute) {
    useEffect(() => {
        if (!isAdminRoute) return

        // El sitio público ya trae su propio <link rel="apple-touch-icon"> estático en
        // index.html — se le cambia el href temporalmente en vez de duplicar el tag,
        // para no dejar dos apple-touch-icon compitiendo en el <head> al mismo tiempo.
        const publicAppleIcon = document.querySelector('link[rel="apple-touch-icon"]')
        const originalAppleIconHref = publicAppleIcon?.getAttribute('href') ?? null
        if (publicAppleIcon) publicAppleIcon.setAttribute('href', ADMIN_APPLE_TOUCH_ICON)

        const manifestLink = document.createElement('link')
        manifestLink.rel = 'manifest'
        manifestLink.href = '/manifest.json'
        document.head.appendChild(manifestLink)

        const metaElements = ADMIN_META_TAGS.map(({ name, content }) => {
            const meta = document.createElement('meta')
            meta.setAttribute('name', name)
            meta.setAttribute('content', content)
            document.head.appendChild(meta)
            return meta
        })

        return () => {
            if (publicAppleIcon && originalAppleIconHref) {
                publicAppleIcon.setAttribute('href', originalAppleIconHref)
            }
            manifestLink.remove()
            metaElements.forEach(meta => meta.remove())
        }
    }, [isAdminRoute])
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useEffect(() => {
        if (hash) {
            // Give the DOM a tick to render the new page
            const id = setTimeout(() => {
                const el = document.querySelector(hash)
                if (el) {
                    const navH = 64 // matches h-16
                    const top = el.getBoundingClientRect().top + window.scrollY - navH
                    window.scrollTo({ top, behavior: 'smooth' })
                }
            }, 80)
            return () => clearTimeout(id)
        } else {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }
    }, [pathname, hash])

    return null
}

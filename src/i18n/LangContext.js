import { createContext, useContext } from 'react'
import { DEFAULT_LANG } from './languages'

// Default 'es' cubre las rutas sin prefijo, que no tienen ningún Provider
// por encima (ver LangLayout.jsx para las rutas /en/* y /de/*).
export const LangContext = createContext(DEFAULT_LANG)

export function useLang() {
    return useContext(LangContext)
}

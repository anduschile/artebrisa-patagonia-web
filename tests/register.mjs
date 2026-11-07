// Permite importar módulos del front sin extensión (como hace Vite) al probarlos con node --test.
import { register } from 'node:module'
register('./resolve-ext.mjs', import.meta.url)

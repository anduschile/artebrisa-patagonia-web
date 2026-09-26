/**
 * Descripción de la unidad en el idioma pedido. 'es' usa `description`;
 * 'en'/'de' usan `description_en`/`description_de` y, si esa columna viene
 * vacía, caen a la descripción en español en vez de dejar la unidad sin texto.
 */
export function localizedDescription(unit, lang) {
    const es = unit.description?.trim()
    if (lang === 'en') return unit.description_en?.trim() || es
    if (lang === 'de') return unit.description_de?.trim() || es
    return es
}

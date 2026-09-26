/**
 * Descripción de la unidad en el idioma pedido. 'es' usa `description`;
 * 'en'/'de'/'pt' usan `description_en`/`description_de`/`description_pt` y, si esa columna viene
 * vacía, caen a la descripción en español en vez de dejar la unidad sin texto.
 */
export function localizedDescription(unit, lang) {
    const es = unit.description?.trim()
    if (lang === 'en') return unit.description_en?.trim() || es
    if (lang === 'de') return unit.description_de?.trim() || es
    if (lang === 'pt') return unit.description_pt?.trim() || es
    return es
}

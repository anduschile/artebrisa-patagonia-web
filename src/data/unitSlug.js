/**
 * Slug legible de unidad para URLs (/unidad/cab-chilco en vez de un UUID).
 * Se deriva de unit.code, que ya es único por unidad en core_units
 * (ej. 'CAB-CHILCO' -> 'cab-chilco', 'DEP-1' -> 'dep-1').
 *
 * Fallback a unit.id si por alguna razón la unidad no trae code (no
 * debería pasar dado el schema actual, pero evita un link roto).
 */
export function unitSlug(unit) {
    return unit?.code ? unit.code.toLowerCase() : unit?.id
}

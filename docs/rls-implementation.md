# Implementación de RLS — Arte Brisa Patagonia

> **Proyecto Supabase:** `khryuvmashcqwsuhhsdd`
> **Fecha:** 2026-05-27
> **Estado:** En ejecución (FASE 3)
> **Riesgo:** Sitio en producción con reservas activas. Sincronización iCal bidireccional con Airbnb activa.

---

## 1. Contexto

Se aplica Row Level Security (RLS) sobre tablas que hoy están **abiertas a la `anon` key**
(la anon key es pública: viaja en el bundle del sitio). Verificado el 2026-05-27 con sondeo
externo (HEAD + count, sin traer datos):

| Tabla | Filas | ¿Leíble por anon HOY? |
|---|---|---|
| core_companies | 1 | ❌ Sí (mal) |
| core_external_calendars | 12 | ❌ Sí — expone ICS URLs privadas de Airbnb/Booking |
| core_ical_sync_errors | 64 | ❌ Sí |
| core_properties | 1 | ❌ Sí |
| core_reservations | 43 | ❌ Sí — expone fechas, notes, montos |
| core_units | 12 | ✅ Sí (esperado: catálogo público) |

---

## 2. Diagnóstico (FASE 1)

- **Cliente frontend** (`src/lib/supabaseClient.js`): único cliente con la **anon key**
  (`VITE_SUPABASE_ANON_KEY`, JWT `role=anon`). Sitio público y admin usan la misma key;
  el admin solo agrega su JWT de sesión encima.
- **Auth admin**: Supabase Auth (`signInWithPassword`). Un admin = fila en `core_app_users`
  con `auth_user_id = auth.uid()` y `role IN ('admin','superadmin')`
  (`src/components/admin/AdminGuard.jsx`).
- **Edge Functions**:
  - `export-ical` y `sync-ical` usan `SUPABASE_SERVICE_ROLE_KEY` → **bypass RLS**.
  - GitHub Action `ical-sync.yml` no toca la base; hace `curl` a `sync-ical` con
    `x-ical-cron-token`. La función usa service_role internamente.
  - `service_role` tiene `BYPASSRLS` → **ninguna política de abajo la afecta**.
- **Uso de las tablas por el frontend**:
  - `core_companies`, `core_properties`, `core_ical_sync_errors`: **el frontend nunca las consulta.**
    El sitio público muestra unidades desde `core_units` / `core_unit_daily_rates`, NO desde `core_properties`.
  - `core_external_calendars`: la lee/edita solo el **panel admin** (`src/data/admin/icalSync.js`:
    `SELECT` + `UPDATE is_active`). Alta de calendarios = Table Editor (service_role).
  - `core_reservations`: el **sitio público la lee Y escribe**:
    - `getConflicts` (`src/data/reservations.js`): SELECT `id, check_in, check_out, status` por unidad (disponibilidad).
    - `createInquiryReservation`: INSERT de `status='inquiry'` + `.select()` de vuelta.
    - Huéspedes se crean vía RPC `find_or_create_guest` (SECURITY DEFINER) → no requiere acceso directo a `core_guests`.

---

## 3. Decisiones

1. **core_properties**: bloqueada a anon (el sitio público no la usa). Solo admin.
2. **core_reservations**: incluida en el alcance. Se aplica **Opción R1** (candado funcional, solo SQL).
3. **Ejecución**: el dueño corre el SQL en el SQL Editor de Supabase; Claude verifica el bloqueo
   desde afuera con curl + anon key.

---

## 4. Estrategia por tabla

| Tabla | Política |
|---|---|
| core_ical_sync_errors | Solo admin (anon bloqueado total) |
| core_companies | Solo admin (anon bloqueado total) |
| core_properties | Solo admin (anon bloqueado total) |
| core_external_calendars | Solo admin full (anon bloqueado); service_role bypass |
| core_reservations (R1) | Admin full; anon: INSERT solo `status='inquiry'` + SELECT (necesario para disponibilidad) |

---

## 5. SQL aplicado

### Paso 0 — Helper `is_admin()` (prerequisito)

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from core_app_users u
    where u.auth_user_id = auth.uid()
      and u.role in ('admin','superadmin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
```

### a. core_ical_sync_errors
```sql
alter table core_ical_sync_errors enable row level security;
create policy "rls_admin_all_ical_sync_errors" on core_ical_sync_errors
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

### b. core_companies
```sql
alter table core_companies enable row level security;
create policy "rls_admin_all_companies" on core_companies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

### c. core_properties
```sql
alter table core_properties enable row level security;
create policy "rls_admin_all_properties" on core_properties
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

### d. core_external_calendars
```sql
alter table core_external_calendars enable row level security;
create policy "rls_admin_all_external_calendars" on core_external_calendars
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

### e. core_reservations (R1 — CONSOLIDACIÓN, no creación)

**Estado encontrado en el backup (2026-05-27):** `core_reservations` **YA tenía RLS activo**
con 9 políticas (con duplicados/triplicados) que funcionalmente ya implementan R1:
- 4 admin separadas por cmd: `Admins can {select,insert,update,delete} reservations` (`authenticated`).
- INSERT inquiry duplicada: `anon_insert_inquiry_reservations` + `web_insert_inquiry_reservations`.
- SELECT availability triplicada: `anon_select_reservations_for_availability`
  + `web_select_reservations_for_availability` + `public_select_reservations_for_availability`.

**Acción:** NO crear políticas nuevas funcionales. Consolidar dentro de una transacción a:
1 admin-all (usando `is_admin()`) + 1 anon-insert-inquiry + 1 anon-select.
**El predicado de anon-select se preserva EXACTAMENTE igual al actual** (no se afloja).
RLS permanece habilitado todo el tiempo.

Volcado confirmado (2026-05-27): las 4 admin usan el predicado equivalente a `is_admin()`;
las INSERT inquiry son idénticas (`with check status='inquiry'`); las 3 SELECT usan
`using (status = ANY (ARRAY['inquiry','confirmed','blocked']))` → se preserva EXACTO.

```sql
begin;

-- Admin: 4 por-cmd → 1 sola con is_admin()
drop policy if exists "Admins can select reservations" on core_reservations;
drop policy if exists "Admins can insert reservations" on core_reservations;
drop policy if exists "Admins can update reservations" on core_reservations;
drop policy if exists "Admins can delete reservations" on core_reservations;

-- INSERT inquiry: quitar duplicada
drop policy if exists "anon_insert_inquiry_reservations" on core_reservations;
drop policy if exists "web_insert_inquiry_reservations"  on core_reservations;

-- SELECT availability: quitar triplicadas
drop policy if exists "anon_select_reservations_for_availability"   on core_reservations;
drop policy if exists "web_select_reservations_for_availability"    on core_reservations;
drop policy if exists "public_select_reservations_for_availability" on core_reservations;

-- Recrear consolidado (RLS sigue habilitado)
create policy "rls_admin_all_reservations" on core_reservations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "rls_anon_insert_inquiry" on core_reservations
  for insert to anon
  with check (status = 'inquiry');

create policy "rls_anon_select_reservations" on core_reservations
  for select to anon
  using (status = ANY (ARRAY['inquiry'::text, 'confirmed'::text, 'blocked'::text]));

commit;
```
> Nota: el filtro de `rls_anon_select_reservations` se copia idéntico al actual (excluye `cancelled`).
> Roles: el `SELECT` consolidado queda `to anon`; los admin (authenticated) leen vía `rls_admin_all_reservations`.
> No hay usuarios `authenticated` no-admin en esta app, así que no se pierde acceso.

---

## 6. Rollback por tabla

```sql
-- Reemplazar <tabla> y los nombres de política según corresponda
drop policy if exists "rls_admin_all_<tabla>" on <tabla>;
-- (core_reservations también: rls_anon_insert_inquiry, rls_anon_select_reservations)
alter table <tabla> disable row level security;
```

---

## 7. Bitácora de ejecución

| # | Paso | Ejecutado | Verificación anon | Estado |
|---|---|---|---|---|
| 0 | backup | ✅ 2026-05-27 | — | OK. Pre-estado: solo core_reservations tenía RLS (9 políticas con duplicados); las otras 4 sin RLS ni políticas. |
| 0 | is_admin() | ✅ 2026-05-27 | — | OK, sin error |
| a | core_ical_sync_errors | ✅ 2026-05-27 | ✅ anon `*/0` (antes 64) | OK |
| b | core_companies | ✅ 2026-05-27 | ✅ anon `*/0` (antes 1) | OK |
| c | core_properties | ✅ 2026-05-27 | ✅ anon `*/0` (antes 1); control: core_units sigue dando 12 | OK |
| d | core_external_calendars | ✅ 2026-05-27 | ✅ anon `*/0` (antes 12); panel admin ve 12 + toggle OK | OK |
| e | core_reservations (consolidación R1) | ✅ 2026-05-27 | ✅ ver matriz abajo | OK — 9 políticas → 3 |

### Verificación final core_reservations (2026-05-27)
Panel admin: lista ✅, calendario/agenda ✅, cambio de status ✅.
Curls anon:
- SELECT disponibilidad activa → HTTP 200, 43 filas ✅ (público intacto)
- INSERT `status='confirmed'` → **42501** RLS violation / HTTP 401 ✅ (rechazado)
- UPDATE → `[]` 0 filas ✅ (rechazado)
- DELETE → `[]` 0 filas ✅ (rechazado)
- Re-conteo → 43 (sin cambios) ✅

## Estado final (2026-05-27)

| Tabla | Anon antes | Anon después | RLS |
|---|---|---|---|
| core_ical_sync_errors | 64 filas | 🔒 0 | admin-only |
| core_companies | 1 fila | 🔒 0 | admin-only |
| core_properties | 1 fila | 🔒 0 | admin-only |
| core_external_calendars | 12 filas | 🔒 0 | admin-only (ICS URLs ya no expuestas) |
| core_reservations | 43 filas (RW abierto) | lectura activa OK; escritura solo `inquiry` | R1: admin-all + anon insert(inquiry) + anon select(activas) |
| core_units | 12 filas | 12 (público, intacto) | sin cambios |

Edge Functions (`export-ical`, `sync-ical`) y GitHub Action: sin afectar (service_role bypassa RLS).
Panel admin: funcionando con `is_admin()`. Sitio público: 12 unidades + disponibilidad OK.

### Smoke test iCal end-to-end bajo RLS (2026-05-27 17:32)
Sync manual disparado desde el panel: **0 insertadas / 33 actualizadas / 0 sin cambios / 0 errores**.
Las 12 unidades respondieron normalmente. ✅ Confirma que `sync-ical` (service_role) sigue
escribiendo en `core_reservations` con RLS habilitado.

---

## 8. PENDIENTE — Fase 2: R2 (endurecido real de core_reservations)

> **Planificado para la próxima semana (semana del 2026-06-01). Trabajo aparte — toca el frontend público + redeploy.**

R1 deja a `anon` con capacidad de **leer todas las filas** de `core_reservations`
(fechas, `status`, `notes`, `quoted_total`, `guest_id`). RLS es por fila, no por columna,
así que no oculta esas columnas. R2 cierra eso:

1. Crear una **vista** `public.public_availability` que exponga solo `unit_id, check_in, check_out, status`
   de reservas activas; `grant select` a `anon`.
2. Repuntar `getConflicts` (`src/data/reservations.js`) para que lea esa vista.
3. Recortar el `.select()` post-insert de `createInquiryReservation` a `.select('id')`
   (o columnas no sensibles), para no depender del SELECT directo de anon.
4. En `core_reservations`: quitar `rls_anon_select_reservations`; dejar a anon solo
   `INSERT (status='inquiry')`. Admin sigue full.
5. Resultado: anon no ve ninguna fila de reservas, solo rangos ocupados anónimos vía la vista.

**Costo/riesgo:** cambios de código en el sitio público + deploy → requiere su propio ciclo de prueba.

### Otros pendientes detectados (fuera del alcance original)
- `core_guests`, `core_channels`: revisar exposición a anon en una iteración futura
  (los huéspedes se crean vía RPC definer, pero conviene auditar el SELECT directo).
</content>

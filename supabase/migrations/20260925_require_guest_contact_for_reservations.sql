-- Requiere que el huésped tenga teléfono Y email antes de poder crear una
-- reserva 'inquiry' desde el sitio público. Motivo: caso real de una
-- huésped que reservó sin dejar ningún dato de contacto y no hubo forma de
-- coordinar check-in/pago con ella.
--
-- NO se agrega NOT NULL a core_guests.phone/email acá (hay huéspedes viejos
-- con esos campos vacíos y un ALTER TABLE con NOT NULL fallaría o rompería
-- esas filas — ver conteo pendiente antes de considerar esa migración por
-- separado).
--
-- Versión 2 de este archivo: la primera versión hacía un EXISTS directo
-- contra core_guests dentro de la política RLS de core_reservations. Se
-- confirmó (Content-Range: */0 en un SELECT anon a core_guests, pese a que
-- core_reservations.guest_id referencia filas reales) que 'anon' no tiene
-- permiso de lectura sobre core_guests — ese EXISTS habría evaluado siempre
-- a falso para 'anon' y bloqueado el 100% de las reservas del sitio, no
-- solo las que faltan contacto. Por eso el chequeo ahora pasa por una
-- función SECURITY DEFINER (mismo patrón que is_admin(), ya usado en este
-- proyecto — ver docs/rls-implementation.md): corre con privilegios propios,
-- bypassa RLS de core_guests internamente, y solo expone un true/false por
-- guest_id — 'anon' sigue sin poder leer core_guests directo.
--
-- ⚠️ ASUNCIÓN SIN VERIFICAR — revisar antes de correr esta migración:
-- se asume que las columnas de core_guests se llaman literalmente `phone`
-- y `email` (coincide con los parámetros p_phone/p_email de
-- find_or_create_guest en src/data/guests.js, pero no se pudo confirmar
-- por introspección directa de pg_policies/information_schema: este
-- entorno solo tiene el anon key, sin service_role ni Docker corriendo
-- para `supabase db dump`). Si los nombres reales son otros, ajustar el
-- WHERE antes de ejecutar.
--
-- No modifica find_or_create_guest(): esa función podría seguir creando un
-- guest con phone/email vacíos si alguien la llama directo, pero el INSERT
-- posterior en core_reservations quedará bloqueado por este check, así que
-- nunca se llega a generar una reserva sin datos de contacto completos.
--
-- No afecta al bot de WhatsApp (supabase/functions/whatsapp-bot) ni al
-- panel admin: ambos usan SUPABASE_SERVICE_ROLE_KEY / rol authenticated,
-- que no pasan por esta política de 'anon'.

begin;

create or replace function public.guest_has_contact(p_guest_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from core_guests g
    where g.id = p_guest_id
      and coalesce(trim(g.phone), '') <> ''
      and coalesce(trim(g.email), '') <> ''
  );
$$;

revoke all on function public.guest_has_contact(uuid) from public;
grant execute on function public.guest_has_contact(uuid) to anon, authenticated;

drop policy if exists "rls_anon_insert_inquiry" on core_reservations;

create policy "rls_anon_insert_inquiry" on core_reservations
  for insert to anon
  with check (
    status = 'inquiry'
    and public.guest_has_contact(guest_id)
  );

commit;

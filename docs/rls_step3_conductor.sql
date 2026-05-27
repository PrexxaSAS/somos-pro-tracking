-- Ejecutar SOLO en Supabase STAGING.
--
-- Politicas RLS para conductor.
--
-- Reglas:
-- - Conductor puede ver su propio perfil de conductor.
-- - Conductor puede ver solo pedidos asignados a su conductor_id.
-- - Conductor puede actualizar solo pedidos asignados a su conductor_id
--   para registrar entrega/novedad/soportes.
-- - Conductor puede leer catalogos necesarios para pantalla.

create or replace function public.current_conductor_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select conductor_id
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_conductor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'conductor'
$$;

drop policy if exists "conductores_select_self_conductor" on public.conductores;
drop policy if exists "pedidos_select_assigned_conductor" on public.pedidos;
drop policy if exists "pedidos_update_assigned_conductor" on public.pedidos;
drop policy if exists "ciudades_select_conductor" on public.ciudades;
drop policy if exists "transportistas_select_conductor" on public.transportistas;

create policy "conductores_select_self_conductor"
on public.conductores
for select
to authenticated
using (
  public.is_conductor()
  and id = public.current_conductor_id()
);

create policy "pedidos_select_assigned_conductor"
on public.pedidos
for select
to authenticated
using (
  public.is_conductor()
  and conductor_id = public.current_conductor_id()
);

create policy "pedidos_update_assigned_conductor"
on public.pedidos
for update
to authenticated
using (
  public.is_conductor()
  and conductor_id = public.current_conductor_id()
)
with check (
  public.is_conductor()
  and conductor_id = public.current_conductor_id()
);

create policy "ciudades_select_conductor"
on public.ciudades
for select
to authenticated
using (public.is_conductor());

create policy "transportistas_select_conductor"
on public.transportistas
for select
to authenticated
using (public.is_conductor());

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('conductores', 'pedidos', 'ciudades', 'transportistas')
order by tablename, policyname;

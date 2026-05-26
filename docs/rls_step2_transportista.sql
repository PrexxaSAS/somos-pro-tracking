-- Ejecutar SOLO en Supabase STAGING.
--
-- Politicas RLS para empresa transportista.
--
-- Reglas:
-- - Transportista puede ver su empresa.
-- - Transportista puede ver conductores asociados a su NIT.
-- - Transportista puede crear conductores asociados a su NIT.
-- - Transportista puede ver usuarios conductores asociados a su NIT.

create or replace function public.current_user_nit()
returns text
language sql
security definer
set search_path = public
as $$
  select nit
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_empresa()
returns text
language sql
security definer
set search_path = public
as $$
  select empresa
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_transportista()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'transportista'
$$;

drop policy if exists "transportistas_select_own_transportista" on public.transportistas;
drop policy if exists "transportadoras_select_own_transportista" on public.transportadoras;
drop policy if exists "conductores_select_own_transportista" on public.conductores;
drop policy if exists "conductores_transportista_insert" on public.conductores;
drop policy if exists "usuarios_select_transportista_drivers" on public.usuarios;
drop policy if exists "usuarios_transportista_insert_driver" on public.usuarios;

create policy "transportistas_select_own_transportista"
on public.transportistas
for select
to authenticated
using (
  public.is_transportista()
  and nit = public.current_user_nit()
);

create policy "transportadoras_select_own_transportista"
on public.transportadoras
for select
to authenticated
using (
  public.is_transportista()
  and nit = public.current_user_nit()
);

create policy "conductores_select_own_transportista"
on public.conductores
for select
to authenticated
using (
  public.is_transportista()
  and nit_proveedor = public.current_user_nit()
);

create policy "conductores_transportista_insert"
on public.conductores
for insert
to authenticated
with check (
  public.is_transportista()
  and nit_proveedor = public.current_user_nit()
);

create policy "usuarios_select_transportista_drivers"
on public.usuarios
for select
to authenticated
using (
  public.is_transportista()
  and rol = 'conductor'
  and nit_proveedor = public.current_user_nit()
);

create policy "usuarios_transportista_insert_driver"
on public.usuarios
for insert
to authenticated
with check (
  public.is_transportista()
  and rol = 'conductor'
  and nit_proveedor = public.current_user_nit()
);

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('transportistas', 'transportadoras', 'conductores', 'usuarios')
order by tablename, policyname;

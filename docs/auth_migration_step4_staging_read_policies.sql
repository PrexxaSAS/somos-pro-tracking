-- Ejecutar SOLO en Supabase STAGING: somos-pro-tracking-prueba.
--
-- Politicas temporales de lectura para continuar validando la app con Auth.
-- No usar todavia en produccion como politica final.
--
-- Objetivo:
-- - Admin puede ver todos los perfiles de usuarios.
-- - Cada usuario puede ver su propio perfil.
-- - Usuarios autenticados pueden leer tablas operativas mientras definimos
--   la matriz RLS final por rol.

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select rol
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_select_own_profile" on public.usuarios;
drop policy if exists "usuarios_select_own_or_admin" on public.usuarios;

create policy "usuarios_select_own_or_admin"
on public.usuarios
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or public.current_user_role() = 'admin'
);

alter table public.transportistas enable row level security;
alter table public.transportadoras enable row level security;
alter table public.conductores enable row level security;
alter table public.ciudades enable row level security;
alter table public.paqueterias enable row level security;
alter table public.promesas_servicio enable row level security;
alter table public.pedidos enable row level security;
alter table public.devoluciones enable row level security;
alter table public.recogidas enable row level security;
alter table public.pqrs enable row level security;
alter table public.facturas_proveedor enable row level security;
alter table public.factura_guias enable row level security;

drop policy if exists "staging_authenticated_read" on public.transportistas;
drop policy if exists "staging_authenticated_read" on public.transportadoras;
drop policy if exists "staging_authenticated_read" on public.conductores;
drop policy if exists "staging_authenticated_read" on public.ciudades;
drop policy if exists "staging_authenticated_read" on public.paqueterias;
drop policy if exists "staging_authenticated_read" on public.promesas_servicio;
drop policy if exists "staging_authenticated_read" on public.pedidos;
drop policy if exists "staging_authenticated_read" on public.devoluciones;
drop policy if exists "staging_authenticated_read" on public.recogidas;
drop policy if exists "staging_authenticated_read" on public.pqrs;
drop policy if exists "staging_authenticated_read" on public.facturas_proveedor;
drop policy if exists "staging_authenticated_read" on public.factura_guias;

create policy "staging_authenticated_read" on public.transportistas for select to authenticated using (true);
create policy "staging_authenticated_read" on public.transportadoras for select to authenticated using (true);
create policy "staging_authenticated_read" on public.conductores for select to authenticated using (true);
create policy "staging_authenticated_read" on public.ciudades for select to authenticated using (true);
create policy "staging_authenticated_read" on public.paqueterias for select to authenticated using (true);
create policy "staging_authenticated_read" on public.promesas_servicio for select to authenticated using (true);
create policy "staging_authenticated_read" on public.pedidos for select to authenticated using (true);
create policy "staging_authenticated_read" on public.devoluciones for select to authenticated using (true);
create policy "staging_authenticated_read" on public.recogidas for select to authenticated using (true);
create policy "staging_authenticated_read" on public.pqrs for select to authenticated using (true);
create policy "staging_authenticated_read" on public.facturas_proveedor for select to authenticated using (true);
create policy "staging_authenticated_read" on public.factura_guias for select to authenticated using (true);

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select
  tablename,
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

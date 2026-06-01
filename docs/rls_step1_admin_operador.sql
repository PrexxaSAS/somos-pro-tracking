-- Ejecutar SOLO en Supabase STAGING.
--
-- Primer reemplazo de politicas temporales por politicas orientadas a rol.
-- Alcance: admin y operador.
--
-- Reglas:
-- - Admin puede leer y modificar todo.
-- - Operador puede leer operacion completa.
-- - Operador NO puede modificar pedidos, conductores ni recogidas.
-- - Operador SI puede gestionar devoluciones y PQRS.
--
-- Nota: PostgreSQL RLS no limita columnas por si solo. Las politicas UPDATE
-- permiten actualizar filas completas. La restriccion de campos debe
-- complementarse con la app o triggers si se requiere enforcement estricto
-- por columna.

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

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

create or replace function public.is_operator()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'operador'
$$;

create or replace function public.is_admin_or_operator()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'operador')
$$;

alter table public.usuarios enable row level security;
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

-- Quitar politicas temporales abiertas.
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

-- Usuarios: admin ve todo; cada perfil ve lo suyo.
drop policy if exists "usuarios_select_own_or_admin" on public.usuarios;
drop policy if exists "usuarios_admin_all" on public.usuarios;
drop policy if exists "usuarios_select_own_admin_operator" on public.usuarios;

create policy "usuarios_select_own_admin_operator"
on public.usuarios
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or public.is_admin()
);

create policy "usuarios_admin_all"
on public.usuarios
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Lectura admin/operador en tablas operativas.
drop policy if exists "transportistas_select_admin_operator" on public.transportistas;
drop policy if exists "transportadoras_select_admin_operator" on public.transportadoras;
drop policy if exists "conductores_select_admin_operator" on public.conductores;
drop policy if exists "ciudades_select_admin_operator" on public.ciudades;
drop policy if exists "paqueterias_select_admin_operator" on public.paqueterias;
drop policy if exists "promesas_select_admin_operator" on public.promesas_servicio;
drop policy if exists "pedidos_select_admin_operator" on public.pedidos;
drop policy if exists "devoluciones_select_admin_operator" on public.devoluciones;
drop policy if exists "recogidas_select_admin_operator" on public.recogidas;
drop policy if exists "pqrs_select_admin_operator" on public.pqrs;
drop policy if exists "facturas_select_admin_operator" on public.facturas_proveedor;
drop policy if exists "factura_guias_select_admin_operator" on public.factura_guias;

create policy "transportistas_select_admin_operator" on public.transportistas for select to authenticated using (public.is_admin_or_operator());
create policy "transportadoras_select_admin_operator" on public.transportadoras for select to authenticated using (public.is_admin_or_operator());
create policy "conductores_select_admin_operator" on public.conductores for select to authenticated using (public.is_admin_or_operator());
create policy "ciudades_select_admin_operator" on public.ciudades for select to authenticated using (public.is_admin_or_operator());
create policy "paqueterias_select_admin_operator" on public.paqueterias for select to authenticated using (public.is_admin_or_operator());
create policy "promesas_select_admin_operator" on public.promesas_servicio for select to authenticated using (public.is_admin_or_operator());
create policy "pedidos_select_admin_operator" on public.pedidos for select to authenticated using (public.is_admin_or_operator());
create policy "devoluciones_select_admin_operator" on public.devoluciones for select to authenticated using (public.is_admin_or_operator());
create policy "recogidas_select_admin_operator" on public.recogidas for select to authenticated using (public.is_admin_or_operator());
create policy "pqrs_select_admin_operator" on public.pqrs for select to authenticated using (public.is_admin_or_operator());
create policy "facturas_select_admin_operator" on public.facturas_proveedor for select to authenticated using (public.is_admin_or_operator());
create policy "factura_guias_select_admin_operator" on public.factura_guias for select to authenticated using (public.is_admin_or_operator());

-- Admin escritura total en tablas operativas.
drop policy if exists "transportistas_admin_all" on public.transportistas;
drop policy if exists "transportadoras_admin_all" on public.transportadoras;
drop policy if exists "conductores_admin_all" on public.conductores;
drop policy if exists "ciudades_admin_all" on public.ciudades;
drop policy if exists "paqueterias_admin_all" on public.paqueterias;
drop policy if exists "promesas_admin_all" on public.promesas_servicio;
drop policy if exists "pedidos_admin_all" on public.pedidos;
drop policy if exists "devoluciones_admin_all" on public.devoluciones;
drop policy if exists "recogidas_admin_all" on public.recogidas;
drop policy if exists "pqrs_admin_all" on public.pqrs;
drop policy if exists "facturas_admin_all" on public.facturas_proveedor;
drop policy if exists "factura_guias_admin_all" on public.factura_guias;

create policy "transportistas_admin_all" on public.transportistas for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "transportadoras_admin_all" on public.transportadoras for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "conductores_admin_all" on public.conductores for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ciudades_admin_all" on public.ciudades for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "paqueterias_admin_all" on public.paqueterias for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "promesas_admin_all" on public.promesas_servicio for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pedidos_admin_all" on public.pedidos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "devoluciones_admin_all" on public.devoluciones for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "recogidas_admin_all" on public.recogidas for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pqrs_admin_all" on public.pqrs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "facturas_admin_all" on public.facturas_proveedor for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "factura_guias_admin_all" on public.factura_guias for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Operador: gestion limitada en devoluciones y PQRS.
drop policy if exists "devoluciones_operator_update" on public.devoluciones;
drop policy if exists "pqrs_operator_update" on public.pqrs;

create policy "devoluciones_operator_update"
on public.devoluciones
for update
to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "pqrs_operator_update"
on public.pqrs
for update
to authenticated
using (public.is_operator())
with check (public.is_operator());

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

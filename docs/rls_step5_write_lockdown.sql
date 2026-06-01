-- Ejecutar SOLO en Supabase STAGING.
--
-- Cierre de escrituras por rol antes de pasar a produccion.
--
-- Objetivo:
-- - Mantener admin con escritura total.
-- - Mantener operador con escrituras operativas necesarias.
-- - Cerrar creacion directa de usuarios/conductores por transportista;
--   la creacion de conductores debe pasar por Edge Function create-system-user.
-- - Mantener transportista solo con edicion de datos basicos de sus conductores.
-- - Mantener conductor solo con update de sus pedidos asignados.
-- - Mantener cliente solo con update limitado de solicitudes propias no gestionadas.
-- - Confirmar que facturas proveedor no tienen escritura para cliente, conductor
--   ni transportista; admin y operador pueden gestionar.

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

-- Asegurar RLS activo en tablas sensibles.
alter table public.usuarios enable row level security;
alter table public.transportistas enable row level security;
alter table public.transportadoras enable row level security;
alter table public.conductores enable row level security;
alter table public.pedidos enable row level security;
alter table public.devoluciones enable row level security;
alter table public.recogidas enable row level security;
alter table public.pqrs enable row level security;
alter table public.facturas_proveedor enable row level security;
alter table public.factura_guias enable row level security;

-- Retirar rutas directas de creacion por transportista.
-- La app debe usar supabase.functions.invoke('create-system-user').
drop policy if exists "conductores_transportista_insert" on public.conductores;
drop policy if exists "usuarios_transportista_insert_driver" on public.usuarios;

-- Retirar cualquier politica temporal abierta de escritura o lectura general.
drop policy if exists "staging_authenticated_read" on public.usuarios;
drop policy if exists "staging_authenticated_read" on public.transportistas;
drop policy if exists "staging_authenticated_read" on public.transportadoras;
drop policy if exists "staging_authenticated_read" on public.conductores;
drop policy if exists "staging_authenticated_read" on public.pedidos;
drop policy if exists "staging_authenticated_read" on public.devoluciones;
drop policy if exists "staging_authenticated_read" on public.recogidas;
drop policy if exists "staging_authenticated_read" on public.pqrs;
drop policy if exists "staging_authenticated_read" on public.facturas_proveedor;
drop policy if exists "staging_authenticated_read" on public.factura_guias;

-- Operador: pedidos nuevos y actualizacion operativa de pedidos existentes.
drop policy if exists "pedidos_operator_insert" on public.pedidos;
drop policy if exists "pedidos_operator_update_basic" on public.pedidos;
drop policy if exists "pedidos_operator_update_basic_delivery" on public.pedidos;

create policy "pedidos_operator_insert"
on public.pedidos
for insert
to authenticated
with check (public.is_operator());

create policy "pedidos_operator_update_basic_delivery"
on public.pedidos
for update
to authenticated
using (public.is_operator())
with check (public.is_operator());

-- Operador: gestion de devoluciones, recogidas y PQRS.
-- Nota: RLS controla filas, no columnas. La app controla campos enviados.
drop policy if exists "devoluciones_operator_update" on public.devoluciones;
drop policy if exists "recogidas_operator_update" on public.recogidas;
drop policy if exists "pqrs_operator_update" on public.pqrs;

create policy "devoluciones_operator_update"
on public.devoluciones
for update
to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "recogidas_operator_update"
on public.recogidas
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

-- Facturas proveedor: admin y operador pueden crear, editar y eliminar.
-- Cliente, conductor y transportista quedan sin politica de escritura.
drop policy if exists "facturas_select_admin_operator" on public.facturas_proveedor;
drop policy if exists "factura_guias_select_admin_operator" on public.factura_guias;
drop policy if exists "facturas_operator_all" on public.facturas_proveedor;
drop policy if exists "factura_guias_operator_all" on public.factura_guias;

create policy "facturas_select_admin_operator"
on public.facturas_proveedor
for select
to authenticated
using (public.is_admin_or_operator());

create policy "factura_guias_select_admin_operator"
on public.factura_guias
for select
to authenticated
using (public.is_admin_or_operator());

create policy "facturas_operator_all"
on public.facturas_proveedor
for all
to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "factura_guias_operator_all"
on public.factura_guias
for all
to authenticated
using (public.is_operator())
with check (public.is_operator());

-- Reporte de politicas de escritura existentes.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
order by tablename, cmd, policyname;

-- Vista resumida para revisar que no queden escrituras inesperadas.
select
  tablename,
  string_agg(policyname || ' [' || cmd || ']', ', ' order by policyname) as write_policies
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
group by tablename
order by tablename;

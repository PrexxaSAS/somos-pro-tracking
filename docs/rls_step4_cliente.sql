-- Ejecutar SOLO en Supabase STAGING.
--
-- Politicas para rol cliente interno.
--
-- Reglas validadas:
-- - Cliente puede ver todos los pedidos en Estado Pedidos, solo lectura.
-- - Cliente puede crear y ver sus propias devoluciones.
-- - Cliente puede modificar sus propias devoluciones solo si no tienen conductor asignado.
-- - Cliente puede crear y ver sus propias recogidas.
-- - Cliente puede modificar sus propias recogidas solo si no tienen conductor asignado.
-- - Cliente puede crear y ver sus propias PQRS.
-- - Cliente puede modificar sus propias PQRS solo si aun estan abiertas, sin gestion.
-- - Cliente NO puede acceder a facturas de proveedor ni a sus guias asociadas.
-- - Facturas proveedor quedan disponibles solo para admin y operador.

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

create or replace function public.current_user_nombre()
returns text
language sql
security definer
set search_path = public
as $$
  select nombre
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_username()
returns text
language sql
security definer
set search_path = public
as $$
  select "user"
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_cliente()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'cliente'
$$;

create or replace function public.is_admin_or_operator()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'operador')
$$;

-- Lecturas necesarias para la pantalla de Estado Pedidos.
drop policy if exists "pedidos_select_cliente_all" on public.pedidos;
drop policy if exists "conductores_select_cliente_assigned" on public.conductores;
drop policy if exists "ciudades_select_cliente" on public.ciudades;

create policy "pedidos_select_cliente_all"
on public.pedidos
for select
to authenticated
using (public.is_cliente());

create policy "conductores_select_cliente_assigned"
on public.conductores
for select
to authenticated
using (
  public.is_cliente()
  and exists (
    select 1
    from public.pedidos p
    where p.conductor_id = conductores.id
  )
);

create policy "ciudades_select_cliente"
on public.ciudades
for select
to authenticated
using (public.is_cliente());

-- Propiedad de solicitudes: se conserva por ahora con solicitado_por
-- porque la estructura actual no tiene cliente_id. Se compara contra
-- nombre visible y usuario operativo para tolerar datos existentes.
drop policy if exists "devoluciones_cliente_select_own" on public.devoluciones;
drop policy if exists "devoluciones_cliente_insert_own" on public.devoluciones;
drop policy if exists "devoluciones_cliente_update_own" on public.devoluciones;

create policy "devoluciones_cliente_select_own"
on public.devoluciones
for select
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
);

create policy "devoluciones_cliente_insert_own"
on public.devoluciones
for insert
to authenticated
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and placa is null
  and nit_proveedor is null
  and estado = 'sin_asignar'
);

create policy "devoluciones_cliente_update_own"
on public.devoluciones
for update
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and estado = 'sin_asignar'
)
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and placa is null
  and nit_proveedor is null
  and estado = 'sin_asignar'
);

drop policy if exists "recogidas_cliente_select_own" on public.recogidas;
drop policy if exists "recogidas_cliente_insert_own" on public.recogidas;
drop policy if exists "recogidas_cliente_update_own" on public.recogidas;

create policy "recogidas_cliente_select_own"
on public.recogidas
for select
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
);

create policy "recogidas_cliente_insert_own"
on public.recogidas
for insert
to authenticated
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and placa is null
  and nit_proveedor is null
  and estado = 'sin_asignar'
);

create policy "recogidas_cliente_update_own"
on public.recogidas
for update
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and estado = 'sin_asignar'
)
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and conductor_id is null
  and placa is null
  and nit_proveedor is null
  and estado = 'sin_asignar'
);

drop policy if exists "pqrs_cliente_select_own" on public.pqrs;
drop policy if exists "pqrs_cliente_insert_own" on public.pqrs;
drop policy if exists "pqrs_cliente_update_own" on public.pqrs;

create policy "pqrs_cliente_select_own"
on public.pqrs
for select
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
);

create policy "pqrs_cliente_insert_own"
on public.pqrs
for insert
to authenticated
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and estado = 'abierta'
  and coalesce(respuesta, '') = ''
  and coalesce(gestionado_por, '') = ''
  and fecha_gestion is null
);

create policy "pqrs_cliente_update_own"
on public.pqrs
for update
to authenticated
using (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and estado = 'abierta'
)
with check (
  public.is_cliente()
  and solicitado_por in (public.current_user_nombre(), public.current_username())
  and estado = 'abierta'
  and coalesce(respuesta, '') = ''
  and coalesce(gestionado_por, '') = ''
  and fecha_gestion is null
);

-- Cierre explicito de facturas: no existe ninguna politica para cliente.
-- Si quedo alguna politica temporal abierta, se elimina.
drop policy if exists "staging_authenticated_read" on public.facturas_proveedor;
drop policy if exists "staging_authenticated_read" on public.factura_guias;
drop policy if exists "facturas_cliente_select" on public.facturas_proveedor;
drop policy if exists "factura_guias_cliente_select" on public.factura_guias;

drop policy if exists "facturas_select_admin_operator" on public.facturas_proveedor;
drop policy if exists "factura_guias_select_admin_operator" on public.factura_guias;

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

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('pedidos','conductores','ciudades','devoluciones','recogidas','pqrs','facturas_proveedor','factura_guias')
order by tablename, policyname;

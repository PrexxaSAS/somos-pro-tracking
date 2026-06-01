-- Ejecutar SOLO en Supabase STAGING.
--
-- Guardas por columna para complementar RLS.
--
-- RLS decide que filas puede tocar cada rol, pero no limita columnas.
-- Estos triggers bloquean cambios sensibles si un usuario autenticado intenta
-- modificar datos fuera de lo permitido usando la API directamente.

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

create or replace function public.prevent_operator_pedido_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'operador' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.guia_interna is distinct from old.guia_interna
    or new.cliente is distinct from old.cliente
    or new.conductor_id is distinct from old.conductor_id
    or new.placa is distinct from old.placa
    or new.nit_proveedor is distinct from old.nit_proveedor
    or new.tipo is distinct from old.tipo
    or new.empresa_transporte is distinct from old.empresa_transporte
    or new.paqueteria is distinct from old.paqueteria
    or new.guia_paqueteria is distinct from old.guia_paqueteria
    or new.estado_despacho is distinct from old.estado_despacho
    or new.ciudad_origen_codigo is distinct from old.ciudad_origen_codigo
    or new.ciudad_origen_nombre is distinct from old.ciudad_origen_nombre
    or new.direccion_origen is distinct from old.direccion_origen
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Operador no puede modificar campos sensibles del pedido';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_operator_pedido_sensitive_changes on public.pedidos;
create trigger trg_operator_pedido_sensitive_changes
before update on public.pedidos
for each row
execute function public.prevent_operator_pedido_sensitive_changes();

create or replace function public.prevent_transportista_conductor_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'transportista' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.usuario_id is distinct from old.usuario_id
    or new.nit_proveedor is distinct from old.nit_proveedor
    or new.empresa is distinct from old.empresa
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Transportista no puede cambiar pertenencia del conductor';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transportista_conductor_sensitive_changes on public.conductores;
create trigger trg_transportista_conductor_sensitive_changes
before update on public.conductores
for each row
execute function public.prevent_transportista_conductor_sensitive_changes();

create or replace function public.prevent_transportista_usuario_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'transportista' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new."user" is distinct from old."user"
    or new.pass is distinct from old.pass
    or new.rol is distinct from old.rol
    or new.nit is distinct from old.nit
    or new.empresa is distinct from old.empresa
    or new.cedula is distinct from old.cedula
    or new.nit_proveedor is distinct from old.nit_proveedor
    or new.conductor_id is distinct from old.conductor_id
    or new.auth_user_id is distinct from old.auth_user_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Transportista no puede modificar acceso ni pertenencia del usuario conductor';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transportista_usuario_sensitive_changes on public.usuarios;
create trigger trg_transportista_usuario_sensitive_changes
before update on public.usuarios
for each row
execute function public.prevent_transportista_usuario_sensitive_changes();

create or replace function public.prevent_cliente_devolucion_gestion_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'cliente' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.guia is distinct from old.guia
    or new.conductor_id is distinct from old.conductor_id
    or new.placa is distinct from old.placa
    or new.nit_proveedor is distinct from old.nit_proveedor
    or new.estado is distinct from old.estado
    or new.novedad is distinct from old.novedad
    or new.fecha_creacion is distinct from old.fecha_creacion
    or new.fecha_real is distinct from old.fecha_real
    or new.solicitado_por is distinct from old.solicitado_por
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cliente no puede modificar gestion operativa de la devolucion';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cliente_devolucion_gestion_changes on public.devoluciones;
create trigger trg_cliente_devolucion_gestion_changes
before update on public.devoluciones
for each row
execute function public.prevent_cliente_devolucion_gestion_changes();

create or replace function public.prevent_cliente_recogida_gestion_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'cliente' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.guia is distinct from old.guia
    or new.conductor_id is distinct from old.conductor_id
    or new.placa is distinct from old.placa
    or new.nit_proveedor is distinct from old.nit_proveedor
    or new.estado is distinct from old.estado
    or new.novedad is distinct from old.novedad
    or new.fecha_creacion is distinct from old.fecha_creacion
    or new.fecha_real is distinct from old.fecha_real
    or new.solicitado_por is distinct from old.solicitado_por
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cliente no puede modificar gestion operativa de la recogida';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cliente_recogida_gestion_changes on public.recogidas;
create trigger trg_cliente_recogida_gestion_changes
before update on public.recogidas
for each row
execute function public.prevent_cliente_recogida_gestion_changes();

create or replace function public.prevent_cliente_pqrs_gestion_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'cliente' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.estado is distinct from old.estado
    or new.solicitado_por is distinct from old.solicitado_por
    or new.fecha_creacion is distinct from old.fecha_creacion
    or new.fecha_gestion is distinct from old.fecha_gestion
    or new.respuesta is distinct from old.respuesta
    or new.gestionado_por is distinct from old.gestionado_por
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Cliente no puede modificar gestion de PQRS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cliente_pqrs_gestion_changes on public.pqrs;
create trigger trg_cliente_pqrs_gestion_changes
before update on public.pqrs
for each row
execute function public.prevent_cliente_pqrs_gestion_changes();

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_operator_pedido_sensitive_changes',
    'trg_transportista_conductor_sensitive_changes',
    'trg_transportista_usuario_sensitive_changes',
    'trg_cliente_devolucion_gestion_changes',
    'trg_cliente_recogida_gestion_changes',
    'trg_cliente_pqrs_gestion_changes'
  )
order by table_name, trigger_name;

-- Fix: la carga masiva de guias de paqueteria (CSV) fallaba en casi todos los
-- pedidos porque trg_prevent_closed_pedido_changes bloquea cualquier update de
-- admin/operador sobre pedidos en_transito, entregado o novedad. Ese bloqueo
-- se diseno para el flujo con conductor (pedidos propios con soporte de
-- entrega), pero el ciclo de vida de un pedido de paqueteria lo maneja
-- admin/operador via CSV: paqueteria -> en_transito -> entregado, con
-- correcciones y sobreescritura de guias.
--
-- Reglas nuevas:
-- - Pedido con tipo = 'paqueteria': admin y operador pueden actualizarlo en
--   cualquier estado (el carrier puede corregir estados o reasignar guias).
-- - Pedidos propios: se mantienen las reglas existentes (solo el conductor
--   cierra en_transito; transportista solo reemplaza soportes de cerrados).
-- - Operador: se le permite tocar tipo/paqueteria/guia_paqueteria solo cuando
--   el pedido queda con tipo = 'paqueteria' (flujo del CSV de guias); el resto
--   de campos sensibles sigue bloqueado.
--
-- Ejecutar primero en STAGING, validar la carga del CSV, y luego en PRODUCCION.

create or replace function public.prevent_closed_pedido_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_estado text := lower(coalesce(old.estado, ''));
  new_estado text := lower(coalesce(new.estado, ''));
  role_actual text := public.current_user_role();
  support_only_change boolean;
begin
  -- Pedidos de paqueteria: su ciclo de vida lo gestiona admin/operador con el
  -- CSV de guias; no aplica el bloqueo pensado para entregas con conductor.
  if lower(coalesce(old.tipo, '')) = 'paqueteria'
    and role_actual in ('admin', 'operador')
  then
    return new;
  end if;

  support_only_change :=
    (to_jsonb(new) - 'soportes' - 'soportes_data')
    is not distinct from
    (to_jsonb(old) - 'soportes' - 'soportes_data');

  if old_estado in ('entregado', 'novedad')
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    if role_actual = 'transportista'
      and support_only_change
      and old.nit_proveedor = public.current_user_nit()
    then
      return new;
    end if;

    raise exception 'No se puede modificar un pedido que ya fue entregado';
  end if;

  if old_estado = 'en_transito'
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    if role_actual = 'conductor'
      and new_estado in ('entregado', 'novedad')
      and new.fecha_real is not null
      and new.id is not distinct from old.id
      and new.guia_interna is not distinct from old.guia_interna
      and new.cliente is not distinct from old.cliente
      and new.ciudad_codigo is not distinct from old.ciudad_codigo
      and new.ciudad_nombre is not distinct from old.ciudad_nombre
      and new.direccion is not distinct from old.direccion
      and new.cajas is not distinct from old.cajas
      and new.factura is not distinct from old.factura
      and new.conductor_id is not distinct from old.conductor_id
      and new.placa is not distinct from old.placa
      and new.nit_proveedor is not distinct from old.nit_proveedor
      and new.estado_despacho is not distinct from old.estado_despacho
      and new.tipo is not distinct from old.tipo
      and new.empresa_transporte is not distinct from old.empresa_transporte
      and new.paqueteria is not distinct from old.paqueteria
      and new.guia_paqueteria is not distinct from old.guia_paqueteria
      and new.notas is not distinct from old.notas
      and new.ciudad_origen_codigo is not distinct from old.ciudad_origen_codigo
      and new.ciudad_origen_nombre is not distinct from old.ciudad_origen_nombre
      and new.direccion_origen is not distinct from old.direccion_origen
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    raise exception 'No se puede editar un pedido en transito; solo el conductor puede registrar la entrega';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_closed_pedido_changes on public.pedidos;
create trigger trg_prevent_closed_pedido_changes
before update on public.pedidos
for each row
execute function public.prevent_closed_pedido_changes();

-- Operador: el CSV de guias siempre escribe tipo, paqueteria y guia_paqueteria.
-- Se permiten esos tres campos solo cuando el pedido queda en el flujo de
-- paqueteria; el resto de campos sensibles sigue igual que en rls_step8.
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
    or new.estado_despacho is distinct from old.estado_despacho
    or new.empresa_transporte is distinct from old.empresa_transporte
    or new.ciudad_origen_codigo is distinct from old.ciudad_origen_codigo
    or new.ciudad_origen_nombre is distinct from old.ciudad_origen_nombre
    or new.direccion_origen is distinct from old.direccion_origen
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Operador no puede modificar campos sensibles del pedido';
  end if;

  if (new.tipo is distinct from old.tipo
      or new.paqueteria is distinct from old.paqueteria
      or new.guia_paqueteria is distinct from old.guia_paqueteria)
    and lower(coalesce(new.tipo, '')) <> 'paqueteria'
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

-- Verificacion
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_prevent_closed_pedido_changes',
    'trg_operator_pedido_sensitive_changes'
  )
order by table_name, trigger_name;

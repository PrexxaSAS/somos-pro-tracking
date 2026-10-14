-- ---------------------------------------------------------------------------
-- El admin puede cambiar el conductor de un pedido EN TRANSITO.
--
-- Hasta ahora un pedido en transito no se podia tocar: solo su conductor podia
-- cerrarlo. Pero a veces el conductor no alcanza a entregar, devuelve el pedido
-- y toca enviarlo con otro. Este script agrega una sola excepcion al trigger
-- trg_prevent_closed_pedido_changes: el ADMIN puede cambiar el conductor (y la
-- placa, el NIT y la empresa que van con el), o dejarlo sin conductor para que
-- vuelva a bodega como Sin asignar. Nada mas del pedido puede cambiar en ese
-- mismo update.
--
-- La funcion es la misma de docs/pedidos_fecha_hora_pedido.sql (la ultima
-- version) con ese bloque agregado; las demas reglas quedan iguales.
--
-- Correr en los DOS proyectos (prueba y produccion).
-- ---------------------------------------------------------------------------

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

  -- Completar la fecha y hora de elaboracion del pedido desde el plano.
  if role_actual in ('admin', 'operador')
    and (old.fecha_pedido is null or old.hora_pedido is null)
    and (old.fecha_pedido is null or new.fecha_pedido is not distinct from old.fecha_pedido)
    and (old.hora_pedido is null or new.hora_pedido is not distinct from old.hora_pedido)
    and (to_jsonb(new) - 'fecha_pedido' - 'hora_pedido')
        is not distinct from
        (to_jsonb(old) - 'fecha_pedido' - 'hora_pedido')
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

    -- El admin puede cambiar el conductor de un pedido en transito (el conductor
    -- devolvio el pedido sin entregarlo y sale con otro, o vuelve a bodega).
    -- Solo el transporte y el estado (en_transito o sin_asignar); todo lo demas
    -- del pedido debe quedar igual.
    if role_actual = 'admin'
      and new_estado in ('en_transito', 'sin_asignar')
      and (to_jsonb(new) - 'conductor_id' - 'placa' - 'nit_proveedor' - 'empresa_transporte' - 'estado')
          is not distinct from
          (to_jsonb(old) - 'conductor_id' - 'placa' - 'nit_proveedor' - 'empresa_transporte' - 'estado')
    then
      return new;
    end if;

    raise exception 'No se puede editar un pedido en transito; solo el conductor puede registrar la entrega';
  end if;

  return new;
end;
$$;

-- El trigger sigue apuntando a la misma funcion; no hace falta recrearlo.

-- Comprobacion: debe decir true.
select pg_get_functiondef('public.prevent_closed_pedido_changes'::regproc) like '%role_actual = ''admin''%' as reasignar_activo;

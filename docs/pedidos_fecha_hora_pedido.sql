-- Fecha y hora de elaboracion del pedido (columnas Fecha y Hora del plano de pedidos).
--
-- POR QUE COLUMNAS NUEVAS Y NO fecha_creacion:
-- fecha_creacion guarda el dia en que el pedido se cargo al sistema, no el dia en que
-- se genero en el ERP. Los pedidos importados quedan todos con la fecha de la subida.
-- Como es un dato distinto, se guarda aparte y no se reinterpreta lo ya registrado.
--
-- Son opcionales: el plano puede traerlas o no, y los pedidos existentes quedan en
-- null hasta que se recargue el plano con esas dos columnas.
--
-- Ejecutar en el SQL Editor: primero STAGING, y luego PRODUCCION.

-- ---------------------------------------------------------------------------
-- 1) Columnas nuevas (cambio aditivo: no toca ningun dato existente)
-- ---------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists fecha_pedido date,
  add column if not exists hora_pedido text;

comment on column public.pedidos.fecha_pedido is
  'Fecha de elaboracion del pedido en el ERP (columna Fecha del plano). Distinta de fecha_creacion, que es cuando se cargo al sistema.';
comment on column public.pedidos.hora_pedido is
  'Hora de elaboracion del pedido en formato HH:MM (columna Hora del plano).';

-- ---------------------------------------------------------------------------
-- 2) Permitir completar esas dos columnas en pedidos ya cerrados
--
-- trg_prevent_closed_pedido_changes bloquea cualquier update sobre un pedido
-- entregado o con novedad. El plano que llena estas columnas incluye pedidos ya
-- entregados, asi que sin esta excepcion casi todos fallarian.
--
-- La excepcion es estrecha a proposito:
--   - solo admin u operador,
--   - solo si la columna estaba vacia (nunca reescribe una fecha ya registrada),
--   - y solo si no cambia ningun otro campo del pedido.
-- Todo lo demas del trigger queda exactamente igual que en rls_step9.
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

    raise exception 'No se puede editar un pedido en transito; solo el conductor puede registrar la entrega';
  end if;

  return new;
end;
$$;

-- El trigger sigue apuntando a la misma funcion; no hace falta recrearlo.

-- ---------------------------------------------------------------------------
-- 3) Verificacion
-- ---------------------------------------------------------------------------
-- Las dos columnas deben aparecer:
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pedidos'
  and column_name in ('fecha_pedido', 'hora_pedido');

-- Despues de cargar el plano, para ver cuantos pedidos ya quedaron con el dato:
-- select count(*) filter (where fecha_pedido is not null) as con_fecha,
--        count(*) filter (where hora_pedido is not null)  as con_hora,
--        count(*) as total
-- from public.pedidos;

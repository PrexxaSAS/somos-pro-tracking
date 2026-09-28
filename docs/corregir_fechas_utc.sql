-- ---------------------------------------------------------------------------
-- Corrige las fechas de entrega que quedaron corridas un dia.
--
-- ESTO SI REESCRIBE DATOS. Antes de correrlo, saca un respaldo.
--
-- QUE CORRIGE Y QUE NO:
-- Solo pedidos.fecha_real. El diagnostico mostro que fecha_creacion no quedo
-- afectada en ninguna tabla (nadie crea registros despues de las 7 p.m.) y que
-- fecha_despacho tampoco: las seis escrituras nocturnas que aparecen no llevan
-- la firma del error, asi que no se tocan.
--
-- COMO ELIGE LAS FILAS, que es lo que importa:
--   1. Se mira el ULTIMO cambio de fecha_real de cada pedido, no cualquiera.
--      Si un pedido se registro de noche y despues alguien lo corrigio de dia,
--      el ultimo cambio es el bueno y el pedido no entra.
--   2. Ese ultimo cambio tiene que ser nocturno (19:00 o mas, hora de Bogota)
--      y haber quedado en el dia siguiente al real. Esa es la firma del error.
--   3. La fecha que el pedido tiene HOY tiene que seguir siendo esa. Si alguien
--      ya la arreglo a mano, no se toca.
-- La fecha nueva no se calcula restando un dia: se pone el dia real en que se
-- registro la entrega, segun la auditoria.
--
-- POR QUE HAY QUE DESACTIVAR UN TRIGGER:
-- Son pedidos entregados, y trg_prevent_closed_pedido_changes impide cualquier
-- cambio sobre un pedido cerrado. Se desactiva y se vuelve a activar dentro de
-- la misma transaccion, asi que si algo falla no queda desactivado.
-- La auditoria NO se desactiva: estos cambios quedan registrados.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- PASO 1. Ver que se va a cambiar, sin cambiar nada.
--         Revisa esta lista antes de seguir.
-- ---------------------------------------------------------------------------
with ultimo as (
  select distinct on (a.record_id)
    a.record_id                                        as pedido_id,
    a.created_at                                       as cuando,
    (a.new_data ->> 'fecha_real')::date                as quedo_guardada,
    (a.created_at at time zone 'America/Bogota')::date as dia_real
  from public.audit_events a
  where a.table_name = 'pedidos'
    and a.action = 'UPDATE'
    and (a.new_data ->> 'fecha_real') is not null
    and (a.new_data ->> 'fecha_real') is distinct from (a.old_data ->> 'fecha_real')
    and (a.new_data ->> 'fecha_real') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  order by a.record_id, a.created_at desc
)
select
  u.pedido_id,
  p.estado,
  u.cuando at time zone 'America/Bogota' as se_registro,
  u.quedo_guardada                       as fecha_actual,
  u.dia_real                             as fecha_corregida
from ultimo u
join public.pedidos p on p.id = u.pedido_id
where (u.cuando at time zone 'America/Bogota')::time >= time '19:00'
  and u.quedo_guardada = u.dia_real + 1
  and p.fecha_real = u.quedo_guardada
order by u.cuando desc;

-- ---------------------------------------------------------------------------
-- PASO 2. Aplicar. Ejecuta este bloque COMPLETO, de begin a commit.
--         Si el numero de filas no coincide con el del paso 1, no confirmes:
--         cambia commit por rollback y avisa.
-- ---------------------------------------------------------------------------
begin;

alter table public.pedidos disable trigger trg_prevent_closed_pedido_changes;

with ultimo as (
  select distinct on (a.record_id)
    a.record_id                                        as pedido_id,
    a.created_at                                       as cuando,
    (a.new_data ->> 'fecha_real')::date                as quedo_guardada,
    (a.created_at at time zone 'America/Bogota')::date as dia_real
  from public.audit_events a
  where a.table_name = 'pedidos'
    and a.action = 'UPDATE'
    and (a.new_data ->> 'fecha_real') is not null
    and (a.new_data ->> 'fecha_real') is distinct from (a.old_data ->> 'fecha_real')
    and (a.new_data ->> 'fecha_real') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  order by a.record_id, a.created_at desc
),
corregibles as (
  select u.pedido_id, u.dia_real
  from ultimo u
  join public.pedidos p on p.id = u.pedido_id
  where (u.cuando at time zone 'America/Bogota')::time >= time '19:00'
    and u.quedo_guardada = u.dia_real + 1
    and p.fecha_real = u.quedo_guardada
)
update public.pedidos p
set fecha_real = c.dia_real
from corregibles c
where p.id = c.pedido_id;

alter table public.pedidos enable trigger trg_prevent_closed_pedido_changes;

commit;

-- ---------------------------------------------------------------------------
-- PASO 3. Comprobar. La primera consulta debe devolver cero filas, y el
--         trigger debe aparecer habilitado ('O').
-- ---------------------------------------------------------------------------
with ultimo as (
  select distinct on (a.record_id)
    a.record_id                                        as pedido_id,
    a.created_at                                       as cuando,
    (a.new_data ->> 'fecha_real')::date                as quedo_guardada,
    (a.created_at at time zone 'America/Bogota')::date as dia_real
  from public.audit_events a
  where a.table_name = 'pedidos'
    and a.action = 'UPDATE'
    and (a.new_data ->> 'fecha_real') is not null
    and (a.new_data ->> 'fecha_real') is distinct from (a.old_data ->> 'fecha_real')
    and (a.new_data ->> 'fecha_real') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  order by a.record_id, a.created_at desc
)
select count(*) as deben_quedar_cero
from ultimo u
join public.pedidos p on p.id = u.pedido_id
where (u.cuando at time zone 'America/Bogota')::time >= time '19:00'
  and u.quedo_guardada = u.dia_real + 1
  and p.fecha_real = u.quedo_guardada;

select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.pedidos'::regclass
  and tgname = 'trg_prevent_closed_pedido_changes';

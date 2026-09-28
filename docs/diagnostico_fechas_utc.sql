-- ---------------------------------------------------------------------------
-- Cuantas filas quedaron con la fecha corrida un dia.
--
-- QUE PASABA:
-- La aplicacion sacaba "hoy" con new Date().toISOString(), que devuelve UTC.
-- Colombia es UTC-5, asi que todo lo que se guardara entre las 7 de la noche y
-- la medianoche quedaba fechado al dia siguiente. Ya esta corregido en el
-- codigo; esto mide el rastro que dejo.
--
-- COMO SE RECONOCE:
-- created_at es timestamptz y siempre fue correcto. Si una fila se creo despues
-- de las 19:00 hora de Bogota y su fecha quedo en el dia siguiente al de
-- created_at, es exactamente la firma del error.
--
-- Esto NO CAMBIA NADA: solo cuenta. Correr en PRODUCCION y en PRUEBA.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) fecha_creacion: se escribia al insertar, asi que created_at la delata
-- ---------------------------------------------------------------------------
with revision as (
  select 'pedidos' as tabla, fecha_creacion, created_at from public.pedidos
  union all select 'devoluciones', fecha_creacion, created_at from public.devoluciones
  union all select 'recogidas',    fecha_creacion, created_at from public.recogidas
  union all select 'pqrs',         fecha_creacion, created_at from public.pqrs
)
select
  tabla,
  count(*) filter (where fecha_creacion is not null)                    as filas_con_fecha,
  count(*) filter (where nocturna)                                      as creadas_despues_de_7pm,
  count(*) filter (where nocturna and corrida)                          as fecha_corrida_un_dia,
  min(fecha_creacion) filter (where nocturna and corrida)               as desde,
  max(fecha_creacion) filter (where nocturna and corrida)               as hasta
from (
  select
    tabla, fecha_creacion, created_at,
    (created_at at time zone 'America/Bogota')::time >= time '19:00'     as nocturna,
    fecha_creacion = (created_at at time zone 'America/Bogota')::date + 1 as corrida
  from revision
  where created_at is not null
) x
group by tabla
order by fecha_corrida_un_dia desc;

-- ---------------------------------------------------------------------------
-- 2) fecha_real, fecha_despacho y fecha_gestion: se escribian al ACTUALIZAR,
--    asi que created_at de la fila no sirve. Se miran en el registro de
--    auditoria, que guarda la hora real de cada cambio.
--
--    Si audit_events no existe, este bloque falla y no se puede medir: en ese
--    caso solo cuenta el bloque 1.
-- ---------------------------------------------------------------------------
select
  campo,
  count(*)                                   as veces_que_se_escribio_de_noche,
  count(*) filter (where corrida)            as quedo_corrida_un_dia,
  min(created_at)                            as primer_caso,
  max(created_at)                            as ultimo_caso
from (
  select
    c.campo,
    a.created_at,
    (a.new_data ->> c.campo)::date = (a.created_at at time zone 'America/Bogota')::date + 1 as corrida
  from public.audit_events a
  cross join lateral (values ('fecha_real'), ('fecha_despacho'), ('fecha_gestion')) as c(campo)
  where a.action = 'UPDATE'
    and (a.new_data ->> c.campo) is not null
    and (a.new_data ->> c.campo) is distinct from (a.old_data ->> c.campo)
    and (a.created_at at time zone 'America/Bogota')::time >= time '19:00'
    and (a.new_data ->> c.campo) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
) y
group by campo
order by quedo_corrida_un_dia desc;

-- ---------------------------------------------------------------------------
-- 3) Si quieres ver casos concretos antes de decidir, los ultimos 30 pedidos
--    cuya entrega se registro de noche.
-- ---------------------------------------------------------------------------
-- select
--   a.record_id                                             as pedido,
--   a.created_at at time zone 'America/Bogota'              as se_registro,
--   (a.created_at at time zone 'America/Bogota')::date      as dia_real,
--   (a.new_data ->> 'fecha_real')::date                     as quedo_guardada
-- from public.audit_events a
-- where a.table_name = 'pedidos'
--   and a.action = 'UPDATE'
--   and (a.new_data ->> 'fecha_real') is distinct from (a.old_data ->> 'fecha_real')
--   and (a.new_data ->> 'fecha_real') is not null
--   and (a.created_at at time zone 'America/Bogota')::time >= time '19:00'
-- order by a.created_at desc
-- limit 30;

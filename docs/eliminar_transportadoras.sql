-- Elimina public.transportadoras: tabla heredada que la aplicacion no usa.
--
-- La app opera con public.transportistas (con "i"). Se verifico que "transportadoras"
-- no aparece en el frontend ni en las Edge Functions, y el conteo de filas dio 0.
-- El Security Advisor la reportaba como "RLS Enabled No Policy": con RLS activo y sin
-- politicas, la tabla quedaba inaccesible para todos los roles.
--
-- Ejecutar en el SQL Editor de PRODUCCION, parte por parte.

-- ---------------------------------------------------------------------------
-- 1) Confirmar que sigue vacia
-- ---------------------------------------------------------------------------
select count(*) as filas from public.transportadoras;

-- ---------------------------------------------------------------------------
-- 2) Confirmar que nada depende de ella
--    Si alguna de las dos consultas devuelve filas, NO continuar.
-- ---------------------------------------------------------------------------
select
  tc.constraint_name,
  tc.table_name as tabla_que_depende,
  kcu.column_name as columna
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'transportadoras';

select distinct view_schema, view_name
from information_schema.view_column_usage
where table_schema = 'public'
  and table_name = 'transportadoras';

-- ---------------------------------------------------------------------------
-- 3) Eliminar
--    RESTRICT (el valor por defecto) hace que falle si quedara alguna dependencia,
--    en lugar de arrastrarla. Es la opcion segura: si falla, hay algo que revisar.
-- ---------------------------------------------------------------------------
drop table if exists public.transportadoras restrict;

-- ---------------------------------------------------------------------------
-- 4) Verificacion: no debe devolver filas
-- ---------------------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'transportadoras';

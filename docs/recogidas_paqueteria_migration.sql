-- Ejecutar SOLO en Supabase STAGING por ahora.
--
-- La interfaz permite crear devoluciones y recogidas por paqueteria.
-- El esquema inicial no tenia estos campos en recogidas y tampoco los
-- tenia documentados en devoluciones, aunque el frontend los envia.

alter table public.devoluciones
  add column if not exists paqueteria text,
  add column if not exists guia_paqueteria text;

alter table public.recogidas
  add column if not exists paqueteria text,
  add column if not exists guia_paqueteria text;

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('devoluciones', 'recogidas')
  and column_name in ('paqueteria', 'guia_paqueteria')
order by table_name, column_name;

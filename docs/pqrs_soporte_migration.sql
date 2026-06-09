alter table public.pqrs
  add column if not exists soporte_data text,
  add column if not exists soporte_nombre text;

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pqrs'
  and column_name in ('soporte_data', 'soporte_nombre')
order by column_name;

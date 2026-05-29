alter table public.conductores
  add column if not exists activo boolean not null default true;

update public.conductores
set activo = true
where activo is null;

-- Reparacion puntual para conductores cuyo acceso ya fue eliminado antes de
-- agregar esta columna. Mantiene pedidos/devoluciones/recogidas historicas.
update public.conductores
set activo = false
where usuario_id is null;

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'conductores'
  and column_name = 'activo';

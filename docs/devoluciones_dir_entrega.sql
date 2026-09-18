-- Direccion de entrega en las devoluciones.
--
-- Las devoluciones solo guardaban la direccion de recogida (donde se recoge la
-- mercancia). Se agrega a donde hay que llevarla, igual que ya lo tienen las
-- recogidas con dir_entrega.
--
-- Es opcional y aditivo: las devoluciones existentes quedan con null.
--
-- Ejecutar en el SQL Editor ANTES de desplegar la nueva version: la app pide esta
-- columna al cargar las devoluciones y, si no existe, la consulta falla completa.
-- Primero STAGING, luego PRODUCCION.

alter table public.devoluciones
  add column if not exists dir_entrega text;

comment on column public.devoluciones.dir_entrega is
  'Direccion a donde se entrega la mercancia devuelta. La de origen es dir_recogida.';

-- Verificacion: debe devolver una fila
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'devoluciones'
  and column_name = 'dir_entrega';

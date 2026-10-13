-- Datos de la entrega que registra el conductor desde el celular.
--
-- Hasta ahora una entrega solo dejaba las fotos, la fecha y si hubo novedad.
-- Estas columnas guardan ademas quien recibio y donde se registro, que es lo
-- que pide el cliente cuando reclama un pedido "que nunca llego".
--
-- Ejecutar en los DOS proyectos de Supabase: primero en prueba, y en produccion
-- antes de subir el cambio a main. La aplicacion tolera que aun no existan (la
-- entrega se guarda igual, sin estos datos), pero hasta correrlo no se conservan.

alter table public.pedidos
  add column if not exists recibe_nombre          text,
  add column if not exists recibe_cedula          text,
  add column if not exists recibe_relacion        text,
  add column if not exists entrega_observaciones  text,
  -- Coordenadas del telefono al registrar la entrega. Se guardan solo si el
  -- conductor concede el permiso de ubicacion; si lo niega, quedan nulas.
  add column if not exists entrega_lat            double precision,
  add column if not exists entrega_lng            double precision;

comment on column public.pedidos.recibe_nombre is
  'Nombre de quien recibio la mercancia, capturado por el conductor.';
comment on column public.pedidos.recibe_relacion is
  'Relacion de quien recibe con el cliente: Cliente, Portero, Almacen, Otro.';
comment on column public.pedidos.entrega_lat is
  'Latitud del telefono al confirmar la entrega. Nula si no se concedio el permiso.';

-- Comprobacion: las seis columnas deben aparecer.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pedidos'
  and column_name in (
    'recibe_nombre', 'recibe_cedula', 'recibe_relacion',
    'entrega_observaciones', 'entrega_lat', 'entrega_lng'
  )
order by column_name;

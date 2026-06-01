-- Ejecutar en Supabase STAGING para verificar el resultado real de una entrega.
-- Reemplazar PEDIDO_ID por el id del pedido.

select
  id,
  estado,
  novedad,
  fecha_real,
  soportes,
  jsonb_array_length(coalesce(soportes_data, '[]'::jsonb)) as soportes_data_count
from public.pedidos
where id = 'PEDIDO_ID';

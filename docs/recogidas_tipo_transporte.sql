-- Agrega el tipo de transporte a las recogidas, como ya lo tienen los pedidos.
--
-- Hoy el formulario ofrece Transporte Propio, Empresa Transportista, Mensajeria y
-- Paqueteria, pero esa eleccion NO se guardaba: solo servia para decidir si se pedia
-- conductor o paqueteria. Al reabrir la recogida se perdia el dato.
--
-- Es un cambio aditivo: agrega una columna con valor por defecto y no modifica nada
-- de lo existente.
--
-- Ejecutar en el SQL Editor de PRODUCCION ANTES de desplegar la nueva version.

alter table public.recogidas
  add column if not exists tipo text default 'propio';

-- Deduce el tipo de las recogidas ya registradas: las que tienen paqueteria quedan
-- como 'paqueteria'; el resto como 'propio'.
update public.recogidas
set tipo = case when coalesce(paqueteria, '') <> '' then 'paqueteria' else 'propio' end
where tipo is null;

-- Verificacion
select coalesce(tipo, '(sin tipo)') as tipo, count(*) as recogidas
from public.recogidas
group by 1
order by recogidas desc;

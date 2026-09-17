-- Agrega el tipo de transporte a las devoluciones, igual que se hizo con recogidas
-- y como ya lo tenian los pedidos.
--
-- El formulario ofrece Transporte Propio, Empresa Transportista, Mensajeria y
-- Paqueteria, pero esa eleccion no se guardaba: solo servia para decidir si se pedia
-- conductor o paqueteria, y al reabrir la devolucion se perdia el dato.
--
-- Es un cambio aditivo: agrega una columna con valor por defecto y no modifica nada
-- de lo existente.
--
-- Ejecutar en el SQL Editor de PRODUCCION ANTES de desplegar la nueva version.

alter table public.devoluciones
  add column if not exists tipo text default 'propio';

-- Deduce el tipo de las devoluciones ya registradas: las que tienen paqueteria quedan
-- como 'paqueteria'; el resto como 'propio'.
update public.devoluciones
set tipo = case when coalesce(paqueteria, '') <> '' then 'paqueteria' else 'propio' end
where tipo is null;

-- Verificacion
select coalesce(tipo, '(sin tipo)') as tipo, count(*) as devoluciones
from public.devoluciones
group by 1
order by devoluciones desc;

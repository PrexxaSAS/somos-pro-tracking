-- Estado "solo_facturar" para pedidos que no se despachan: la mercancia ya fue
-- entregada y el registro existe solo para facturacion. El sistema origen lo marca
-- en las notas con "NO DESPACHAR" o "SOLO FACTURAR".
--
-- Desde la version que incluye este estado, el importador de pedidos por CSV ya
-- los crea con estado solo_facturar. Este script corrige los que se importaron
-- antes como sin_asignar.
--
-- Solo toca pedidos sin conductor y sin guia: si alguno ya fue asignado o despachado,
-- se deja como esta para revisarlo a mano.
--
-- La columna estado no tiene restriccion CHECK, asi que no requiere cambiar el esquema.
-- Ejecutar en el SQL Editor del proyecto de PRODUCCION.

-- 1) Revisar primero cuantos se van a cambiar
select count(*) as pedidos_a_cambiar
from public.pedidos
where estado = 'sin_asignar'
  and conductor_id is null
  and coalesce(guia_paqueteria, '') = ''
  and (notas ilike '%no despachar%' or notas ilike '%solo facturar%');

-- 2) Aplicar el cambio (la auditoria registra cada pedido modificado)
update public.pedidos
set estado = 'solo_facturar'
where estado = 'sin_asignar'
  and conductor_id is null
  and coalesce(guia_paqueteria, '') = ''
  and (notas ilike '%no despachar%' or notas ilike '%solo facturar%');

-- 3) Verificacion
select estado, count(*) as pedidos
from public.pedidos
where notas ilike '%no despachar%' or notas ilike '%solo facturar%'
group by estado
order by pedidos desc;

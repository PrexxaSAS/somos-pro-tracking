-- Pedidos basura creados por el parser viejo de CSV.
--
-- QUE PASO:
-- El importador partia el archivo por saltos de linea y por el separador sin mirar
-- las comillas. Cuando un campo entrecomillado traia una coma o un salto de linea
-- (un telefono "115 - ext 210, 211", una direccion en dos renglones), esa fila se
-- rompia: el pedazo sobrante se importaba como un pedido aparte, con ese texto en el
-- numero de pedido, o se corrian todas las columnas y el pedido quedaba con el
-- telefono en el nombre del cliente.
--
-- El parser ya se corrigio, pero los pedidos que alcanzaron a entrar siguen ahi.
-- Este script los encuentra y los elimina despues de que los revises.
--
-- Ejecutar parte por parte. Revisar el resultado del paso 1 ANTES de borrar nada.

-- ---------------------------------------------------------------------------
-- 1) Encontrarlos
--    Un numero de pedido real no tiene espacios ni comillas. Los que si tienen
--    son fragmentos de otra fila.
-- ---------------------------------------------------------------------------
select
  id,
  cliente,
  ciudad_nombre,
  direccion,
  estado,
  guia_interna,
  created_at
from public.pedidos
where id ~ '[ "]'
order by created_at desc;

-- Cuantos son:
select count(*) as pedidos_con_id_corrupto
from public.pedidos
where id ~ '[ "]';

-- ---------------------------------------------------------------------------
-- 2) Pedidos con las columnas corridas pero con id valido
--    No se pueden detectar automaticamente con certeza; estas dos consultas
--    muestran los casos mas probables para revisarlos a mano.
-- ---------------------------------------------------------------------------
-- Clientes que en realidad son un telefono o una extension:
select id, cliente, ciudad_nombre, direccion, created_at
from public.pedidos
where cliente ~* '(^\s*\d[\d\s.-]*$|ext\.?\s*\d)'
   or cliente like '%"%'
order by created_at desc;

-- Textos que quedaron con comillas sueltas en cualquier campo:
select id, cliente, ciudad_nombre, direccion, notas, created_at
from public.pedidos
where cliente like '%"%'
   or direccion like '%"%'
   or ciudad_nombre like '%"%'
   or notas like '%"%'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- 3) Comprobar que nada dependa de los que vas a borrar
--    Si devuelve filas, esos pedidos estan en una factura: revisalos antes.
-- ---------------------------------------------------------------------------
select fg.factura_id, fg.pedido_id
from public.factura_guias fg
join public.pedidos p on p.id = fg.pedido_id
where p.id ~ '[ "]';

-- ---------------------------------------------------------------------------
-- 4) Eliminar
--    Solo despues de revisar el paso 1. El where es el mismo de arriba, asi que
--    borra exactamente las filas que viste. No tiene vuelta atras.
-- ---------------------------------------------------------------------------
-- delete from public.pedidos
-- where id ~ '[ "]';

-- ---------------------------------------------------------------------------
-- 5) Verificacion: debe devolver 0
-- ---------------------------------------------------------------------------
-- select count(*) as quedan
-- from public.pedidos
-- where id ~ '[ "]';

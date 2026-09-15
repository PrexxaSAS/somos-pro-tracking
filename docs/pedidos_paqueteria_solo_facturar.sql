-- Corrige pedidos donde "SOLO FACTURAR" se guardo como transportadora (paqueteria)
-- en lugar de usar el estado solo_facturar. En la lista de Pedidos la columna
-- Conductor muestra la transportadora, por eso aparecia "SOLO FACTURAR" ahi.
--
-- Ejecutar en el SQL Editor de PRODUCCION, parte por parte y en orden.

-- 1) Revisar: pedidos con "facturar" en transportadora, guia o empresa de transporte
select id, guia_interna, cliente, tipo, estado, paqueteria, guia_paqueteria,
       empresa_transporte, conductor_id
from public.pedidos
where paqueteria ilike '%factur%'
   or guia_paqueteria ilike '%factur%'
   or empresa_transporte ilike '%factur%'
order by created_at desc;

-- 2) Revisar: la transportadora falsa en el catalogo de paqueterias
select * from public.paqueterias where nombre ilike '%factur%';

-- 3) Corregir los pedidos.
--    - estado pasa a solo_facturar
--    - se borra el texto falso de transportadora, guia o empresa de transporte
--    No toca pedidos en transito, entregados o con novedad: la base bloquea esos
--    cambios y deben revisarse a mano (la consulta 1 los muestra).
update public.pedidos
set estado = 'solo_facturar',
    paqueteria = case when paqueteria ilike '%factur%' then null else paqueteria end,
    guia_paqueteria = case when guia_paqueteria ilike '%factur%' then null else guia_paqueteria end,
    empresa_transporte = case when empresa_transporte ilike '%factur%' then null else empresa_transporte end
where (paqueteria ilike '%factur%'
    or guia_paqueteria ilike '%factur%'
    or empresa_transporte ilike '%factur%')
  and coalesce(estado, '') not in ('en_transito', 'entregado', 'novedad');

-- 4) Quitar la transportadora falsa del catalogo para que no se vuelva a elegir.
--    Los pedidos guardan el nombre como texto, no como referencia, asi que borrarla
--    no afecta a otros registros.
delete from public.paqueterias where nombre ilike '%factur%';

-- 5) Verificacion: debe devolver solo pedidos en transito, entregados o con novedad
--    (si hay alguno), que requieren revision manual.
select id, guia_interna, estado, paqueteria, guia_paqueteria, empresa_transporte
from public.pedidos
where paqueteria ilike '%factur%'
   or guia_paqueteria ilike '%factur%'
   or empresa_transporte ilike '%factur%';

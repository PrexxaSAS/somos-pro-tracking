-- Quita las comillas sobrantes que el parser viejo de CSV dejo en las notas.
--
-- En CSV, una comilla dentro de un campo entrecomillado se escribe duplicada:
-- """Sin observaciones""" significa "Sin observaciones". El parser viejo solo
-- quitaba las comillas de los extremos, asi que quedo guardado ""Sin observaciones"".
--
-- OJO: esto NO repara las notas que quedaron cortadas (las que traian una coma y se
-- partieron) ni los textos con ? por el encoding. Ese texto ya no esta en la base:
-- para recuperarlo hay que volver a cargar el plano original con el parser corregido.
--
-- Ejecutar parte por parte en el SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Ver que se va a cambiar
-- ---------------------------------------------------------------------------
select
  id,
  notas as antes,
  nullif(btrim(replace(notas, '"', '')), '') as despues,
  estado,
  created_at
from public.pedidos
where notas like '%"%'
order by created_at desc;

select count(*) as notas_con_comillas
from public.pedidos
where notas like '%"%';

-- ---------------------------------------------------------------------------
-- 2) Desactivar el bloqueo de pedidos cerrados
--
-- trg_prevent_closed_pedido_changes impide modificar un pedido entregado, y en el
-- SQL Editor no hay un usuario de la aplicacion que califique para las excepciones:
-- sin esto, el update de abajo falla en todos los pedidos ya entregados.
--
-- IMPORTANTE: el paso 4 lo vuelve a activar. No dejes la sesion a medias.
-- ---------------------------------------------------------------------------
alter table public.pedidos disable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 3) Limpiar
--    Ninguno de estos textos necesita comillas, asi que se quitan todas y se
--    recorta el espacio sobrante. Si el campo queda vacio, se guarda como null.
-- ---------------------------------------------------------------------------
update public.pedidos
set notas = nullif(btrim(replace(notas, '"', '')), '')
where notas like '%"%';

-- ---------------------------------------------------------------------------
-- 4) Volver a activar el bloqueo (no omitir)
-- ---------------------------------------------------------------------------
alter table public.pedidos enable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 5) Verificacion
-- ---------------------------------------------------------------------------
-- Debe devolver 0:
select count(*) as quedan_con_comillas
from public.pedidos
where notas like '%"%';

-- El trigger debe quedar habilitado: tgenabled tiene que ser 'O'.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.pedidos'::regclass
  and not tgisinternal
order by tgname;

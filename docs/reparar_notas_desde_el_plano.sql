-- Procedimiento para reparar las observaciones que el parser viejo dejo cortadas.
--
-- El texto perdido no esta en la base: hay que volver a leerlo del plano original con
-- el parser corregido. Eso se hace desde la aplicacion, con la casilla
-- "Actualizar notas desde el plano" del modal de CSV de Pedidos.
--
-- EL OBSTACULO:
-- trg_prevent_closed_pedido_changes impide modificar un pedido entregado o con
-- novedad, y buena parte de los pedidos afectados ya estan entregados. Sin apagarlo,
-- la reparacion falla justo en esos y el reporte los lista como error.
--
-- POR QUE APAGARLO Y NO DARLE UNA EXCEPCION PERMANENTE:
-- Una excepcion en el trigger dejaria las notas de los pedidos cerrados editables
-- para siempre. Esto es una reparacion de una sola vez, asi que es preferible abrir
-- la ventana, hacerla y volver a cerrar.
--
-- IMPORTANTE: mientras el trigger este apagado, cualquier usuario puede modificar un
-- pedido entregado. Hazlo en un momento de poco movimiento y no dejes la ventana
-- abierta mas de lo necesario. La auditoria (audit_row_change) sigue registrando
-- todo, asi que queda constancia de lo que se cambio.

-- ---------------------------------------------------------------------------
-- 1) Antes: ver cuales tienen la nota danada
-- ---------------------------------------------------------------------------
select id, estado, notas, created_at
from public.pedidos
where notas like '%"%'
   or notas like '%?%'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- 2) Abrir la ventana
-- ---------------------------------------------------------------------------
alter table public.pedidos disable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 3) EN LA APLICACION (no aqui):
--    Pedidos -> CSV Pedidos -> cargar el plano ORIGINAL
--    -> marcar "Actualizar notas desde el plano" -> Actualizar notas
--
--    Asegurate de usar el archivo tal como lo exporta el ERP. Si lo reabriste y
--    guardaste en Excel, revisa que las tildes se vean bien antes de subirlo.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 4) Cerrar la ventana (no omitir)
-- ---------------------------------------------------------------------------
alter table public.pedidos enable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 5) Verificacion
-- ---------------------------------------------------------------------------
-- El trigger debe quedar habilitado: tgenabled tiene que ser 'O'.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.pedidos'::regclass
  and not tgisinternal
order by tgname;

-- Las notas reparadas ya no deben tener comillas sueltas ni caracteres danados:
select count(*) as quedan_danadas
from public.pedidos
where notas like '%"%'
   or notas like '%?%';

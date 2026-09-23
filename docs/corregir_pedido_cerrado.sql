-- Completar los datos de un pedido que quedo cerrado sin ellos.
--
-- CUANDO SE USA:
-- Si al subir el soporte el pedido paso a "entregado" antes de que se guardaran
-- las cajas, la factura o la ciudad, esos campos ya no se pueden editar desde la
-- aplicacion: el trigger prevent_closed_pedido_changes bloquea cualquier cambio
-- sobre un pedido entregado.
--
-- El origen del problema ya esta corregido en la aplicacion (subir el soporte
-- ahora guarda tambien lo que este escrito en el formulario), pero los pedidos que
-- alcanzaron a quedar asi hay que arreglarlos aqui.
--
-- IMPORTANTE: mientras el trigger este apagado, cualquier usuario puede modificar
-- un pedido entregado. Es una ventana corta: apagar, corregir, encender.
-- La auditoria sigue registrando el cambio.

-- ---------------------------------------------------------------------------
-- 1) Ver como esta el pedido. Cambia el numero por el que vas a corregir.
-- ---------------------------------------------------------------------------
select id, cliente, estado, cajas, factura, ciudad_codigo, ciudad_nombre,
       direccion, fecha_real, estado_despacho
from public.pedidos
where id = 'PT000010660';

-- ---------------------------------------------------------------------------
-- 2) Abrir la ventana
-- ---------------------------------------------------------------------------
alter table public.pedidos disable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 3) Corregir
--
-- Caso real de PT000010660: cajas 2, factura PT12225, fecha estimada hoy y la
-- modalidad "Cliente Recoge".
--
-- Esa modalidad se guarda en estado_despacho y NO en estado, porque en estado
-- vive "entregado": si se reemplazara, el pedido dejaria de contar como entregado
-- en el dashboard y perderia el cierre, aunque tenga su soporte y su fecha real.
-- El detalle del pedido muestra el badge "Entregado" y el desplegable de despacho
-- en "Cliente Recoge", que es justo lo que se quiere ver.
--
-- Para otro pedido, cambia el id y los valores; borra las columnas que no aplican.
-- ---------------------------------------------------------------------------
update public.pedidos
set cajas           = 2,
    factura         = 'PT12225',
    fecha_estimada  = current_date,
    estado_despacho = 'cliente_recoge'
where id = 'PT000010660';

-- Si ademas hay que corregir la ciudad, agrega estas dos lineas al update de
-- arriba con el codigo DANE que corresponda:
--     ciudad_codigo = '05001',
--     ciudad_nombre = (select c.name from public.ciudades c where c.code = '05001')

-- ---------------------------------------------------------------------------
-- 4) Cerrar la ventana (no omitir)
-- ---------------------------------------------------------------------------
alter table public.pedidos enable trigger trg_prevent_closed_pedido_changes;

-- ---------------------------------------------------------------------------
-- 5) Verificacion
-- ---------------------------------------------------------------------------
select id, cliente, estado, cajas, factura, ciudad_codigo, ciudad_nombre, fecha_real
from public.pedidos
where id = 'PT000010660';

-- El trigger debe quedar habilitado: tgenabled tiene que ser 'O'.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.pedidos'::regclass
  and tgname = 'trg_prevent_closed_pedido_changes';

-- ---------------------------------------------------------------------------
-- 6) Para saber si hay mas pedidos en la misma situacion:
--    entregados, con soporte, pero sin cajas o sin factura.
-- ---------------------------------------------------------------------------
select id, cliente, estado, cajas, factura, ciudad_codigo, fecha_real, created_at
from public.pedidos
where estado in ('entregado','novedad')
  and coalesce(array_length(soportes, 1), 0) > 0
  and (coalesce(cajas, 0) = 0 or coalesce(factura, '') = '')
order by created_at desc;

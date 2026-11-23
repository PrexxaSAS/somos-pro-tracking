-- ---------------------------------------------------------------------------
-- Facturas de proveedor: relacionar tambien devoluciones y recogidas.
--
-- Cada fila de factura_guias apunta a UNA sola cosa: un pedido, una
-- devolucion o una recogida. El valor de la factura se reparte por cajas (de
-- los pedidos) y unidades (de las devoluciones y recogidas).
--
-- Las politicas de factura_guias no miran la columna del pedido: siguen
-- sirviendo igual.
--
-- Correr en los dos proyectos ANTES de publicar la version que lo usa.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

alter table public.factura_guias alter column pedido_id drop not null;

alter table public.factura_guias
  add column if not exists devolucion_id text references public.devoluciones(id) on delete cascade,
  add column if not exists recogida_id   text references public.recogidas(id)    on delete cascade;

-- Exactamente una de las tres. NOT VALID: no revisa las filas viejas (todas
-- son de pedidos), solo las nuevas.
alter table public.factura_guias drop constraint if exists factura_guias_una_sola;
alter table public.factura_guias
  add constraint factura_guias_una_sola
  check (num_nonnulls(pedido_id, devolucion_id, recogida_id) = 1) not valid;

create index if not exists idx_factura_guias_devolucion on public.factura_guias(devolucion_id) where devolucion_id is not null;
create index if not exists idx_factura_guias_recogida   on public.factura_guias(recogida_id)   where recogida_id   is not null;

-- Comprobacion: deben salir las dos columnas nuevas.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'factura_guias'
   and column_name in ('devolucion_id', 'recogida_id');

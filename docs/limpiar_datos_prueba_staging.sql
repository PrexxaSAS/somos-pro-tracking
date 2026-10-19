-- ---------------------------------------------------------------------------
-- Limpiar los datos de prueba de STAGING para empezar en cero con el nuevo
-- flujo (los pedidos entran por el cargue de cartera).
--
--   *** SOLO EN EL PROYECTO DE PRUEBA (STAGING). NUNCA EN PRODUCCION. ***
--   Antes de correrlo mira la URL del panel de Supabase: si dice
--   cfvvnvmezmrxehpaqayw, estas en PRODUCCION. Cierra esto y no lo corras.
--
-- Borra TODO lo de estas tablas:
--   pedidos (y su orden de ruta del conductor, que cuelga de ellos)
--   pedidos_cartera, pedidos_cartera_detalle, historial_cartera
--   cortes_programados (los cupos por dia; se vuelven a crear solos)
--   devoluciones, recogidas, pqrs
--   facturas_proveedor, factura_guias
--
-- NO toca: sedes, cortes_sede, asesores, conductores, transportistas,
-- usuarios, ciudades, promesas_servicio, paqueterias.
--
-- La numeracion de guias (SPT-, DV-, RC-) y de casos PQRS se calcula como el
-- mayor numero existente + 1, asi que despues de esto vuelve a empezar en 0001.
--
-- Como correrlo: primero el PASO 1 solo, y revisa que los numeros sean los de
-- prueba. Despues el PASO 3 (el PASO 2 es opcional). Por ultimo el PASO 4.
-- ---------------------------------------------------------------------------


-- PASO 1 (solo lectura): cuanto hay hoy. Esto es lo que se va a borrar.
select 'pedidos' as tabla, count(*) as filas, min(created_at)::date as desde, max(created_at)::date as hasta from public.pedidos
union all select 'pedidos_cartera',         count(*), min(created_at)::date, max(created_at)::date from public.pedidos_cartera
union all select 'pedidos_cartera_detalle', count(*), null, null from public.pedidos_cartera_detalle
union all select 'historial_cartera',       count(*), null, null from public.historial_cartera
union all select 'cortes_programados',      count(*), min(fecha), max(fecha) from public.cortes_programados
union all select 'devoluciones',            count(*), min(created_at)::date, max(created_at)::date from public.devoluciones
union all select 'recogidas',               count(*), min(created_at)::date, max(created_at)::date from public.recogidas
union all select 'pqrs',                    count(*), min(created_at)::date, max(created_at)::date from public.pqrs
union all select 'facturas_proveedor',      count(*), min(created_at)::date, max(created_at)::date from public.facturas_proveedor
union all select 'factura_guias',           count(*), null, null from public.factura_guias;


-- PASO 2 (opcional): copia de respaldo dentro de la misma base, en un esquema
-- aparte. Ocupa espacio (los pedidos guardan las fotos de soporte), y el plan
-- Free tiene 500 MB por proyecto: correrlo solo si hay espacio. Para usarlo,
-- quita los "--" de las lineas de abajo. Se borra despues con:
--   drop schema respaldo_prueba cascade;
--
-- create schema if not exists respaldo_prueba;
-- create table respaldo_prueba.pedidos                 as table public.pedidos;
-- create table respaldo_prueba.pedidos_cartera         as table public.pedidos_cartera;
-- create table respaldo_prueba.pedidos_cartera_detalle as table public.pedidos_cartera_detalle;
-- create table respaldo_prueba.historial_cartera       as table public.historial_cartera;
-- create table respaldo_prueba.cortes_programados      as table public.cortes_programados;
-- create table respaldo_prueba.devoluciones            as table public.devoluciones;
-- create table respaldo_prueba.recogidas               as table public.recogidas;
-- create table respaldo_prueba.pqrs                    as table public.pqrs;
-- create table respaldo_prueba.facturas_proveedor      as table public.facturas_proveedor;
-- create table respaldo_prueba.factura_guias           as table public.factura_guias;


-- PASO 3: el borrado, todo o nada. Si algo falla (por ejemplo, una tabla que
-- apunta a pedidos y no esta en la lista), no se borra nada y el error dice
-- cual es.
begin;

  -- Primero lo que apunta a pedidos sin borrarse en cascada.
  delete from public.factura_guias;
  delete from public.facturas_proveedor;

  -- Cartera: el detalle y el historial se van en cascada con su pedido.
  delete from public.pedidos_cartera;
  delete from public.cortes_programados;

  -- Pedidos: la ruta del conductor (ruta_conductor) se va en cascada.
  delete from public.pedidos;

  delete from public.devoluciones;
  delete from public.recogidas;
  delete from public.pqrs;

commit;


-- PASO 4 (solo lectura): todo debe quedar en 0.
select 'pedidos' as tabla, count(*) as filas from public.pedidos
union all select 'pedidos_cartera',         count(*) from public.pedidos_cartera
union all select 'pedidos_cartera_detalle', count(*) from public.pedidos_cartera_detalle
union all select 'historial_cartera',       count(*) from public.historial_cartera
union all select 'cortes_programados',      count(*) from public.cortes_programados
union all select 'devoluciones',            count(*) from public.devoluciones
union all select 'recogidas',               count(*) from public.recogidas
union all select 'pqrs',                    count(*) from public.pqrs
union all select 'facturas_proveedor',      count(*) from public.facturas_proveedor
union all select 'factura_guias',           count(*) from public.factura_guias;

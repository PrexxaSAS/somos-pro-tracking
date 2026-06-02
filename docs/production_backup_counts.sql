-- Conteos para backup productivo pre-despliegue.
-- Ejecutar en Supabase SQL Editor del proyecto de PRODUCCION.
-- No modifica datos.

select 'usuarios' as tabla, count(*) as total from public.usuarios
union all select 'transportistas', count(*) from public.transportistas
union all select 'conductores', count(*) from public.conductores
union all select 'ciudades', count(*) from public.ciudades
union all select 'paqueterias', count(*) from public.paqueterias
union all select 'promesas_servicio', count(*) from public.promesas_servicio
union all select 'pedidos', count(*) from public.pedidos
union all select 'devoluciones', count(*) from public.devoluciones
union all select 'recogidas', count(*) from public.recogidas
union all select 'pqrs', count(*) from public.pqrs
union all select 'facturas_proveedor', count(*) from public.facturas_proveedor
union all select 'factura_guias', count(*) from public.factura_guias
union all select 'audit_events', count(*) from public.audit_events
order by tabla;


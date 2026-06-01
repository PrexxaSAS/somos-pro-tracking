-- Ejecutar en Supabase SQL Editor del proyecto de STAGING.
-- Verifica que las tablas base tengan datos ficticios suficientes
-- antes de probar la app local o el preview de Vercel.

select 'usuarios' as tabla, count(*) as total from public.usuarios
union all select 'transportistas', count(*) from public.transportistas
union all select 'transportadoras', count(*) from public.transportadoras
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
order by tabla;

select
  rol,
  count(*) as total
from public.usuarios
group by rol
order by rol;

select
  estado,
  count(*) as total
from public.pedidos
group by estado
order by estado;

select
  u."user",
  u.rol,
  u.nombre,
  c.id as conductor_id,
  c.placa
from public.usuarios u
left join public.conductores c on c.usuario_id = u.id
order by u.rol, u."user";

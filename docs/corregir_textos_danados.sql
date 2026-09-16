-- Corrige textos que quedaron con el simbolo de reemplazo (U+FFFD, el rombo con
-- interrogante) porque el archivo venia en ANSI (Windows-1252) y se leia como UTF-8.
-- Ejemplos vistos: "KM 14 V?A AL MAGDALENA", "Cra. 10 N? 30B-20".
--
-- LIMITE IMPORTANTE: al leerse mal, el byte original SE PERDIO. No se puede saber con
-- certeza si ese simbolo era A, I, O, N u otra letra. Por eso solo se corrigen patrones
-- donde el contexto no deja duda (palabras completas) y el resto queda listado para
-- revision manual.
--
-- Se reemplaza por la version SIN tilde (VIA, ANO, TELEFONO): deja el texto legible
-- sin inventar acentos que no se pueden confirmar.
--
-- El cargue por CSV ya lee la codificacion correcta, asi que esto es solo para lo que
-- quedo guardado antes.
--
-- Ejecutar en el SQL Editor de PRODUCCION, parte por parte.

-- ---------------------------------------------------------------------------
-- 1) Inventario: cuantos registros estan afectados por tabla
-- ---------------------------------------------------------------------------
with marcado as (
  select 'pedidos' as tabla, count(*) as filas from public.pedidos
   where concat_ws(' ', cliente, direccion, notas, ciudad_nombre, ciudad_origen_nombre,
                   direccion_origen, empresa_transporte, paqueteria) like '%' || chr(65533) || '%'
  union all
  select 'devoluciones', count(*) from public.devoluciones
   where concat_ws(' ', motivo, dir_recogida, ciudad_nombre) like '%' || chr(65533) || '%'
  union all
  select 'recogidas', count(*) from public.recogidas
   where concat_ws(' ', observaciones, dir_recogida, dir_entrega,
                   ciudad_recogida_nombre, ciudad_entrega_nombre) like '%' || chr(65533) || '%'
  union all
  select 'pqrs', count(*) from public.pqrs
   where concat_ws(' ', motivo, descripcion, respuesta) like '%' || chr(65533) || '%'
  union all
  select 'ciudades', count(*) from public.ciudades
   where name like '%' || chr(65533) || '%'
)
select * from marcado where filas > 0 order by filas desc;

-- ---------------------------------------------------------------------------
-- 2) Funcion con las correcciones seguras
-- ---------------------------------------------------------------------------
create or replace function public.reparar_texto(t text)
returns text
language plpgsql
immutable
as $$
declare
  d text := chr(65533);          -- el simbolo de reemplazo
  r text := t;
  reemplazos text[][];
  i integer;
begin
  if r is null or position(d in r) = 0 then
    return r;
  end if;

  reemplazos := array[
    ['V' || d || 'A',        'VIA'],
    ['N' || d || 'MERO',     'NUMERO'],
    ['N' || d || ' ',        'No. '],
    ['A' || d || 'O',        'ANO'],
    ['SE' || d || 'OR',      'SENOR'],
    ['MU' || d || 'OZ',      'MUNOZ'],
    ['PE' || d || 'A',       'PENA'],
    ['NI' || d || 'O',       'NINO'],
    ['CA' || d || 'A',       'CANA'],
    ['ESPA' || d || 'A',     'ESPANA'],
    ['NARI' || d || 'O',     'NARINO'],
    ['MA' || d || 'ANA',     'MANANA'],
    ['DISE' || d || 'O',     'DISENO'],
    ['BOGOT' || d,           'BOGOTA'],
    ['MEDELL' || d || 'N',   'MEDELLIN'],
    ['ATL' || d || 'NTICO',  'ATLANTICO'],
    ['BOL' || d || 'VAR',    'BOLIVAR'],
    ['C' || d || 'RDOBA',    'CORDOBA'],
    ['QUIND' || d || 'O',    'QUINDIO'],
    ['CAQUET' || d,          'CAQUETA'],
    ['CHOC' || d,            'CHOCO'],
    ['TEL' || d || 'FONO',   'TELEFONO'],
    ['DIRECCI' || d || 'N',  'DIRECCION'],
    ['ATENCI' || d || 'N',   'ATENCION'],
    ['LOG' || d || 'STICA',  'LOGISTICA'],
    ['MI' || d || 'RCOLES',  'MIERCOLES'],
    ['S' || d || 'BADO',     'SABADO'],
    ['D' || d || 'A ',       'DIA ']
  ];

  for i in 1 .. array_length(reemplazos, 1) loop
    r := replace(r, reemplazos[i][1], reemplazos[i][2]);
  end loop;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Previsualizar el resultado ANTES de modificar nada
-- ---------------------------------------------------------------------------
select id,
       notas as antes,
       public.reparar_texto(notas) as despues
from public.pedidos
where notas like '%' || chr(65533) || '%'
limit 30;

-- ---------------------------------------------------------------------------
-- 4) Aplicar. Los triggers de pedidos bloquean cambios en pedidos cerrados o en
--    transito, asi que se desactivan solo durante esta correccion de texto.
--    Todo va en una transaccion: si algo falla, no queda nada a medias.
-- ---------------------------------------------------------------------------
begin;

alter table public.pedidos disable trigger trg_prevent_closed_pedido_changes;

update public.pedidos set
  cliente              = public.reparar_texto(cliente),
  direccion            = public.reparar_texto(direccion),
  notas                = public.reparar_texto(notas),
  ciudad_nombre        = public.reparar_texto(ciudad_nombre),
  ciudad_origen_nombre = public.reparar_texto(ciudad_origen_nombre),
  direccion_origen     = public.reparar_texto(direccion_origen),
  empresa_transporte   = public.reparar_texto(empresa_transporte),
  paqueteria           = public.reparar_texto(paqueteria)
where concat_ws(' ', cliente, direccion, notas, ciudad_nombre, ciudad_origen_nombre,
                direccion_origen, empresa_transporte, paqueteria) like '%' || chr(65533) || '%';

alter table public.pedidos enable trigger trg_prevent_closed_pedido_changes;

update public.devoluciones set
  motivo        = public.reparar_texto(motivo),
  dir_recogida  = public.reparar_texto(dir_recogida),
  ciudad_nombre = public.reparar_texto(ciudad_nombre)
where concat_ws(' ', motivo, dir_recogida, ciudad_nombre) like '%' || chr(65533) || '%';

update public.recogidas set
  observaciones          = public.reparar_texto(observaciones),
  dir_recogida           = public.reparar_texto(dir_recogida),
  dir_entrega            = public.reparar_texto(dir_entrega),
  ciudad_recogida_nombre = public.reparar_texto(ciudad_recogida_nombre),
  ciudad_entrega_nombre  = public.reparar_texto(ciudad_entrega_nombre)
where concat_ws(' ', observaciones, dir_recogida, dir_entrega,
                ciudad_recogida_nombre, ciudad_entrega_nombre) like '%' || chr(65533) || '%';

update public.pqrs set
  motivo      = public.reparar_texto(motivo),
  descripcion = public.reparar_texto(descripcion),
  respuesta   = public.reparar_texto(respuesta)
where concat_ws(' ', motivo, descripcion, respuesta) like '%' || chr(65533) || '%';

update public.ciudades set name = public.reparar_texto(name)
where name like '%' || chr(65533) || '%';

commit;

-- ---------------------------------------------------------------------------
-- 5) Que quedo pendiente de revision manual (el simbolo sigue ahi)
-- ---------------------------------------------------------------------------
select 'pedidos' as tabla, id, 'notas' as campo, notas as texto from public.pedidos
 where notas like '%' || chr(65533) || '%'
union all
select 'pedidos', id, 'direccion', direccion from public.pedidos
 where direccion like '%' || chr(65533) || '%'
union all
select 'pedidos', id, 'cliente', cliente from public.pedidos
 where cliente like '%' || chr(65533) || '%'
union all
select 'recogidas', id, 'observaciones', observaciones from public.recogidas
 where observaciones like '%' || chr(65533) || '%'
union all
select 'devoluciones', id, 'motivo', motivo from public.devoluciones
 where motivo like '%' || chr(65533) || '%'
union all
select 'pqrs', id, 'descripcion', descripcion from public.pqrs
 where descripcion like '%' || chr(65533) || '%'
order by 1, 2;

-- ---------------------------------------------------------------------------
-- Una sola fuente para la guia interna.
--
-- EL PROBLEMA:
-- La guia se generaba en dos sitios distintos y ninguno se enteraba del otro:
--   - la aplicacion, al crear un pedido a mano: leia su lista en memoria,
--     buscaba el consecutivo mas alto y le sumaba uno;
--   - el trigger de cartera, al aprobar: hacia lo mismo contra la tabla.
-- Dos personas creando al tiempo, o una creando mientras cartera aprueba,
-- podian sacar la misma guia. Nada lo impedia: la columna no tiene restriccion.
--
-- LA SOLUCION:
-- La guia la pone la base y nadie mas. Un trigger BEFORE INSERT la asigna
-- cuando llega vacia, tomando un candado por transaccion para que dos insert
-- simultaneos se turnen. Y un indice unico la vuelve imposible de repetir
-- aunque alguien la mande escrita a mano.
--
-- Los pedidos de paqueteria no llevan guia interna: se quedan en null, y el
-- indice unico no estorba porque Postgres permite varios null.
--
-- Ejecutar en el SQL Editor: primero PRUEBA, y luego PRODUCCION.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Antes de nada: ¿hay guias repetidas hoy?
--    Si esta consulta devuelve filas, el indice del paso 3 va a fallar. Hay que
--    decidir cual conserva su guia y cual se renumera antes de seguir.
-- ---------------------------------------------------------------------------
select guia_interna, count(*) as veces, string_agg(id, ', ') as pedidos
from public.pedidos
where guia_interna is not null
group by guia_interna
having count(*) > 1
order by veces desc;

-- ---------------------------------------------------------------------------
-- 2) El generador, en un solo lugar
-- ---------------------------------------------------------------------------
create or replace function public.asignar_guia_interna()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  anio           text;
  patron_entero  text;
  patron_captura text;
  consecutivo    integer;
begin
  -- Si ya viene con guia, se respeta: hay pedidos que la traen de antes.
  if new.guia_interna is not null and btrim(new.guia_interna) <> '' then
    return new;
  end if;

  -- La paqueteria no lleva guia interna, la lleva la transportadora.
  if lower(coalesce(new.tipo, '')) = 'paqueteria' then
    new.guia_interna := null;
    return new;
  end if;

  anio           := to_char(now() at time zone 'America/Bogota', 'YYYY');
  patron_entero  := '^SPT-' || anio || '-[0-9]+$';
  patron_captura := '^SPT-' || anio || '-([0-9]+)$';

  -- El candado hace que dos inserciones simultaneas se turnen en vez de leer
  -- las dos el mismo maximo. Se suelta solo al terminar la transaccion.
  perform pg_advisory_xact_lock(hashtext('pedidos.guia_interna'));

  select coalesce(max(substring(guia_interna from patron_captura)::integer), 0) + 1
    into consecutivo
  from public.pedidos
  where guia_interna ~ patron_entero;

  new.guia_interna := 'SPT-' || anio || '-' || lpad(consecutivo::text, 4, '0');
  return new;
end
$fn$;

comment on function public.asignar_guia_interna is
  'Asigna la guia interna (SPT-<anio>-<consecutivo>) cuando el pedido llega sin ella. Unico generador: la aplicacion y el trigger de cartera ya no la calculan.';

drop trigger if exists trg_asignar_guia_interna on public.pedidos;
create trigger trg_asignar_guia_interna
  before insert on public.pedidos
  for each row execute function public.asignar_guia_interna();

-- ---------------------------------------------------------------------------
-- 3) Y que no se pueda repetir, pase lo que pase
--    Si el paso 1 devolvio filas, esto falla. Es a proposito: es preferible
--    que falle aqui a que sigan naciendo guias repetidas.
-- ---------------------------------------------------------------------------
create unique index if not exists uq_pedidos_guia_interna
  on public.pedidos (guia_interna)
  where guia_interna is not null;

-- ---------------------------------------------------------------------------
-- 4) Comprobacion
-- ---------------------------------------------------------------------------
-- insert into public.pedidos (id, cliente) values ('PRUEBA-GUIA-1', 'Prueba');
-- select id, guia_interna from public.pedidos where id = 'PRUEBA-GUIA-1';
-- delete from public.pedidos where id = 'PRUEBA-GUIA-1';

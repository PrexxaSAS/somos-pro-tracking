-- ---------------------------------------------------------------------------
-- El pedido aprobado en cartera entra a produccion.
--
-- QUE RESUELVE:
-- Hasta ahora los pedidos de produccion entraban por el plano CSV del modulo
-- Pedidos, y cartera vivia aparte: pedidos_cartera.numero_pedido es el mismo
-- numero que pedidos.id, pero nada los unia. Ahora la unica puerta de entrada
-- es el cargue de cartera, y el pedido nace en produccion cuando se aprueba.
--
-- POR QUE UN TRIGGER Y NO CODIGO EN LA APLICACION:
-- Quien aprueba puede ser admin, operador o cartera. El rol cartera no tiene
-- permiso de insert sobre public.pedidos ni de lectura sobre public.ciudades,
-- asi que un insert desde el navegador le fallaria. Al ser security definer, la
-- funcion escribe con los permisos del dueno y no depende del rol de quien
-- aprueba. Ademas no hay forma de aprobar sin que el pedido se cree: no queda
-- la mitad del trabajo hecha si el navegador se cierra entre una cosa y otra.
--
-- QUE DATOS TRAE Y CUALES NO:
--   fecha_pedido / hora_pedido  <- la fecha y hora del corte asignado
--   ciudad_codigo               <- sector_dane (destino), a 5 digitos
--   ciudad_origen_codigo        <- dane_origen
--   los nombres de ciudad se resuelven contra public.ciudades
--   cajas    entra en 0
--   factura  y  tipo  entran vacios: se llenan a mano desde la edicion
--
-- Ejecutar en el SQL Editor: primero PRUEBA, y luego PRODUCCION.
-- ---------------------------------------------------------------------------

create or replace function public.cartera_crear_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  numero          text;
  dane_destino    text;
  dane_origen_n   text;
  nombre_destino  text;
  nombre_origen   text;
  cuando          timestamptz;
begin
  -- Solo los aprobados, y solo la primera vez que lo son.
  if new.estado_cartera is distinct from 'aprobado' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.estado_cartera = 'aprobado' then
    return new;
  end if;

  numero := btrim(coalesce(new.numero_pedido, ''));
  if numero = '' then
    return new;
  end if;

  -- Si el pedido ya existe en produccion no se toca: pudo cargarse antes con el
  -- plano, o aprobarse dos veces. Se prefiere no pisar lo que ya se opero.
  if exists (select 1 from public.pedidos where id = numero) then
    return new;
  end if;

  -- El DANE viaja sin el cero de la izquierda ("5380" es "05380").
  dane_destino  := nullif(lpad(btrim(coalesce(new.sector_dane, '')), 5, '0'), '00000');
  dane_origen_n := nullif(lpad(btrim(coalesce(new.dane_origen, '')), 5, '0'), '00000');

  select name into nombre_destino from public.ciudades where code = dane_destino;
  select name into nombre_origen  from public.ciudades where code = dane_origen_n;

  -- La fecha y hora del pedido son las del corte. Si no se le asigno corte
  -- (el DANE origen no tiene sede configurada), quedan vacias y se ven vacias,
  -- en vez de inventar la fecha de hoy.
  cuando := new.fecha_corte;

  insert into public.pedidos (
    id, cliente, direccion,
    ciudad_codigo, ciudad_nombre,
    ciudad_origen_codigo, ciudad_origen_nombre,
    cajas, factura, tipo, estado,
    fecha_pedido, hora_pedido, notas
  ) values (
    numero,
    coalesce(
      nullif(btrim(coalesce(new.cliente, '')), ''),
      nullif(btrim(coalesce(new.nit, '')), ''),
      'Sin cliente'
    ),
    nullif(btrim(coalesce(new.direccion, '')), ''),
    dane_destino,  nombre_destino,
    dane_origen_n, nombre_origen,
    0,            -- las cajas se digitan en la edicion del pedido
    null,         -- factura: se pone cuando se facture
    null,         -- tipo: propio o paqueteria, se elige a mano
    'sin_asignar',
    (cuando at time zone 'America/Bogota')::date,
    to_char(cuando at time zone 'America/Bogota', 'HH24:MI'),
    nullif(btrim(coalesce(new.observacion, '')), '')
  );

  return new;
end
$fn$;

comment on function public.cartera_crear_pedido is
  'Crea el pedido de produccion cuando un pedido de cartera pasa a aprobado. La fecha y hora del pedido son las del corte asignado.';

drop trigger if exists trg_cartera_crear_pedido on public.pedidos_cartera;
create trigger trg_cartera_crear_pedido
  after insert or update of estado_cartera on public.pedidos_cartera
  for each row execute function public.cartera_crear_pedido();

-- ---------------------------------------------------------------------------
-- Comprobacion: aprobar un pedido de cartera debe dejar su gemelo en pedidos.
-- ---------------------------------------------------------------------------
-- select pc.numero_pedido, pc.estado_cartera, pc.fecha_corte,
--        p.id, p.fecha_pedido, p.hora_pedido, p.ciudad_nombre
-- from public.pedidos_cartera pc
-- left join public.pedidos p on p.id = pc.numero_pedido
-- where pc.estado_cartera = 'aprobado'
-- order by pc.created_at desc
-- limit 20;

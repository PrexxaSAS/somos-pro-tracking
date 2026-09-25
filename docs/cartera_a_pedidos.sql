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
--   guia_interna                <- SPT-<anio>-<consecutivo>, como la genera la app
--   fecha_estimada              <- la fecha del corte mas los dias de la promesa
--                                  de servicio de la ciudad destino
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
  dia_pedido      date;
  dias_promesa    integer;
  anio            text;
  consecutivo     integer;
  guia            text;
  patron_entero   text;
  patron_captura  text;
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
  dia_pedido := (cuando at time zone 'America/Bogota')::date;

  -- La fecha estimada es la del corte mas los dias de la promesa de servicio de
  -- la ciudad destino. Si esa ciudad no tiene promesa configurada no se inventa
  -- ningun plazo: queda vacia, igual que hoy al crear el pedido a mano.
  select dias_plazo into dias_promesa
  from public.promesas_servicio
  where ciudad_codigo = dane_destino;

  -- La guia interna la venia generando la aplicacion al crear el pedido. Se
  -- arma igual (SPT-<anio>-<consecutivo de 4 digitos>), pero con un candado por
  -- transaccion: dos aprobaciones simultaneas se turnan en vez de sacar las dos
  -- el mismo numero, que es lo que si podia pasar desde el navegador.
  anio := to_char(now() at time zone 'America/Bogota', 'YYYY');
  patron_entero  := '^SPT-' || anio || '-[0-9]+$';
  patron_captura := '^SPT-' || anio || '-([0-9]+)$';
  perform pg_advisory_xact_lock(hashtext('pedidos.guia_interna'));
  select coalesce(max(substring(guia_interna from patron_captura)::integer), 0) + 1
    into consecutivo
  from public.pedidos
  where guia_interna ~ patron_entero;
  guia := 'SPT-' || anio || '-' || lpad(consecutivo::text, 4, '0');

  insert into public.pedidos (
    id, guia_interna, cliente, direccion,
    ciudad_codigo, ciudad_nombre,
    ciudad_origen_codigo, ciudad_origen_nombre,
    cajas, factura, tipo, estado,
    fecha_pedido, hora_pedido, fecha_estimada, notas
  ) values (
    numero,
    guia,
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
    dia_pedido,
    to_char(cuando at time zone 'America/Bogota', 'HH24:MI'),
    case when dias_promesa is not null then dia_pedido + dias_promesa end,
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
--        p.id, p.guia_interna, p.fecha_pedido, p.hora_pedido,
--        p.fecha_estimada, p.ciudad_nombre
-- from public.pedidos_cartera pc
-- left join public.pedidos p on p.id = pc.numero_pedido
-- where pc.estado_cartera = 'aprobado'
-- order by pc.created_at desc
-- limit 20;

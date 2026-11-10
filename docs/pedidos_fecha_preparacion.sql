-- ---------------------------------------------------------------------------
-- "En preparacion": pedidos ya impresos en su corte que aun no tienen conductor.
--
-- No es un estado nuevo: el campo estado sigue en 'sin_asignar' y asignar
-- conductor, las promesas y las demas reglas no cambian. Se guarda la fecha en
-- que el pedido se imprimio por primera vez (fecha_preparacion) y la aplicacion
-- muestra "En preparacion" cuando el pedido esta Sin asignar y tiene esa fecha
-- (estadoVisible en src/Constants.js). Asi se puede filtrar, contar en el
-- dashboard y verlo el cliente.
--
-- La llena la base, no la pantalla: cualquier forma de imprimir (consolidado,
-- pedidos, el boton del celular, un pedido suelto) termina marcando
-- pedidos_cartera.estado_impresion = 'impreso', y ahi se dispara esto.
--
-- Solo se llena con el pedido en Sin asignar y solo la primera vez: reimprimir
-- no la cambia, y los pedidos que ya salieron (en transito, entregados) no se
-- tocan, porque la base no deja modificarlos.
--
-- Correr en los dos proyectos ANTES de publicar la version de la aplicacion
-- que la lee: sin la columna, la lista de pedidos no carga.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

alter table public.pedidos
  add column if not exists fecha_preparacion timestamptz;

comment on column public.pedidos.fecha_preparacion is
  'Primera vez que el pedido se imprimio en su corte de cartera. Con estado sin_asignar se muestra "En preparacion".';

create or replace function public.marcar_pedido_en_preparacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  numero text := btrim(coalesce(new.numero_pedido, ''));
begin
  if new.estado_impresion is distinct from 'impreso'
     or old.estado_impresion is not distinct from 'impreso'
     or numero = '' then
    return new;
  end if;

  begin
    update public.pedidos
       set fecha_preparacion = coalesce(new.fecha_impresion, now())
     where id = numero
       and estado = 'sin_asignar'
       and fecha_preparacion is null;
  exception when others then
    -- Marcar la impresion no puede fallar por esto.
    raise warning 'No se pudo marcar en preparacion el pedido %: %', numero, sqlerrm;
  end;

  return new;
end;
$$;

comment on function public.marcar_pedido_en_preparacion() is
  'Al imprimir un pedido de cartera, guarda en pedidos.fecha_preparacion la fecha de la primera impresion.';

drop trigger if exists trg_cartera_en_preparacion on public.pedidos_cartera;
create trigger trg_cartera_en_preparacion
  after update of estado_impresion on public.pedidos_cartera
  for each row
  execute function public.marcar_pedido_en_preparacion();

-- Pedidos que ya estaban impresos y siguen Sin asignar.
update public.pedidos p
   set fecha_preparacion = coalesce(pc.fecha_impresion, now())
  from public.pedidos_cartera pc
 where p.id = btrim(pc.numero_pedido)
   and pc.estado_impresion = 'impreso'
   and p.estado = 'sin_asignar'
   and p.fecha_preparacion is null;

-- Comprobacion: cuantos pedidos quedan "En preparacion".
select count(*) as en_preparacion
from public.pedidos
where estado = 'sin_asignar' and fecha_preparacion is not null;

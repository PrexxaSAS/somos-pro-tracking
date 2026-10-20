-- ---------------------------------------------------------------------------
-- Marcar los pedidos de cartera que al aprobarse ya existian en Pedidos.
--
-- trg_cartera_crear_pedido (docs/cartera_a_pedidos.sql) crea el pedido de
-- produccion al aprobar, pero si ese numero ya existe en public.pedidos (se
-- creo a mano o entro por el plano viejo) no lo toca ni lo duplica, y nadie se
-- enteraba. Este trigger corre ANTES de guardar y deja la marca
-- ya_en_produccion en el pedido de cartera; la aplicacion la muestra en el
-- resultado del cargue y al aprobar en Gestion de pedidos.
--
-- Es security definer porque el rol cartera no puede leer public.pedidos.
-- Correr en los dos proyectos. Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

alter table public.pedidos_cartera
  add column if not exists ya_en_produccion boolean not null default false;

create or replace function public.cartera_marcar_ya_en_produccion()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Igual que cartera_crear_pedido: solo al pasar a aprobado por primera vez.
  if new.estado_cartera is distinct from 'aprobado' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.estado_cartera = 'aprobado' then
    return new;
  end if;

  new.ya_en_produccion := exists (
    select 1 from public.pedidos
    where id = btrim(coalesce(new.numero_pedido, ''))
  );
  return new;
end
$fn$;

drop trigger if exists trg_cartera_marcar_ya_en_produccion on public.pedidos_cartera;
create trigger trg_cartera_marcar_ya_en_produccion
  before insert or update of estado_cartera on public.pedidos_cartera
  for each row execute function public.cartera_marcar_ya_en_produccion();

-- Los aprobados de antes: si el pedido de produccion es mas viejo que el de
-- cartera, ya existia cuando cartera lo cargo.
update public.pedidos_cartera pc
set ya_en_produccion = true
from public.pedidos p
where p.id = pc.numero_pedido
  and pc.estado_cartera = 'aprobado'
  and p.created_at < pc.created_at
  and not pc.ya_en_produccion;

notify pgrst, 'reload schema';

-- Comprobacion: los marcados.
select numero_pedido, cliente, fecha_aprobacion
from public.pedidos_cartera
where ya_en_produccion
order by fecha_aprobacion desc nulls last;

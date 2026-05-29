-- Bloqueo terminal de pedidos entregados.
-- Una vez un pedido queda en estado entregado o novedad, no puede modificarse
-- por admin, operador, conductor ni por llamadas directas a la API.
--
-- Este trigger permite la transicion inicial hacia entregado/novedad,
-- pero bloquea cualquier update posterior sobre una fila ya cerrada.

create or replace function public.prevent_closed_pedido_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(old.estado, '')) in ('entregado', 'novedad')
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    raise exception 'No se puede modificar un pedido que ya fue entregado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_closed_pedido_changes on public.pedidos;
create trigger trg_prevent_closed_pedido_changes
before update on public.pedidos
for each row
execute function public.prevent_closed_pedido_changes();

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name = 'trg_prevent_closed_pedido_changes';

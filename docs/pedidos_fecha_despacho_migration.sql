begin;

alter table public.pedidos
  add column if not exists fecha_despacho date;

-- Backfill best-effort solo para pedidos no cerrados. Los pedidos entregados
-- quedan intactos porque existe un bloqueo de seguridad que impide modificarlos.
do $$
begin
  if to_regclass('public.audit_events') is not null then
    update public.pedidos p
    set fecha_despacho = audit.primera_fecha_despacho
    from (
      select
        record_id,
        min(created_at::date) as primera_fecha_despacho
      from public.audit_events
      where table_name = 'pedidos'
        and action = 'UPDATE'
        and new_data->>'estado' = 'en_transito'
        and coalesce(old_data->>'estado', '') <> 'en_transito'
      group by record_id
    ) audit
    where p.id = audit.record_id
      and p.fecha_despacho is null
      and lower(coalesce(p.estado, '')) not in ('entregado', 'novedad');
  end if;
end $$;

create or replace function public.set_pedido_fecha_despacho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.estado, '')) = 'en_transito'
    and (tg_op = 'INSERT' or lower(coalesce(old.estado, '')) <> 'en_transito')
    and new.fecha_despacho is null
  then
    new.fecha_despacho := current_date;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_pedido_fecha_despacho on public.pedidos;
create trigger trg_set_pedido_fecha_despacho
before insert or update on public.pedidos
for each row
execute function public.set_pedido_fecha_despacho();

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pedidos'
  and column_name = 'fecha_despacho';

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name = 'trg_set_pedido_fecha_despacho';

commit;

-- Permite que el transportista vea pedidos asociados a sus conductores
-- y reemplace unicamente soportes de pedidos ya cerrados.
-- RLS abre la ruta de update; el trigger limita las columnas permitidas.

drop policy if exists "pedidos_transportista_select_own_drivers" on public.pedidos;
drop policy if exists "pedidos_transportista_update_supports" on public.pedidos;

create policy "pedidos_transportista_select_own_drivers"
on public.pedidos
for select
to authenticated
using (
  public.is_transportista()
  and (
    nit_proveedor = public.current_user_nit()
    or exists (
      select 1
      from public.conductores c
      where c.id = pedidos.conductor_id
        and c.nit_proveedor = public.current_user_nit()
    )
  )
);

create policy "pedidos_transportista_update_supports"
on public.pedidos
for update
to authenticated
using (
  public.is_transportista()
  and (
    nit_proveedor = public.current_user_nit()
    or exists (
      select 1
      from public.conductores c
      where c.id = pedidos.conductor_id
        and c.nit_proveedor = public.current_user_nit()
    )
  )
)
with check (
  public.is_transportista()
  and (
    nit_proveedor = public.current_user_nit()
    or exists (
      select 1
      from public.conductores c
      where c.id = pedidos.conductor_id
        and c.nit_proveedor = public.current_user_nit()
    )
  )
);

create or replace function public.prevent_closed_pedido_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_estado text := lower(coalesce(old.estado, ''));
  new_estado text := lower(coalesce(new.estado, ''));
  role_actual text := public.current_user_role();
  support_only_change boolean;
begin
  support_only_change :=
    (to_jsonb(new) - 'soportes' - 'soportes_data')
    is not distinct from
    (to_jsonb(old) - 'soportes' - 'soportes_data');

  if old_estado in ('entregado', 'novedad')
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    if role_actual = 'transportista'
      and support_only_change
      and (
        old.nit_proveedor = public.current_user_nit()
        or exists (
          select 1
          from public.conductores c
          where c.id = old.conductor_id
            and c.nit_proveedor = public.current_user_nit()
        )
      )
    then
      return new;
    end if;

    raise exception 'No se puede modificar un pedido que ya fue entregado';
  end if;

  if old_estado = 'en_transito'
    and to_jsonb(new) is distinct from to_jsonb(old)
  then
    if role_actual = 'conductor'
      and new_estado in ('entregado', 'novedad')
      and new.fecha_real is not null
      and new.id is not distinct from old.id
      and new.guia_interna is not distinct from old.guia_interna
      and new.cliente is not distinct from old.cliente
      and new.ciudad_codigo is not distinct from old.ciudad_codigo
      and new.ciudad_nombre is not distinct from old.ciudad_nombre
      and new.direccion is not distinct from old.direccion
      and new.cajas is not distinct from old.cajas
      and new.factura is not distinct from old.factura
      and new.conductor_id is not distinct from old.conductor_id
      and new.placa is not distinct from old.placa
      and new.nit_proveedor is not distinct from old.nit_proveedor
      and new.estado_despacho is not distinct from old.estado_despacho
      and new.tipo is not distinct from old.tipo
      and new.empresa_transporte is not distinct from old.empresa_transporte
      and new.paqueteria is not distinct from old.paqueteria
      and new.guia_paqueteria is not distinct from old.guia_paqueteria
      and new.notas is not distinct from old.notas
      and new.ciudad_origen_codigo is not distinct from old.ciudad_origen_codigo
      and new.ciudad_origen_nombre is not distinct from old.ciudad_origen_nombre
      and new.direccion_origen is not distinct from old.direccion_origen
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    raise exception 'No se puede editar un pedido en transito; solo el conductor puede registrar la entrega';
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
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'pedidos'
  and policyname in (
    'pedidos_transportista_select_own_drivers',
    'pedidos_transportista_update_supports'
  )
order by policyname;

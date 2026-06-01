create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select rol
  from public.usuarios
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_operator()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'operador'
$$;

-- Operador: puede crear devoluciones y recogidas operativas.
drop policy if exists "devoluciones_operator_insert" on public.devoluciones;
drop policy if exists "recogidas_operator_insert" on public.recogidas;

create policy "devoluciones_operator_insert"
on public.devoluciones
for insert
to authenticated
with check (public.is_operator());

create policy "recogidas_operator_insert"
on public.recogidas
for insert
to authenticated
with check (public.is_operator());

-- Operador: puede asignar conductor a pedidos no cerrados/no en transito.
-- El bloqueo de pedidos en transito o entregados lo maneja trg_prevent_closed_pedido_changes.
create or replace function public.prevent_operator_pedido_sensitive_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'operador' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.guia_interna is distinct from old.guia_interna
    or new.cliente is distinct from old.cliente
    or new.tipo is distinct from old.tipo
    or new.empresa_transporte is distinct from old.empresa_transporte
    or new.paqueteria is distinct from old.paqueteria
    or new.guia_paqueteria is distinct from old.guia_paqueteria
    or new.estado_despacho is distinct from old.estado_despacho
    or new.ciudad_origen_codigo is distinct from old.ciudad_origen_codigo
    or new.ciudad_origen_nombre is distinct from old.ciudad_origen_nombre
    or new.direccion_origen is distinct from old.direccion_origen
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Operador no puede modificar campos sensibles del pedido';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_operator_pedido_sensitive_changes on public.pedidos;
create trigger trg_operator_pedido_sensitive_changes
before update on public.pedidos
for each row
execute function public.prevent_operator_pedido_sensitive_changes();

-- PQRS: una respuesta registrada no se puede sobrescribir, ni por admin ni por operador.
create or replace function public.prevent_pqrs_response_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if btrim(coalesce(old.respuesta, '')) <> ''
    or old.fecha_gestion is not null
    or btrim(coalesce(old.gestionado_por, '')) <> ''
  then
    if new.respuesta is distinct from old.respuesta
      or new.fecha_gestion is distinct from old.fecha_gestion
      or new.gestionado_por is distinct from old.gestionado_por
    then
      raise exception 'No se puede modificar una respuesta de PQRS ya registrada';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_pqrs_response_rewrite on public.pqrs;
create trigger trg_prevent_pqrs_response_rewrite
before update on public.pqrs
for each row
execute function public.prevent_pqrs_response_rewrite();

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('pedidos', 'devoluciones', 'recogidas', 'pqrs')
order by tablename, policyname;

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_operator_pedido_sensitive_changes',
    'trg_prevent_pqrs_response_rewrite'
  )
order by table_name, trigger_name;

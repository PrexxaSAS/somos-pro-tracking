-- Auditoria fase 1: tabla centralizada de eventos.
-- Ejecutar primero en staging.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_auth_user_id uuid,
  actor_usuario_id uuid,
  actor_user text,
  actor_nombre text,
  actor_rol text,
  old_estado text,
  new_estado text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_table_record_idx
on public.audit_events (table_name, record_id, created_at desc);

create index if not exists audit_events_actor_idx
on public.audit_events (actor_usuario_id, created_at desc);

create index if not exists audit_events_created_at_idx
on public.audit_events (created_at desc);

create or replace function public.audit_current_profile()
returns table (
  usuario_id uuid,
  user_login text,
  nombre text,
  rol text
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u."user",
    u.nombre,
    u.rol
  from public.usuarios u
  where u.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile record;
  old_json jsonb;
  new_json jsonb;
  row_id text;
begin
  select *
  into profile
  from public.audit_current_profile();

  old_json := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_json := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  row_id := coalesce(new_json->>'id', old_json->>'id');

  insert into public.audit_events (
    table_name,
    record_id,
    action,
    actor_auth_user_id,
    actor_usuario_id,
    actor_user,
    actor_nombre,
    actor_rol,
    old_estado,
    new_estado,
    old_data,
    new_data
  )
  values (
    tg_table_name,
    coalesce(row_id, ''),
    tg_op,
    auth.uid(),
    profile.usuario_id,
    profile.user_login,
    profile.nombre,
    profile.rol,
    old_json->>'estado',
    new_json->>'estado',
    old_json,
    new_json
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_pedidos on public.pedidos;
create trigger trg_audit_pedidos
after insert or update or delete on public.pedidos
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_devoluciones on public.devoluciones;
create trigger trg_audit_devoluciones
after insert or update or delete on public.devoluciones
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_recogidas on public.recogidas;
create trigger trg_audit_recogidas
after insert or update or delete on public.recogidas
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_pqrs on public.pqrs;
create trigger trg_audit_pqrs
after insert or update or delete on public.pqrs
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_facturas_proveedor on public.facturas_proveedor;
create trigger trg_audit_facturas_proveedor
after insert or update or delete on public.facturas_proveedor
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_factura_guias on public.factura_guias;
create trigger trg_audit_factura_guias
after insert or update or delete on public.factura_guias
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_usuarios on public.usuarios;
create trigger trg_audit_usuarios
after insert or update or delete on public.usuarios
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_conductores on public.conductores;
create trigger trg_audit_conductores
after insert or update or delete on public.conductores
for each row execute function public.audit_row_change();

drop trigger if exists trg_audit_transportistas on public.transportistas;
create trigger trg_audit_transportistas
after insert or update or delete on public.transportistas
for each row execute function public.audit_row_change();

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_admin_operator" on public.audit_events;
drop policy if exists "audit_events_select_admin" on public.audit_events;

create policy "audit_events_select_admin"
on public.audit_events
for select
to authenticated
using (public.current_user_role() = 'admin');

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name like 'trg_audit_%'
order by table_name, trigger_name, event_manipulation;

select
  tablename,
  policyname,
  cmd,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'audit_events'
order by policyname;

-- Auditoria fase 1B: reducir ruido y evitar guardar base64/passwords en auditoria.
-- Ejecutar en staging despues de `audit_step1_event_log.sql`.

alter table public.audit_events
  add column if not exists changed_fields text[];

create or replace function public.audit_sanitize_row(row_data jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when row_data is null then null
    else row_data
      - 'soportes_data'
      - 'soporte_data'
      - 'doc_data'
      - 'pass'
  end
$$;

create or replace function public.audit_json_changed_fields(old_row jsonb, new_row jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key order by key), array[]::text[])
  from (
    select key
    from jsonb_object_keys(coalesce(old_row, '{}'::jsonb) || coalesce(new_row, '{}'::jsonb)) as keys(key)
    where (old_row->key) is distinct from (new_row->key)
  ) changed
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile record;
  old_raw jsonb;
  new_raw jsonb;
  old_json jsonb;
  new_json jsonb;
  row_id text;
  changed text[];
begin
  old_raw := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_raw := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  -- Evita eventos vacios cuando la app envia un update sin cambios reales.
  if tg_op = 'UPDATE' and old_raw = new_raw then
    return new;
  end if;

  changed := case
    when tg_op = 'UPDATE' then public.audit_json_changed_fields(old_raw, new_raw)
    else null
  end;

  if tg_op = 'UPDATE' and cardinality(changed) = 0 then
    return new;
  end if;

  select *
  into profile
  from public.audit_current_profile();

  old_json := public.audit_sanitize_row(old_raw);
  new_json := public.audit_sanitize_row(new_raw);
  row_id := coalesce(new_raw->>'id', old_raw->>'id');

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
    new_data,
    changed_fields
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
    old_raw->>'estado',
    new_raw->>'estado',
    old_json,
    new_json,
    changed
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- Limpieza opcional de ruido ya generado en staging.
delete from public.audit_events
where action = 'UPDATE'
  and old_data = new_data;

-- Quitar campos pesados/sensibles de eventos existentes.
update public.audit_events
set
  old_data = public.audit_sanitize_row(old_data),
  new_data = public.audit_sanitize_row(new_data)
where old_data ?| array['soportes_data', 'soporte_data', 'doc_data', 'pass']
   or new_data ?| array['soportes_data', 'soporte_data', 'doc_data', 'pass'];

select
  id,
  table_name,
  record_id,
  action,
  actor_user,
  actor_rol,
  old_estado,
  new_estado,
  changed_fields,
  created_at
from public.audit_events
order by created_at desc
limit 20;

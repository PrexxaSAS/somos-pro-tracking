-- Auditoria fase 3: endurecer acceso a vistas de auditoria.
-- Ejecutar en staging despues de `audit_step2_views.sql`.
--
-- Objetivo:
-- - Evitar acceso anonimo a auditoria.
-- - Hacer que las vistas usen permisos del usuario que consulta.
-- - Mantener la decision actual: solo administrador lee auditoria,
--   porque la tabla base audit_events tiene RLS con esa regla.

begin;

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_admin_operator" on public.audit_events;
drop policy if exists "audit_events_select_admin" on public.audit_events;

create policy "audit_events_select_admin"
on public.audit_events
for select
to authenticated
using (public.current_user_role() = 'admin');

-- Permisos de tabla base: authenticated puede intentar leer, RLS decide filas.
-- anon no debe tener acceso.
revoke all on table public.audit_events from anon;
revoke all on table public.audit_events from authenticated;
grant select on table public.audit_events to authenticated;

-- Vistas de auditoria. security_invoker obliga a respetar permisos/RLS
-- del usuario invocador sobre audit_events.
alter view public.audit_events_resumen set (security_invoker = true);
alter view public.audit_pedidos_historial set (security_invoker = true);
alter view public.audit_devoluciones_historial set (security_invoker = true);
alter view public.audit_recogidas_historial set (security_invoker = true);
alter view public.audit_pqrs_historial set (security_invoker = true);
alter view public.audit_facturas_proveedor_historial set (security_invoker = true);
alter view public.audit_por_usuario set (security_invoker = true);

revoke all on table public.audit_events_resumen from anon;
revoke all on table public.audit_pedidos_historial from anon;
revoke all on table public.audit_devoluciones_historial from anon;
revoke all on table public.audit_recogidas_historial from anon;
revoke all on table public.audit_pqrs_historial from anon;
revoke all on table public.audit_facturas_proveedor_historial from anon;
revoke all on table public.audit_por_usuario from anon;

revoke all on table public.audit_events_resumen from authenticated;
revoke all on table public.audit_pedidos_historial from authenticated;
revoke all on table public.audit_devoluciones_historial from authenticated;
revoke all on table public.audit_recogidas_historial from authenticated;
revoke all on table public.audit_pqrs_historial from authenticated;
revoke all on table public.audit_facturas_proveedor_historial from authenticated;
revoke all on table public.audit_por_usuario from authenticated;

grant select on table public.audit_events_resumen to authenticated;
grant select on table public.audit_pedidos_historial to authenticated;
grant select on table public.audit_devoluciones_historial to authenticated;
grant select on table public.audit_recogidas_historial to authenticated;
grant select on table public.audit_pqrs_historial to authenticated;
grant select on table public.audit_facturas_proveedor_historial to authenticated;
grant select on table public.audit_por_usuario to authenticated;

-- Validacion: revisar reloptions y permisos visibles.
select
  n.nspname as schema_name,
  c.relname as view_name,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'audit_events_resumen',
    'audit_pedidos_historial',
    'audit_devoluciones_historial',
    'audit_recogidas_historial',
    'audit_pqrs_historial',
    'audit_facturas_proveedor_historial',
    'audit_por_usuario'
  )
order by c.relname;

select
  table_name,
  privilege_type,
  grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'audit_events',
    'audit_events_resumen',
    'audit_pedidos_historial',
    'audit_devoluciones_historial',
    'audit_recogidas_historial',
    'audit_pqrs_historial',
    'audit_facturas_proveedor_historial',
    'audit_por_usuario'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

commit;

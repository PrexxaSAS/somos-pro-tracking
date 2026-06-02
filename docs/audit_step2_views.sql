-- Auditoria fase 2: vistas de consulta.
-- Ejecutar en staging despues de `audit_step1_event_log.sql` y `audit_step1b_reduce_noise.sql`.
-- Luego ejecutar `audit_step3_secure_views.sql` para endurecer permisos de las vistas.

create or replace view public.audit_events_resumen as
select
  ae.id,
  ae.created_at,
  ae.table_name,
  ae.record_id,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.old_estado,
  ae.new_estado,
  ae.changed_fields
from public.audit_events ae
order by ae.created_at desc;

create or replace view public.audit_pedidos_historial as
select
  ae.id,
  ae.created_at,
  ae.record_id as pedido_id,
  coalesce(ae.new_data->>'guia_interna', ae.old_data->>'guia_interna') as guia_interna,
  coalesce(ae.new_data->>'cliente', ae.old_data->>'cliente') as cliente,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.old_estado,
  ae.new_estado,
  ae.changed_fields,
  ae.old_data->>'conductor_id' as old_conductor_id,
  ae.new_data->>'conductor_id' as new_conductor_id,
  ae.old_data->>'placa' as old_placa,
  ae.new_data->>'placa' as new_placa,
  ae.old_data->>'fecha_real' as old_fecha_real,
  ae.new_data->>'fecha_real' as new_fecha_real
from public.audit_events ae
where ae.table_name = 'pedidos'
order by ae.created_at desc;

create or replace view public.audit_devoluciones_historial as
select
  ae.id,
  ae.created_at,
  ae.record_id as devolucion_id,
  coalesce(ae.new_data->>'guia', ae.old_data->>'guia') as guia,
  coalesce(ae.new_data->>'factura', ae.old_data->>'factura') as factura,
  coalesce(ae.new_data->>'pedido_ref', ae.old_data->>'pedido_ref') as pedido_ref,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.old_estado,
  ae.new_estado,
  ae.changed_fields,
  ae.old_data->>'conductor_id' as old_conductor_id,
  ae.new_data->>'conductor_id' as new_conductor_id,
  ae.old_data->>'fecha_real' as old_fecha_real,
  ae.new_data->>'fecha_real' as new_fecha_real
from public.audit_events ae
where ae.table_name = 'devoluciones'
order by ae.created_at desc;

create or replace view public.audit_recogidas_historial as
select
  ae.id,
  ae.created_at,
  ae.record_id as recogida_id,
  coalesce(ae.new_data->>'guia', ae.old_data->>'guia') as guia,
  coalesce(ae.new_data->>'ciudad_recogida_nombre', ae.old_data->>'ciudad_recogida_nombre') as ciudad_recogida,
  coalesce(ae.new_data->>'ciudad_entrega_nombre', ae.old_data->>'ciudad_entrega_nombre') as ciudad_entrega,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.old_estado,
  ae.new_estado,
  ae.changed_fields,
  ae.old_data->>'conductor_id' as old_conductor_id,
  ae.new_data->>'conductor_id' as new_conductor_id,
  ae.old_data->>'fecha_real' as old_fecha_real,
  ae.new_data->>'fecha_real' as new_fecha_real
from public.audit_events ae
where ae.table_name = 'recogidas'
order by ae.created_at desc;

create or replace view public.audit_pqrs_historial as
select
  ae.id,
  ae.created_at,
  ae.record_id as pqrs_id,
  coalesce(ae.new_data->>'factura', ae.old_data->>'factura') as factura,
  coalesce(ae.new_data->>'pedido_ref', ae.old_data->>'pedido_ref') as pedido_ref,
  coalesce(ae.new_data->>'motivo', ae.old_data->>'motivo') as motivo,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.old_estado,
  ae.new_estado,
  ae.changed_fields,
  ae.old_data->>'gestionado_por' as old_gestionado_por,
  ae.new_data->>'gestionado_por' as new_gestionado_por,
  ae.old_data->>'fecha_gestion' as old_fecha_gestion,
  ae.new_data->>'fecha_gestion' as new_fecha_gestion
from public.audit_events ae
where ae.table_name = 'pqrs'
order by ae.created_at desc;

create or replace view public.audit_facturas_proveedor_historial as
select
  ae.id,
  ae.created_at,
  ae.record_id as factura_proveedor_id,
  coalesce(ae.new_data->>'numero_factura', ae.old_data->>'numero_factura') as numero_factura,
  coalesce(ae.new_data->>'transportista_id', ae.old_data->>'transportista_id') as transportista_id,
  coalesce(ae.new_data->>'valor_total', ae.old_data->>'valor_total') as valor_total,
  ae.action,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  ae.changed_fields
from public.audit_events ae
where ae.table_name = 'facturas_proveedor'
order by ae.created_at desc;

create or replace view public.audit_por_usuario as
select
  ae.actor_usuario_id,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol,
  count(*) as total_eventos,
  min(ae.created_at) as primer_evento,
  max(ae.created_at) as ultimo_evento
from public.audit_events ae
group by
  ae.actor_usuario_id,
  ae.actor_user,
  ae.actor_nombre,
  ae.actor_rol
order by ultimo_evento desc;

select
  table_schema,
  table_name
from information_schema.views
where table_schema = 'public'
  and table_name like 'audit_%'
order by table_name;

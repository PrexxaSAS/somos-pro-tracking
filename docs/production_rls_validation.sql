-- Validacion previa a produccion: RLS, politicas y triggers criticos.
-- Ejecutar en Supabase SQL Editor del proyecto que se va a lanzar.

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'usuarios',
    'transportistas',
    'transportadoras',
    'conductores',
    'pedidos',
    'devoluciones',
    'recogidas',
    'pqrs',
    'facturas_proveedor',
    'factura_guias',
    'ciudades',
    'paqueterias',
    'promesas_servicio'
  )
order by tablename;

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'usuarios',
    'transportistas',
    'transportadoras',
    'conductores',
    'pedidos',
    'devoluciones',
    'recogidas',
    'pqrs',
    'facturas_proveedor',
    'factura_guias'
  )
order by tablename, cmd, policyname;

select
  routine_name,
  routine_type,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'current_user_role',
    'current_user_nit',
    'current_user_empresa',
    'current_user_nombre',
    'current_username',
    'is_admin',
    'is_operator',
    'is_admin_or_operator',
    'is_transportista',
    'is_cliente',
    'prevent_operator_pedido_sensitive_changes',
    'prevent_transportista_conductor_sensitive_changes',
    'prevent_transportista_usuario_sensitive_changes',
    'prevent_cliente_devolucion_gestion_changes',
    'prevent_cliente_recogida_gestion_changes',
    'prevent_cliente_pqrs_gestion_changes',
    'prevent_closed_pedido_changes',
    'prevent_pqrs_response_rewrite'
  )
order by routine_name;

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'trg_operator_pedido_sensitive_changes',
    'trg_transportista_conductor_sensitive_changes',
    'trg_transportista_usuario_sensitive_changes',
    'trg_cliente_devolucion_gestion_changes',
    'trg_cliente_recogida_gestion_changes',
    'trg_cliente_pqrs_gestion_changes',
    'trg_prevent_closed_pedido_changes',
    'trg_prevent_pqrs_response_rewrite'
  )
order by table_name, trigger_name;

select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
  and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'factura_guias'
  and tc.constraint_name = 'factura_guias_factura_id_fkey';

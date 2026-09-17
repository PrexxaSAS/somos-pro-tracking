-- Atiende las advertencias del Security Advisor sobre funciones SECURITY DEFINER
-- expuestas como RPC (/rest/v1/rpc/...).
--
-- POR QUE LA PRIMERA VERSION NO SIRVIO:
-- En PostgreSQL toda funcion nace con EXECUTE otorgado a PUBLIC, un pseudo-rol que
-- incluye a todos los demas. Revocar a `anon` o a `authenticated` no cambia nada,
-- porque esos roles no tenian un permiso propio: lo heredaban de PUBLIC.
-- Hay que revocar a PUBLIC y despues otorgar solo a quien de verdad lo necesita.
--
-- CUIDADO CON LAS FUNCIONES DE LAS POLITICAS RLS:
-- is_admin(), current_user_nit() y companeras se usan DENTRO de las politicas, y
-- Postgres las evalua con los permisos del usuario que consulta. Si quedan sin
-- EXECUTE para `authenticated`, toda la app falla con "permission denied for
-- function". Por eso a esas se les revoca PUBLIC pero se les vuelve a otorgar a
-- `authenticated`: el resultado es que `anon` deja de poder llamarlas y la app sigue
-- funcionando igual.
--
-- Ejecutar en el SQL Editor de PRODUCCION, parte por parte.

-- ---------------------------------------------------------------------------
-- 0) Foto antes del cambio (para comparar al final)
-- ---------------------------------------------------------------------------
select
  p.proname as funcion,
  has_function_privilege('anon', p.oid, 'EXECUTE') as puede_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as puede_autenticado
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- ---------------------------------------------------------------------------
-- 1) Funciones que usan las politicas RLS.
--    Se quita a PUBLIC (y con ello a anon) y se devuelve a authenticated.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.current_conductor_id(),
  public.current_user_empresa(),
  public.current_user_nit(),
  public.current_user_nombre(),
  public.current_user_role(),
  public.current_username(),
  public.is_admin(),
  public.is_admin_or_operator(),
  public.is_cliente(),
  public.is_conductor(),
  public.is_operator(),
  public.is_transportista()
from public;

grant execute on function
  public.current_conductor_id(),
  public.current_user_empresa(),
  public.current_user_nit(),
  public.current_user_nombre(),
  public.current_user_role(),
  public.current_username(),
  public.is_admin(),
  public.is_admin_or_operator(),
  public.is_cliente(),
  public.is_conductor(),
  public.is_operator(),
  public.is_transportista()
to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Funciones de trigger y auxiliares. Nadie las llama desde la app:
--    se revoca a PUBLIC y no se otorgan a nadie.
--
--    Los triggers siguen funcionando: PostgreSQL verifica el permiso sobre la
--    funcion al CREAR el trigger, no cada vez que se dispara.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.asignar_guia_solicitud(),
  public.audit_current_profile(),
  public.audit_row_change(),
  public.audit_sanitize_row(jsonb),
  public.audit_json_changed_fields(jsonb, jsonb),
  public.prevent_cliente_devolucion_gestion_changes(),
  public.prevent_cliente_pqrs_gestion_changes(),
  public.prevent_cliente_recogida_gestion_changes(),
  public.prevent_closed_pedido_changes(),
  public.prevent_operator_pedido_sensitive_changes(),
  public.prevent_pqrs_response_rewrite(),
  public.prevent_transportista_conductor_sensitive_changes(),
  public.prevent_transportista_usuario_sensitive_changes(),
  public.rls_auto_enable(),
  public.set_pedido_fecha_despacho()
from public;

-- Si reparar_texto() todavia existe (la de la limpieza de textos):
revoke execute on function public.reparar_texto(text) from public;

-- ---------------------------------------------------------------------------
-- 3) Comprobar el resultado.
--    puede_anon deberia ser false en todas.
--    puede_autenticado: true solo en las doce del punto 1.
-- ---------------------------------------------------------------------------
select
  p.proname as funcion,
  has_function_privilege('anon', p.oid, 'EXECUTE') as puede_anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as puede_autenticado
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- ---------------------------------------------------------------------------
-- 4) PROBAR EN LA APP, en este orden:
--    1. Que cargue la lista de pedidos (usa is_admin_or_operator en las politicas).
--    2. Crear o editar un pedido (dispara prevent_closed_pedido_changes y la auditoria).
--    3. Crear una recogida (dispara asignar_guia_solicitud).
--    4. Entrar con un usuario conductor y con uno cliente.
--
-- Si algo falla con "permission denied for function", se revierte al instante con:
--   grant execute on function public.<nombre>(<tipos>) to authenticated;
-- ---------------------------------------------------------------------------

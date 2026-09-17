-- Atiende las advertencias del Security Advisor sobre funciones SECURITY DEFINER
-- expuestas como RPC (/rest/v1/rpc/...).
--
-- CUIDADO, ESTO ES LO IMPORTANTE:
-- Las funciones is_admin(), is_operator(), current_user_nit()... se usan DENTRO de las
-- politicas RLS. Postgres evalua esas politicas con los permisos del usuario que
-- consulta, asi que si se le quita EXECUTE al rol `authenticated`, cada consulta
-- fallaria con "permission denied for function" y la aplicacion dejaria de cargar.
-- Por eso a esas funciones SOLO se les revoca el permiso a `anon`.
--
-- Las funciones de trigger (prevent_*, audit_row_change, asignar_guia_solicitud...)
-- no se usan en politicas y no se pueden invocar por RPC de forma util: Postgres
-- rechaza llamarlas fuera de un trigger. A esas si se les puede revocar a ambos roles.
--
-- Ejecutar en el SQL Editor de PRODUCCION, parte por parte.

-- ---------------------------------------------------------------------------
-- PARTE A: quitar el permiso al rol anonimo (sin sesion). Sin riesgo:
-- ninguna politica de la app aplica a `anon`.
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
  public.is_transportista(),
  public.audit_current_profile()
from anon;

-- ---------------------------------------------------------------------------
-- PARTE B: funciones de trigger. No se usan en politicas RLS, asi que se les
-- puede revocar a los dos roles.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.asignar_guia_solicitud(),
  public.audit_row_change(),
  public.prevent_cliente_devolucion_gestion_changes(),
  public.prevent_cliente_pqrs_gestion_changes(),
  public.prevent_cliente_recogida_gestion_changes(),
  public.prevent_closed_pedido_changes(),
  public.prevent_operator_pedido_sensitive_changes(),
  public.prevent_pqrs_response_rewrite(),
  public.prevent_transportista_conductor_sensitive_changes(),
  public.prevent_transportista_usuario_sensitive_changes(),
  public.set_pedido_fecha_despacho(),
  public.rls_auto_enable()
from anon, authenticated;

-- Tambien las auxiliares de auditoria y la de limpieza de texto, que nadie llama
-- desde la app.
revoke execute on function
  public.audit_sanitize_row(jsonb),
  public.audit_json_changed_fields(jsonb, jsonb)
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- PARTE C: PROBAR ANTES DE DARLO POR BUENO
-- Entra a la app y verifica, en este orden:
--   1. Que cargue la lista de pedidos (usa is_admin_or_operator en las politicas).
--   2. Crear o editar un pedido (dispara prevent_closed_pedido_changes y la auditoria).
--   3. Crear una recogida (dispara asignar_guia_solicitud).
--   4. Entrar con un usuario conductor y con uno cliente.
--
-- Si algo falla con "permission denied for function", se revierte con:
--   grant execute on function public.<nombre>(<tipos>) to authenticated;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Lo que NO se hace aqui y por que
-- ---------------------------------------------------------------------------
-- Las advertencias "Signed-In Users Can Execute SECURITY DEFINER Function" sobre
-- is_admin(), current_user_nit() y companeras van a seguir apareciendo. Quitarles el
-- permiso a `authenticated` romperia las politicas RLS.
--
-- El riesgo real es bajo: esas funciones solo devuelven datos del propio usuario que
-- llama (su rol, su NIT, su nombre); no exponen informacion de otros.
--
-- La solucion definitiva, si algun dia se quiere dejar el panel en cero, es moverlas
-- a un esquema no expuesto por la API (por ejemplo `private`) y actualizar todas las
-- politicas para que apunten alli. Es un cambio grande y conviene hacerlo con calma.

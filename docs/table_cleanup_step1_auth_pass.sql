-- Limpieza segura fase 1 para usuarios.pass.
-- Ejecutar primero en staging.
--
-- Objetivo:
-- - No borrar columnas.
-- - No tocar usuarios sin Auth.
-- - Reemplazar passwords legacy solo en perfiles que ya tienen auth_user_id.

begin;

update public.usuarios
set pass = '__auth_managed__'
where auth_user_id is not null
  and pass is distinct from '__auth_managed__';

select
  count(*) as total_usuarios,
  count(*) filter (where auth_user_id is null) as usuarios_sin_auth,
  count(*) filter (where pass is distinct from '__auth_managed__') as usuarios_con_pass_legacy,
  count(*) filter (where pass is null) as usuarios_pass_null
from public.usuarios;

select
  id,
  "user",
  nombre,
  rol,
  auth_user_id,
  pass
from public.usuarios
where auth_user_id is null
   or pass is distinct from '__auth_managed__'
order by rol, "user";

commit;


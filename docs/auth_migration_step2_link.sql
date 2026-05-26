-- Ejecutar SOLO en Supabase STAGING: somos-pro-tracking-prueba.
--
-- Paso 2 de migracion gradual a Supabase Auth.
-- Antes de ejecutar este script, crear manualmente estos usuarios
-- en Authentication > Users:
--
-- admin@somospro.local
-- operador@somospro.local
-- transprueba@somospro.local
-- driver1@somospro.local
-- cliente@somospro.local
--
-- Usar las mismas contrasenas ficticias de staging:
-- admin123, op123, trans123, cond123, cli123.

update public.usuarios u
set auth_user_id = au.id
from auth.users au
where au.email = u."user" || '@somospro.local'
  and u.auth_user_id is null;

select
  u."user",
  u.nombre,
  u.rol,
  u.auth_user_id,
  au.email as auth_email,
  case
    when u.auth_user_id is null then 'pendiente_vincular_auth'
    when au.id is null then 'auth_user_no_encontrado'
    else 'vinculado_auth'
  end as estado_migracion_auth
from public.usuarios u
left join auth.users au on au.id = u.auth_user_id
order by u.rol, u."user";

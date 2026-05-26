-- Ejecutar en Supabase STAGING.
-- Valida que cada perfil de public.usuarios tenga un usuario Auth existente
-- y que el email tecnico coincida con el user visible.

select
  u."user",
  u.rol,
  u.auth_user_id,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  case
    when u.auth_user_id is null then 'sin_auth_user_id'
    when au.id is null then 'auth_user_id_no_existe'
    when au.email <> u."user" || '@somospro.local' then 'email_auth_no_coincide'
    when au.email_confirmed_at is null then 'email_no_confirmado'
    else 'ok'
  end as estado
from public.usuarios u
left join auth.users au on au.id = u.auth_user_id
order by u.rol, u."user";

select
  id,
  email,
  email_confirmed_at,
  created_at
from auth.users
where email in (
  'admin@somospro.local',
  'operador@somospro.local',
  'transprueba@somospro.local',
  'driver1@somospro.local',
  'cliente@somospro.local'
)
order by email;

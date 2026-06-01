-- Ejecutar SOLO en Supabase STAGING: somos-pro-tracking-prueba.
--
-- Paso 1 de migracion gradual a Supabase Auth.
-- No borra `pass` ni cambia el login aun.
-- Solo prepara la tabla `usuarios` para vincular perfiles de negocio
-- con usuarios reales de Supabase Auth.

alter table public.usuarios
  add column if not exists auth_user_id uuid;

create unique index if not exists usuarios_auth_user_id_key
  on public.usuarios(auth_user_id)
  where auth_user_id is not null;

comment on column public.usuarios.auth_user_id is
  'Referencia al usuario en Supabase Auth. Se usara gradualmente para reemplazar contrasenas en texto plano.';

select
  id,
  "user",
  nombre,
  rol,
  auth_user_id,
  case
    when auth_user_id is null then 'pendiente_vincular_auth'
    else 'vinculado_auth'
  end as estado_migracion_auth
from public.usuarios
order by rol, "user";

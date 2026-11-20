-- ---------------------------------------------------------------------------
-- Correo a los operadores con cada solicitud de recogida.
--
-- 1. usuarios.email: el correo de cada usuario. Lo llena el admin en Usuarios
--    (por ahora se pide para el rol operador, que es quien recibe el aviso).
-- 2. guardar_correo_usuario: el admin guarda ese correo. Los usuarios se crean
--    y editan por la Edge Function create-system-user; el correo va aparte por
--    aqui para no tener que volver a publicar esa funcion.
-- 3. recogidas.aviso_operativo_at: cuando se envio el aviso. La funcion
--    enviar-correo-recogida solo envia si esta vacio, asi una recogida no
--    puede disparar el correo dos veces.
--
-- Correr en los dos proyectos ANTES de publicar la version que lo usa.
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

alter table public.usuarios  add column if not exists email text;
alter table public.recogidas add column if not exists aviso_operativo_at timestamptz;

create or replace function public.guardar_correo_usuario(p_user text, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if coalesce(public.current_user_role() <> 'admin', true) then
    raise exception 'Solo el administrador puede cambiar el correo de un usuario';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'El correo % no es valido', v_email;
  end if;
  update public.usuarios set email = v_email where "user" = btrim(p_user);
  if not found then
    raise exception 'No existe el usuario %', p_user;
  end if;
end;
$$;

revoke execute on function public.guardar_correo_usuario(text, text) from public, anon;
grant execute on function public.guardar_correo_usuario(text, text) to authenticated;

-- Comprobacion: deben salir las dos columnas y la funcion.
select table_name, column_name from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'usuarios' and column_name = 'email')
     or (table_name = 'recogidas' and column_name = 'aviso_operativo_at'));
select proname from pg_proc
 where pronamespace = 'public'::regnamespace and proname = 'guardar_correo_usuario';

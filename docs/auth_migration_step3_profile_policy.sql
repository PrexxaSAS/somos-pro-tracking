-- Ejecutar SOLO en Supabase STAGING: somos-pro-tracking-prueba.
--
-- Permite que un usuario autenticado con Supabase Auth lea su propio
-- perfil de negocio en public.usuarios usando auth.uid().
--
-- Esto corrige el caso donde Auth inicia sesion correctamente, pero la app
-- no encuentra perfil por RLS y muestra:
-- "Usuario autenticado sin perfil asignado".

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_select_own_profile" on public.usuarios;

create policy "usuarios_select_own_profile"
on public.usuarios
for select
to authenticated
using (auth.uid() = auth_user_id);

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'usuarios';

select
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'usuarios'
order by policyname;

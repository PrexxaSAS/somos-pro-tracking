-- Ejecutar SOLO en Supabase STAGING.
--
-- Permite a la empresa transportista editar conductores asociados a su NIT.
-- La app tambien actualiza datos basicos del usuario conductor vinculado.

drop policy if exists "conductores_transportista_update" on public.conductores;
drop policy if exists "usuarios_transportista_update_driver" on public.usuarios;

create policy "conductores_transportista_update"
on public.conductores
for update
to authenticated
using (
  public.is_transportista()
  and nit_proveedor = public.current_user_nit()
)
with check (
  public.is_transportista()
  and nit_proveedor = public.current_user_nit()
);

create policy "usuarios_transportista_update_driver"
on public.usuarios
for update
to authenticated
using (
  public.is_transportista()
  and rol = 'conductor'
  and nit_proveedor = public.current_user_nit()
)
with check (
  public.is_transportista()
  and rol = 'conductor'
  and nit_proveedor = public.current_user_nit()
);

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('conductores', 'usuarios')
order by tablename, policyname;

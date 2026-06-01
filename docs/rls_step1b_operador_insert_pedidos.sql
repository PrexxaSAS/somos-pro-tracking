-- Ejecutar SOLO en Supabase STAGING.
--
-- Ajuste de regla: operador puede registrar pedidos nuevos,
-- pero no editar ni eliminar pedidos existentes.

drop policy if exists "pedidos_operator_insert" on public.pedidos;

create policy "pedidos_operator_insert"
on public.pedidos
for insert
to authenticated
with check (public.is_operator());

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'pedidos'
order by policyname;

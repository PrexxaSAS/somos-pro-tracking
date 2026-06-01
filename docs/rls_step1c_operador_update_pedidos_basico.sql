-- Ejecutar SOLO en Supabase STAGING.
--
-- Ajuste de regla: operador puede editar datos basicos de pedidos existentes
-- y marcar entrega con soporte fotografico.
--
-- Campos permitidos por la app:
-- - direccion
-- - ciudad_codigo
-- - ciudad_nombre
-- - cajas
-- - factura
-- - fecha_estimada
-- - estado
-- - fecha_real
-- - novedad
-- - soportes
-- - soportes_data
--
-- Nota tecnica: RLS limita filas, no columnas. Esta politica permite UPDATE
-- de la fila al operador; la app limita los campos enviados. Si se requiere
-- enforcement por columna en base de datos, se debe agregar trigger.

drop policy if exists "pedidos_operator_update_basic" on public.pedidos;
drop policy if exists "pedidos_operator_update_basic_delivery" on public.pedidos;

create policy "pedidos_operator_update_basic_delivery"
on public.pedidos
for update
to authenticated
using (public.is_operator())
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

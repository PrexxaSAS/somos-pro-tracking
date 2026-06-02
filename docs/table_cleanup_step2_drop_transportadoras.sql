-- Limpieza segura fase 2: retirar public.transportadoras en STAGING.
--
-- Motivo:
-- - La app usa public.transportistas como tabla operativa.
-- - public.transportadoras no se usa en frontend ni en facturacion.
-- - Mantener ambas tablas aumenta confusion.
--
-- IMPORTANTE:
-- - Ejecutar primero solo en staging.
-- - No ejecutar en produccion hasta confirmar que no hay datos reales,
--   integraciones externas ni reportes usando public.transportadoras.

begin;

-- 1. Evidencia antes de retirar.
select
  count(*) as total_transportadoras
from public.transportadoras;

select
  id,
  nit,
  razon_social,
  created_at
from public.transportadoras
order by created_at desc;

-- 2. Verificar dependencias declaradas hacia public.transportadoras.
-- Si este query devuelve filas, revisar antes de continuar.
select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
  and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'transportadoras';

-- 3. Retirar politicas RLS asociadas si existen.
drop policy if exists "staging_authenticated_read" on public.transportadoras;
drop policy if exists "transportadoras_select_admin_operator" on public.transportadoras;
drop policy if exists "transportadoras_admin_all" on public.transportadoras;
drop policy if exists "transportadoras_select_own_transportista" on public.transportadoras;

-- 4. Retirar tabla duplicada.
drop table if exists public.transportadoras;

-- 5. Validar que ya no exista.
select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'transportadoras';

commit;


-- Ejecutar SOLO en Supabase STAGING por ahora.
--
-- Permite eliminar una factura proveedor y que sus guias asociadas
-- en public.factura_guias se eliminen automaticamente.

alter table public.factura_guias
  drop constraint if exists factura_guias_factura_id_fkey;

alter table public.factura_guias
  add constraint factura_guias_factura_id_fkey
  foreign key (factura_id)
  references public.facturas_proveedor(id)
  on delete cascade;

select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
  and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'factura_guias'
  and tc.constraint_name = 'factura_guias_factura_id_fkey';

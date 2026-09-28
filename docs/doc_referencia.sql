-- ---------------------------------------------------------------------------
-- Doc. referencia en Devoluciones y Recogidas.
--
-- Devoluciones pedia N° factura y N° pedido por separado; Recogidas no pedia
-- ningun documento. Ahora las dos piden un solo campo, "Doc. referencia", que
-- puede ser un pedido, una factura o una orden de compra.
--
--   - Columna nueva doc_referencia en las dos tablas.
--   - factura y pedido_ref de devoluciones dejan de ser obligatorias: las
--     nuevas ya no las llenan. Las devoluciones viejas conservan sus valores y
--     la aplicacion las muestra juntas ("FAC-001 · PED-001").
--
-- *** Correr ANTES de usar la version de la app que trae este campo, en los
-- DOS proyectos (prueba y produccion). La app pide doc_referencia al leer
-- devoluciones y recogidas: si la columna no existe, esas pantallas no cargan.
-- ---------------------------------------------------------------------------

alter table public.devoluciones add column if not exists doc_referencia text;
alter table public.recogidas    add column if not exists doc_referencia text;

alter table public.devoluciones alter column factura    drop not null;
alter table public.devoluciones alter column pedido_ref drop not null;

-- Comprobacion: las dos columnas deben aparecer.
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and ((table_name in ('devoluciones', 'recogidas') and column_name = 'doc_referencia')
    or (table_name = 'devoluciones' and column_name in ('factura', 'pedido_ref')))
order by table_name, column_name;

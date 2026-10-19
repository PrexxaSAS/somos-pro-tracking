-- Linea de negocio de cada producto del plano (columna L_Neg_Med).
-- El consolidado de impresion de los cortes agrupa Bodega -> Linea -> Referencia.
-- Correr en el proyecto de Supabase donde este cartera (hoy solo staging).
-- Es seguro correrlo mas de una vez.

alter table public.pedidos_cartera_detalle
  add column if not exists linea text;

-- Que PostgREST vea la columna nueva sin esperar.
notify pgrst, 'reload schema';

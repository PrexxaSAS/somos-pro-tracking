-- Ejecutar en ambos proyectos antes de publicar el frontend.
-- Cerrar la app no modifica este indicador ni borra la ultima posicion.
alter table public.gps_conductores
  add column if not exists apagado_por_conductor boolean not null default false;

-- Publicar los cambios con las mismas politicas RLS de lectura existentes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'gps_conductores'
  ) then
    alter publication supabase_realtime add table public.gps_conductores;
  end if;
end $$;

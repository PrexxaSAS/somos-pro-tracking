-- ---------------------------------------------------------------------------
-- El rol cliente puede CREAR asesores, no editarlos ni borrarlos.
--
-- La tabla asesores no guarda a quien pertenece cada asesor, asi que quien
-- pueda escribir escribe sobre los de todos. Por eso el cliente recibe solo
-- insert: puede agregar los suyos sin poder tocar ni borrar los que ya estan.
-- Editar y eliminar siguen siendo de admin y cartera.
--
-- Esta politica se suma a cartera_escritura (admin, cartera) en vez de
-- reemplazarla: las politicas permisivas se combinan con OR, y al llevar otro
-- nombre sobrevive si se vuelve a correr cartera_schema.sql.
--
-- Correr en los DOS proyectos de Supabase: prueba y produccion.
-- ---------------------------------------------------------------------------
drop policy if exists asesores_cliente_insert on public.asesores;
create policy asesores_cliente_insert on public.asesores
  for insert to authenticated
  with check (public.current_user_role() = 'cliente');

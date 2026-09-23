-- Comparar el proyecto de PRUEBA con el de PRODUCCION.
--
-- PARA QUE:
-- Cuando una base se queda atras en una migracion, el sintoma no es un campo vacio:
-- PostgREST rechaza la consulta completa y el modulo entero aparece sin datos. Este
-- script permite detectar esa diferencia antes de que la descubra un usuario.
--
-- COMO SE USA:
--   1. Corre el PASO 1 en el proyecto de prueba y guarda el resultado.
--   2. Corre el PASO 1 en produccion.
--   3. Compara las dos tablas: donde la columna "huella" sea distinta, hay drift.
--   4. Para esa categoria, corre la consulta de detalle del PASO 2 en ambos y
--      compara las listas para ver que falta donde.
--
-- La huella es un md5 del contenido ordenado de cada categoria: dos proyectos
-- iguales dan la misma huella; basta una columna, una politica o un trigger de
-- diferencia para que cambie.
--
-- LO QUE ESTE SCRIPT NO VE (revisalo aparte en el dashboard):
--   - Las Edge Functions y su codigo desplegado.
--   - La configuracion de Auth (proveedores, politicas de contrasena).
--   - Los datos de las tablas: aqui solo se compara la estructura.

-- ===========================================================================
-- PASO 1: huellas. Corre esto en los dos proyectos y compara.
-- ===========================================================================
with
columnas as (
  select md5(string_agg(table_name || '.' || column_name || ':' || data_type, '|'
              order by table_name, column_name)) as huella,
         count(*) as elementos
  from information_schema.columns
  where table_schema = 'public'
),
tablas as (
  select md5(string_agg(c.relname || ':' || c.relrowsecurity::text, '|' order by c.relname)) as huella,
         count(*) as elementos
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
politicas as (
  select md5(string_agg(tablename || '.' || policyname || ':' || cmd || ':' ||
                        coalesce(qual, '') || ':' || coalesce(with_check, ''), '|'
              order by tablename, policyname)) as huella,
         count(*) as elementos
  from pg_policies
  where schemaname = 'public'
),
triggers as (
  select md5(string_agg(c.relname || '.' || t.tgname || ':' || t.tgenabled::text, '|'
              order by c.relname, t.tgname)) as huella,
         count(*) as elementos
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
funciones as (
  select md5(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ||
                        ':secdef=' || p.prosecdef::text ||
                        ':config=' || coalesce(array_to_string(p.proconfig, ','), ''), '|'
              order by p.proname, pg_get_function_identity_arguments(p.oid))) as huella,
         count(*) as elementos
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
permisos as (
  select md5(string_agg(c.relname || ':anon=' ||
                        has_table_privilege('anon', c.oid, 'SELECT')::text ||
                        has_table_privilege('anon', c.oid, 'INSERT')::text ||
                        has_table_privilege('anon', c.oid, 'UPDATE')::text ||
                        has_table_privilege('anon', c.oid, 'DELETE')::text ||
                        ':auth=' ||
                        has_table_privilege('authenticated', c.oid, 'SELECT')::text ||
                        has_table_privilege('authenticated', c.oid, 'INSERT')::text ||
                        has_table_privilege('authenticated', c.oid, 'UPDATE')::text ||
                        has_table_privilege('authenticated', c.oid, 'DELETE')::text,
              '|' order by c.relname)) as huella,
         count(*) as elementos
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
)
select 'tablas y RLS'   as categoria, elementos, huella from tablas
union all select 'columnas',          elementos, huella from columnas
union all select 'politicas RLS',     elementos, huella from politicas
union all select 'triggers',          elementos, huella from triggers
union all select 'funciones',         elementos, huella from funciones
union all select 'permisos de tabla', elementos, huella from permisos
order by categoria;

-- ===========================================================================
-- PASO 2: detalle por categoria. Usa solo la de la huella que no coincidio.
--
-- Corre la consulta en los dos proyectos, exporta cada resultado con
-- "Download CSV" y compara los dos archivos.
-- ===========================================================================

-- --- Columnas -------------------------------------------------------------
-- select table_name, column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
-- order by table_name, column_name;

-- --- Tablas y si tienen RLS activo ----------------------------------------
-- select c.relname as tabla, c.relrowsecurity as rls_activo
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;

-- --- Politicas RLS --------------------------------------------------------
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

-- --- Triggers (tgenabled 'O' = habilitado, 'D' = deshabilitado) -----------
-- select c.relname as tabla, t.tgname as trigger, t.tgenabled
-- from pg_trigger t
-- join pg_class c on c.oid = t.tgrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and not t.tgisinternal
-- order by c.relname, t.tgname;

-- --- Funciones ------------------------------------------------------------
-- select p.proname as funcion,
--        pg_get_function_identity_arguments(p.oid) as argumentos,
--        p.prosecdef as security_definer,
--        p.proconfig as search_path
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
-- order by p.proname;

-- --- Permisos de tabla ----------------------------------------------------
-- select c.relname as tabla,
--        has_table_privilege('anon', c.oid, 'SELECT') as anon_lee,
--        has_table_privilege('anon', c.oid, 'UPDATE') as anon_escribe,
--        has_table_privilege('authenticated', c.oid, 'SELECT') as auth_lee,
--        has_table_privilege('authenticated', c.oid, 'UPDATE') as auth_escribe
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;

-- ===========================================================================
-- PASO 3: atajo para el caso mas comun
--
-- Casi siempre el drift es una columna que falta. Si la huella de "columnas"
-- no coincide, docs/poner_al_dia_columnas.sql agrega de una vez todas las que
-- la aplicacion consulta, y es seguro correrlo las veces que haga falta.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Permisos (RLS) mas rapidos, con exactamente las mismas reglas.
--
-- EL PROBLEMA:
-- Las politicas preguntan el rol con funciones como is_admin_or_operator() o
-- current_user_role(), que buscan al usuario en public.usuarios. Escritas asi,
-- Postgres las ejecuta UNA VEZ POR CADA FILA: leer 1.000 pedidos eran miles de
-- busquedas, y cada tanda de pedidos tardaba ~3,6 s al abrir la aplicacion
-- (tablas chicas como devoluciones tardaban 0,3 s).
--
-- LA SOLUCION (la que recomienda Supabase):
-- Escribirlas como (select is_admin_or_operator()). Asi Postgres la calcula una
-- sola vez por consulta y reusa el resultado. Ninguna de estas funciones
-- depende de la fila (solo de quien inicio sesion), asi que el resultado de
-- cada politica es identico: nadie gana ni pierde permisos.
--
-- Se reescriben todas las politicas del esquema public que llaman funciones sin
-- argumentos is_*() o current_*() o auth.uid(). Las que ya estan envueltas en
-- (select ...) no se tocan. Es seguro correrlo mas de una vez.
--
-- Correr en los DOS proyectos (prueba y produccion). Primero el paso 1 para
-- ver que va a cambiar; despues el paso 2.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Vista previa: que politicas cambian y como quedan (no modifica nada)
-- ---------------------------------------------------------------------------
with patron as (
  select '(?<!SELECT )(?<![A-Za-z0-9_.])((public\.)?(is_[a-z_]+|current_[a-z_]+)\(\)|auth\.uid\(\))' as re
)
select pol.tablename, pol.policyname, pol.cmd,
       pol.qual,
       regexp_replace(pol.qual, patron.re, '(SELECT \1)', 'g')       as qual_nueva,
       pol.with_check,
       regexp_replace(pol.with_check, patron.re, '(SELECT \1)', 'g') as with_check_nueva
from pg_policies pol, patron
where pol.schemaname = 'public'
  and (pol.qual       ~ patron.re or pol.with_check ~ patron.re)
order by pol.tablename, pol.policyname;

-- ---------------------------------------------------------------------------
-- 2) Aplicar
-- ---------------------------------------------------------------------------
do $$
declare
  re  constant text := '(?<!SELECT )(?<![A-Za-z0-9_.])((public\.)?(is_[a-z_]+|current_[a-z_]+)\(\)|auth\.uid\(\))';
  pol record;
  sql text;
  n   int := 0;
begin
  for pol in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ re or with_check ~ re)
  loop
    sql := format('alter policy %I on public.%I', pol.policyname, pol.tablename);
    if pol.qual is not null then
      sql := sql || format(' using (%s)', regexp_replace(pol.qual, re, '(SELECT \1)', 'g'));
    end if;
    if pol.with_check is not null then
      sql := sql || format(' with check (%s)', regexp_replace(pol.with_check, re, '(SELECT \1)', 'g'));
    end if;
    execute sql;
    n := n + 1;
  end loop;
  raise notice 'Politicas reescritas: %', n;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) Comprobacion: debe salir vacia (ninguna llamada sin envolver)
-- ---------------------------------------------------------------------------
select tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual       ~ '(?<!SELECT )(?<![A-Za-z0-9_.])((public\.)?(is_[a-z_]+|current_[a-z_]+)\(\)|auth\.uid\(\))'
    or with_check ~ '(?<!SELECT )(?<![A-Za-z0-9_.])((public\.)?(is_[a-z_]+|current_[a-z_]+)\(\)|auth\.uid\(\))');

-- Fija el search_path de las funciones que no lo declaraban.
--
-- El Security Advisor lo reporta como "Function Search Path Mutable": si una funcion
-- no fija su search_path, alguien con permiso de crear objetos podria anteponer un
-- esquema propio y hacer que la funcion use SUS tablas en lugar de las reales.
--
-- No cambia el comportamiento: solo obliga a resolver los nombres contra public.
-- Ejecutar en el SQL Editor de PRODUCCION.

alter function public.audit_sanitize_row(jsonb) set search_path = public;
alter function public.audit_json_changed_fields(jsonb, jsonb) set search_path = public;

-- reparar_texto() se creo solo para la limpieza de textos danados.
-- Si ya la ejecutaste y no la vas a volver a usar, es mejor eliminarla que ajustarla:
--   drop function if exists public.reparar_texto(text);
-- Si prefieres conservarla:
alter function public.reparar_texto(text) set search_path = public;

-- Verificacion: no debe devolver filas.
select p.proname as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.proconfig is null
order by p.proname;

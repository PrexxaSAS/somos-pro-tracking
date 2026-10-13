-- ---------------------------------------------------------------------------
-- Los limites de la sede mandan sobre sus cortes, tambien en la base.
--
-- La aplicacion ya lo revisa (ModuloCartera.jsx: razonCorteNoCabe y
-- razonSedeNoCabe). Esto hace que se cumpla aunque alguien escriba directo en
-- la base o dos personas agreguen cortes a la vez. Las reglas son las mismas:
--
--   Al crear o cambiar un corte (cortes_sede):
--     - la sede no puede pasar de num_cortes cortes;
--     - no puede haber dos cortes a la misma hora;
--     - ningun corte puede ser mas tarde que hora_ultimo_corte;
--     - la suma de capacidad_corte no puede pasar de capacidad_dia;
--     - capacidad_corte tiene que ser mayor que 0.
--   Al cambiar la sede (sedes):
--     - num_cortes, capacidad_dia y hora_ultimo_corte no pueden quedar por
--       debajo de lo que ya tienen sus cortes.
--
-- Un limite en NULL no limita (asi quedan las sedes viejas sin ese dato).
-- Los cortes que ya existen no se tocan: si una sede ya pasa sus limites,
-- sigue igual, pero no se le puede agregar otro corte ni editar la sede hasta
-- corregirla. La consulta del PASO 1 las muestra.
--
-- Correr en los DOS proyectos de Supabase: prueba y produccion.
-- ---------------------------------------------------------------------------


-- PASO 1 (solo lectura): sedes que hoy ya pasan sus limites.
-- Si sale alguna, eliminale cortes o subele los limites antes o despues de
-- correr el PASO 2; mientras no se corrija, esa sede no se deja editar.
select s.nombre,
       s.num_cortes,        count(c.id)                  as cortes_actuales,
       s.capacidad_dia,     coalesce(sum(c.capacidad_corte), 0) as suma_capacidad,
       s.hora_ultimo_corte, max(c.hora_corte)            as corte_mas_tarde
from public.sedes s
left join public.cortes_sede c on c.sede_id = s.id
group by s.id
having (s.num_cortes is not null and count(c.id) > s.num_cortes)
    or (s.capacidad_dia is not null and coalesce(sum(c.capacidad_corte), 0) > s.capacidad_dia)
    or (s.hora_ultimo_corte is not null and max(c.hora_corte) > s.hora_ultimo_corte)
order by s.nombre;


-- PASO 2: las reglas.

-- Cortes de una sede
create or replace function public.validar_corte_sede()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sede   public.sedes%rowtype;
  v_cortes integer;
  v_suma   integer;
begin
  if coalesce(new.capacidad_corte, 0) < 1 then
    raise exception 'El máximo de pedidos del corte debe ser mayor que 0.'
      using errcode = 'check_violation';
  end if;

  -- Se bloquea la fila de la sede para que dos cortes agregados a la vez se
  -- revisen uno despues del otro y no pasen los dos el mismo limite.
  select * into v_sede from public.sedes where id = new.sede_id for update;
  if not found then
    return new;  -- la llave foranea ya se encarga
  end if;

  select count(*), coalesce(sum(capacidad_corte), 0)
    into v_cortes, v_suma
    from public.cortes_sede
   where sede_id = new.sede_id
     and id is distinct from new.id;

  if v_sede.num_cortes is not null and v_cortes + 1 > v_sede.num_cortes then
    raise exception 'La sede admite % cortes por día y ya los tiene.', v_sede.num_cortes
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.cortes_sede
              where sede_id = new.sede_id
                and id is distinct from new.id
                and hora_corte = new.hora_corte) then
    raise exception 'Ya hay un corte a las %.', to_char(new.hora_corte, 'HH24:MI')
      using errcode = 'unique_violation';
  end if;

  if v_sede.hora_ultimo_corte is not null and new.hora_corte > v_sede.hora_ultimo_corte then
    raise exception 'El último corte de la sede es a las %; este no puede ser más tarde.',
      to_char(v_sede.hora_ultimo_corte, 'HH24:MI')
      using errcode = 'check_violation';
  end if;

  if v_sede.capacidad_dia is not null and v_suma + new.capacidad_corte > v_sede.capacidad_dia then
    raise exception 'La capacidad por día es % y los cortes ya suman %: a este le caben máximo %.',
      v_sede.capacidad_dia, v_suma, greatest(0, v_sede.capacidad_dia - v_suma)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_corte_sede on public.cortes_sede;
create trigger trg_validar_corte_sede
  before insert or update of sede_id, hora_corte, capacidad_corte on public.cortes_sede
  for each row execute function public.validar_corte_sede();


-- La sede no puede bajar sus limites por debajo de sus cortes
create or replace function public.validar_limites_sede()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cortes integer;
  v_suma   integer;
  v_tarde  time;
begin
  select count(*), coalesce(sum(capacidad_corte), 0), max(hora_corte)
    into v_cortes, v_suma, v_tarde
    from public.cortes_sede
   where sede_id = new.id;

  if v_cortes = 0 then
    return new;
  end if;

  if new.num_cortes is not null and v_cortes > new.num_cortes then
    raise exception 'La sede ya tiene % cortes; "Cortes por día" no puede ser menor. Elimina cortes primero.', v_cortes
      using errcode = 'check_violation';
  end if;

  if new.capacidad_dia is not null and v_suma > new.capacidad_dia then
    raise exception 'Los cortes ya suman % pedidos; "Capacidad por día" no puede ser menor.', v_suma
      using errcode = 'check_violation';
  end if;

  if new.hora_ultimo_corte is not null and v_tarde > new.hora_ultimo_corte then
    raise exception 'Ya hay un corte a las %; "Último corte" no puede ser más temprano.', to_char(v_tarde, 'HH24:MI')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_limites_sede on public.sedes;
create trigger trg_validar_limites_sede
  before update of num_cortes, capacidad_dia, hora_ultimo_corte on public.sedes
  for each row execute function public.validar_limites_sede();


-- PASO 3 (opcional, para comprobar): debe fallar con "ya los tiene" si la
-- sede elegida ya esta llena. Cambia el nombre y corre dentro de una
-- transaccion que se deshace.
-- begin;
--   insert into public.cortes_sede (sede_id, hora_corte, capacidad_corte)
--   select id, '23:59', 1 from public.sedes where nombre = 'CEDI La Estrella';
-- rollback;

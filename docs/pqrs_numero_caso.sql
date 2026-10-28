-- ---------------------------------------------------------------------------
-- El numero de caso de las PQRS (PQRS-AAAA-NNNN) lo asigna la base.
--
-- EL PROBLEMA:
-- La aplicacion calculaba el numero con la lista de PQRS que el usuario tiene
-- cargada. El rol cliente solo ve SUS propias PQRS (RLS), asi que para el la
-- lista esta casi vacia y proponia PQRS-2026-0001, que ya existia: la PQRS no
-- se radicaba y salia "Ya existe un registro con esos datos". Es el mismo caso
-- que ya se resolvio para devoluciones y recogidas
-- (docs/guias_recogidas_devoluciones.sql).
--
-- LA SOLUCION:
-- Un trigger BEFORE INSERT asigna el siguiente numero libre del ano. Es
-- security definer: ve todas las PQRS. Un advisory lock evita que dos
-- radicaciones simultaneas tomen el mismo numero.
--
-- Tambien corrige el numero cuando la aplicacion lo manda ya ocupado, asi que
-- destraba a los usuarios aunque la aplicacion publicada siga enviando su
-- numero. La version nueva de la aplicacion ya no lo envia y muestra el que
-- asigna la base.
--
-- Correr en los dos proyectos. Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

create or replace function public.asignar_numero_pqrs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefijo   text;
  siguiente integer;
begin
  -- Si viene con un numero que nadie usa, se respeta.
  if coalesce(new.id, '') <> ''
     and not exists (select 1 from public.pqrs where id = new.id) then
    return new;
  end if;

  prefijo := 'PQRS-' || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-';

  -- Serializa la numeracion mientras dure la transaccion.
  perform pg_advisory_xact_lock(hashtext('numero_pqrs'));

  select coalesce(max(nullif(split_part(id, '-', 3), '')::integer), 0) + 1
    into siguiente
    from public.pqrs
   where id like prefijo || '%'
     and split_part(id, '-', 3) ~ '^[0-9]+$';

  new.id := prefijo || lpad(siguiente::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_asignar_numero_pqrs on public.pqrs;
create trigger trg_asignar_numero_pqrs
before insert on public.pqrs
for each row
execute function public.asignar_numero_pqrs();

-- Comprobacion: el trigger existe y cual seria el siguiente numero.
select trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public' and trigger_name = 'trg_asignar_numero_pqrs';

select 'PQRS-' || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-'
       || lpad((coalesce(max(nullif(split_part(id, '-', 3), '')::integer), 0) + 1)::text, 4, '0') as siguiente_numero
from public.pqrs
where id like 'PQRS-' || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-%'
  and split_part(id, '-', 3) ~ '^[0-9]+$';

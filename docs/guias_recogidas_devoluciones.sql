-- La guia de recogidas y devoluciones (RC-AAAA-NNNN / DV-AAAA-NNNN) se calculaba en el
-- navegador con la lista que el usuario tiene cargada. El rol cliente solo ve SUS propias
-- solicitudes por RLS, asi que para el la lista esta casi vacia y proponia RC-2026-0001,
-- que ya existia: el insert fallaba con "Ya existe un registro con esos datos".
--
-- Aqui el numero lo asigna la base, que si ve todas las filas (security definer).
-- Un advisory lock evita que dos solicitudes simultaneas tomen el mismo numero.
--
-- La app deja de enviar id y guia: los recibe de vuelta ya asignados.
-- Ejecutar en el SQL Editor de PRODUCCION.

create or replace function public.asignar_guia_solicitud()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefijo text;
  siguiente integer;
begin
  -- Si ya viene con guia (por ejemplo, una carga masiva), se respeta.
  if coalesce(new.guia, '') <> '' then
    new.id := coalesce(nullif(new.id, ''), new.guia);
    return new;
  end if;

  prefijo := case tg_table_name when 'recogidas' then 'RC-' else 'DV-' end
             || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-';

  -- Serializa la numeracion de esta tabla mientras dure la transaccion.
  perform pg_advisory_xact_lock(hashtext('guia_' || tg_table_name));

  if tg_table_name = 'recogidas' then
    select coalesce(max(nullif(split_part(guia, '-', 3), '')::integer), 0) + 1
      into siguiente
      from public.recogidas
     where guia like prefijo || '%';
  else
    select coalesce(max(nullif(split_part(guia, '-', 3), '')::integer), 0) + 1
      into siguiente
      from public.devoluciones
     where guia like prefijo || '%';
  end if;

  new.guia := prefijo || lpad(siguiente::text, 4, '0');
  new.id := coalesce(nullif(new.id, ''), new.guia);
  return new;
end;
$$;

drop trigger if exists trg_asignar_guia_recogidas on public.recogidas;
create trigger trg_asignar_guia_recogidas
before insert on public.recogidas
for each row
execute function public.asignar_guia_solicitud();

drop trigger if exists trg_asignar_guia_devoluciones on public.devoluciones;
create trigger trg_asignar_guia_devoluciones
before insert on public.devoluciones
for each row
execute function public.asignar_guia_solicitud();

-- Verificacion
select
  event_object_table as tabla,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('trg_asignar_guia_recogidas', 'trg_asignar_guia_devoluciones')
order by tabla;

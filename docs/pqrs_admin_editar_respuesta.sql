-- ---------------------------------------------------------------------------
-- El admin puede corregir la respuesta de una PQRS ya registrada.
--
-- Antes (docs/rls_step8_operador_assign_requests_pqrs.sql) el trigger
-- trg_prevent_pqrs_response_rewrite no dejaba cambiar la respuesta, quien la
-- registro ni la fecha de gestion una vez guardadas, "ni por admin ni por
-- operador". Ahora el admin si puede, tambien con la PQRS cerrada; para el
-- operador sigue igual.
--
-- Solo se reemplaza la funcion; el trigger y sus permisos quedan como estaban.
-- Correr en los dos proyectos. Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_pqrs_response_rewrite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El admin puede corregir una respuesta registrada.
  if public.current_user_role() = 'admin' then
    return new;
  end if;

  if btrim(coalesce(old.respuesta, '')) <> ''
    or old.fecha_gestion is not null
    or btrim(coalesce(old.gestionado_por, '')) <> ''
  then
    if new.respuesta is distinct from old.respuesta
      or new.fecha_gestion is distinct from old.fecha_gestion
      or new.gestionado_por is distinct from old.gestionado_por
    then
      raise exception 'No se puede modificar una respuesta de PQRS ya registrada';
    end if;
  end if;

  return new;
end;
$$;

-- Comprobacion: el trigger sigue activo sobre pqrs.
select trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public' and trigger_name = 'trg_prevent_pqrs_response_rewrite';

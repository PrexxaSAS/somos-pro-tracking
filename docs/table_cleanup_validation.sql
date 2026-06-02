-- Validacion previa antes de retirar columnas/tablas obsoletas.
-- Ejecutar primero en staging. No borra ni modifica datos.

select
  count(*) as total_usuarios,
  count(*) filter (where auth_user_id is null) as usuarios_sin_auth,
  count(*) filter (where pass is distinct from '__auth_managed__') as usuarios_con_pass_legacy,
  count(*) filter (where pass is null) as usuarios_pass_null
from public.usuarios;

select
  id,
  "user",
  nombre,
  rol,
  auth_user_id,
  pass
from public.usuarios
where auth_user_id is null
   or pass is distinct from '__auth_managed__'
order by rol, "user";

select
  to_regclass('public.transportadoras') as transportadoras_table;

select
  case
    when to_regclass('public.transportadoras') is null then 'retirada'
    else 'existe'
  end as estado_transportadoras;

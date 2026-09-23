-- Pone una base al dia con todas las columnas que la aplicacion consulta.
--
-- PARA QUE SIRVE:
-- Cuando un proyecto se queda atras en una migracion, el sintoma no es un campo
-- vacio: PostgREST rechaza la consulta completa y el modulo entero aparece sin
-- datos, con el motivo real en un aviso pequeno ("column X does not exist").
-- Este script junta todas las columnas aditivas de docs/ para no ir descubriendo
-- una por una.
--
-- Es seguro correrlo en cualquier momento y las veces que haga falta: todo es
-- "add column if not exists" y ningun dato existente se modifica.
--
-- Lo que NO incluye: los triggers, las politicas RLS y las correcciones de datos
-- que viven en sus propios scripts. Si una base esta muy atrasada, revisa tambien
-- los demas archivos de docs/.

-- ---------------------------------------------------------------------------
-- pedidos
-- ---------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists fecha_despacho date,
  add column if not exists fecha_pedido date,
  add column if not exists hora_pedido text;

-- ---------------------------------------------------------------------------
-- devoluciones
-- ---------------------------------------------------------------------------
alter table public.devoluciones
  add column if not exists tipo text default 'propio',
  add column if not exists dir_entrega text,
  add column if not exists paqueteria text,
  add column if not exists guia_paqueteria text;

-- ---------------------------------------------------------------------------
-- recogidas
-- ---------------------------------------------------------------------------
alter table public.recogidas
  add column if not exists tipo text default 'propio',
  add column if not exists paqueteria text,
  add column if not exists guia_paqueteria text;

-- ---------------------------------------------------------------------------
-- pqrs
-- ---------------------------------------------------------------------------
alter table public.pqrs
  add column if not exists soporte_data text,
  add column if not exists soporte_nombre text;

-- ---------------------------------------------------------------------------
-- conductores y usuarios
-- ---------------------------------------------------------------------------
alter table public.conductores
  add column if not exists activo boolean not null default true;

alter table public.usuarios
  add column if not exists auth_user_id uuid;

-- ---------------------------------------------------------------------------
-- auditoria
-- ---------------------------------------------------------------------------
alter table public.audit_events
  add column if not exists changed_fields text[];

-- ---------------------------------------------------------------------------
-- Verificacion: deben aparecer las once columnas
-- ---------------------------------------------------------------------------
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'pedidos'      and column_name in ('fecha_despacho','fecha_pedido','hora_pedido')) or
    (table_name = 'devoluciones' and column_name in ('tipo','dir_entrega','paqueteria','guia_paqueteria')) or
    (table_name = 'recogidas'    and column_name in ('tipo','paqueteria','guia_paqueteria')) or
    (table_name = 'pqrs'         and column_name in ('soporte_data','soporte_nombre')) or
    (table_name = 'conductores'  and column_name = 'activo') or
    (table_name = 'usuarios'     and column_name = 'auth_user_id') or
    (table_name = 'audit_events' and column_name = 'changed_fields')
  )
order by table_name, column_name;

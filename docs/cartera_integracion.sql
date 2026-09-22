-- Integracion del modulo de cartera (Qtrack_Pedidos) a QTracking.
--
-- QUE RESUELVE:
-- El modulo llego con su propio login (tabla usuarios_cartera, contrasenas en texto
-- plano) y con una politica abierta en todas sus tablas:
--     create policy acceso_app ... for all to anon, authenticated using (true)
-- Como la anon key viaja dentro del JavaScript que descarga cualquier visitante, eso
-- permitia leer y escribir todo sin haber iniciado sesion, incluida la lista de
-- usuarios con sus contrasenas.
--
-- Al pasar el modulo a QTracking, la autenticacion es Supabase Auth y el rol sale de
-- public.usuarios, asi que las politicas pueden apoyarse en current_user_role() como
-- el resto del sistema.
--
-- ORDEN OBLIGATORIO:
--   1. Este script en el proyecto de PRUEBA.
--   2. Probar el modulo con un usuario de cada rol.
--   3. Este script en PRODUCCION (junto con el schema del modulo, si no esta).
--   4. Merge a main.
--
-- MIENTRAS TANTO: la app suelta Qtrack_Pedidos DEJA DE FUNCIONAR en cuanto se corra
-- el paso 3, porque entra como anon. Es lo esperado: esa app se reemplaza por el
-- modulo dentro de QTracking.

-- ---------------------------------------------------------------------------
-- 1) Los roles nuevos
--    public.usuarios.rol es texto libre (no tiene check), asi que no hay que
--    alterar la tabla. Los usuarios se crean desde QTracking con la Edge Function
--    create-system-user, que los registra en Supabase Auth.
--
--    Roles del modulo: cartera, logistica, consultas.
-- ---------------------------------------------------------------------------
select rol, count(*) as usuarios
from public.usuarios
group by rol
order by rol;

-- ---------------------------------------------------------------------------
-- 2) Repuntar las llaves foraneas a public.usuarios
--    Hoy apuntan a usuarios_cartera, que va a desaparecer. Los dos son uuid, asi
--    que el cambio es directo.
--
--    Si ya hay decisiones registradas, sus usuario_id pertenecen a usuarios_cartera
--    y no existen en usuarios: el paso 2.1 los deja en null para no perder la fila
--    del historial (quien decidio se pierde, la decision no).
-- ---------------------------------------------------------------------------
-- 2.1 Limpiar referencias que no existiran en public.usuarios
update public.pedidos_cartera
set aprobado_por = null
where aprobado_por is not null
  and aprobado_por not in (select id from public.usuarios);

update public.historial_cartera
set usuario_id = null
where usuario_id is not null
  and usuario_id not in (select id from public.usuarios);

-- 2.2 Cambiar las llaves foraneas
alter table public.pedidos_cartera
  drop constraint if exists pedidos_cartera_aprobado_por_fkey;
alter table public.pedidos_cartera
  add constraint pedidos_cartera_aprobado_por_fkey
  foreign key (aprobado_por) references public.usuarios(id) on delete set null;

alter table public.historial_cartera
  drop constraint if exists historial_cartera_usuario_id_fkey;
alter table public.historial_cartera
  add constraint historial_cartera_usuario_id_fkey
  foreign key (usuario_id) references public.usuarios(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3) Politicas reales, en reemplazo del "acceso_app" abierto
--
--    Quien puede que cosa:
--      admin      -> todo
--      cartera    -> carga y decide pedidos; lee la configuracion
--      logistica  -> ve pedidos aprobados y los marca impresos/transmitidos
--      consultas  -> solo lectura
--      anon       -> nada
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sedes','cortes_sede','cortes_programados','asesores',
                           'cartera_clientes','pedidos_cartera',
                           'pedidos_cartera_detalle','historial_cartera']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- Fuera la politica abierta que traia el modulo
    execute format('drop policy if exists acceso_app on public.%I', t);

    -- Lectura: cualquier usuario autenticado del modulo (o admin/operador)
    execute format($p$
      drop policy if exists cartera_lectura on public.%I;
      create policy cartera_lectura on public.%I
        for select to authenticated
        using (public.current_user_role() in ('admin','operador','cartera','logistica','consultas'));
    $p$, t, t);

    -- Escritura: admin y cartera en todas; logistica solo en las de pedidos
    -- (para marcar impresion y transmision), que se ajusta abajo.
    execute format($p$
      drop policy if exists cartera_escritura on public.%I;
      create policy cartera_escritura on public.%I
        for all to authenticated
        using (public.current_user_role() in ('admin','cartera'))
        with check (public.current_user_role() in ('admin','cartera'));
    $p$, t, t);
  end loop;
end $$;

-- Logistica necesita actualizar los pedidos aprobados (impresion y transmision)
-- y los cortes programados (cerrar el corte al transmitir).
drop policy if exists cartera_logistica_update on public.pedidos_cartera;
create policy cartera_logistica_update on public.pedidos_cartera
  for update to authenticated
  using (public.current_user_role() = 'logistica')
  with check (public.current_user_role() = 'logistica');

drop policy if exists cartera_logistica_cortes on public.cortes_programados;
create policy cartera_logistica_cortes on public.cortes_programados
  for update to authenticated
  using (public.current_user_role() = 'logistica')
  with check (public.current_user_role() = 'logistica');

-- ---------------------------------------------------------------------------
-- 4) Comprobar que anon quedo por fuera
--    Las dos columnas de anon deben dar false.
-- ---------------------------------------------------------------------------
select
  c.relname as tabla,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_lee,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_escribe,
  c.relrowsecurity as rls_activo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('sedes','cortes_sede','cortes_programados','asesores',
                    'cartera_clientes','pedidos_cartera',
                    'pedidos_cartera_detalle','historial_cartera')
order by c.relname;

-- Politicas que quedaron en cada tabla:
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('sedes','cortes_sede','cortes_programados','asesores',
                    'cartera_clientes','pedidos_cartera',
                    'pedidos_cartera_detalle','historial_cartera')
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- 5) Eliminar usuarios_cartera
--    SOLO despues de crear en QTracking los usuarios equivalentes y de confirmar
--    que el modulo funciona con ellos. Guarda antes la lista de correos: las
--    contrasenas no sirven, porque las nuevas las maneja Supabase Auth.
-- ---------------------------------------------------------------------------
-- select nombre, email, rol, activo from public.usuarios_cartera order by nombre;
-- drop table if exists public.usuarios_cartera;

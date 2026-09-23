-- Tablas del modulo de cartera, ya integradas a QTracking.
--
-- CUAL DE LOS DOS SCRIPTS USAR:
--   - Proyecto que NUNCA tuvo el modulo (produccion): este.
--   - Proyecto donde ya corrio el schema viejo de Qtrack_Pedidos (el de prueba):
--     docs/cartera_integracion.sql, que migra lo que ya existe.
--
-- Diferencias con el schema original de Qtrack_Pedidos:
--   - No se crea usuarios_cartera. La autenticacion es Supabase Auth y el perfil
--     sale de public.usuarios, como en todo QTracking.
--   - aprobado_por y usuario_id apuntan a public.usuarios.
--   - Las politicas son por rol. El schema viejo abria todas las tablas a anon con
--     "using (true)", lo que permitia leer y escribir sin iniciar sesion.
--
-- Ejecutar en el SQL Editor. Requiere que public.usuarios ya exista.

-- ---------------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------------

-- Sedes de despacho
create table if not exists public.sedes (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  municipio         text,
  dane_code         text,                    -- se compara normalizado a 5 digitos ("5380" = "05380")
  capacidad_dia     integer default 50,
  hora_ultimo_corte time default '16:00',
  num_cortes        integer default 3,
  activa            boolean default true,
  created_at        timestamptz default now()
);

-- Cortes configurados de cada sede
create table if not exists public.cortes_sede (
  id              uuid primary key default gen_random_uuid(),
  sede_id         uuid not null references public.sedes(id) on delete cascade,
  hora_corte      time not null,
  capacidad_corte integer default 20,
  orden           integer default 1,
  created_at      timestamptz default now()
);
create index if not exists idx_cortes_sede_sede on public.cortes_sede(sede_id);

-- Cortes del dia (se crean solos al aprobar pedidos)
create table if not exists public.cortes_programados (
  id                uuid primary key default gen_random_uuid(),
  sede_id           uuid not null references public.sedes(id) on delete cascade,
  corte_sede_id     uuid not null references public.cortes_sede(id) on delete cascade,
  fecha             date not null,
  hora_corte        time not null,
  capacidad_max     integer default 20,
  pedidos_asignados integer default 0,
  estado            text default 'abierto',  -- abierto | transmitido
  fecha_transmision timestamptz,
  created_at        timestamptz default now(),
  unique (sede_id, corte_sede_id, fecha)
);

-- Asesores comerciales (para el correo de rechazo)
create table if not exists public.asesores (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,           -- la carga por CSV hace upsert sobre este campo
  nombre     text,
  email      text,
  created_at timestamptz default now()
);

-- Estado de cartera por cliente (se reemplaza completo en cada carga)
create table if not exists public.cartera_clientes (
  id               uuid primary key default gen_random_uuid(),
  nit              text not null,
  razon_social     text,
  tiene_vencidos   boolean default false,
  dias_max_vencido integer default 0,
  fecha_corte      text,                     -- text: llega tal cual del CSV
  created_at       timestamptz default now()
);
create index if not exists idx_cartera_clientes_nit on public.cartera_clientes(nit);

-- Pedidos en revision de cartera
create table if not exists public.pedidos_cartera (
  id                uuid primary key default gen_random_uuid(),
  numero_pedido     text not null unique,
  cia               text,
  fecha_pedido      text,                    -- text: el archivo de origen no trae formato uniforme
  nit               text,
  cliente           text,
  direccion         text,
  sector_dane       text,
  codigo_mensaje    text,
  plazo             integer default 0,
  observacion       text,
  vendedor          text,
  origen            text,
  dane_origen       text,                    -- con esto se asigna la sede y el corte
  valor_total       numeric(14,2) default 0,

  estado_cartera    text default 'pendiente'
                    check (estado_cartera in ('pendiente','preaprobado','cartera_vencida','aprobado','rechazado')),
  motivo_rechazo    text,
  fecha_aprobacion  timestamptz,
  aprobado_por      uuid references public.usuarios(id) on delete set null,

  corte_id          uuid references public.cortes_programados(id) on delete set null,
  fecha_corte       timestamptz,

  estado_impresion  text default 'no_impreso'
                    check (estado_impresion in ('no_impreso','impreso')),
  fecha_impresion   timestamptz,
  transmitido_tms   boolean default false,
  fecha_transmision timestamptz,

  created_at        timestamptz default now()
);
create index if not exists idx_pedidos_estado on public.pedidos_cartera(estado_cartera);
create index if not exists idx_pedidos_corte  on public.pedidos_cartera(corte_id);
create index if not exists idx_pedidos_nit    on public.pedidos_cartera(nit);

-- Lineas de cada pedido
create table if not exists public.pedidos_cartera_detalle (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos_cartera(id) on delete cascade,
  cia_bod_ref     text,
  bodega          text,
  referencia      text,
  descripcion     text,
  precio          numeric(14,2) default 0,
  cantidad_pedida integer default 0,
  lios            integer default 0,
  valor_total     numeric(14,2) default 0,
  created_at      timestamptz default now()
);
create index if not exists idx_detalle_pedido on public.pedidos_cartera_detalle(pedido_id);

-- Historial de decisiones
create table if not exists public.historial_cartera (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references public.pedidos_cartera(id) on delete cascade,
  decision   text not null,                  -- aprobado | rechazado | reactivado
  usuario_id uuid references public.usuarios(id) on delete set null,
  motivo     text,
  created_at timestamptz default now()
);
create index if not exists idx_historial_pedido on public.historial_cartera(pedido_id);

-- ---------------------------------------------------------------------------
-- 2) Politicas por rol
--      admin      -> todo
--      cartera    -> carga y decide pedidos; lee la configuracion
--      operador   -> lee todo y actualiza pedidos y cortes (impresion, transmision)
--      cliente    -> solo lectura
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
    execute format('drop policy if exists acceso_app on public.%I', t);

    execute format($p$
      drop policy if exists cartera_lectura on public.%I;
      create policy cartera_lectura on public.%I
        for select to authenticated
        using (public.current_user_role() in ('admin','operador','cartera','cliente'));
    $p$, t, t);

    execute format($p$
      drop policy if exists cartera_escritura on public.%I;
      create policy cartera_escritura on public.%I
        for all to authenticated
        using (public.current_user_role() in ('admin','cartera'))
        with check (public.current_user_role() in ('admin','cartera'));
    $p$, t, t);
  end loop;
end $$;

drop policy if exists cartera_logistica_update on public.pedidos_cartera;
drop policy if exists cartera_operador_update on public.pedidos_cartera;
create policy cartera_operador_update on public.pedidos_cartera
  for update to authenticated
  using (public.current_user_role() = 'operador')
  with check (public.current_user_role() = 'operador');

drop policy if exists cartera_logistica_cortes on public.cortes_programados;
drop policy if exists cartera_operador_cortes on public.cortes_programados;
create policy cartera_operador_cortes on public.cortes_programados
  for update to authenticated
  using (public.current_user_role() = 'operador')
  with check (public.current_user_role() = 'operador');

-- ---------------------------------------------------------------------------
-- 3) Verificacion: anon no debe poder leer ni escribir
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

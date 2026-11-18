-- ---------------------------------------------------------------------------
-- Ubicacion real de los conductores.
--
-- EL PROBLEMA:
-- El panel GPS del conductor leia la ubicacion del celular, pero solo la
-- guardaba en la memoria de ese navegador. Nadie mas podia verla: Rastreo GPS
-- mostraba la direccion de destino y la vista del cliente nunca veia "GPS en
-- vivo" desde otro equipo.
--
-- LA SOLUCION:
-- Una fila por conductor con su ultima ubicacion. El celular del conductor la
-- actualiza mientras tiene el GPS encendido (cada ~20 s o al moverse); las
-- demas pantallas la leen cada 20 s. Solo se guarda la ultima posicion, no el
-- recorrido.
--
-- Quien la ve: admin, operador, cliente interno y la empresa transportista
-- (solo sus conductores). Quien la escribe: solo el propio conductor.
--
-- Correr en los dos proyectos ANTES de publicar la version que la usa (sin la
-- tabla la aplicacion no falla, solo no muestra ubicaciones en vivo).
-- Es seguro correrlo mas de una vez.
-- ---------------------------------------------------------------------------

create table if not exists public.gps_conductores (
  conductor_id   uuid primary key references public.conductores(id) on delete cascade,
  lat            double precision not null,
  lng            double precision not null,
  precision_m    real,
  actualizado_en timestamptz not null default now()
);

alter table public.gps_conductores enable row level security;

drop policy if exists "gps_select" on public.gps_conductores;
create policy "gps_select"
on public.gps_conductores
for select
to authenticated
using (
  (select public.current_user_role()) in ('admin', 'operador', 'cliente')
  or ((select public.is_conductor()) and conductor_id = (select public.current_conductor_id()))
  or (
    (select public.is_transportista())
    and exists (
      select 1 from public.conductores c
      where c.id = gps_conductores.conductor_id
        and c.nit_proveedor = (select public.current_user_nit())
    )
  )
);

drop policy if exists "gps_insert_conductor" on public.gps_conductores;
create policy "gps_insert_conductor"
on public.gps_conductores
for insert
to authenticated
with check ((select public.is_conductor()) and conductor_id = (select public.current_conductor_id()));

drop policy if exists "gps_update_conductor" on public.gps_conductores;
create policy "gps_update_conductor"
on public.gps_conductores
for update
to authenticated
using ((select public.is_conductor()) and conductor_id = (select public.current_conductor_id()))
with check ((select public.is_conductor()) and conductor_id = (select public.current_conductor_id()));

grant select, insert, update on public.gps_conductores to authenticated;

-- Comprobacion: la tabla y sus politicas.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'gps_conductores'
order by policyname;

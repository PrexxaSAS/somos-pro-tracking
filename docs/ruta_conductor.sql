-- ---------------------------------------------------------------------------
-- El orden de ruta que el conductor elige para sus entregas.
--
-- COMO SE ORDENA LA RUTA:
-- Por defecto, por urgencia: primero el pedido cuya promesa de servicio vence
-- antes. Si el conductor necesita otro orden (conoce la ciudad, un cliente
-- abre temprano), lo cambia desde el celular y ese orden queda guardado aqui.
-- Los pedidos que le asignen despues de reordenar se agregan al final, por
-- urgencia. "Restablecer" borra sus filas y vuelve al orden por promesa.
--
-- POR QUE UNA TABLA APARTE Y NO UNA COLUMNA EN pedidos:
-- trg_prevent_closed_pedido_changes no deja que el conductor cambie nada de un
-- pedido en transito salvo para registrar la entrega. Una columna de orden en
-- pedidos obligaria a abrirle una excepcion a ese trigger, que es el que
-- protege los pedidos en ruta. Con una tabla aparte el trigger no se toca.
--
-- Cada conductor ve y escribe solo sus filas. Admin y operador pueden leerlas
-- para saber en que orden va cada ruta.
--
-- Ejecutar en el SQL Editor: primero PRUEBA, y luego PRODUCCION.
-- ---------------------------------------------------------------------------

create table if not exists public.ruta_conductor (
  conductor_id  uuid    not null references public.conductores(id) on delete cascade,
  pedido_id     text    not null references public.pedidos(id)     on delete cascade,
  orden         integer not null,
  actualizado   timestamptz not null default now(),
  primary key (conductor_id, pedido_id)
);

comment on table public.ruta_conductor is
  'Orden de entrega que el conductor eligio a mano. Sin filas, la ruta va por urgencia de la promesa.';

alter table public.ruta_conductor enable row level security;

revoke all on public.ruta_conductor from anon;
grant select, insert, update, delete on public.ruta_conductor to authenticated;

drop policy if exists ruta_conductor_propia on public.ruta_conductor;
create policy ruta_conductor_propia on public.ruta_conductor
  for all to authenticated
  using (public.is_conductor() and conductor_id = public.current_conductor_id())
  with check (public.is_conductor() and conductor_id = public.current_conductor_id());

drop policy if exists ruta_conductor_lectura_central on public.ruta_conductor;
create policy ruta_conductor_lectura_central on public.ruta_conductor
  for select to authenticated
  using (public.is_admin_or_operator());

-- Comprobacion: debe mostrar las dos politicas.
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'ruta_conductor';

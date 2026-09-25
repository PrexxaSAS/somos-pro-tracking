-- ---------------------------------------------------------------------------
-- El operador tambien carga pedidos y cartera vencida.
--
-- Hasta ahora el operador solo podia ACTUALIZAR pedidos_cartera (imprimir,
-- transmitir) por cartera_operador_update; no podia insertar nada. Las dos
-- pantallas de cargue escriben asi:
--
--   Cargar pedidos    insert en pedidos_cartera y en pedidos_cartera_detalle
--   Cartera vencida   delete + insert en cartera_clientes (se reemplaza toda)
--
-- Sin estas politicas las pantallas se ven pero el cargue falla al guardar.
-- Se suman a las que ya existen; las permisivas se combinan con OR.
--
-- El admin no necesita nada: cartera_escritura ya lo cubre.
--
-- Correr en los DOS proyectos de Supabase: prueba y produccion.
-- ---------------------------------------------------------------------------

-- Cargar pedidos
drop policy if exists cartera_operador_insert_pedidos on public.pedidos_cartera;
create policy cartera_operador_insert_pedidos on public.pedidos_cartera
  for insert to authenticated
  with check (public.current_user_role() = 'operador');

drop policy if exists cartera_operador_insert_detalle on public.pedidos_cartera_detalle;
create policy cartera_operador_insert_detalle on public.pedidos_cartera_detalle
  for insert to authenticated
  with check (public.current_user_role() = 'operador');

-- Cartera vencida: la carga borra lo anterior y vuelve a insertar, asi que
-- necesita las dos cosas. No se le da update: no hay pantalla que lo use.
drop policy if exists cartera_operador_vencida_insert on public.cartera_clientes;
create policy cartera_operador_vencida_insert on public.cartera_clientes
  for insert to authenticated
  with check (public.current_user_role() = 'operador');

drop policy if exists cartera_operador_vencida_delete on public.cartera_clientes;
create policy cartera_operador_vencida_delete on public.cartera_clientes
  for delete to authenticated
  using (public.current_user_role() = 'operador');

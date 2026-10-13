-- ---------------------------------------------------------------------------
-- El operador tambien carga pedidos y cartera vencida.
--
-- Hasta ahora el operador solo podia ACTUALIZAR pedidos_cartera (imprimir,
-- transmitir) por cartera_operador_update; no podia insertar nada. Las dos
-- pantallas de cargue escriben asi:
--
--   Cargar pedidos    insert en pedidos_cartera y en pedidos_cartera_detalle
--
-- Sin estas politicas las pantallas se ven pero el cargue falla al guardar.
-- Se suman a las que ya existen; las permisivas se combinan con OR.
--
-- El admin no necesita nada: cartera_escritura ya lo cubre.
--
-- El cargue ademas APRUEBA los pedidos que traen plazo, y aprobar asigna
-- corte y escribe historial: por eso tambien van esos dos permisos.
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


-- Al cargar, el pedido con plazo entra aprobado. Aprobar asigna corte: crea el
-- corte del dia si no existe y le suma uno a pedidos_asignados (el update ya lo
-- tenia por cartera_operador_cortes), y deja el rastro en historial_cartera.
drop policy if exists cartera_operador_crear_corte on public.cortes_programados;
create policy cartera_operador_crear_corte on public.cortes_programados
  for insert to authenticated
  with check (public.current_user_role() = 'operador');

drop policy if exists cartera_operador_historial on public.historial_cartera;
create policy cartera_operador_historial on public.historial_cartera
  for insert to authenticated
  with check (public.current_user_role() = 'operador');

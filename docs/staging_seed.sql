-- Ejecutar en Supabase SQL Editor del proyecto de STAGING
-- despues de docs/staging_schema.sql.
--
-- Datos ficticios minimos para validar todos los roles y modulos base.

insert into public.usuarios
  (id, nombre, "user", pass, rol, nit, empresa, cedula, placa, celular, nit_proveedor)
values
  ('00000000-0000-4000-8000-000000000001', 'Admin Prueba', 'admin', 'admin123', 'admin', null, null, null, null, null, null),
  ('00000000-0000-4000-8000-000000000002', 'Operador Prueba', 'operador', 'op123', 'operador', null, null, null, null, null, null),
  ('00000000-0000-4000-8000-000000000003', 'Transportes Prueba S.A.S', 'transprueba', 'trans123', 'transportista', '900111222-1', 'Transportes Prueba S.A.S', null, null, null, null),
  ('00000000-0000-4000-8000-000000000004', 'Conductor Prueba', 'driver1', 'cond123', 'conductor', null, 'Transportes Prueba S.A.S', '1010101010', 'ABC123', '3001234567', '900111222-1'),
  ('00000000-0000-4000-8000-000000000005', 'Cliente Interno Prueba', 'cliente', 'cli123', 'cliente', null, null, null, null, null, null)
on conflict ("user") do nothing;

insert into public.ciudades (code, name)
values
  ('11001', 'Bogota D.C.'),
  ('05001', 'Medellin'),
  ('76001', 'Cali'),
  ('08001', 'Barranquilla'),
  ('68001', 'Bucaramanga')
on conflict (code) do nothing;

insert into public.transportistas
  (id, nombre, nit, contacto, tel, usuario_id)
values
  ('10000000-0000-4000-8000-000000000001', 'Transportes Prueba S.A.S', '900111222-1', 'Contacto Prueba', '3007654321', '00000000-0000-4000-8000-000000000003')
on conflict (nit) do nothing;

insert into public.transportadoras
  (id, nit, razon_social)
values
  ('40000000-0000-4000-8000-000000000001', '900111222-1', 'Transportes Prueba S.A.S')
on conflict (nit) do nothing;

insert into public.conductores
  (id, nombre, cedula, placa, celular, nit_proveedor, empresa, usuario_id)
values
  ('20000000-0000-4000-8000-000000000001', 'Conductor Prueba', '1010101010', 'ABC123', '3001234567', '900111222-1', 'Transportes Prueba S.A.S', '00000000-0000-4000-8000-000000000004')
on conflict (id) do nothing;

update public.usuarios
set conductor_id = '20000000-0000-4000-8000-000000000001'
where id = '00000000-0000-4000-8000-000000000004';

insert into public.paqueterias (nombre)
values
  ('Servientrega Prueba'),
  ('Coordinadora Prueba')
on conflict (nombre) do nothing;

insert into public.promesas_servicio (ciudad_codigo, dias_plazo)
values
  ('11001', 1),
  ('05001', 2),
  ('76001', 2),
  ('08001', 3),
  ('68001', 2)
on conflict (ciudad_codigo) do update set dias_plazo = excluded.dias_plazo;

insert into public.pedidos
  (id, guia_interna, cliente, ciudad_codigo, ciudad_nombre, direccion, cajas, factura, conductor_id, placa, nit_proveedor, estado, estado_despacho, novedad, fecha_creacion, fecha_estimada, fecha_real, tipo, empresa_transporte, paqueteria, guia_paqueteria, soportes, soportes_data, notas, ciudad_origen_codigo, ciudad_origen_nombre, direccion_origen)
values
  ('PED-STG-001', 'SPT-2026-0001', 'Cliente Ficticio Norte', '11001', 'Bogota D.C.', 'Calle 100 # 10-10', 5, 'FAC-STG-001', null, null, null, 'sin_asignar', 'despachado', false, current_date, current_date + 1, null, 'propio', null, null, null, '{}', '[]'::jsonb, 'Pedido sin asignar para prueba.', '11001', 'Bogota D.C.', 'Bodega Prueba'),
  ('PED-STG-002', 'SPT-2026-0002', 'Cliente Ficticio Centro', '05001', 'Medellin', 'Carrera 43 # 20-20', 8, 'FAC-STG-002', '20000000-0000-4000-8000-000000000001', 'ABC123', '900111222-1', 'en_transito', 'despachado', false, current_date, current_date + 2, null, 'propio', null, null, null, '{}', '[]'::jsonb, 'Pedido en transito para conductor prueba.', '11001', 'Bogota D.C.', 'Bodega Prueba'),
  ('PED-STG-003', null, 'Cliente Ficticio Occidente', '76001', 'Cali', 'Av. 6 # 30-30', 3, 'FAC-STG-003', null, null, null, 'paqueteria', 'despachado', false, current_date, current_date + 2, null, 'paqueteria', null, 'Servientrega Prueba', 'SRV-STG-003', '{}', '[]'::jsonb, 'Pedido de paqueteria.', '11001', 'Bogota D.C.', 'Bodega Prueba'),
  ('PED-STG-004', 'SPT-2026-0004', 'Cliente Ficticio Caribe', '08001', 'Barranquilla', 'Via 40 # 40-40', 12, 'FAC-STG-004', '20000000-0000-4000-8000-000000000001', 'ABC123', '900111222-1', 'entregado', 'despachado', false, current_date - 2, current_date - 1, current_date, 'propio', null, null, null, array['soporte_prueba.jpg'], '[{"nombre":"soporte_prueba.jpg","data":""}]'::jsonb, 'Pedido entregado ficticio.', '11001', 'Bogota D.C.', 'Bodega Prueba'),
  ('PED-STG-005', 'SPT-2026-0005', 'Cliente Ficticio Santander', '68001', 'Bucaramanga', 'Calle 35 # 25-25', 2, 'FAC-STG-005', '20000000-0000-4000-8000-000000000001', 'ABC123', '900111222-1', 'novedad', 'despachado', true, current_date - 1, current_date, current_date, 'propio', null, null, null, array['novedad_prueba.jpg'], '[{"nombre":"novedad_prueba.jpg","data":""}]'::jsonb, 'Pedido con novedad ficticia.', '11001', 'Bogota D.C.', 'Bodega Prueba')
on conflict (id) do nothing;

insert into public.devoluciones
  (id, guia, factura, pedido_ref, unidades, volumen_m3, peso_kg, dir_recogida, ciudad_codigo, ciudad_nombre, motivo, conductor_id, placa, nit_proveedor, estado, novedad, solicitado_por)
values
  ('DEV-STG-001', 'DV-2026-0001', 'FAC-STG-002', 'PED-STG-002', 1, 0.2, 5, 'Calle 20 # 10-10', '11001', 'Bogota D.C.', 'Producto averiado de prueba', null, null, null, 'sin_asignar', false, 'Cliente Interno Prueba')
on conflict (id) do nothing;

insert into public.recogidas
  (id, guia, dir_recogida, ciudad_recogida_cod, ciudad_recogida_nombre, dir_entrega, ciudad_entrega_cod, ciudad_entrega_nombre, unidades, volumen_m3, peso_kg, observaciones, conductor_id, placa, nit_proveedor, estado, novedad, solicitado_por)
values
  ('REC-STG-001', 'RC-2026-0001', 'Bodega Cliente Prueba', '11001', 'Bogota D.C.', 'Bodega Central Prueba', '05001', 'Medellin', 2, 0.5, 12, 'Recogida ficticia', null, null, null, 'sin_asignar', false, 'Operador Prueba')
on conflict (id) do nothing;

insert into public.pqrs
  (id, factura, pedido_ref, motivo, descripcion, estado, solicitado_por)
values
  ('PQRS-STG-001', 'FAC-STG-003', 'PED-STG-003', 'Demora', 'PQRS ficticia para validar flujo.', 'abierta', 'Cliente Interno Prueba')
on conflict (id) do nothing;

insert into public.facturas_proveedor
  (id, numero_factura, transportista_id, fecha_factura, valor_total, observaciones)
values
  ('30000000-0000-4000-8000-000000000001', 'FP-STG-001', '10000000-0000-4000-8000-000000000001', current_date, 150000, 'Factura ficticia de transportista')
on conflict (id) do nothing;

insert into public.factura_guias
  (factura_id, pedido_id)
values
  ('30000000-0000-4000-8000-000000000001', 'PED-STG-002'),
  ('30000000-0000-4000-8000-000000000001', 'PED-STG-004');

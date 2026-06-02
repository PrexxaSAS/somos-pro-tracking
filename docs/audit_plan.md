# Plan de auditoria

La auditoria se implementara por fases para no frenar la estabilizacion del aplicativo ni romper flujos existentes.

## Objetivo

Registrar de forma confiable:

- quien hizo un cambio;
- cuando lo hizo;
- sobre que modulo/tabla;
- que registro fue afectado;
- que accion ocurrio;
- estado anterior y estado nuevo cuando aplique;
- datos anteriores/nuevos para trazabilidad tecnica.

## Fase 1. Auditoria tecnica centralizada

Crear una tabla unica `public.audit_events` y triggers sobre tablas criticas.

Tablas iniciales:

- `pedidos`
- `devoluciones`
- `recogidas`
- `pqrs`
- `facturas_proveedor`
- `factura_guias`
- `usuarios`
- `conductores`
- `transportistas`

Eventos:

- `INSERT`
- `UPDATE`
- `DELETE`

Campos principales:

- `actor_auth_user_id`
- `actor_usuario_id`
- `actor_user`
- `actor_nombre`
- `actor_rol`
- `table_name`
- `record_id`
- `action`
- `old_estado`
- `new_estado`
- `old_data`
- `new_data`
- `created_at`

Ventaja: no requiere cambiar la interfaz para empezar a registrar eventos.

### Ajuste anti-ruido

Despues de la primera prueba se detecto que algunos updates de la app pueden generar eventos sin cambios reales y que guardar `soportes_data` en auditoria produce registros enormes por el base64.

Se agrega `docs/audit_step1b_reduce_noise.sql` para:

- ignorar `UPDATE` sin cambios reales;
- registrar `changed_fields`;
- excluir de `old_data` y `new_data` campos pesados/sensibles:
  - `soportes_data`;
  - `soporte_data`;
  - `doc_data`;
  - `pass`;
- limpiar eventos ruidosos ya generados en staging.

## Fase 2. Auditoria funcional visible

Agregar vistas especificas para lectura operativa:

- pedido entregado por;
- fecha/hora de entrega;
- devolucion gestionada por;
- recogida gestionada por;
- factura creada/editada/eliminada por;
- PQRS respondida por.

Se agrega `docs/audit_step2_views.sql` con vistas para consultar:

- `audit_events_resumen`;
- `audit_pedidos_historial`;
- `audit_devoluciones_historial`;
- `audit_recogidas_historial`;
- `audit_pqrs_historial`;
- `audit_facturas_proveedor_historial`;
- `audit_por_usuario`.

Por ahora estas vistas quedan solo para consulta SQL. No se exponen en interfaz.

## Fase 3. Historial de estados

Crear vista o tabla especifica para historial de estados de pedidos:

- pedido;
- estado anterior;
- estado nuevo;
- usuario;
- fecha/hora;
- origen del cambio.

Recomendacion: derivarlo inicialmente desde `audit_events` filtrando cambios de `estado`.

## Reglas

- La auditoria debe probarse primero en staging.
- No se debe exponer `audit_events` a clientes, conductores ni transportistas.
- Admin puede consultar auditoria completa.
- Operador puede consultar auditoria operativa si negocio lo aprueba.
- Los eventos de Edge Functions pueden aparecer sin `auth.uid()` si se ejecutan con `service_role`; por eso se guardan tambien los datos disponibles en cada evento.

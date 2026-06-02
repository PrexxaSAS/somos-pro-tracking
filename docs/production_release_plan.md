# Plan de salida a produccion

Este plan prepara la salida a produccion sin ejecutar nada sobre datos reales hasta que exista una ventana aprobada. El objetivo es tener un paquete claro: backup, scripts permitidos, scripts prohibidos, configuracion requerida, validaciones y rollback.

## Regla principal

No ejecutar migraciones, seeds, cambios de variables ni despliegues en produccion hasta completar:

- Validacion final en staging/preview.
- Backup productivo.
- Decision de datos: iniciar limpio o migrar datos reales.
- Confirmacion del responsable de negocio/logistica.
- Ventana de salida aprobada.

## Proyectos identificados

| Entorno | Supabase URL | Project ref | Estado |
| --- | --- | --- | --- |
| Staging/preview | `https://dnahgbevwnbdhiqjlqyu.supabase.co` | `dnahgbevwnbdhiqjlqyu` | Validado funcionalmente |
| Produccion | `https://cfvvnvmezmrxehpaqayw.supabase.co` | `cfvvnvmezmrxehpaqayw` | Identificado, no intervenir aun |

## Variables requeridas

### Vercel Preview

- `VITE_SUPABASE_URL`: URL de staging.
- `VITE_SUPABASE_ANON_KEY`: anon public key de staging.

### Vercel Production

Pendiente para ventana de salida:

- `VITE_SUPABASE_URL`: URL de produccion.
- `VITE_SUPABASE_ANON_KEY`: anon public key de produccion.

No debe existir en Vercel:

- `SERVICE_ROLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`.

### Supabase Edge Functions produccion

Pendiente para ventana de salida:

- `SUPABASE_URL`.
- `SUPABASE_ANON_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`.

La `SUPABASE_SERVICE_ROLE_KEY` solo debe existir en Supabase Edge Functions.

## Scripts SQL permitidos para paquete productivo

Estos scripts pueden hacer parte del paquete productivo, segun decision final y despues de backup:

1. `docs/auth_migration_step1.sql`
2. `docs/auth_migration_step2_link.sql`
3. `docs/auth_migration_step3_profile_policy.sql`
4. `docs/recogidas_paqueteria_migration.sql`
5. `docs/factura_guias_cascade_migration.sql`
6. `docs/conductores_activo_migration.sql`
7. `docs/rls_step1_admin_operador.sql`
8. `docs/rls_step2_transportista.sql`
9. `docs/rls_step2b_transportista_update_driver.sql`
10. `docs/rls_step3_conductor.sql`
11. `docs/rls_step4_cliente.sql`
12. `docs/rls_step5_write_lockdown.sql`
13. `docs/rls_step6_column_guards.sql`
14. `docs/rls_step6b_trigger_null_context_fix.sql`
15. `docs/rls_step7_pedidos_terminal_lock.sql`
16. `docs/rls_step8_operador_assign_requests_pqrs.sql`
17. `docs/audit_step1_event_log.sql`
18. `docs/audit_step1b_reduce_noise.sql`
19. `docs/audit_step2_views.sql`
20. `docs/production_rls_validation.sql`

Nota: `production_rls_validation.sql` no modifica datos; se usa para validar.

## Scripts que no se deben ejecutar en produccion

Estos scripts son de staging, auditoria o diagnostico y no deben ejecutarse como migracion productiva:

- `docs/staging_seed.sql`
- `docs/staging_validation.sql`
- `docs/staging_schema.sql`, salvo que se decida crear produccion desde cero con esquema controlado.
- `docs/supabase_schema_export.sql`
- `docs/check_pedido_estado.sql`
- Cualquier script de prueba o consulta descargado desde Supabase que no este aprobado en este plan.

## Orden propuesto de preparacion

### Fase 0. Congelar staging

- [ ] Confirmar que preview/staging funciona por rol.
- [ ] Confirmar que no hay errores criticos pendientes.
- [ ] Registrar commit o version candidata.
- [ ] Guardar URL del preview validado.

### Fase 1. Decidir datos

- [ ] Confirmar con negocio si produccion inicia limpia.
- [ ] Si inicia limpia, definir usuarios iniciales reales.
- [ ] Si migra datos reales, listar tablas y campos a migrar.
- [ ] Definir si soportes base64 existentes migran o quedan historicos.

### Fase 2. Backup

- [ ] Exportar esquema de produccion.
- [ ] Exportar datos de produccion.
- [ ] Guardar backup con fecha y responsable.
- [ ] Documentar restauracion.

### Fase 3. Preparar Supabase produccion

- [ ] Revisar esquema actual.
- [ ] Ejecutar solo scripts aprobados.
- [ ] Crear/vincular usuarios Auth reales.
- [ ] Desplegar `create-system-user`.
- [ ] Configurar secrets de Edge Function.
- [ ] Ejecutar `production_rls_validation.sql`.

### Fase 4. Preparar Vercel Production

- [ ] Configurar `VITE_SUPABASE_URL`.
- [ ] Configurar `VITE_SUPABASE_ANON_KEY`.
- [ ] Confirmar que no hay service role.
- [ ] Hacer deploy production.

### Fase 5. Validacion post-salida

- [ ] Login admin.
- [ ] Login operador.
- [ ] Login transportista.
- [ ] Login conductor.
- [ ] Login cliente.
- [ ] Crear usuario de prueba real y eliminarlo.
- [ ] Crear pedido, asignar conductor y entregar con soporte.
- [ ] Crear devolucion y recogida.
- [ ] Crear y responder PQRS.
- [ ] Crear factura proveedor y asociar guias.

## Rollback

Si hay fallo critico:

1. No seguir ejecutando scripts.
2. Desactivar deploy productivo o volver al deployment anterior de Vercel.
3. Si el fallo es de datos/RLS, restaurar backup o aplicar script de reversa especifico.
4. Registrar el error, hora, usuario y modulo.
5. Repetir validacion en staging antes de un nuevo intento.

## Pendientes de decision

- [ ] Produccion limpia o migracion de datos reales.
- [ ] Usuarios iniciales reales.
- [ ] Responsable de aprobar salida.
- [ ] Ventana de salida.
- [ ] Estrategia exacta de backup/restore.

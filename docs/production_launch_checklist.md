# Checklist de salida a produccion

Este documento ordena los pendientes para lanzar Somos PRO Tracking con el menor riesgo posible. Se debe trabajar primero en staging/preview y solo pasar a produccion cuando cada bloque critico este validado.

Plan operativo relacionado: `docs/production_release_plan.md`.

## 1. Checklist Vercel/Supabase

- [x] Confirmar proyecto Supabase de produccion.
- [x] Confirmar proyecto Supabase de staging/preview separado.
- [ ] Configurar variables de produccion en Vercel:
  - [ ] `VITE_SUPABASE_URL`.
  - [ ] `VITE_SUPABASE_ANON_KEY`.
- [x] Configurar variables de preview en Vercel apuntando a staging.
- [x] Confirmar que `SERVICE_ROLE_KEY` no exista en frontend ni en Vercel client-side.
- [ ] Configurar `SERVICE_ROLE_KEY` solo en Supabase Edge Functions.
- [ ] Desplegar Edge Function `create-system-user` en Supabase produccion.
- [ ] Validar que la Edge Function tenga:
  - [ ] `SUPABASE_URL`.
  - [ ] `SUPABASE_ANON_KEY`.
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Confirmar RLS activo en tablas publicas sensibles.
- [ ] Confirmar que preview y produccion no comparten base de datos.
- [ ] Hacer redeploy final de Vercel Preview antes de produccion.

### Evidencia y estado del bloque 1

- Staging/preview validado con proyecto Supabase de prueba: `dnahgbevwnbdhiqjlqyu`.
- Produccion identificada con Supabase URL: `https://cfvvnvmezmrxehpaqayw.supabase.co`.
- Project Ref de produccion inferido por URL: `cfvvnvmezmrxehpaqayw`.
- Preview Vercel ya fue usado contra staging y los roles principales fueron probados.
- En el repo, la `SERVICE_ROLE_KEY` solo aparece documentada y usada dentro de `supabase/functions/create-system-user/index.ts`; no aparece en `src/`.
- Confirmado: no existe `SERVICE_ROLE_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` en Vercel Production ni Preview.
- Pendiente: Vercel Production no tiene aun `VITE_SUPABASE_URL` ni `VITE_SUPABASE_ANON_KEY`.
- Queda pendiente ejecutar `docs/production_rls_validation.sql` en el proyecto que se usara para produccion.
- Pendiente: `create-system-user` no existe aun en Supabase produccion.
- Pendiente: configurar secrets de `create-system-user` en produccion: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Nota: estos pendientes no se deben ejecutar todavia; quedan preparados para ventana de salida.

## 2. Datos y migracion a produccion

- [ ] Decidir si produccion inicia limpia o con datos reales migrados.
- [ ] Si inicia limpia:
  - [ ] No ejecutar seeds ficticios.
  - [ ] Crear solo usuarios iniciales reales.
  - [ ] Crear ciudades, paqueterias y promesas necesarias.
- [ ] Si migra datos reales:
  - [ ] Exportar datos origen.
  - [ ] Revisar compatibilidad de columnas.
  - [ ] Preparar script de migracion.
  - [ ] Probar migracion primero en staging.
- [ ] Separar scripts productivos de scripts ficticios/staging.
- [ ] Confirmar que `docs/staging_seed.sql` no se ejecute en produccion.
- [x] Crear plan de scripts permitidos y scripts prohibidos para produccion.

## 3. Backups

- [x] Crear carpeta local de backup pre-despliegue.
- [ ] Tomar backup antes de cualquier cambio productivo.
- [ ] Exportar esquema.
- [ ] Exportar datos o confirmar produccion vacia con conteos.
- [x] Guardar backup en ubicacion acordada.
- [x] Documentar fecha, responsable y proyecto respaldado.
- [x] Documentar pasos de restauracion.
- [ ] Validar al menos una restauracion en entorno de prueba o proyecto temporal.

### Estado backup

- Carpeta creada fuera del repo: `D:\Users\j.bustamante\Documents\somos-pro-tracking-backups\production\2026-06-02_prelaunch\`.
- Metadata creada: `00_metadata.md`.
- Plantilla de esquema creada: `01_schema.sql`.
- Plantilla de conteos creada: `02_table_counts.csv`.
- Plantilla de validacion RLS creada: `03_rls_validation_before_changes.csv`.
- Notas de restauracion creadas: `04_restore_notes.md`.
- Consulta de conteos creada: `docs/production_backup_counts.sql`.
- Pendiente: reemplazar plantillas con export/resultados reales desde Supabase Dashboard/SQL Editor.

## 4. Pruebas de errores

- [x] Crear plan de pruebas de errores por modulo.
- [x] Agregar helper de mensajes para traducir errores comunes de Supabase/RLS/Edge Function.
- [ ] Validar login invalido.
- [ ] Validar sesion expirada o sin perfil.
- [ ] Validar error por permisos RLS.
- [ ] Validar error al crear usuario duplicado.
- [ ] Validar error al crear conductor sin datos obligatorios.
- [ ] Validar error al subir soporte demasiado pesado.
- [ ] Validar error al intentar editar pedido bloqueado.
- [ ] Validar error al intentar editar PQRS ya respondida.
- [ ] Confirmar que los mensajes sean claros para usuario final.

## 5. Auditoria

- [x] Definir campos minimos de auditoria por modulo.
- [x] Crear plan de auditoria por fases.
- [x] Crear SQL fase 1 para tabla centralizada `audit_events`.
- [x] Crear ajuste anti-ruido para auditoria: ignorar updates sin cambios y excluir base64/passwords.
- [x] Crear vistas SQL para consultar auditoria por modulo y por usuario.
- [x] Crear script para endurecer permisos de vistas de auditoria.
- [x] Ejecutar endurecimiento de vistas de auditoria en staging.
- [x] Validar que `anon` no tenga acceso a vistas de auditoria.
- [x] Validar que operador, cliente, conductor y transportista no puedan leer auditoria por API.
- [x] Registrar quien gestiono PQRS.
- [x] Registrar fecha de gestion de PQRS.
- [x] Registrar quien gestiono devoluciones.
- [x] Registrar fecha de gestion de devoluciones.
- [x] Registrar quien gestiono recogidas.
- [x] Registrar fecha de gestion de recogidas.
- [x] Registrar quien marco entregas.
- [x] Registrar fecha de entrega.
- [x] Registrar quien creo/edito/eliminar facturas proveedor.
- [x] Definir historial de estados de pedidos.
- [x] Crear tabla de eventos si se decide auditar historico completo.

### Estado auditoria

- Auditoria tecnica validada en staging.
- `audit_events` registra eventos reales y omite updates sin cambios.
- Los campos pesados/sensibles `soportes_data`, `soporte_data`, `doc_data` y `pass` no quedan guardados dentro de `old_data`/`new_data`.
- Las vistas SQL de auditoria por modulo y por usuario funcionan.
- Script de endurecimiento creado: `docs/audit_step3_secure_views.sql`.
- Decision actual: solo administrador puede leer auditoria.
- Endurecimiento validado en staging: `authenticated` solo conserva `SELECT`, `anon` no aparece en permisos y la lectura queda limitada por RLS a admin.
- Pendiente fase posterior: construir una pantalla de auditoria dentro de la app si negocio lo requiere.

## 6. Revision de tablas

- [x] Decidir si se mantiene `transportistas`, `transportadoras` o ambas.
- [x] Documentar diferencia funcional mientras existan ambas.
- [x] Revisar si `clientes` requiere tabla propia en fase posterior.
- [x] Revisar si `operadores` requiere tabla propia en fase posterior.
- [x] Revisar columna `pass` en `usuarios`.
- [x] Definir cuando eliminar o dejar de usar `pass` despues de estabilizar Supabase Auth.
- [x] Revisar columnas obsoletas o duplicadas.
- [x] Corregir flujos legacy que aun insertan usuarios con `pass` directamente desde la app.
- [x] Retirar `transportadoras` en staging con script controlado.
- [ ] Confirmar en produccion si `transportadoras` tiene datos reales antes de retirarla.

### Estado revision de tablas

- Documento creado: `docs/table_review.md`.
- Validacion segura creada: `docs/table_cleanup_validation.sql`.
- Limpieza segura fase 1 creada: `docs/table_cleanup_step1_auth_pass.sql`.
- Limpieza segura fase 2 creada: `docs/table_cleanup_step2_drop_transportadoras.sql`.
- Decision actual: `transportistas` es la tabla operativa; `transportadoras` fue retirada de staging y no se usa para desarrollo nuevo.
- No se crean tablas `clientes` ni `operadores` por ahora; ambos siguen como roles en `usuarios`.
- `usuarios.pass` queda obsoleta y solo temporal por compatibilidad. La autenticacion real debe vivir en Supabase Auth.
- Se mantienen snapshots como `placa` y `nit_proveedor` en pedidos/devoluciones/recogidas para conservar historico.
- Flujo seguro aplicado: creacion de conductores y empresas transportistas con acceso ahora pasa por `create-system-user`.
- Pendiente tecnico menor: revisar si se mantiene la sincronizacion directa de perfil conductor en `usuarios` para campos no sensibles.

## 7. Soportes fotograficos

- [ ] Mantener base64 temporalmente mientras se estabiliza produccion.
- [ ] Definir bucket de Supabase Storage para soportes.
- [ ] Definir estructura de rutas por modulo:
  - [ ] pedidos.
  - [ ] devoluciones.
  - [ ] recogidas.
  - [ ] PQRS, si aplica.
- [ ] Definir politicas de Storage por rol.
- [ ] Migrar nuevos soportes a Storage.
- [ ] Decidir si se migran soportes historicos base64.
- [ ] Probar visualizacion y descarga manual.

## 8. Dependencias frontend

- [ ] Revisar vulnerabilidades reportadas por NPM.
- [ ] Ejecutar `npm audit` cuando haya acceso estable al registry.
- [ ] Evaluar si las correcciones requieren cambios mayores de versiones.
- [ ] Aplicar fixes solo despues de validar que no rompan Vite/React/Supabase.

### Estado dependencias

- Al instalar dependencias para validar el build, NPM reporto 2 vulnerabilidades moderadas.
- No se aplico `npm audit fix` para no mezclar correcciones de dependencias con la modularizacion del frontend.
- Pendiente: tratar estas vulnerabilidades al final del bloque UX/UI o antes del despliegue productivo final.

## Estado actual

- [x] Paso 1 y 2 funcionales en staging/preview segun validacion del desarrollador.
- [ ] Checklist productivo formal pendiente.
- [ ] Backup productivo pendiente.
- [ ] Auditoria pendiente.
- [ ] Storage pendiente.

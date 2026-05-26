# Somos PRO Tracking

Sistema de Gestion de Transporte (TMS) para administrar pedidos, asignacion de transporte, seguimiento GPS, entregas con soporte fotografico, devoluciones, recogidas y PQRS.

## Estado Actual

- Frontend: React 18 + Vite.
- Backend/datos: Supabase PostgreSQL.
- Hosting: Vercel.
- Tipo de app: PWA instalable en movil y escritorio.
- Roles actuales: administrador, operador, transportista, conductor y cliente interno.
- Estrategia acordada: preparar salida a produccion con acciones minimas seguras en un entorno de prueba, sin intervenir datos reales hasta validar.

## Objetivo Inmediato

Lanzar el aplicativo a produccion de forma controlada, priorizando seguridad minima y continuidad operativa.

El trabajo debe hacerse gradualmente:

1. Preparar entorno de prueba/staging.
2. Migrar seguridad sin romper el login actual por usuario.
3. Validar reglas de negocio con el coordinador de logistica.
4. Probar con datos anonimizados o copias controladas.
5. Pasar cambios a produccion solo despues de validacion funcional.

## Riesgos Criticos Identificados

- Las contrasenas se guardan hoy en texto plano en la tabla `usuarios`.
- La autenticacion actual compara `user` y `pass` desde el frontend.
- RLS esta desactivado en Supabase, por lo que la clave anon publica representa riesgo alto.
- Los permisos por rol viven principalmente en frontend.
- Las fotos de entrega estan guardadas como base64 en base de datos.
- No hay auditoria completa de cambios de estado.
- Pedidos, devoluciones y recogidas cargan todos los registros al iniciar.

## Decisiones De Trabajo

- Por ahora se conserva login por usuario, no por email visible para el usuario.
- La migracion sera gradual.
- Supabase Auth sera la base futura de autenticacion segura.
- La tabla `usuarios` seguira funcionando como perfil de negocio durante la migracion.
- El entorno de prueba debe evitar datos reales o usar datos anonimizados.
- Todo cambio sensible debe documentarse en este README.
- Se recomienda usar un proyecto Supabase separado para staging.
- Por ahora staging usara datos ficticios.
- El proyecto Supabase de staging se llamara `somos-pro-tracking-prueba`.
- Todos los roles deben validarse antes de salida a produccion.
- La foto sera obligatoria para marcar una entrega: minimo 1 foto, maximo 3 como funciona actualmente.
- El cliente interno podra ver datos basicos del conductor, estado, ciudad, guia y fechas.
- Admin puede crear usuarios de cualquier rol.
- Empresa transportista solo puede crear conductores asociados a su propia empresa.
- Operador, conductor y cliente interno no pueden crear usuarios.
- Operador puede ver pedidos, conductores, transportistas, devoluciones, recogidas y PQRS.
- Operador no puede modificar conductores, pedidos ni recogidas.
- Operador si puede gestionar devoluciones y PQRS.

## Arquitectura Actual

Archivos principales:

- `src/SomosProTracking.jsx`: contiene la mayor parte de la aplicacion, modulos y logica.
- `src/Subcomponentes.jsx`: componentes reutilizables como botones, modales, tarjetas, campos y toast.
- `src/supabase.js`: cliente Supabase.
- `src/DataStore.js`: datos iniciales/demo.
- `src/Constants.js`: colores, roles, estados y catalogos base.
- `docs/supabase_schema_export.sql`: consulta para extraer estructura real de Supabase sin datos sensibles.
- `docs/staging_schema.sql`: crea estructura de tablas en Supabase staging.
- `docs/staging_seed.sql`: carga datos ficticios minimos para validar staging.
- `docs/staging_validation.sql`: verifica conteos y datos base de staging antes de probar la app.
- `docs/auth_migration_step1.sql`: prepara `usuarios.auth_user_id` para migracion gradual a Supabase Auth.
- `docs/auth_migration_step2_link.sql`: vincula perfiles `usuarios` con usuarios creados en Supabase Auth.
- `docs/auth_migration_validate_links.sql`: valida vinculacion entre `usuarios` y `auth.users`.
- `docs/auth_migration_step3_profile_policy.sql`: agrega politica RLS minima para leer perfil propio.
- `docs/auth_migration_step4_staging_read_policies.sql`: agrega politicas temporales de lectura para staging con Auth.
- `docs/auth_migration_notes.md`: notas y reglas de negocio para la migracion de autenticacion.
- `docs/rls_matrix.md`: matriz objetivo de permisos RLS por rol.
- `docs/rls_step1_admin_operador.sql`: primeras politicas finales para admin y operador.
- `docs/rls_step2_transportista.sql`: politicas RLS para empresa transportista y sus conductores.
- `docs/rls_step2b_transportista_update_driver.sql`: permite a transportista editar conductores propios.

Tablas principales en Supabase:

- `usuarios`
- `pedidos`
- `conductores`
- `transportistas`
- `devoluciones`
- `recogidas`
- `pqrs`
- `ciudades`
- `paqueterias`
- `promesas_servicio`
- `facturas_proveedor`
- `factura_guias`

## Linea De Diseno

La aplicacion debe conservar una identidad operativa, clara y consistente:

- Interfaz tipo herramienta de trabajo, no landing comercial.
- Priorizar lectura rapida, acciones claras y baja friccion operativa.
- Mantener la paleta principal basada en morados de `Constants.js`.
- Usar estados con colores semanticos: verde para entregado/exito, rojo para error/novedad, amarillo para advertencia, azul/cian para informacion o paqueteria.
- Evitar cambios visuales aislados que rompan coherencia entre modulos.
- Los botones deben mantener variantes existentes: primary, secondary, success, danger, etc.
- Los formularios deben usar `Field` y los modales deben usar `Modal` cuando sea posible.
- Los textos visibles deben ser cortos y orientados a la operacion.

## Reglas Para Cambios Futuros

- Trabajar en cambios pequenos y verificables.
- Antes de tocar produccion, probar en staging.
- No modificar datos reales sin respaldo y autorizacion.
- Documentar en este README cada cambio relevante.
- Si una decision afecta operacion logistica, validarla con el coordinador de logistica.
- Si una decision afecta seguridad, validarla desde Supabase y no solo desde frontend.
- No agregar nuevas librerias salvo que resuelvan un problema claro.

## Plan Minimo Seguro Para Produccion

### 1. Entorno De Prueba

Objetivo: tener una version donde se pueda romper, probar y ajustar sin afectar operacion real.

Decision recomendada:

- Crear un proyecto Supabase separado para staging.
- Nombre definido: `somos-pro-tracking-prueba`.
- Usar datos ficticios mientras se estabilizan Auth, RLS y reglas de negocio.
- Configurar Vercel con variables de entorno diferentes para staging y produccion.

Pendiente por definir:

- Rama o preview de Vercel que apuntara a staging.

Checklist de configuracion:

- [x] Crear proyecto Supabase `somos-pro-tracking-prueba`.
- [ ] Confirmar region del proyecto Supabase antes de crearlo.
- [x] Crear las tablas necesarias con la misma estructura de produccion.
- [x] Cargar datos ficticios para todos los modulos principales.
- [x] Crear usuarios ficticios para los 5 roles: admin, operador, transportista, conductor y cliente interno.
- [x] Configurar variables de entorno locales en `.env`.
- [ ] Configurar variables de entorno de staging en Vercel.
- [x] Confirmar datos base de staging con `docs/staging_validation.sql`.
- [x] Confirmar que Vercel Preview apunta a staging, no a produccion.
- [x] Validar login en Vercel Preview con usuarios ficticios de staging.
- [ ] Confirmar que el preview de Vercel apunta a staging, no a produccion.
- [ ] Validar login y navegacion basica con cada rol.
- [ ] Validar que una entrega no pueda cerrarse sin foto.
- [ ] Validar que una entrega permita hasta 3 fotos.
- [ ] Validar visibilidad del cliente interno: conductor basico, estado, ciudad, guia y fechas.
- [ ] Registrar errores encontrados y corregirlos antes de tocar produccion.

### 2. Variables De Entorno

Mover configuracion de Supabase a variables de entorno:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Esto no reemplaza RLS, pero evita dejar configuracion fija en codigo y permite separar staging/produccion.

Archivos relacionados:

- `.env.example`: plantilla de variables necesarias.
- `.gitignore`: evita subir archivos `.env` reales al repositorio.
- `src/supabase.js`: lee la URL y anon key desde variables de entorno.

Nota: para la version actual de `@supabase/supabase-js`, usar la `anon public key` tipo JWT del proyecto Supabase. Si se usa una key nueva con prefijo `sb_publishable_` y la API responde `401 Unauthorized`, cambiarla por la anon key JWT o actualizar y validar la libreria Supabase.

### 3. Autenticacion Gradual

Objetivo: usar Supabase Auth manteniendo experiencia de login por usuario.

Idea base:

- Crear usuarios en Supabase Auth.
- Mantener `usuarios.user` como identificador operativo.
- Agregar relacion entre `usuarios` y `auth.users`, por ejemplo `auth_user_id`.
- Resolver internamente el usuario operativo a una identidad Auth.
- Mantener la tabla `usuarios` como perfil y fuente de rol de negocio.
- Dejar de guardar contrasenas en texto plano.

### 4. RLS Minimo

Objetivo: bloquear acceso directo no autorizado a tablas.

Orden sugerido:

1. Definir matriz de permisos por rol.
2. Crear politicas de lectura por rol.
3. Crear politicas de escritura por rol.
4. Probar cada modulo con cada rol.
5. Activar RLS progresivamente.

### 5. Backup Y Restauracion

Antes de produccion:

- Tomar respaldo inicial.
- Documentar responsable.
- Documentar ubicacion del respaldo.
- Probar al menos una restauracion o simulacion de restauracion.

### 6. Salida Controlada

- Habilitar solo usuarios definidos.
- Monitorear primeros dias de uso.
- Tener plan de reversa.
- Registrar incidencias y decisiones.

## Preguntas De Negocio Pendientes

Estas preguntas deben validarse con el coordinador de logistica:

- Que acciones exactas puede hacer cada rol sobre un pedido?
- Validado: un conductor no debe poder marcar entrega sin foto.
- Validado: la entrega requiere minimo 1 foto y permite maximo 3 fotos, como funciona actualmente.
- Que diferencia operativa hay entre `novedad`, `entregado con novedad` y `novedad_despacho`?
- Quien puede reasignar un conductor despues de que el pedido ya esta en transito?
- Una empresa transportista puede ver todos sus pedidos historicos o solo activos?
- Validado: el cliente interno puede ver datos basicos del conductor, estado, ciudad, guia y fechas.
- Pendiente: el cliente interno puede ver costos o datos completos del transportista?
- Que datos se consideran sensibles y no deben aparecer para cliente interno?
- Cual es el flujo correcto para devoluciones: solicitud, aprobacion, asignacion, recogida, cierre?
- Cual es el flujo correcto para PQRS y quien puede cerrarlas?
- Que promesa de servicio aplica cuando no existe ciudad configurada?
- Cuantos dias hacia atras debe cargar por defecto el modulo de pedidos en produccion?

## Checklist De Validacion Por Rol

### Administrador

- [ ] Puede ver dashboard.
- [ ] Puede crear, editar y eliminar usuarios.
- [ ] Puede gestionar pedidos.
- [ ] Puede gestionar conductores.
- [ ] Puede gestionar transportistas.
- [ ] Puede gestionar ciudades, paqueterias y promesas de servicio.
- [ ] Puede ver devoluciones, recogidas, PQRS y facturas.

### Operador

- [ ] Puede gestionar pedidos.
- [ ] Puede asignar conductor, empresa transportista o paqueteria.
- [ ] Puede cambiar estados operativos permitidos.
- [ ] Puede gestionar devoluciones y recogidas.
- [ ] Puede gestionar PQRS segun flujo definido.
- [ ] No puede modificar configuracion sensible si no corresponde.

### Transportista

- [ ] Puede ver su empresa.
- [ ] Puede ver sus conductores.
- [ ] Puede inscribir conductores asociados.
- [ ] No puede ver informacion de otras empresas transportistas.
- [ ] No puede modificar pedidos ajenos a su operacion.

### Conductor

- [ ] Puede ver solo pedidos asignados.
- [ ] Puede abrir detalle de sus pedidos.
- [ ] Puede cargar soporte fotografico.
- [ ] No puede marcar entrega sin al menos 1 foto.
- [ ] Puede cargar maximo 3 fotos por entrega.
- [ ] Puede registrar ubicacion GPS si el navegador lo permite.

### Cliente Interno

- [ ] Puede consultar pedidos.
- [ ] Puede ver estado, ciudad, guia y fechas.
- [ ] Puede ver datos basicos del conductor.
- [ ] No debe ver datos sensibles no aprobados.
- [ ] Puede consultar rastreo segun alcance definido.
- [ ] Puede crear o consultar PQRS si aplica.

## Datos Ficticios Minimos Para Staging

- [ ] 1 usuario administrador.
- [ ] 1 usuario operador.
- [ ] 1 empresa transportista.
- [ ] 1 conductor asociado a la empresa transportista.
- [ ] 1 cliente interno.
- [ ] 5 pedidos con estados diferentes: sin asignar, en transito, paqueteria, entregado y novedad.
- [ ] 1 devolucion de prueba.
- [ ] 1 recogida de prueba.
- [ ] 1 PQRS abierta.
- [ ] 1 ciudad principal por region operativa que se quiera validar.
- [ ] 2 paqueterias de prueba.
- [ ] Promesas de servicio para las ciudades usadas en los pedidos ficticios.

## Criterios Para Pasar A Produccion

- [ ] La app funciona conectada a staging mediante variables de entorno.
- [ ] No hay credenciales reales hardcodeadas en el codigo.
- [ ] Todos los roles fueron probados.
- [ ] La entrega con foto obligatoria fue validada.
- [ ] La visibilidad del cliente interno fue validada con logistica.
- [ ] Existe respaldo de produccion antes de aplicar cambios.
- [ ] Existe plan de reversa documentado.
- [ ] RLS y Auth se probaron en staging antes de activarse en produccion.
- [ ] El coordinador de logistica aprobo el flujo operativo minimo.

## Bitacora De Cambios

### 2026-05-26

- Se reviso el informe de tareas estimadas y el informe tecnico ejecutivo.
- Se acordo trabajar con enfoque de salida a produccion minima segura.
- Se definio que el trabajo se hara primero en entorno de prueba.
- Se decidio conservar login por usuario por ahora.
- Se decidio migrar gradualmente hacia Supabase Auth.
- Se creo este README como memoria viva tecnica, funcional y visual del proyecto.
- Se recomendo crear un proyecto Supabase separado para staging.
- Se definio `somos-pro-tracking-prueba` como nombre del proyecto Supabase de staging.
- Se definio usar datos ficticios en staging por ahora.
- Se definio que todos los roles deben validarse antes de produccion.
- Se definio que la entrega requiere minimo 1 foto y permite maximo 3 fotos.
- Se definio visibilidad basica para cliente interno: conductor, estado, ciudad, guia y fechas.
- Se movio la configuracion de Supabase a variables de entorno.
- Se agrego `.env.example` y `.gitignore`.
- Se agrego checklist de configuracion de staging, validacion por rol, datos ficticios y criterios para paso a produccion.
- Se configuro `.env` local apuntando al proyecto Supabase de prueba.
- Se agrego SQL de auditoria para exportar estructura real de tablas desde Supabase produccion.
- Se revisaron exports reales de columnas, constraints y RLS de Supabase produccion.
- Se agrego script de esquema para staging basado en estructura real.
- Se agrego script de datos ficticios minimos para staging.
- Se agrego dato ficticio para `transportadoras` aunque la app actual usa principalmente `transportistas`.
- Se agrego SQL de validacion para revisar conteos, roles y estados de pedidos en staging.
- Se valido staging: tablas base con datos, 5 roles creados, conductor vinculado y pedidos en 5 estados.
- Se corrigio carga inicial para no sembrar datos si Supabase responde error; ahora muestra el error real y evita bucle infinito.
- Se documento que staging debe usar anon public key compatible si aparece `401 Unauthorized`.
- Se valido login en Vercel Preview con usuarios ficticios del entorno de prueba.
- Se definio regla de creacion de usuarios por rol.
- Se agrego primer SQL de migracion gradual a Supabase Auth sin cambiar aun el login.
- Se agrego SQL para vincular perfiles de staging con usuarios de Supabase Auth.
- Se actualizo login para autenticar con Supabase Auth usando usuario visible y email tecnico interno.
- Se elimino el auto-sembrado desde el cliente cuando no hay usuarios visibles, para evitar bucles y errores 403 en staging/RLS.
- Se agrego SQL para validar vinculacion de perfiles con Supabase Auth.
- Se agrego politica RLS minima para que cada usuario autenticado lea su propio perfil.
- Se agrego politica temporal de lectura para staging mientras se define RLS final por rol.
- Se documento matriz RLS inicial: operador ve operacion, pero solo gestiona devoluciones y PQRS.
- Se agrego primer SQL de politicas RLS finales para admin y operador.
- Se agrego SQL de politicas RLS para que transportista vea su empresa y conductores propios.
- Se agrego SQL para que transportista pueda editar conductores propios.
- Se ajusto edicion de conductor para que transportista no cambie NIT proveedor ni empresa propietaria.
- Se cambio el modal de edicion de conductor: para transportista, NIT y empresa aparecen como informacion no editable.

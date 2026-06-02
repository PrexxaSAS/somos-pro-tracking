# Revision de tablas

Este documento deja la decision tecnica actual sobre las tablas principales. La idea no es migrar todavia, sino congelar una linea clara para que los siguientes cambios no aumenten duplicidad ni deuda.

## Decision general

- `usuarios` se mantiene como perfil de negocio y control de rol.
- Supabase Auth se mantiene como fuente real de autenticacion.
- `conductores` se mantiene como entidad operativa de conductor.
- `transportistas` se mantiene como entidad operativa de empresa transportista.
- `transportadoras` fue retirada en staging: no usarla para nuevas pantallas, reglas ni datos.
- No se crean tablas `clientes` ni `operadores` por ahora.
- Las columnas de soporte base64 se mantienen temporalmente hasta migrar a Supabase Storage.

## Mapa actual

| Tabla | Estado | Uso recomendado |
| --- | --- | --- |
| `usuarios` | Viva | Perfil, rol, login operativo y vinculo con Auth mediante `auth_user_id`. |
| `conductores` | Viva | Datos operativos del conductor, asignaciones e historico. |
| `transportistas` | Viva | Empresas transportistas, conductores por NIT y facturas proveedor. |
| `transportadoras` | Retirada en staging | Duplicada o legado. No usar en desarrollo nuevo. |
| `pedidos` | Viva | Operacion principal de pedidos y estados. |
| `devoluciones` | Viva | Solicitudes y gestion de devoluciones. |
| `recogidas` | Viva | Solicitudes y gestion de recogidas. |
| `pqrs` | Viva | PQRS y respuestas de gestion. |
| `facturas_proveedor` | Viva | Facturas emitidas por transportistas/proveedores. |
| `factura_guias` | Viva | Tabla puente entre facturas proveedor y pedidos/guias. |
| `ciudades` | Viva | Catalogo DANE/ciudades. |
| `paqueterias` | Viva | Catalogo de empresas de paqueteria. |
| `promesas_servicio` | Viva | Dias de promesa por ciudad. |
| `audit_events` | Viva | Auditoria tecnica centralizada. |

## Transportistas vs transportadoras

`transportistas` es la tabla que usa la app:

- modulo de empresas transportistas;
- selectores de facturas proveedor;
- creacion/edicion desde Edge Function;
- relacion con `facturas_proveedor.transportista_id`;
- filtros por NIT para empresa transportista.

`transportadoras` aparecia en scripts SQL y politicas, pero no aparece como fuente funcional en el frontend. En staging ya fue retirada. Para produccion se recomienda:

- confirmar antes de produccion si tiene datos reales o integraciones externas;
- si no tiene uso real, preparar migracion posterior para retirarla o fusionarla en `transportistas`.

## Usuarios, clientes y operadores

No se recomienda crear tablas `clientes` ni `operadores` en esta fase.

Motivo:

- hoy no tienen campos operativos propios suficientes;
- su acceso se controla por `usuarios.rol`;
- crear tablas ahora aumentaria migraciones y RLS sin resolver un problema concreto.

Cuando podria cambiar:

- si clientes necesitan NIT, sedes, centros de costo o visibilidad por empresa;
- si operadores necesitan area, permisos granulares, supervisor o turnos;
- si se requiere auditoria o reportes por equipo operativo.

## Conductores y usuarios

Relacion actual:

- `usuarios.id` representa el perfil de acceso.
- `usuarios.auth_user_id` vincula con Supabase Auth.
- `conductores.usuario_id` apunta al perfil que puede iniciar sesion como conductor.
- `usuarios.conductor_id` apunta al registro operativo del conductor.

Esto es redundante, pero por ahora se conserva porque ya soporta:

- login seguro por Auth;
- busqueda rapida del conductor autenticado;
- baja logica del conductor sin borrar historicos;
- conservacion de pedidos, devoluciones y recogidas ya asignadas.

Regla recomendada:

- `conductores` es la fuente canonica para datos operativos: placa, cedula, celular, empresa y NIT proveedor.
- `usuarios` conserva datos minimos para perfil, rol y acceso.

## Columna `usuarios.pass`

`usuarios.pass` queda obsoleta.

Estado actual:

- usuarios nuevos creados por Edge Function guardan `pass = '__auth_managed__'`;
- la contrasena real vive en Supabase Auth;
- auditoria ya excluye `pass` para no registrar secretos.

Regla:

- no usar `usuarios.pass` para autenticar;
- no insertar contrasenas reales nuevas en `usuarios.pass`;
- conservar la columna temporalmente por compatibilidad;
- eliminarla o hacerla nullable solo cuando todos los flujos legacy de creacion/edicion se hayan movido a Edge Function y se valide que no hay consultas activas.

## Columnas duplicadas utiles

Algunas columnas parecen duplicadas, pero cumplen funcion historica:

- `pedidos.placa` y `pedidos.nit_proveedor` guardan snapshot de asignacion.
- `devoluciones.placa` y `devoluciones.nit_proveedor` guardan snapshot de gestion.
- `recogidas.placa` y `recogidas.nit_proveedor` guardan snapshot de gestion.

Se mantienen porque si un conductor se inactiva o cambia de placa/empresa, el historico no debe perder contexto.

## Propiedad de solicitudes

`devoluciones`, `recogidas` y `pqrs` usan `solicitado_por` como texto.

Esto funciona para la fase actual, pero es debil porque depende de nombre/usuario. Recomendacion futura:

- agregar `solicitado_por_usuario_id uuid references usuarios(id)`;
- seguir mostrando `solicitado_por` como texto historico;
- migrar RLS de cliente a `solicitado_por_usuario_id` cuando exista.

## Soportes y documentos

Campos actuales:

- `pedidos.soportes_data` guarda fotos en JSON/base64.
- `devoluciones.soporte_data` guarda soporte en base64.
- `recogidas.doc_data` guarda documento en base64.

Se mantienen temporalmente para no romper operacion. Recomendacion futura:

- crear buckets en Supabase Storage;
- guardar rutas/metadata en base de datos;
- dejar base64 solo como historico mientras se migra.

## Facturas proveedor y factura_guias

`facturas_proveedor` representa la factura del proveedor/transportista.

`factura_guias` es una tabla puente que conecta una factura con uno o varios pedidos/guias. Se mantiene porque:

- una factura puede contener varias guias;
- una guia puede auditarse dentro de una factura;
- permite borrar factura y limpiar asociaciones con `ON DELETE CASCADE`.

## Riesgos detectados

- Corregido: los flujos de creacion de conductores y empresas transportistas con acceso pasan por `create-system-user`.
- Queda una sincronizacion directa no sensible hacia `usuarios` al editar conductor: nombre, placa y celular.
- `transportadoras` queda pendiente de verificacion en produccion antes de retirarla alli.
- `usuarios` y `conductores` tienen datos de conductor duplicados.
- `solicitado_por` en texto puede fallar si cambia el nombre del usuario.
- Los soportes base64 aumentan peso de consultas y base de datos.

## Orden recomendado

1. Confirmar si `transportadoras` existe o tiene datos reales en produccion antes de retirarla alli.
2. Validar si la sincronizacion directa de perfil conductor en `usuarios` se mantiene o se mueve a una funcion segura.
3. Mantener `clientes` y `operadores` solo en `usuarios`.
4. Planear `solicitado_por_usuario_id` para solicitudes.
5. Planear Storage para soportes.
6. Cuando Auth este completamente estable, retirar `usuarios.pass`.

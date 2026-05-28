# Matriz RLS Por Rol

Esta matriz define el objetivo de permisos para Supabase RLS. Primero se valida en staging y solo despues se replica en produccion.

## Decisiones Validadas

### Admin

- Puede ver todo.
- Puede crear usuarios de cualquier rol.
- Puede modificar usuarios, pedidos, conductores, transportistas, devoluciones, recogidas, PQRS y configuracion.

### Operador

- Puede ver pedidos, conductores, transportistas, devoluciones, recogidas y PQRS.
- Puede registrar pedidos nuevos.
- Puede editar datos basicos de pedidos: direccion, ciudad destino, cajas, factura y fecha estimada.
- Puede marcar entrega con soporte fotografico y novedad si aplica.
- No puede modificar conductores.
- No puede reasignar conductor, cambiar tipo de transporte ni eliminar pedidos existentes.
- No puede modificar recogidas.
- Si puede gestionar devoluciones.
- Si puede gestionar PQRS.
- No puede crear usuarios.
- No debe modificar configuracion sensible.

### Empresa Transportista

- Puede ver su empresa.
- Puede ver sus conductores.
- Puede crear solo conductores asociados a su propia empresa.
- Puede editar datos basicos de sus conductores asociados.
- No puede cambiar el NIT proveedor ni la empresa propietaria del conductor.
- Puede ver usuarios de tipo conductor asociados a su NIT.
- No puede crear usuarios de otros roles.
- No debe ver informacion de otras empresas transportistas.

### Conductor

- Puede ver su propio perfil.
- Puede ver solo pedidos asignados.
- Puede registrar entrega con soporte fotografico obligatorio.
- No puede ver ni modificar pedidos de otros conductores.
- Puede leer catalogos necesarios para su pantalla, como ciudades.

### Cliente Interno

- Puede consultar absolutamente todos los pedidos desde Estado Pedidos.
- Sobre pedidos tiene acceso solo lectura: no puede crear, editar, marcar entrega ni eliminar.
- Puede ver estado, ciudad, guia, fechas y datos basicos del conductor.
- Puede crear, ver y modificar sus propias devoluciones.
- Puede crear, ver y modificar sus propias recogidas.
- Puede crear, ver y modificar sus propias PQRS.
- No puede ver Facturas Proveedor ni sus guias asociadas.
- Facturas Proveedor queda limitado a admin y operador.
- No debe ver datos sensibles no aprobados.

## Pendiente De Detalle

### Devoluciones

Operador puede gestionar:

- conductor_id
- placa
- nit_proveedor
- estado
- novedad
- fecha_real

El usuario decide asignar conductor y marcar novedad. La app completa placa, NIT proveedor, estado y fecha real cuando corresponde.

### PQRS

Operador puede gestionar:

- estado
- gestionado_por
- respuesta
- fecha_gestion

El usuario escribe la respuesta. La app completa gestionado por, fecha de gestion y estado.

## Enfoque Tecnico

- Usar `auth.uid()` para identificar el usuario autenticado.
- Usar `public.usuarios.auth_user_id` como vinculo entre Auth y perfil de negocio.
- Usar funciones auxiliares como `public.current_user_role()` para simplificar politicas.
- Mantener politicas temporales de staging solo mientras se prueba.
- Reemplazar politicas temporales por politicas finales tabla por tabla.

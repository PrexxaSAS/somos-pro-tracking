# Plan de pruebas de errores y mensajes

Ejecutar en staging/preview. El objetivo es confirmar que el usuario recibe mensajes claros, no errores tecnicos crudos de Supabase.

## Login y sesion

- [ ] Intentar login con usuario inexistente.
  - Esperado: mensaje de credenciales incorrectas.
- [ ] Intentar login con contrasena incorrecta.
  - Esperado: mensaje de credenciales incorrectas.
- [ ] Probar recarga con sesion activa.
  - Esperado: la sesion se restaura.
- [ ] Probar perfil Auth sin `public.usuarios` vinculado.
  - Esperado: mensaje de sesion/perfil no asignado.

## Permisos RLS

- [ ] Cliente intenta acceder a Facturas Proveedor.
  - Esperado: no ve el modulo; si fuerza accion, mensaje de permisos.
- [ ] Conductor intenta editar pedido entregado.
  - Esperado: mensaje de pedido cerrado.
- [ ] Operador intenta editar pedido en transito fuera de lo permitido.
  - Esperado: mensaje de pedido en transito o permisos.
- [ ] Transportista intenta editar conductor de otra empresa.
  - Esperado: mensaje de permisos.

## Usuarios y Edge Function

- [ ] Crear usuario duplicado.
  - Esperado: "Ya existe un registro con esos datos" o "Ese usuario ya existe".
- [ ] Crear conductor sin cedula/placa/NIT.
  - Esperado: mensaje de campos obligatorios.
- [ ] Editar usuario sin perfil Auth vinculado y sin contrasena.
  - Esperado: mensaje indicando que debe ingresar contrasena para crear acceso.
- [ ] Eliminar admin principal.
  - Esperado: mensaje de bloqueo.
- [ ] Eliminar conductor con pedido en transito.
  - Esperado: mensaje de bloqueo por pedidos en transito.

## Pedidos

- [ ] Crear pedido con ID duplicado.
  - Esperado: mensaje de registro duplicado.
- [ ] Editar pedido entregado.
  - Esperado: no permite modificar pedido entregado.
- [ ] Asignar conductor a pedido sin permisos.
  - Esperado: mensaje de permisos.
- [ ] Subir soporte con conexion fallida o archivo pesado.
  - Esperado: mensaje de conexion o imagen pesada.

## Devoluciones y recogidas

- [ ] Crear devolucion con campos obligatorios vacios.
  - Esperado: mensaje de campos obligatorios.
- [ ] Crear recogida con campos obligatorios vacios.
  - Esperado: mensaje de campos obligatorios.
- [ ] Cliente intenta editar devolucion ya asignada.
  - Esperado: no aparece boton o mensaje de permisos.
- [ ] Cliente intenta editar recogida ya asignada.
  - Esperado: no aparece boton o mensaje de permisos.

## PQRS

- [ ] Crear PQRS con campos vacios.
  - Esperado: mensaje de campos obligatorios.
- [ ] Responder PQRS sin texto.
  - Esperado: mensaje para escribir respuesta.
- [ ] Intentar editar respuesta PQRS ya registrada.
  - Esperado: mensaje indicando que no se puede editar.

## Facturas proveedor

- [ ] Crear factura sin campos obligatorios.
  - Esperado: mensaje de campos obligatorios.
- [ ] Crear factura con valor cero o invalido.
  - Esperado: mensaje de valor mayor a 0.
- [ ] Relacionar guia duplicada o invalida.
  - Esperado: mensaje de registro duplicado o relacion invalida.
- [ ] Eliminar factura con guias asociadas.
  - Esperado: eliminacion correcta por cascada/app; si falla, mensaje claro.


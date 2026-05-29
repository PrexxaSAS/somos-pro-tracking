# Edge Functions

## create-system-user

Funcion segura para crear usuarios del sistema sin exponer `service_role` en el frontend.

Ruta:

```txt
supabase/functions/create-system-user/index.ts
```

## Funcion Actual

Soporta creacion de usuarios autenticables:

- Valida la sesion del usuario que llama.
- Admin puede crear usuarios de cualquier rol mediante `type: "system_user"`.
- Admin puede editar usuarios mediante `type: "update_system_user"`, incluyendo usuario/login y contrasena de Supabase Auth.
- Transportista puede crear solo conductores de su propia empresa.
- Crea usuario en Supabase Auth.
- Crea perfil en `public.usuarios`.
- Si el rol es `conductor`, crea registro en `public.conductores` y vincula `usuarios.conductor_id`.
- Si el rol es `transportista`, crea o actualiza el registro base en `public.transportistas`.
- Admin puede eliminar accesos mediante `type: "delete_system_user"`.
- Al eliminar un acceso, se borra `public.usuarios` y el usuario Auth; si tenia conductor o transportista asociado, se conserva la entidad operativa y se limpia `usuario_id`.

## Variables Requeridas

La funcion usa variables disponibles en Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

La `SUPABASE_SERVICE_ROLE_KEY` no debe estar en frontend ni en Vercel.

## Despliegue En Staging

Desde una terminal con Supabase CLI autenticado:

```bash
supabase functions deploy create-system-user --project-ref dnahgbevwnbdhiqjlqyu
```

Tambien se puede crear desde el Dashboard de Supabase pegando el contenido de `index.ts`.

## Validacion

Despues de desplegar:

1. Entrar al Preview como admin.
2. Crear un usuario nuevo desde Usuarios del Sistema.
3. Confirmar en Authentication > Users que existe `usuario@somospro.local`.
4. Confirmar en `public.usuarios` que tiene `auth_user_id`.
5. Si es conductor, confirmar en `public.conductores` que existe el conductor.
6. Probar login como ese usuario.
7. Repetir con transportista para inscribir un conductor propio.
8. Desde admin, eliminar un usuario de prueba y confirmar que desaparece de Usuarios del Sistema y de Authentication > Users.

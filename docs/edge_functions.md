# Edge Functions

## create-system-user

Funcion segura para crear usuarios del sistema sin exponer `service_role` en el frontend.

Ruta:

```txt
supabase/functions/create-system-user/index.ts
```

## Funcion Actual

Soporta creacion de conductores:

- Valida la sesion del usuario que llama.
- Admin puede crear usuarios.
- Transportista puede crear solo conductores de su propia empresa.
- Crea usuario en Supabase Auth.
- Crea perfil en `public.usuarios`.
- Crea registro en `public.conductores`.
- Vincula `usuarios.conductor_id`.

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

1. Entrar al Preview como transportista.
2. Inscribir un conductor nuevo.
3. Confirmar en Authentication > Users que existe `usuario@somospro.local`.
4. Confirmar en `public.usuarios` que tiene `auth_user_id`.
5. Confirmar en `public.conductores` que existe el conductor.
6. Probar login como ese conductor.

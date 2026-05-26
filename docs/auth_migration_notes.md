# Migracion Gradual A Supabase Auth

## Objetivo

Reemplazar el login actual basado en `usuarios.user` + `usuarios.pass` en texto plano por Supabase Auth, conservando por ahora la experiencia de login por usuario.

## Regla De Negocio Validada

- Admin puede crear usuarios de cualquier rol.
- Empresa transportista solo puede crear conductores asociados a su propia empresa.
- Operador, conductor y cliente interno no pueden crear usuarios.

## Modelo De Transicion

El usuario seguira escribiendo:

```txt
admin / contrasena
```

La aplicacion usara internamente un email tecnico para Supabase Auth:

```txt
admin@somospro.local
```

La tabla `usuarios` seguira siendo el perfil de negocio:

- nombre
- user
- rol
- nit
- empresa
- conductor_id
- auth_user_id

## Paso 1

Ejecutar `docs/auth_migration_step1.sql` en Supabase staging.

Ese script:

- Agrega `usuarios.auth_user_id`.
- Crea indice unico para evitar que dos perfiles apunten al mismo usuario Auth.
- Lista usuarios pendientes de vincular con Auth.

No elimina `pass` todavia.

## Paso 2 Pendiente

Crear usuarios en Supabase Auth para los usuarios ficticios de staging:

- `admin@somospro.local`
- `operador@somospro.local`
- `transprueba@somospro.local`
- `driver1@somospro.local`
- `cliente@somospro.local`

Luego vincular cada `auth.users.id` con `public.usuarios.auth_user_id`.

### Como crear usuarios Auth en staging

En Supabase `somos-pro-tracking-prueba`:

1. Ir a Authentication > Users.
2. Crear cada usuario con email tecnico.
3. Marcar email como confirmado si Supabase lo solicita.
4. Usar las contrasenas ficticias de staging.

Usuarios:

| user visible | email Auth | contrasena |
| --- | --- | --- |
| admin | admin@somospro.local | admin123 |
| operador | operador@somospro.local | op123 |
| transprueba | transprueba@somospro.local | trans123 |
| driver1 | driver1@somospro.local | cond123 |
| cliente | cliente@somospro.local | cli123 |

Despues ejecutar `docs/auth_migration_step2_link.sql`.

## Paso 3

Actualizar la app para que el formulario siga pidiendo `Usuario`, pero autentique con Supabase Auth usando email tecnico:

```txt
usuario@somospro.local
```

La app debe buscar el perfil en `public.usuarios` por `auth_user_id` despues de autenticarse y usar ese perfil para rol, nombre, empresa y conductor.

El cliente no debe sembrar datos automaticamente si no ve usuarios. Si no hay usuarios visibles, debe mostrar error para evitar bucles e inserciones desde navegador.

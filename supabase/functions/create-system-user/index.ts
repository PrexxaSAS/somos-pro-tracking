import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown) => String(value ?? "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Faltan variables de entorno de Supabase en la funcion." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sesion requerida." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  if (sessionError || !sessionData.user) return json({ error: "Sesion invalida." }, 401);

  const { data: caller, error: callerError } = await adminClient
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", sessionData.user.id)
    .single();

  if (callerError || !caller) return json({ error: "Perfil del solicitante no encontrado." }, 403);

  const getLinkedConductorId = async (profile: Record<string, unknown>) => {
    const conductorId = clean(profile.conductor_id);
    if (conductorId) return conductorId;

    const { data } = await adminClient
      .from("conductores")
      .select("id")
      .eq("usuario_id", clean(profile.id))
      .maybeSingle();

    return clean(data?.id);
  };

  const validateConductorWithoutTransit = async (conductorId: string) => {
    const { count, error } = await adminClient
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("conductor_id", conductorId)
      .eq("estado", "en_transito");

    if (error) return error.message;
    if ((count ?? 0) > 0) {
      return "No se puede eliminar o desactivar el conductor porque tiene pedidos en transito asignados.";
    }
    return "";
  };

  const payload = await req.json().catch(() => null);
  if (!payload || !["conductor", "system_user", "update_system_user", "delete_system_user"].includes(payload.type)) {
    return json({ error: "Tipo de usuario no soportado." }, 400);
  }

  if (payload.type === "delete_system_user") {
    if (caller.rol !== "admin") return json({ error: "Solo admin puede eliminar usuarios." }, 403);

    const userId = clean(payload.user_id);
    if (!userId) return json({ error: "ID de usuario requerido." }, 400);

    const { data: target, error: targetError } = await adminClient
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();

    if (targetError || !target) return json({ error: "Usuario no encontrado." }, 404);
    if (target.user === "admin") return json({ error: "No se puede eliminar el admin principal." }, 400);
    if (target.auth_user_id === sessionData.user.id) return json({ error: "No puedes eliminar tu propio usuario en sesion." }, 400);

    const targetConductorId = await getLinkedConductorId(target);
    if (targetConductorId) {
      const transitError = await validateConductorWithoutTransit(targetConductorId);
      if (transitError) return json({ error: transitError }, 400);
    }

    const { error: conductoresError } = await adminClient
      .from("conductores")
      .update({ usuario_id: null, activo: false })
      .eq("usuario_id", target.id);
    if (conductoresError) return json({ error: conductoresError.message }, 400);

    const { error: transportistasError } = await adminClient
      .from("transportistas")
      .update({ usuario_id: null })
      .eq("usuario_id", target.id);
    if (transportistasError) return json({ error: transportistasError.message }, 400);

    const { error: usuarioError } = await adminClient
      .from("usuarios")
      .delete()
      .eq("id", target.id);
    if (usuarioError) return json({ error: usuarioError.message }, 400);

    if (target.auth_user_id) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.auth_user_id);
      if (authDeleteError) return json({ error: authDeleteError.message }, 400);
    }

    return json({ deleted: true });
  }

  if (payload.type === "update_system_user") {
    if (caller.rol !== "admin") return json({ error: "Solo admin puede editar usuarios." }, 403);

    const userId = clean(payload.user_id);
    const nombre = clean(payload.nombre);
    const rol = clean(payload.rol).toLowerCase();
    const cedula = clean(payload.cedula);
    const placa = clean(payload.placa);
    const celular = clean(payload.celular);
    const username = clean(payload.user_login).toLowerCase();
    const password = clean(payload.pass_login);
    const nitProveedor = clean(payload.nit_proveedor);
    const empresa = clean(payload.empresa);
    const nit = clean(payload.nit || nitProveedor);

    const rolesPermitidos = ["admin", "operador", "transportista", "conductor", "cliente"];
    if (!userId) return json({ error: "ID de usuario requerido." }, 400);
    if (!rolesPermitidos.includes(rol)) return json({ error: "Rol no soportado." }, 400);
    if (!nombre || !username) return json({ error: "Nombre y usuario son obligatorios." }, 400);
    if (rol === "conductor" && (!cedula || !placa || !nitProveedor)) {
      return json({ error: "Cedula, placa y NIT proveedor son obligatorios para conductor." }, 400);
    }
    if (rol === "transportista" && !nit) {
      return json({ error: "NIT es obligatorio para transportista." }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();

    if (targetError || !target) return json({ error: "Usuario no encontrado." }, 404);
    if (target.user === "admin" && rol !== "admin") {
      return json({ error: "No se puede cambiar el rol del admin principal." }, 400);
    }

    const targetConductorId = await getLinkedConductorId(target);
    if (targetConductorId && rol !== "conductor") {
      const transitError = await validateConductorWithoutTransit(targetConductorId);
      if (transitError) return json({ error: transitError }, 400);
    }

    const { data: duplicate, error: duplicateError } = await adminClient
      .from("usuarios")
      .select("id")
      .eq("user", username)
      .neq("id", userId)
      .maybeSingle();

    if (duplicateError) return json({ error: duplicateError.message }, 400);
    if (duplicate) return json({ error: "Ese usuario ya existe." }, 400);

    const email = `${username}@somospro.local`;
    let authUserId = target.auth_user_id as string | null;
    let createdAuthUserId: string | null = null;

    if (authUserId) {
      const authUpdate = {
        email,
        email_confirm: true,
        user_metadata: { user: username, rol, nombre },
        ...(password ? { password } : {}),
      };

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(authUserId, authUpdate);
      if (authUpdateError) return json({ error: authUpdateError.message }, 400);
    } else {
      if (!password) {
        return json({ error: "Este perfil no tiene Auth vinculado. Ingresa una contrasena para crear el acceso." }, 400);
      }

      const { data: authData, error: authCreateError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { user: username, rol, nombre },
      });

      if (authCreateError || !authData.user) {
        return json({ error: authCreateError?.message || "No se pudo crear el usuario Auth." }, 400);
      }

      authUserId = authData.user.id;
      createdAuthUserId = authData.user.id;
    }

    try {
      let conductorId: string | null = rol === "conductor" ? target.conductor_id : null;

      if (rol === "conductor") {
        const conductorPayload = {
          nombre,
          cedula,
          placa,
          celular,
          nit_proveedor: nitProveedor,
          empresa,
          usuario_id: target.id,
          activo: true,
        };

        const { data: conductorExistente } = await adminClient
          .from("conductores")
          .select("id")
          .eq("usuario_id", target.id)
          .maybeSingle();

        if (conductorExistente?.id) {
          conductorId = conductorExistente.id;
          const { error: conductorUpdateError } = await adminClient
            .from("conductores")
            .update(conductorPayload)
            .eq("id", conductorId);
          if (conductorUpdateError) throw conductorUpdateError;
        } else {
          const { data: conductorNuevo, error: conductorInsertError } = await adminClient
            .from("conductores")
            .insert(conductorPayload)
            .select()
            .single();
          if (conductorInsertError || !conductorNuevo) throw conductorInsertError || new Error("No se pudo crear conductor.");
          conductorId = conductorNuevo.id;
        }
      } else {
        const { error: conductorDetachError } = await adminClient
          .from("conductores")
          .update({ usuario_id: null, activo: false })
          .eq("usuario_id", target.id);
        if (conductorDetachError) throw conductorDetachError;
      }

      if (rol === "transportista") {
        const { error: transportistaError } = await adminClient
          .from("transportistas")
          .upsert({
            nombre: empresa || nombre,
            nit,
            usuario_id: target.id,
          }, { onConflict: "nit" });
        if (transportistaError) throw transportistaError;
      } else {
        const { error: transportistaDetachError } = await adminClient
          .from("transportistas")
          .update({ usuario_id: null })
          .eq("usuario_id", target.id);
        if (transportistaDetachError) throw transportistaDetachError;
      }

      const { data: usuario, error: usuarioError } = await adminClient
        .from("usuarios")
        .update({
          nombre,
          user: username,
          pass: "__auth_managed__",
          rol,
          nit: rol === "transportista" ? nit : null,
          cedula,
          placa,
          celular,
          nit_proveedor: rol === "conductor" ? nitProveedor : null,
          empresa,
          conductor_id: rol === "conductor" ? conductorId : null,
          auth_user_id: authUserId,
        })
        .eq("id", target.id)
        .select()
        .single();

      if (usuarioError || !usuario) throw usuarioError || new Error("No se pudo actualizar perfil.");

      return json({ usuario });
    } catch (error) {
      if (createdAuthUserId) await adminClient.auth.admin.deleteUser(createdAuthUserId);
      return json({ error: error instanceof Error ? error.message : "No se pudo actualizar el usuario." }, 400);
    }
  }

  const nombre = clean(payload.nombre);
  const rol = clean(payload.rol || "conductor").toLowerCase();
  const cedula = clean(payload.cedula);
  const placa = clean(payload.placa);
  const celular = clean(payload.celular);
  const username = clean(payload.user_login).toLowerCase();
  const password = clean(payload.pass_login);
  const nitProveedor = clean(payload.nit_proveedor);
  const empresa = clean(payload.empresa);

  const rolesPermitidos = ["admin", "operador", "transportista", "conductor", "cliente"];
  if (!rolesPermitidos.includes(rol)) {
    return json({ error: "Rol no soportado." }, 400);
  }

  if (!nombre || !username || !password) {
    return json({ error: "Nombre, usuario y contrasena son obligatorios." }, 400);
  }
  if (rol === "conductor" && (!cedula || !placa)) {
    return json({ error: "Cedula y placa son obligatorias para conductor." }, 400);
  }
  if (rol === "transportista" && (!nitProveedor && !clean(payload.nit))) {
    return json({ error: "NIT es obligatorio para transportista." }, 400);
  }

  const callerIsAdmin = caller.rol === "admin";
  const callerIsTransportista = caller.rol === "transportista";
  if (!callerIsAdmin && !callerIsTransportista) {
    return json({ error: "No tienes permiso para crear usuarios." }, 403);
  }
  if (callerIsTransportista && (rol !== "conductor" || nitProveedor !== caller.nit)) {
    return json({ error: "Solo puedes crear conductores asociados a tu empresa." }, 403);
  }
  if (!callerIsAdmin && payload.type === "system_user") {
    return json({ error: "Solo admin puede crear usuarios de sistema." }, 403);
  }

  const email = `${username}@somospro.local`;
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user: username, rol, nombre },
  });

  if (authError || !authData.user) {
    return json({ error: authError?.message || "No se pudo crear el usuario Auth." }, 400);
  }

  let usuarioId: string | null = null;
  try {
    const { data: usuario, error: usuarioError } = await adminClient
      .from("usuarios")
      .insert({
        nombre,
        user: username,
        pass: "__auth_managed__",
        rol,
        nit: rol === "transportista" ? clean(payload.nit || nitProveedor) : null,
        cedula,
        placa,
        celular,
        nit_proveedor: rol === "conductor" ? nitProveedor : null,
        empresa,
        auth_user_id: authData.user.id,
      })
      .select()
      .single();

    if (usuarioError || !usuario) throw usuarioError || new Error("No se pudo crear perfil.");
    usuarioId = usuario.id;

    if (rol === "conductor") {
      const { data: conductor, error: conductorError } = await adminClient
        .from("conductores")
        .insert({
          nombre,
          cedula,
          placa,
          celular,
          nit_proveedor: nitProveedor,
          empresa,
          usuario_id: usuario.id,
          activo: true,
        })
        .select()
        .single();

      if (conductorError || !conductor) throw conductorError || new Error("No se pudo crear conductor.");

      await adminClient.from("usuarios").update({ conductor_id: conductor.id }).eq("id", usuario.id);

      return json({ usuario: { ...usuario, conductor_id: conductor.id }, conductor }, 201);
    }

    if (rol === "transportista") {
      const nitTransportista = clean(payload.nit || nitProveedor);
      const { error: transportistaError } = await adminClient
        .from("transportistas")
        .upsert({
          nombre: empresa || nombre,
          nit: nitTransportista,
          usuario_id: usuario.id,
        }, { onConflict: "nit" });

      if (transportistaError) throw transportistaError;
    }

    return json({ usuario }, 201);
  } catch (error) {
    if (usuarioId) await adminClient.from("usuarios").delete().eq("id", usuarioId);
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return json({ error: error instanceof Error ? error.message : "No se pudo crear el conductor." }, 400);
  }
});

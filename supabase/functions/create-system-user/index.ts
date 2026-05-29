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

  const payload = await req.json().catch(() => null);
  if (!payload || !["conductor", "system_user"].includes(payload.type)) {
    return json({ error: "Tipo de usuario no soportado." }, 400);
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

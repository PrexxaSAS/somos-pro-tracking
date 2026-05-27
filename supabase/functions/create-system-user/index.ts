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
  if (!payload || payload.type !== "conductor") {
    return json({ error: "Tipo de usuario no soportado." }, 400);
  }

  const nombre = clean(payload.nombre);
  const cedula = clean(payload.cedula);
  const placa = clean(payload.placa);
  const celular = clean(payload.celular);
  const username = clean(payload.user_login).toLowerCase();
  const password = clean(payload.pass_login);
  const nitProveedor = clean(payload.nit_proveedor);
  const empresa = clean(payload.empresa);

  if (!nombre || !cedula || !placa || !username || !password) {
    return json({ error: "Nombre, cedula, placa, usuario y contrasena son obligatorios." }, 400);
  }

  const callerIsAdmin = caller.rol === "admin";
  const callerIsTransportista = caller.rol === "transportista";
  if (!callerIsAdmin && !callerIsTransportista) {
    return json({ error: "No tienes permiso para crear usuarios." }, 403);
  }
  if (callerIsTransportista && nitProveedor !== caller.nit) {
    return json({ error: "Solo puedes crear conductores asociados a tu empresa." }, 403);
  }

  const email = `${username}@somospro.local`;
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user: username, rol: "conductor", nombre },
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
        rol: "conductor",
        cedula,
        placa,
        celular,
        nit_proveedor: nitProveedor,
        empresa,
        auth_user_id: authData.user.id,
      })
      .select()
      .single();

    if (usuarioError || !usuario) throw usuarioError || new Error("No se pudo crear perfil.");
    usuarioId = usuario.id;

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
  } catch (error) {
    if (usuarioId) await adminClient.from("usuarios").delete().eq("id", usuarioId);
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return json({ error: error instanceof Error ? error.message : "No se pudo crear el conductor." }, 400);
  }
});

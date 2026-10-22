// Envia por SMTP el aviso de pedido rechazado al asesor del pedido.
//
// Antes salia desde el navegador con EmailJS, con las claves en el codigo y
// sin saber si de verdad se enviaba. Ahora sale de aqui, con el SMTP de la
// empresa, y la respuesta dice si se envio o por que no.
//
// La aplicacion solo manda el id del pedido. El destinatario y el contenido
// los busca esta funcion en la base: asi nadie puede usarla para mandar
// correos a cualquier direccion o con cualquier texto.
//
// Secretos que necesita (Edge Functions > Secrets en Supabase):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
//   SMTP_FROM_NAME, SMTP_FROM_EMAIL
// Supabase bloquea la salida por los puertos 25 y 587: usar 465 (SSL).
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

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
const esc = (value: unknown) =>
  clean(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
// "01" y "1" son el mismo asesor: el plano a veces trae el codigo con ceros.
const sinCeros = (codigo: string) => codigo.replace(/^0+/, "") || "0";

// Los roles que pueden rechazar pedidos en Gestion de pedidos.
const ROLES_PERMITIDOS = ["admin", "cartera", "operador"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Faltan variables de entorno de Supabase en la funcion." }, 500);
  }

  const smtp = {
    host: Deno.env.get("SMTP_HOST"),
    port: Number(Deno.env.get("SMTP_PORT") || 465),
    secure: (Deno.env.get("SMTP_SECURE") ?? "true") !== "false",
    user: Deno.env.get("SMTP_USER"),
    pass: Deno.env.get("SMTP_PASS"),
    fromName: Deno.env.get("SMTP_FROM_NAME") || "QTracking",
    fromEmail: Deno.env.get("SMTP_FROM_EMAIL") || Deno.env.get("SMTP_USER"),
  };
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.fromEmail) {
    return json({ error: "El correo no esta configurado: faltan los secretos SMTP de la funcion." }, 500);
  }

  // Solo alguien con sesion y con un rol que rechaza pedidos.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sesion requerida." }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: sessionData, error: sessionError } = await userClient.auth.getUser();
  if (sessionError || !sessionData.user) return json({ error: "Sesion invalida." }, 401);
  const { data: caller } = await adminClient
    .from("usuarios").select("rol").eq("auth_user_id", sessionData.user.id).maybeSingle();
  if (!caller || !ROLES_PERMITIDOS.includes(clean(caller.rol))) {
    return json({ error: "No tienes permiso para enviar este aviso." }, 403);
  }

  const payload = await req.json().catch(() => null);
  const pedidoId = clean(payload?.pedido_id);
  if (!pedidoId) return json({ error: "Falta el pedido." }, 400);

  const { data: pedido, error: pedidoError } = await adminClient
    .from("pedidos_cartera")
    .select("numero_pedido, cliente, nit, vendedor, motivo_rechazo, estado_cartera")
    .eq("id", pedidoId)
    .maybeSingle();
  if (pedidoError || !pedido) return json({ error: "Pedido no encontrado." }, 404);
  if (pedido.estado_cartera !== "rechazado") {
    return json({ error: "El pedido no esta rechazado: no se envia el aviso." }, 409);
  }

  // El asesor sale del codigo de vendedor del pedido.
  const codigo = clean(pedido.vendedor);
  if (!codigo) return json({ enviado: false, razon: "sin_vendedor" });
  const { data: asesores } = await adminClient.from("asesores").select("codigo, nombre, email");
  const asesor = (asesores || []).find((a) => {
    const c = clean(a.codigo);
    return c === codigo || sinCeros(c) === sinCeros(codigo);
  });
  const para = clean(asesor?.email);
  if (!para) return json({ enviado: false, razon: asesor ? "asesor_sin_correo" : "asesor_no_registrado" });

  const asunto = `Pedido ${clean(pedido.numero_pedido)} rechazado por cartera`;
  const filas = [
    ["Pedido", pedido.numero_pedido],
    ["Cliente", pedido.cliente],
    ["NIT", pedido.nit],
    ["Motivo del rechazo", pedido.motivo_rechazo || "(sin motivo)"],
  ];
  const html = `<!DOCTYPE html><html lang="es"><body style="margin:0;padding:24px;background:#f6f5fa;font-family:Arial,sans-serif;color:#17141f">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5ee;border-radius:12px;padding:24px">
    <div style="font-size:13px;color:#77738a">QTracking · Cartera</div>
    <h1 style="font-size:20px;margin:6px 0 16px">Pedido rechazado</h1>
    <p style="margin:0 0 16px;font-size:14px">Hola${asesor?.nombre ? ` ${esc(asesor.nombre)}` : ""}, cartera rechazó un pedido tuyo:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${filas.map(([k, v]) => `<tr><td style="padding:8px 0;color:#77738a;width:160px;vertical-align:top">${k}</td><td style="padding:8px 0;font-weight:bold">${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#77738a">Este es un aviso automático; no respondas a este correo.</p>
  </div></body></html>`;
  const texto = `Pedido rechazado por cartera\n\n${filas.map(([k, v]) => `${k}: ${clean(v)}`).join("\n")}\n\nEste es un aviso automatico.`;

  try {
    const transporte = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporte.sendMail({
      from: { name: smtp.fromName, address: smtp.fromEmail! },
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
  } catch (e) {
    console.error("SMTP:", e);
    // 200 a proposito: la aplicacion lee el motivo en el cuerpo y avisa.
    return json({ enviado: false, razon: "error_smtp", detalle: clean((e as Error)?.message) });
  }

  return json({ enviado: true, para });
});

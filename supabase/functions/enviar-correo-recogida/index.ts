// Avisa por correo a los operadores (usuarios con rol operador y correo
// registrado) cada vez que se crea una solicitud de recogida.
//
// La aplicacion solo manda el id de la recogida. Los destinatarios y el
// contenido los busca esta funcion en la base, y cada recogida avisa una sola
// vez (recogidas.aviso_operativo_at, docs/recogidas_correo_operativo.sql): asi
// nadie puede usarla para mandar correos repetidos o a otras direcciones.
//
// Usa los mismos secretos que enviar-correo-rechazo:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
//   SMTP_FROM_NAME, SMTP_FROM_EMAIL, y opcional APP_URL.
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
const numero = (v: unknown, unidad: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("es-CO")} ${unidad}` : "";
};

// Los roles que pueden crear recogidas.
const ROLES_PERMITIDOS = ["admin", "operador", "cliente"];

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
  const appUrl = clean(Deno.env.get("APP_URL") || "https://somos-pro-tracking.vercel.app").replace(/\/+$/, "");
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.fromEmail) {
    return json({ error: "El correo no esta configurado: faltan los secretos SMTP de la funcion." }, 500);
  }

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
  const recogidaId = clean(payload?.recogida_id);
  if (!recogidaId) return json({ error: "Falta la recogida." }, 400);

  const { data: operadores } = await adminClient
    .from("usuarios").select("email").eq("rol", "operador").not("email", "is", null);
  const para = [...new Set((operadores || []).map((o) => clean(o.email).toLowerCase()).filter(Boolean))];
  if (para.length === 0) return json({ enviado: false, razon: "sin_destinatarios" });

  // Se marca antes de enviar: si dos llamadas llegan juntas, solo una gana.
  const { data: rec, error: recError } = await adminClient
    .from("recogidas")
    .update({ aviso_operativo_at: new Date().toISOString() })
    .eq("id", recogidaId)
    .is("aviso_operativo_at", null)
    .select("id, guia, dir_recogida, ciudad_recogida_nombre, dir_entrega, ciudad_entrega_nombre, unidades, volumen_m3, peso_kg, observaciones, solicitado_por, fecha_creacion")
    .maybeSingle();
  if (recError) return json({ error: "No se pudo leer la recogida." }, 500);
  if (!rec) return json({ enviado: false, razon: "ya_enviado_o_no_existe" });

  const lugar = (dir: unknown, ciudad: unknown) => [clean(dir), clean(ciudad)].filter(Boolean).join(", ");
  const carga = [numero(rec.unidades, "und"), numero(rec.volumen_m3, "m³"), numero(rec.peso_kg, "kg")].filter(Boolean).join(" · ");
  const filas: [string, string][] = [
    ["Guía", clean(rec.guia)],
    ["Solicitada por", clean(rec.solicitado_por)],
    ["Recoger en", lugar(rec.dir_recogida, rec.ciudad_recogida_nombre)],
    ["Entregar en", lugar(rec.dir_entrega, rec.ciudad_entrega_nombre)],
    ["Carga", carga],
    ["Observaciones", clean(rec.observaciones)],
    ["Fecha", clean(rec.fecha_creacion)],
  ].filter(([, v]) => v) as [string, string][];

  const asunto = `Nueva solicitud de recogida ${clean(rec.guia)}${rec.ciudad_recogida_nombre ? ` · ${clean(rec.ciudad_recogida_nombre)}` : ""}`;
  const enlace = `${appUrl}/?vista=recogidas`;
  // Todo en tablas y con el relleno en las celdas, como el correo de rechazo:
  // Outlook ignora el padding de <a> y de <div>.
  const fuente = "font-family:Arial,Helvetica,sans-serif;";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5fa">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f5fa" style="background:#f6f5fa"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e7e5ee;border-radius:12px">
    <tr><td style="padding:26px 30px;${fuente}color:#17141f">
      <p style="margin:0;font-size:13px;color:#77738a;${fuente}">QTracking · Recogidas</p>
      <h1 style="margin:6px 0 14px;font-size:22px;line-height:1.3;color:#17141f;${fuente}">Nueva solicitud de recogida</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#17141f;${fuente}">Se registró una recogida en QTracking. Asígnale conductor o paquetería:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #efedf4">
        ${filas.map(([k, v]) => `<tr>
          <td valign="top" width="130" style="padding:10px 12px 10px 0;border-bottom:1px solid #efedf4;font-size:13px;color:#77738a;${fuente}">${k}</td>
          <td valign="top" style="padding:10px 0;border-bottom:1px solid #efedf4;font-size:14px;font-weight:bold;color:#17141f;${fuente}">${esc(v)}</td>
        </tr>`).join("")}
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-top:24px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td align="center" bgcolor="#6d42d8" style="background:#6d42d8;border-radius:10px;padding:13px 26px;${fuente}">
            <a href="${esc(enlace)}" target="_blank" style="${fuente}font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;display:inline-block">Abrir QTracking</a>
          </td>
        </tr></table>
      </td></tr></table>
      <p style="margin:24px 0 0;font-size:12px;color:#77738a;${fuente}">Este es un aviso automático; no respondas a este correo.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  const texto = `Nueva solicitud de recogida\n\n${filas.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nAbrir QTracking: ${enlace}\n\nEste es un aviso automático.`;

  try {
    const transporte = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporte.sendMail({
      from: { name: smtp.fromName, address: smtp.fromEmail! },
      to: para.join(", "),
      subject: asunto,
      text: texto,
      html,
    });
  } catch (e) {
    console.error("SMTP:", e);
    // Se libera la marca para que se pueda reintentar.
    await adminClient.from("recogidas").update({ aviso_operativo_at: null }).eq("id", recogidaId);
    return json({ enviado: false, razon: "error_smtp", detalle: clean((e as Error)?.message) });
  }

  return json({ enviado: true, destinatarios: para.length });
});

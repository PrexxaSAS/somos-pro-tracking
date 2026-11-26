// Resumen diario de los pedidos de cada asesor, por correo a su auxiliar.
//
// La llama pg_cron de lunes a sabado a las 6:00 p. m. hora Colombia
// (docs/resumen_pedidos_asesores.sql). Entran solo los pedidos de cartera que
// se movieron ese dia:
//   - cargados               pedidos_cartera.created_at
//   - decision de cartera    historial_cartera (aprobado, rechazado, reactivado)
//   - devueltos por logistica pedidos_cartera.fecha_devolucion
//   - cambios en Pedidos     audit_events de la tabla pedidos (paso a logistica,
//                            despachado, entregado, novedad)
// Cada pedido sale con sus movimientos del dia y el estado en que quedo.
//
// Destinatario: los pedidos se agrupan por asesor (pedidos_cartera.vendedor =
// asesores.codigo) y cada asesor va al correo de su auxiliar responsable
// (asesores.auxiliar_id -> usuarios.email). Si la auxiliar no tiene correo en
// Usuarios, va al correo registrado del asesor (asesores.email), que es el que
// usa la devolucion por logistica. Una auxiliar recibe un solo correo con
// todos sus asesores. Sin movimientos, no se envia nada.
//
// Quien puede llamarla: pg_cron con x-resumen-secret = RESUMEN_ASESORES_SECRET,
// o un admin con sesion (para probarla), que puede mandar { fecha: "AAAA-MM-DD" }.
//
// Secretos: los SMTP_* de enviar-correo-rechazo, RESUMEN_ASESORES_SECRET, APP_URL
// (opcional) y RESUMEN_ASESORES_PARA (opcional, solo para pruebas: si existe,
// TODOS los correos van ahi en vez de a las auxiliares).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clean = (v: unknown) => String(v ?? "").trim();
const esc = (v: unknown) =>
  clean(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const correoValido = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
// "01" y "1" son el mismo asesor (igual que public.codigo_asesor_normal).
const codigoAsesor = (v: unknown) => {
  const t = clean(v);
  if (!t) return "";
  return t.replace(/^0+/, "") || "0";
};

// ── Fechas en hora Colombia (UTC-5, sin horario de verano) ────────────────
const dos = (n: number) => String(n).padStart(2, "0");
const enBogota = (d: Date) => new Date(d.getTime() - 5 * 3600 * 1000);
const hoyBogota = () => {
  const b = enBogota(new Date());
  return `${b.getUTCFullYear()}-${dos(b.getUTCMonth() + 1)}-${dos(b.getUTCDate())}`;
};
const horaBogota = (iso: unknown) => {
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return "";
  const b = enBogota(d);
  return `${dos(b.getUTCHours())}:${dos(b.getUTCMinutes())}`;
};
const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00Z`)
  .toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// deno-lint-ignore no-explicit-any
type Fila = any;

// Lee todas las filas, de a 1000 (el limite de PostgREST).
async function todas(armar: () => Fila) {
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await armar().range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}
// Lee por lotes de una lista de valores (.in() con muchos valores no cabe en la URL).
async function porLotes(db: SupabaseClient, tabla: string, cols: string, campo: string, valores: string[]) {
  const filas: Fila[] = [];
  for (let i = 0; i < valores.length; i += 100) {
    const { data, error } = await db.from(tabla).select(cols).in(campo, valores.slice(i, i + 100));
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
  }
  return filas;
}

// El estado en que quedo el pedido: el de Pedidos si ya paso a logistica; si
// no, el de cartera.
const ESTADO_PEDIDO: Record<string, string> = {
  pendiente: "Por despachar", en_transito: "En tránsito", entregado: "Entregado", novedad: "Novedad",
};
const ESTADO_CARTERA: Record<string, string> = {
  pendiente: "En revisión de cartera", aprobado: "Aprobado", rechazado: "Rechazado por cartera",
  devuelto: "Devuelto por logística", preaprobado: "En revisión de cartera",
};
const COLOR_ESTADO: Record<string, string> = {
  "Entregado": "#047857", "En tránsito": "#1d4ed8", "Por despachar": "#6d42d8", "Aprobado": "#6d42d8",
  "Novedad": "#b45309", "Devuelto por logística": "#b45309", "En revisión de cartera": "#475569",
  "Rechazado por cartera": "#b91c1c",
};
const DECISION: Record<string, string> = {
  aprobado: "Aprobado por cartera", rechazado: "Rechazado por cartera", reactivado: "Reactivado",
};
const CAMBIO_PEDIDO: Record<string, string> = {
  en_transito: "Despachado", entregado: "Entregado", novedad: "Novedad", pendiente: "Volvió a por despachar",
};

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
  const appUrl = clean(Deno.env.get("APP_URL") || "https://somos-pro-tracking.vercel.app").replace(/\/+$/, "");
  const db = createClient(supabaseUrl, serviceRoleKey);

  // ¿Quien llama? pg_cron con el secreto, o un admin con sesion.
  const secreto = clean(Deno.env.get("RESUMEN_ASESORES_SECRET"));
  const desdeCron = secreto.length >= 16 && clean(req.headers.get("x-resumen-secret")) === secreto;
  if (!desdeCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sesion requerida." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: sesion, error: sesionError } = await userClient.auth.getUser();
    if (sesionError || !sesion.user) return json({ error: "Sesion invalida." }, 401);
    const { data: caller } = await db.from("usuarios").select("rol").eq("auth_user_id", sesion.user.id).maybeSingle();
    if (clean(caller?.rol) !== "admin") return json({ error: "Solo el admin puede enviar el resumen." }, 403);
  }

  const payload = await req.json().catch(() => ({}));
  const dia = !desdeCron && /^\d{4}-\d{2}-\d{2}$/.test(clean(payload?.fecha)) ? clean(payload.fecha) : hoyBogota();
  // El dia completo en hora Colombia.
  const inicio = new Date(`${dia}T05:00:00Z`).toISOString();
  const fin = new Date(new Date(`${dia}T05:00:00Z`).getTime() + 86400000).toISOString();
  const enDia = (v: unknown) => { const x = Date.parse(String(v)); return x >= Date.parse(inicio) && x < Date.parse(fin); };
  const redirigir = clean(Deno.env.get("RESUMEN_ASESORES_PARA")).toLowerCase();

  try {
    // 1. Lo que se movio en el dia. Solo columnas pequenas: nada de old_data/new_data.
    const COLS_CARTERA = "id, numero_pedido, cliente, vendedor, estado_cartera, motivo_rechazo, created_at, fecha_devolucion";
    const carteraDia = await todas(() => db.from("pedidos_cartera").select(COLS_CARTERA)
      .or(`and(created_at.gte.${inicio},created_at.lt.${fin}),and(fecha_devolucion.gte.${inicio},fecha_devolucion.lt.${fin})`)
      .order("id"));
    const historial = await todas(() => db.from("historial_cartera").select("pedido_id, decision, motivo, created_at")
      .gte("created_at", inicio).lt("created_at", fin).order("created_at"));
    const auditoria = (await todas(() => db.from("audit_events").select("record_id, action, old_estado, new_estado, created_at")
      .eq("table_name", "pedidos").in("action", ["INSERT", "UPDATE"])
      .gte("created_at", inicio).lt("created_at", fin).order("created_at")))
      .filter((a: Fila) => a.action === "INSERT" || (a.new_estado && a.old_estado !== a.new_estado));

    // 2. Los pedidos de cartera de esos movimientos.
    const porId = new Map<string, Fila>(carteraDia.map((c: Fila) => [c.id, c]));
    const faltanIds = [...new Set(historial.map((h: Fila) => h.pedido_id))].filter((id) => !porId.has(id as string)) as string[];
    (await porLotes(db, "pedidos_cartera", COLS_CARTERA, "id", faltanIds)).forEach((c) => porId.set(c.id, c));
    const porNumero = new Map<string, Fila>([...porId.values()].map((c) => [clean(c.numero_pedido), c]));
    const faltanNumeros = [...new Set(auditoria.map((a: Fila) => clean(a.record_id)))].filter((n) => n && !porNumero.has(n));
    (await porLotes(db, "pedidos_cartera", COLS_CARTERA, "numero_pedido", faltanNumeros))
      .forEach((c) => { porId.set(c.id, c); porNumero.set(clean(c.numero_pedido), c); });

    // 3. Movimientos de cada pedido, en orden.
    const movimientos = new Map<string, { hora: string; t: string; texto: string }[]>();
    const anotar = (c: Fila | undefined, cuando: unknown, texto: string) => {
      if (!c) return;
      if (!movimientos.has(c.id)) movimientos.set(c.id, []);
      movimientos.get(c.id)!.push({ hora: horaBogota(cuando), t: String(cuando), texto });
    };
    porId.forEach((c) => {
      if (enDia(c.created_at)) anotar(c, c.created_at, "Cargado");
      if (c.fecha_devolucion && enDia(c.fecha_devolucion)) {
        anotar(c, c.fecha_devolucion, "Devuelto por logística");
      }
    });
    historial.forEach((h: Fila) => anotar(porId.get(h.pedido_id), h.created_at,
      DECISION[clean(h.decision)] || clean(h.decision)));
    auditoria.forEach((a: Fila) => anotar(porNumero.get(clean(a.record_id)), a.created_at,
      a.action === "INSERT" ? "Pasó a logística" : (CAMBIO_PEDIDO[a.new_estado] || a.new_estado)));

    // 4. Estado actual y destino de cada pedido movido.
    const ids = [...movimientos.keys()];
    const numeros = ids.map((id) => clean(porId.get(id).numero_pedido));
    const enPedidos = new Map<string, Fila>((await porLotes(db, "pedidos", "id, estado, ciudad_nombre", "id", numeros))
      .map((p) => [clean(p.id), p]));

    const asesores = await todas(() => db.from("asesores").select("codigo, nombre, email, auxiliar_id").order("codigo"));
    const auxiliares = await todas(() => db.from("usuarios").select("id, nombre, email").eq("rol", "cliente").order("id"));
    const auxPorId = new Map<string, Fila>(auxiliares.map((u: Fila) => [u.id, u]));
    const asesorPorCodigo = new Map<string, Fila>(asesores.map((a: Fila) => [codigoAsesor(a.codigo), a]));

    // destino -> { nombre de la auxiliar, asesores -> pedidos }
    const correos = new Map<string, { saludo: string; asesores: Map<string, { asesor: Fila; pedidos: Fila[] }> }>();
    let sinAsesor = 0, sinCorreo = 0;
    ids.forEach((id) => {
      const c = porId.get(id);
      const asesor = asesorPorCodigo.get(codigoAsesor(c.vendedor));
      if (!asesor) { sinAsesor++; return; }
      const aux = asesor.auxiliar_id ? auxPorId.get(asesor.auxiliar_id) : null;
      const destino = [clean(aux?.email), clean(asesor.email)].map((e) => e.toLowerCase()).find(correoValido);
      if (!destino) { sinCorreo++; return; }
      const p = enPedidos.get(clean(c.numero_pedido));
      const estado = p ? (ESTADO_PEDIDO[p.estado] || p.estado) : (ESTADO_CARTERA[c.estado_cartera] || c.estado_cartera);
      if (!correos.has(destino)) correos.set(destino, { saludo: clean(aux?.nombre), asesores: new Map() });
      const grupo = correos.get(destino)!.asesores;
      const clave = codigoAsesor(asesor.codigo);
      if (!grupo.has(clave)) grupo.set(clave, { asesor, pedidos: [] });
      grupo.get(clave)!.pedidos.push({
        numero: clean(c.numero_pedido), cliente: clean(c.cliente), destino: clean(p?.ciudad_nombre),
        estado, motivo: c.estado_cartera === "rechazado" ? clean(c.motivo_rechazo) : "",
        movs: movimientos.get(id)!.sort((a, b) => Date.parse(a.t) - Date.parse(b.t)),
      });
    });

    // 5. Un correo por destino.
    const transporte = correos.size ? nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass },
    }) : null;
    const fuente = "font-family:Arial,Helvetica,sans-serif;";
    const enviados: string[] = [], fallidos: string[] = [];
    for (const [destino, { saludo, asesores: grupo }] of correos) {
      const bloques = [...grupo.values()].sort((a, b) => clean(a.asesor.nombre).localeCompare(clean(b.asesor.nombre)));
      const total = bloques.reduce((n, b) => n + b.pedidos.length, 0);
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5fa">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f5fa"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:680px;max-width:100%;background:#ffffff;border:1px solid #e7e5ee;border-radius:12px">
    <tr><td style="padding:26px 30px;${fuente}color:#17141f">
      <p style="margin:0;font-size:13px;color:#77738a;${fuente}">QTracking · Resumen diario</p>
      <h1 style="margin:6px 0 6px;font-size:22px;line-height:1.3;color:#17141f;${fuente}">Pedidos de tus asesores</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.5;${fuente}">${saludo ? `Hola, ${esc(saludo)}. ` : ""}Estos son los pedidos que se movieron el ${esc(fechaLarga(dia))}: ${total} ${total === 1 ? "pedido" : "pedidos"}.</p>
      ${bloques.map(({ asesor, pedidos }) => {
        const cuenta = new Map<string, number>();
        pedidos.forEach((p) => cuenta.set(p.estado, (cuenta.get(p.estado) || 0) + 1));
        const chips = [...cuenta].map(([e, n]) =>
          `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 9px;border-radius:10px;background:#f1eff7;font-size:12px;color:${COLOR_ESTADO[e] || "#17141f"};${fuente}"><b>${n}</b> ${esc(e)}</span>`).join("");
        return `
      <h2 style="margin:22px 0 6px;font-size:16px;color:#17141f;${fuente}">${esc(asesor.nombre || "Asesor")} <span style="font-weight:normal;color:#77738a;font-size:13px">· código ${esc(asesor.codigo)}</span></h2>
      <div style="margin:0 0 8px">${chips}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-top:1px solid #efedf4">
        <tr>
          <td style="padding:7px 8px 7px 0;font-size:11px;color:#77738a;border-bottom:1px solid #efedf4;${fuente}">PEDIDO</td>
          <td style="padding:7px 8px;font-size:11px;color:#77738a;border-bottom:1px solid #efedf4;${fuente}">CLIENTE</td>
          <td style="padding:7px 8px;font-size:11px;color:#77738a;border-bottom:1px solid #efedf4;${fuente}">MOVIMIENTOS HOY</td>
          <td style="padding:7px 0 7px 8px;font-size:11px;color:#77738a;border-bottom:1px solid #efedf4;${fuente}">QUEDÓ EN</td>
        </tr>
        ${pedidos.sort((a, b) => a.numero.localeCompare(b.numero)).map((p) => `<tr>
          <td valign="top" style="padding:8px 8px 8px 0;border-bottom:1px solid #efedf4;font-size:13px;font-weight:bold;font-family:Consolas,monospace">${esc(p.numero)}</td>
          <td valign="top" style="padding:8px;border-bottom:1px solid #efedf4;font-size:13px;${fuente}">${esc(p.cliente)}${p.destino ? `<br><span style="color:#77738a;font-size:12px">${esc(p.destino)}</span>` : ""}</td>
          <td valign="top" style="padding:8px;border-bottom:1px solid #efedf4;font-size:12px;color:#3f3b4d;${fuente}">${p.movs.map((m: Fila) => `${esc(m.hora)} ${esc(m.texto)}`).join("<br>")}</td>
          <td valign="top" style="padding:8px 0 8px 8px;border-bottom:1px solid #efedf4;font-size:13px;font-weight:bold;color:${COLOR_ESTADO[p.estado] || "#17141f"};${fuente}">${esc(p.estado)}${p.motivo ? `<br><span style="font-weight:normal;color:#77738a;font-size:12px">${esc(p.motivo)}</span>` : ""}</td>
        </tr>`).join("")}
      </table>`;
      }).join("")}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-top:24px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td align="center" bgcolor="#6d42d8" style="background:#6d42d8;border-radius:10px;padding:13px 26px;${fuente}">
            <a href="${esc(appUrl)}" target="_blank" style="${fuente}font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;display:inline-block">Abrir QTracking</a>
          </td>
        </tr></table>
      </td></tr></table>
      <p style="margin:24px 0 0;font-size:12px;color:#77738a;${fuente}">Resumen automático de lunes a sábado a las 6:00 p. m.; no respondas a este correo.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
      const texto = `Pedidos de tus asesores · ${fechaLarga(dia)}\n\n` + bloques.map(({ asesor, pedidos }) =>
        `${clean(asesor.nombre)} (código ${clean(asesor.codigo)})\n` + pedidos.map((p) =>
          `  ${p.numero} · ${p.cliente} · ${p.movs.map((m: Fila) => `${m.hora} ${m.texto}`).join(", ")} · quedó en ${p.estado}`).join("\n"),
      ).join("\n\n") + `\n\nAbrir QTracking: ${appUrl}`;
      try {
        await transporte!.sendMail({
          from: { name: smtp.fromName, address: smtp.fromEmail! },
          to: redirigir || destino,
          subject: `Resumen de pedidos de tus asesores · ${dia}${redirigir ? ` (prueba, para ${destino})` : ""}`,
          text: texto,
          html,
        });
        enviados.push(destino);
      } catch (e) {
        console.error("SMTP", destino, e);
        fallidos.push(destino);
      }
    }

    return json({
      dia, pedidos_movidos: ids.length, correos: enviados.length, fallidos,
      sin_asesor: sinAsesor, sin_correo: sinCorreo, redirigido_a: redirigir || null,
    }, fallidos.length && !enviados.length ? 502 : 200);
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo armar el resumen.", detalle: clean((e as Error)?.message) }, 500);
  }
});

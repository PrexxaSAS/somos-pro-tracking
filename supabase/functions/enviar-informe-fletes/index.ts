// Informe de fletes semanal por correo, en CSV.
//
// La llama pg_cron todos los lunes a las 6:00 a. m. hora Colombia
// (docs/informe_fletes_semanal.sql) y manda el informe de la semana anterior:
// las facturas de proveedor con fecha_factura de lunes a domingo pasados.
// Es el mismo CSV que "Informe de fletes" en Facturas proveedor
// (src/utils/informeFletes.js y src/utils/envioFactura.js): si cambian las
// columnas alla, hay que cambiarlas aqui tambien.
//
// Quien puede llamarla:
//   - pg_cron, con el encabezado x-informe-secret igual al secreto
//     INFORME_FLETES_SECRET de la funcion;
//   - un admin con sesion (para probarla), que puede mandar { desde, hasta };
//   - el servidor de la oficina, con x-informe-descarga igual a
//     INFORME_FLETES_DESCARGA_SECRET: recibe el CSV (puede mandar
//     { desde, hasta }) y NO se envia correo. Lo guarda en la carpeta de red
//     scripts/servidor/guardar-informe-fletes.ps1.
//
// Secretos: los SMTP_* de enviar-correo-rechazo, INFORME_FLETES_SECRET,
// INFORME_FLETES_DESCARGA_SECRET y, opcional, INFORME_FLETES_PARA (correos
// separados por coma).
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-informe-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown) => String(value ?? "").trim();
const PARA_POR_DEFECTO = "la.perez@prexxa.com.co";

// ── Fechas en hora Colombia (UTC-5, sin horario de verano) ────────────────
const dos = (n: number) => String(n).padStart(2, "0");
const enBogota = (d: Date) => new Date(d.getTime() - 5 * 3600 * 1000);
const fechaISO = (d: Date) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
const sumarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return fechaISO(d);
};
const fechaHora = (iso: unknown) => {
  const d = iso ? new Date(String(iso)) : null;
  if (!d || isNaN(d.getTime())) return "";
  const b = enBogota(d);
  return `${fechaISO(b)} ${dos(b.getUTCHours())}:${dos(b.getUTCMinutes())}`;
};
// La semana anterior a hoy: de lunes a domingo.
function semanaAnterior() {
  const hoy = enBogota(new Date());
  const diaSemana = (hoy.getUTCDay() + 6) % 7; // lunes = 0
  const lunesEsta = sumarDias(fechaISO(hoy), -diaSemana);
  return { desde: sumarDias(lunesEsta, -7), hasta: sumarDias(lunesEsta, -1) };
}
const esFecha = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(clean(v));

// ── Lo mismo que src/utils/envioFactura.js ────────────────────────────────
const TIPO_ENVIO: Record<string, string> = { pedido: "Pedido", devolucion: "Devolución", recogida: "Recogida" };
const SELECT_GUIAS_FACTURA = "*, "
  + "pedidos(id,guia_interna,cliente,cajas,factura,ciudad_codigo,ciudad_nombre,fecha_creacion,fecha_despacho,"
  + "fecha_real,fecha_pedido,guia_paqueteria,ciudad_origen_codigo,ciudad_origen_nombre,notas), "
  + "devoluciones(id,guia,factura,pedido_ref,unidades,ciudad_codigo,ciudad_nombre,dir_entrega,motivo,"
  + "fecha_creacion,fecha_real,guia_paqueteria,solicitado_por), "
  + "recogidas(id,guia,unidades,ciudad_recogida_cod,ciudad_recogida_nombre,ciudad_entrega_cod,ciudad_entrega_nombre,"
  + "observaciones,fecha_creacion,fecha_real,guia_paqueteria,solicitado_por)";

// deno-lint-ignore no-explicit-any
type Fila = any;

const envioDeDevolucion = (d: Fila) => ({
  envio: "devolucion", id: d.id, guia_interna: d.guia || "", cajas: Number(d.unidades) || 0,
  factura: d.factura || "", pedido_px: d.pedido_ref || "",
  ciudad_origen_codigo: d.ciudad_codigo || "", ciudad_origen_nombre: d.ciudad_nombre || "",
  ciudad_codigo: "", ciudad_nombre: d.dir_entrega || "",
  fecha_pedido: d.fecha_creacion || "", fecha_despacho: "",
  fecha_real: d.fecha_real || "", guia_paqueteria: d.guia_paqueteria || "", notas: d.motivo || "",
});
const envioDeRecogida = (r: Fila) => ({
  envio: "recogida", id: r.id, guia_interna: r.guia || "", cajas: Number(r.unidades) || 0,
  factura: "", pedido_px: "",
  ciudad_origen_codigo: r.ciudad_recogida_cod || "", ciudad_origen_nombre: r.ciudad_recogida_nombre || "",
  ciudad_codigo: r.ciudad_entrega_cod || "", ciudad_nombre: r.ciudad_entrega_nombre || "",
  fecha_pedido: r.fecha_creacion || "", fecha_despacho: "",
  fecha_real: r.fecha_real || "", guia_paqueteria: r.guia_paqueteria || "", notas: r.observaciones || "",
});
const normalizarGuia = (g: Fila) => {
  if (g.devolucion_id) return { ...g, pedidos: envioDeDevolucion(g.devoluciones || { id: g.devolucion_id }) };
  if (g.recogida_id) return { ...g, pedidos: envioDeRecogida(g.recogidas || { id: g.recogida_id }) };
  return { ...g, pedidos: g.pedidos ? { ...g.pedidos, envio: "pedido", pedido_px: g.pedidos.id } : g.pedidos };
};

// ── Lo mismo que src/utils/informeFletes.js ───────────────────────────────
const COLUMNAS = [
  "Tipo", "Guia tercero", "Guia propia", "Fecha envio", "Fecha pedido", "Fecha corte", "Fecha entrega",
  "Proveedor", "Factura proveedor", "Factura PX", "Pedido PX", "Origen", "DANE origen",
  "Destino", "DANE destino", "Sede origen", "Cajas", "Valor flete", "Observaciones",
];
const dane5 = (v: unknown) => {
  const d = String(v || "").replace(/\D/g, "").slice(0, 5);
  return d ? d.padStart(5, "0") : "";
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
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // ¿Quien llama? pg_cron con el secreto, el servidor de la oficina con el
  // secreto de descarga (solo recibe el CSV, no manda correo), o un admin.
  const secreto = clean(Deno.env.get("INFORME_FLETES_SECRET"));
  const desdeCron = secreto.length >= 16 && clean(req.headers.get("x-informe-secret")) === secreto;
  const secretoDescarga = clean(Deno.env.get("INFORME_FLETES_DESCARGA_SECRET"));
  const descarga = !desdeCron && secretoDescarga.length >= 16
    && clean(req.headers.get("x-informe-descarga")) === secretoDescarga;
  if (!desdeCron && !descarga) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sesion requerida." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: sesion, error: sesionError } = await userClient.auth.getUser();
    if (sesionError || !sesion.user) return json({ error: "Sesion invalida." }, 401);
    const { data: caller } = await adminClient
      .from("usuarios").select("rol").eq("auth_user_id", sesion.user.id).maybeSingle();
    if (clean(caller?.rol) !== "admin") return json({ error: "Solo el admin puede enviar el informe." }, 403);
  }

  // Periodo: la semana anterior, o el que mande el admin al probar.
  const payload = await req.json().catch(() => ({}));
  let { desde, hasta } = semanaAnterior();
  if (!desdeCron && esFecha(payload?.desde) && esFecha(payload?.hasta)) {
    desde = clean(payload.desde);
    hasta = clean(payload.hasta);
    if (desde > hasta) return json({ error: "La fecha desde va despues de hasta." }, 400);
  }
  const para = (Deno.env.get("INFORME_FLETES_PARA") || PARA_POR_DEFECTO)
    .split(",").map((c) => clean(c).toLowerCase()).filter(Boolean);

  // Facturas del periodo, con sus guias.
  const { data: facturas, error: facError } = await adminClient
    .from("facturas_proveedor")
    .select("id, numero_factura, transportista_id, fecha_factura, valor_total")
    .gte("fecha_factura", desde).lte("fecha_factura", hasta)
    .order("fecha_factura").order("id");
  if (facError) return json({ error: "No se pudieron leer las facturas.", detalle: facError.message }, 500);

  const idsFactura = (facturas || []).map((f: Fila) => f.id);
  const guiasPorFactura = new Map<unknown, Fila[]>();
  for (let i = 0; i < idsFactura.length; i += 100) {
    const { data, error } = await adminClient
      .from("factura_guias").select(SELECT_GUIAS_FACTURA)
      .in("factura_id", idsFactura.slice(i, i + 100)).order("id");
    if (error) return json({ error: "No se pudieron leer las guias.", detalle: error.message }, 500);
    (data || []).map(normalizarGuia).forEach((g: Fila) => {
      if (!guiasPorFactura.has(g.factura_id)) guiasPorFactura.set(g.factura_id, []);
      guiasPorFactura.get(g.factura_id)!.push(g);
    });
  }

  const { data: transportistas } = await adminClient.from("transportistas").select("id, nombre");
  const nombreTrans = new Map((transportistas || []).map((t: Fila) => [t.id, t.nombre]));

  // Cartera (fecha del plano y corte) por numero de pedido, y sede por DANE.
  const idsPedido = [...new Set([...guiasPorFactura.values()].flat()
    .filter((g: Fila) => g.pedido_id).map((g: Fila) => clean(g.pedidos?.id || g.pedido_id)).filter(Boolean))];
  const cartera = new Map<string, Fila>();
  for (let i = 0; i < idsPedido.length; i += 100) {
    const { data } = await adminClient.from("pedidos_cartera")
      .select("numero_pedido, fecha_pedido, fecha_corte").in("numero_pedido", idsPedido.slice(i, i + 100));
    (data || []).forEach((c: Fila) => cartera.set(clean(c.numero_pedido), c));
  }
  const { data: sedes } = await adminClient.from("sedes").select("nombre, dane_code");
  const sedePorDane = new Map((sedes || []).filter((s: Fila) => dane5(s.dane_code)).map((s: Fila) => [dane5(s.dane_code), s.nombre]));

  // Una linea por guia; el valor de la factura se reparte por cajas.
  const filas: unknown[][] = [];
  let totalCajas = 0, totalFlete = 0;
  (facturas || []).forEach((fac: Fila) => {
    const guias = guiasPorFactura.get(fac.id) || [];
    const cajasFactura = guias.reduce((a, g) => a + (Number(g.pedidos?.cajas) || 0), 0);
    const valorCaja = cajasFactura > 0 ? Number(fac.valor_total || 0) / cajasFactura : 0;
    guias.forEach((g) => {
      const p = g.pedidos || {};
      const c = g.pedido_id ? cartera.get(clean(p.id || g.pedido_id)) : null;
      const cajas = Number(p.cajas) || 0;
      const flete = cajasFactura > 0 ? Math.round(valorCaja * cajas) : 0;
      totalCajas += cajas;
      totalFlete += flete;
      filas.push([
        TIPO_ENVIO[p.envio] || "Pedido", p.guia_paqueteria || "", p.guia_interna || "",
        p.fecha_despacho || "", c?.fecha_pedido || p.fecha_pedido || "",
        c?.fecha_corte ? fechaHora(c.fecha_corte) : "", p.fecha_real || "",
        nombreTrans.get(fac.transportista_id) || "", fac.numero_factura || "", p.factura || "",
        p.pedido_px ?? (p.id || g.pedido_id || ""), p.ciudad_origen_nombre || "", p.ciudad_origen_codigo || "",
        p.ciudad_nombre || "", p.ciudad_codigo || "", sedePorDane.get(dane5(p.ciudad_origen_codigo)) || "",
        cajas, flete, p.notas || "",
      ]);
    });
  });

  // Mismo formato del CSV de la app: BOM para Excel y cada valor en una linea.
  const unaLinea = (v: unknown) => String(v ?? "").split(/\r\n|\r|\n/).map((s) => s.trim()).filter(Boolean).join(" · ");
  const esc = (v: unknown) => `"${unaLinea(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [COLUMNAS, ...filas].map((r) => r.map(esc).join(",")).join("\n");
  const nombreArchivo = `Informe_fletes_${desde}_a_${hasta}.csv`;

  // El servidor de la oficina guarda el archivo en la carpeta de red
  // (scripts/servidor/guardar-informe-fletes.ps1).
  if (descarga) {
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
      },
    });
  }

  const cop = (n: number) => "$ " + n.toLocaleString("es-CO");
  const nFacturas = (facturas || []).length;
  const resumen = nFacturas === 0
    ? "No hubo facturas de proveedor en el periodo; el archivo va solo con los encabezados."
    : `${nFacturas} ${nFacturas === 1 ? "factura" : "facturas"} · ${filas.length} ${filas.length === 1 ? "guía" : "guías"} · `
      + `${totalCajas.toLocaleString("es-CO")} cajas · Flete total ${cop(totalFlete)}`;
  const periodo = `del ${desde} al ${hasta}`;
  const fuente = "font-family:Arial,Helvetica,sans-serif;";
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f5fa">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f5fa"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e7e5ee;border-radius:12px">
    <tr><td style="padding:26px 30px;${fuente}color:#17141f">
      <p style="margin:0;font-size:13px;color:#77738a;${fuente}">QTracking · Facturas proveedor</p>
      <h1 style="margin:6px 0 14px;font-size:22px;line-height:1.3;color:#17141f;${fuente}">Informe de fletes semanal</h1>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;${fuente}">Facturas de proveedor ${periodo}.</p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;font-weight:bold;${fuente}">${resumen}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;${fuente}">El informe va adjunto en CSV.</p>
      <p style="margin:24px 0 0;font-size:12px;color:#77738a;${fuente}">Este es un envío automático de cada lunes; no respondas a este correo.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  try {
    const transporte = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporte.sendMail({
      from: { name: smtp.fromName, address: smtp.fromEmail! },
      to: para.join(", "),
      subject: `Informe de fletes ${periodo}`,
      text: `Informe de fletes semanal\n\nFacturas de proveedor ${periodo}.\n${resumen}\n\nEl informe va adjunto en CSV.`,
      html,
      attachments: [{
        filename: nombreArchivo,
        content: csv,
        contentType: "text/csv; charset=utf-8",
      }],
    });
  } catch (e) {
    console.error("SMTP:", e);
    return json({ enviado: false, razon: "error_smtp", detalle: clean((e as Error)?.message) }, 502);
  }

  return json({ enviado: true, desde, hasta, facturas: nFacturas, lineas: filas.length });
});

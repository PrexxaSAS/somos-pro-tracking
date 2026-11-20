import { supabase } from '../supabase';
import { imprimirHTML } from './imprimir';
import { TIPO_ENVIO } from './envioFactura';

const escHTML = (v) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Informe de fletes: una linea por guia relacionada a una factura de proveedor
// (factura_guias), con los datos del pedido, de cartera y el valor del flete
// repartido por cajas, como en Gestionar guias.
//
// De donde sale cada columna:
//   Guia tercero      pedidos.guia_paqueteria (la guia de la paqueteria)
//   Guia propia       pedidos.guia_interna
//   Fecha envio       pedidos.fecha_despacho
//   Fecha pedido      pedidos_cartera.fecha_pedido (la del plano); sin cartera, pedidos.fecha_pedido
//   Fecha corte       pedidos_cartera.fecha_corte; solo los pedidos de cartera tienen corte
//   Fecha entrega     pedidos.fecha_real
//   Sede origen       la sede cuyo DANE es el DANE origen del pedido
//   Valor flete       valor de la factura repartido por las cajas de sus guias
//   Observaciones     pedidos.notas
//   Tipo              Pedido, Devolucion o Recogida (utils/envioFactura). En las
//                     devoluciones y recogidas las cajas son sus unidades.

export const COLUMNAS_INFORME_FLETES = [
 "Tipo", "Guia tercero", "Guia propia", "Fecha envio", "Fecha pedido", "Fecha corte", "Fecha entrega",
 "Proveedor", "Factura proveedor", "Factura PX", "Pedido PX", "Origen", "DANE origen",
 "Destino", "DANE destino", "Sede origen", "Cajas", "Valor flete", "Observaciones",
];

// El DANE de municipio son 5 digitos: "5380" es "05380" y "05001001" es "05001".
const dane5 = (v) => {
 const d = String(v || "").replace(/\D/g, "").slice(0, 5);
 return d ? d.padStart(5, "0") : "";
};

const dos = (n) => String(n).padStart(2, "0");
const fechaHora = (iso) => {
 const d = iso ? new Date(iso) : null;
 if (!d || isNaN(d)) return "";
 return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

// Lo que el informe necesita de cartera, por numero de pedido. Si el rol no
// puede leer cartera o sedes, esas columnas quedan vacias y el informe sale igual.
async function datosCartera(ids) {
 const porNumero = new Map();
 const unicos = [...new Set(ids.filter(Boolean))];
 try {
  for (let i = 0; i < unicos.length; i += 100) {
   const { data, error } = await supabase.from("pedidos_cartera")
    .select("numero_pedido, fecha_pedido, fecha_corte").in("numero_pedido", unicos.slice(i, i + 100));
   if (error) throw error;
   (data || []).forEach(c => porNumero.set(String(c.numero_pedido || "").trim(), c));
  }
 } catch { /* sin acceso a cartera */ }
 let sedes = [];
 try {
  const { data } = await supabase.from("sedes").select("nombre, dane_code");
  sedes = data || [];
 } catch { /* sin acceso a sedes */ }
 const sedePorDane = new Map(sedes.filter(s => dane5(s.dane_code)).map(s => [dane5(s.dane_code), s.nombre]));
 return { porNumero, sedePorDane };
}

export async function armarLineasInforme(facturas, transportistas) {
 // Solo los pedidos pueden venir de cartera; las devoluciones y recogidas no.
 const ids = facturas.flatMap(f => (f.factura_guias || []).filter(g => g.pedido_id).map(g => g.pedidos?.id || g.pedido_id));
 const { porNumero, sedePorDane } = await datosCartera(ids);
 const lineas = [];
 facturas.forEach(fac => {
  const trans = transportistas.find(t => t.id === fac.transportista_id);
  const guias = fac.factura_guias || [];
  const totalCajas = guias.reduce((a, g) => a + (Number(g.pedidos?.cajas) || 0), 0);
  const valorCaja = totalCajas > 0 ? Number(fac.valor_total || 0) / totalCajas : 0;
  guias.forEach(g => {
   const p = g.pedidos || {};
   const c = g.pedido_id ? porNumero.get(String(p.id || g.pedido_id || "").trim()) : null;
   const cajas = Number(p.cajas) || 0;
   lineas.push({
    tipo: TIPO_ENVIO[p.envio] || "Pedido",
    guiaTercero: p.guia_paqueteria || "",
    guiaPropia: p.guia_interna || "",
    fechaEnvio: p.fecha_despacho || "",
    fechaPedido: c?.fecha_pedido || p.fecha_pedido || "",
    fechaCorte: c?.fecha_corte ? fechaHora(c.fecha_corte) : "",
    fechaEntrega: p.fecha_real || "",
    proveedor: trans?.nombre || "",
    facturaProveedor: fac.numero_factura || "",
    facturaPX: p.factura || "",
    pedidoPX: p.pedido_px ?? (p.id || g.pedido_id || ""),
    origen: p.ciudad_origen_nombre || "",
    daneOrigen: p.ciudad_origen_codigo || "",
    destino: p.ciudad_nombre || "",
    daneDestino: p.ciudad_codigo || "",
    sedeOrigen: sedePorDane.get(dane5(p.ciudad_origen_codigo)) || "",
    cajas,
    valorFlete: totalCajas > 0 ? Math.round(valorCaja * cajas) : 0,
    observaciones: p.notas || "",
   });
  });
 });
 return lineas;
}

const filaDe = (l) => [
 l.tipo, l.guiaTercero, l.guiaPropia, l.fechaEnvio, l.fechaPedido, l.fechaCorte, l.fechaEntrega,
 l.proveedor, l.facturaProveedor, l.facturaPX, l.pedidoPX, l.origen, l.daneOrigen,
 l.destino, l.daneDestino, l.sedeOrigen, l.cajas, l.valorFlete, l.observaciones,
];

export function descargarInformeCSV(lineas, nombre) {
 // Cada valor en una sola linea: Excel le activa "Ajustar texto" a la celda que
 // trae un salto de linea y, con la columna angosta, la fila crecia hasta 20
 // renglones. Los saltos pasan a " · " y los renglones vacios se quitan.
 const unaLinea = (c) => String(c ?? "").split(/\r\n|\r|\n/).map(s => s.trim()).filter(Boolean).join(" · ");
 const esc = (c) => `"${unaLinea(c).replace(/"/g, '""')}"`;
 const csv = "﻿" + [COLUMNAS_INFORME_FLETES, ...lineas.map(filaDe)].map(r => r.map(esc).join(",")).join("\n");
 const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
 const a = document.createElement("a");
 a.href = url;
 a.download = `${nombre}.csv`;
 a.click();
 URL.revokeObjectURL(url);
}

// PDF por el dialogo de impresion ("Guardar como PDF"), en hoja horizontal.
// Los margenes van dentro del documento (encabezado y pie vacios que se repiten)
// para que no dependan de lo que este elegido en el dialogo.
export function exportarInformePDF(lineas, { nombre, periodo }) {
 const cop = (n) => "$ " + Number(n || 0).toLocaleString("es-CO");
 const totalCajas = lineas.reduce((a, l) => a + l.cajas, 0);
 const totalFlete = lineas.reduce((a, l) => a + l.valorFlete, 0);
 const facturas = new Set(lineas.map(l => l.facturaProveedor)).size;
 const derecha = new Set([16, 17]);
 // Solo los textos largos pasan a otra linea; codigos, fechas y valores no se parten.
 const ajusta = new Set([7, 11, 13, 15, 18]);
 const clase = (i) => [derecha.has(i) ? "der" : "", ajusta.has(i) ? "ajusta" : ""].filter(Boolean).join(" ");
 const attr = (i) => clase(i) ? ` class="${clase(i)}"` : "";
 const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escHTML(nombre)}</title><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:7.5px;color:#000}
  @page{size:A4 landscape;margin:0}
  .marco{width:100%;border-collapse:collapse}
  .marco>thead>tr>td,.marco>tfoot>tr>td,.marco>tbody>tr>td{border:none;padding:0}
  .marco .esp{height:10mm}
  .marco .cuerpo{padding:0 8mm}
  h1{font-size:14px;margin-bottom:2px}
  .meta{font-size:9px;color:#333;margin-bottom:8px}
  table.datos{width:100%;border-collapse:collapse;table-layout:auto}
  .datos th,.datos td{border:1px solid #999;padding:2px 3px;vertical-align:top;white-space:nowrap}
  .datos td.ajusta{white-space:normal;min-width:16mm}
  .datos td.ajusta:last-child{min-width:30mm}
  .datos th{background:#eee;font-size:7px;text-align:left;white-space:normal}
  .datos thead{display:table-header-group}
  .datos tr{page-break-inside:avoid}
  .der{text-align:right;white-space:nowrap}
  .total td{font-weight:bold;background:#f5f5f5}
 </style></head><body><table class="marco"><thead><tr><td class="esp"></td></tr></thead><tfoot><tr><td class="esp"></td></tr></tfoot><tbody><tr><td class="cuerpo">
  <h1>SOMOS PRO · Informe de fletes</h1>
  <div class="meta">${escHTML(periodo)} · ${facturas} ${facturas === 1 ? "factura" : "facturas"} · ${lineas.length} ${lineas.length === 1 ? "guia" : "guias"} · ${totalCajas.toLocaleString("es-CO")} cajas · Flete total ${cop(totalFlete)} · Generado ${fechaHora(new Date().toISOString())}</div>
  <table class="datos">
   <thead><tr>${COLUMNAS_INFORME_FLETES.map((c, i) => `<th${attr(i)}>${escHTML(c)}</th>`).join("")}</tr></thead>
   <tbody>
    ${lineas.map(l => `<tr>${filaDe(l).map((v, i) => `<td${attr(i)}>${escHTML(i === 17 ? cop(v) : i === 16 ? Number(v).toLocaleString("es-CO") : v)}</td>`).join("")}</tr>`).join("")}
    <tr class="total"><td colspan="16">Total</td><td class="der">${totalCajas.toLocaleString("es-CO")}</td><td class="der">${cop(totalFlete)}</td><td></td></tr>
   </tbody>
  </table>
 </td></tr></tbody></table></body></html>`;
 return imprimirHTML(html, nombre);
}

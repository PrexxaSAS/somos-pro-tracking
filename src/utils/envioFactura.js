// Una guia de factura de proveedor (factura_guias) puede ser un pedido, una
// devolucion o una recogida (docs/factura_guias_devoluciones_recogidas.sql).
// Para que la tabla, el CSV y el informe de fletes las traten igual, cada guia
// lleva en g.pedidos el envio con los campos de un pedido, mas:
//   envio      "pedido" | "devolucion" | "recogida"
//   pedido_px  el pedido de Prexxa al que pertenece (en la devolucion, pedido_ref)
// Las cajas de una devolucion o una recogida son sus unidades: el valor de la
// factura se reparte entre todas por igual.

export const TIPO_ENVIO = { pedido: "Pedido", devolucion: "Devolución", recogida: "Recogida" };

// Columnas que se piden de cada tabla al leer las guias.
export const SELECT_GUIAS_FACTURA = '*, '
 + 'pedidos(id,guia_interna,cliente,cajas,factura,ciudad_codigo,ciudad_nombre,fecha_creacion,fecha_despacho,'
 + 'fecha_real,fecha_pedido,guia_paqueteria,ciudad_origen_codigo,ciudad_origen_nombre,notas), '
 + 'devoluciones(id,guia,factura,pedido_ref,unidades,ciudad_codigo,ciudad_nombre,dir_entrega,motivo,'
 + 'fecha_creacion,fecha_real,guia_paqueteria,solicitado_por), '
 + 'recogidas(id,guia,unidades,ciudad_recogida_cod,ciudad_recogida_nombre,ciudad_entrega_cod,ciudad_entrega_nombre,'
 + 'observaciones,fecha_creacion,fecha_real,guia_paqueteria,solicitado_por)';

export function envioDeDevolucion(d) {
 return {
  envio: "devolucion",
  id: d.id, guia_interna: d.guia || "", cliente: d.solicitado_por || "Devolución",
  cajas: Number(d.unidades) || 0, factura: d.factura || "", pedido_px: d.pedido_ref || "",
  ciudad_origen_codigo: d.ciudad_codigo || "", ciudad_origen_nombre: d.ciudad_nombre || "",
  ciudad_codigo: "", ciudad_nombre: d.dir_entrega || "",
  fecha_creacion: d.fecha_creacion || "", fecha_pedido: d.fecha_creacion || "", fecha_despacho: "",
  fecha_real: d.fecha_real || "", guia_paqueteria: d.guia_paqueteria || "", notas: d.motivo || "",
 };
}

export function envioDeRecogida(r) {
 return {
  envio: "recogida",
  id: r.id, guia_interna: r.guia || "", cliente: r.solicitado_por || "Recogida",
  cajas: Number(r.unidades) || 0, factura: "", pedido_px: "",
  ciudad_origen_codigo: r.ciudad_recogida_cod || "", ciudad_origen_nombre: r.ciudad_recogida_nombre || "",
  ciudad_codigo: r.ciudad_entrega_cod || "", ciudad_nombre: r.ciudad_entrega_nombre || "",
  fecha_creacion: r.fecha_creacion || "", fecha_pedido: r.fecha_creacion || "", fecha_despacho: "",
  fecha_real: r.fecha_real || "", guia_paqueteria: r.guia_paqueteria || "", notas: r.observaciones || "",
 };
}

// Deja g.pedidos con el envio, sea cual sea.
export function normalizarGuiaFactura(g) {
 if (g.devolucion_id) return { ...g, pedidos: envioDeDevolucion(g.devoluciones || { id: g.devolucion_id }) };
 if (g.recogida_id) return { ...g, pedidos: envioDeRecogida(g.recogidas || { id: g.recogida_id }) };
 return { ...g, pedidos: g.pedidos ? { ...g.pedidos, envio: "pedido", pedido_px: g.pedidos.id } : g.pedidos };
}

// Clave de un envio para el selector y para saber si ya esta relacionado.
export const claveGuia = (g) => g.devolucion_id ? `devolucion:${g.devolucion_id}`
 : g.recogida_id ? `recogida:${g.recogida_id}` : `pedido:${g.pedido_id}`;

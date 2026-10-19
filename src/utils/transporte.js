import { ESTADOS_SIN_DESPACHO } from "../Constants";

// "Solo facturar" llego a guardarse como si fuera una transportadora o una guia.
// No es un transporte real: se trata como vacio al mostrar la columna de conductor.
export function esTextoSoloFacturar(valor) {
  return /no\s*despachar|solo\s*factur/i.test(String(valor || ""));
}

// Texto de la columna Conductor / Transporte de un pedido.
// - Paqueteria con transportadora o guia real: la transportadora y la guia.
// - Con conductor: nombre y placa.
// - Solo facturar sin conductor ni transporte real: "No aplica" (no es un pendiente).
// - Sin nada asignado: principal null, y cada vista decide su texto ("Sin asignar"...).
export function transportePedido(pedido, conductor) {
  const p = pedido || {};
  const paqueteria = esTextoSoloFacturar(p.paqueteria) ? "" : (p.paqueteria || "");
  const guia = esTextoSoloFacturar(p.guia_paqueteria) ? "" : (p.guia_paqueteria || "");

  if (p.tipo === "paqueteria" && (paqueteria || guia)) {
    return { principal: paqueteria || "Paqueteria", detalle: guia, noAplica: false };
  }
  if (conductor) {
    return { principal: conductor.nombre, detalle: p.placa || conductor.placa || "", noAplica: false };
  }
  if (ESTADOS_SIN_DESPACHO.includes(p.estado)) {
    return { principal: "No aplica", detalle: "", noAplica: true };
  }
  if (p.tipo === "paqueteria") {
    return { principal: "Paqueteria", detalle: "", noAplica: false };
  }
  return { principal: null, detalle: "", noAplica: false };
}

// Lo que le falta a un pedido para quedar completo: los que llegan de cartera
// entran con 0 cajas, sin factura y sin tipo de envio, y se completan a mano
// desde la edicion. Los cerrados (entregado o novedad) no cuentan: ya no se
// pueden editar desde la aplicacion. Los que no se despachan (solo facturar,
// cliente recoge) no necesitan tipo de envio.
export function faltantesPedido(pedido) {
  const p = pedido || {};
  if (["entregado", "novedad"].includes(p.estado)) return [];
  const falta = [];
  if (!(parseInt(p.cajas) > 0)) falta.push("cajas");
  if (!String(p.factura || "").trim()) falta.push("factura");
  if (!p.tipo && !ESTADOS_SIN_DESPACHO.includes(p.estado)) falta.push("tipo de envio");
  return falta;
}

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

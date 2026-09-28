// Doc. referencia de una devolucion o recogida: un solo numero que puede ser un
// pedido, una factura o una orden de compra. Las devoluciones creadas antes de
// este campo guardaban factura y pedido por separado; esas se muestran juntas,
// "FAC-001 · PED-001", para no perder ninguno de los dos.
export function docReferencia(x) {
  const doc = String(x?.doc_referencia || "").trim();
  if (doc) return doc;
  return [x?.factura, x?.pedido_ref]
    .map(v => String(v || "").trim())
    .filter(Boolean)
    .join(" · ");
}

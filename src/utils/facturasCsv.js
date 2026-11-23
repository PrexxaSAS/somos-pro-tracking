export function exportarCSVFacturaProveedor(fac, lineas, trans, formatCOP) {
  const headers = [
    "Tipo","Fecha Factura","Guia Interna","Transportista","Fecha Pedido","Fecha Despacho",
    "Codigo DANE","Ciudad Destino","N Factura Proveedor",
    "Cajas / Unidades","Valor Guia COP","Factura Interna","Pedido Interno"
  ];
  const tipos = { pedido: "Pedido", devolucion: "Devolucion", recogida: "Recogida" };
  const rows = lineas.map(l => [
    tipos[l.pedidos?.envio] || "Pedido",
    fac.fecha_factura,
    l.pedidos?.guia_interna || "",
    trans?.nombre || "",
    l.pedidos?.fecha_creacion || "",
    l.pedidos?.fecha_despacho || "",
    l.pedidos?.ciudad_codigo || "",
    l.pedidos?.ciudad_nombre || "",
    fac.numero_factura,
    l.cajas,
    l.valorGuia,
    l.pedidos?.factura || "",
    l.pedidos?.pedido_px ?? l.pedidos?.id ?? "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `Factura_${fac.numero_factura}_${fac.fecha_factura}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


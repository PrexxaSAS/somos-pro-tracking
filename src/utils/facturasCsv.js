export function exportarCSVFacturaProveedor(fac, lineas, trans, formatCOP) {
  const headers = [
    "Fecha Factura","Guia Interna","Transportista","Fecha Pedido","Fecha Despacho",
    "Codigo DANE","Ciudad Destino","N Factura Proveedor",
    "Cajas","Valor Guia COP","Factura Interna","Pedido Interno"
  ];
  const rows = lineas.map(l => [
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
    l.pedidos?.id || "",
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


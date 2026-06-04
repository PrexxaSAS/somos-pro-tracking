export function generarPDFSoportes(pedido, extras) {
  const fecha = new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"});
  const todos = [...(pedido.soportes_data||[]), ...(extras||[])].map((soporte, index) => {
    if (typeof soporte === "string") return { data: soporte, nombre: `Soporte ${index + 1}` };
    return soporte || {};
  }).filter(soporte => soporte.data);
  const win = window.open("","_blank");
  if(!win) return;
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const imgs = todos.map((s,i)=>`<div class="support"><p>Soporte ${i+1}${s.nombre?" - "+escapeHtml(s.nombre):""}</p><img src="${s.data}" /></div>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Soportes ${escapeHtml(pedido.id)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;background:#f8fafc;color:#111827}
    .toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 32px;display:flex;justify-content:flex-end;gap:10px;z-index:10}
    button{background:#4c1d95;color:#fff;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
    .page{padding:32px;max-width:980px;margin:0 auto;background:#fff;min-height:100vh}
    h1{color:#4c1d95}hr{border:none;border-top:2px solid #ddd6fe;margin:16px 0}
    .support{page-break-inside:avoid;margin-bottom:32px}
    .support p{color:#4c1d95;font-weight:bold;margin:0 0 8px}
    .support img{max-width:100%;border:2px solid #ddd6fe;border-radius:8px;display:block}
    @media print{body{background:#fff}.toolbar{display:none}.page{padding:32px;max-width:none;margin:0;min-height:auto}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Guardar PDF</button></div><main class="page"><h1>Soportes - ${escapeHtml(pedido.guia_interna||pedido.id)}</h1><p>Pedido: ${escapeHtml(pedido.id)} | Cliente: ${escapeHtml(pedido.cliente)} | ${fecha}</p><hr/>${imgs||"<p>Sin soportes.</p>"}</main></body></html>`);
  win.document.close();
}

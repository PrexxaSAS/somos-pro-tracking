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
  const imgs = todos.map((s,i)=>`<div style="page-break-inside:avoid;margin-bottom:32px"><p style="color:#4c1d95;font-weight:bold;margin:0 0 8px">Soporte ${i+1}${s.nombre?" - "+escapeHtml(s.nombre):""}</p><img src="${s.data}" style="max-width:100%;border:2px solid #ddd6fe;border-radius:8px"/></div>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Soportes ${escapeHtml(pedido.id)}</title><style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#4c1d95}hr{border:none;border-top:2px solid #ddd6fe;margin:16px 0}</style></head><body><h1>Soportes - ${escapeHtml(pedido.guia_interna||pedido.id)}</h1><p>Pedido: ${escapeHtml(pedido.id)} | Cliente: ${escapeHtml(pedido.cliente)} | ${fecha}</p><hr/>${imgs||"<p>Sin soportes.</p>"}<script>function imprimirCuandoCargue(){var imgs=Array.from(document.images);if(!imgs.length){window.print();return;}var pending=imgs.length;var done=function(){pending--;if(pending<=0)setTimeout(function(){window.print();},150);};imgs.forEach(function(img){if(img.complete)done();else{img.onload=done;img.onerror=done;}});setTimeout(function(){if(pending>0)window.print();},2500);}window.onload=imprimirCuandoCargue;<\/script></body></html>`);
  win.document.close();
}

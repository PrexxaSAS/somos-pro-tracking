export function generarGuia(pedidos) {
  const year = new Date().getFullYear();
  const usados = pedidos.map(p=>p.guia_interna).filter(g=>g&&g.startsWith(`SPT-${year}-`)).map(g=>parseInt(g.split("-")[2])||0);
  return `SPT-${year}-${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}

export function generarGuiaDV(lista) {
  const year = new Date().getFullYear();
  const pfx = `DV-${year}-`;
  const usados = lista.map(d=>d.guia).filter(g=>g&&g.startsWith(pfx)).map(g=>parseInt(g.split("-")[2])||0);
  return `${pfx}${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}

export function generarGuiaRC(lista) {
  const year = new Date().getFullYear();
  const pfx = `RC-${year}-`;
  const usados = lista.map(r=>r.guia).filter(g=>g&&g.startsWith(pfx)).map(g=>parseInt(g.split("-")[2])||0);
  return `${pfx}${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}

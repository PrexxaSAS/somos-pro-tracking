// La guia interna de los pedidos ya no se genera aqui: la pone la base, en
// trg_asignar_guia_interna, que es el unico generador y toma un candado para
// que dos inserciones simultaneas no saquen el mismo numero. Las de
// devoluciones y recogidas siguen calculandose en el navegador.

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

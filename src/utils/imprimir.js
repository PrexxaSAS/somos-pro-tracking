// Imprime un documento HTML sin abrir otra pestana. Antes cada impresion abria
// una pagina "about:blank" con el documento, que se quedaba abierta despues de
// imprimir. Ahora el documento se arma en un iframe invisible dentro de la
// misma pagina, se abre el dialogo de impresion y el iframe se quita al cerrar.
// Devuelve una promesa que se cumple cuando el dialogo se cierra. El navegador
// no dice si se imprimio o se cancelo: quien necesite saberlo debe preguntar.
//
// nombre: el nombre que propone "Guardar como PDF". El navegador lo toma del
// titulo de la pagina, asi que mientras el dialogo esta abierto la pestana
// lleva ese titulo y despues vuelve al suyo.
export function imprimirHTML(html, nombre) {
  let avisarCierre;
  const cerrado = new Promise(res => { avisarCierre = res; });
  const tituloAntes = document.title;
  const limpio = nombre ? String(nombre).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() : "";
  if (limpio) document.title = limpio;
  let avisado = false;
  const avisar = () => {
    if (avisado) return;
    avisado = true;
    if (limpio) document.title = tituloAntes;
    avisarCierre();
  };
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(marco);

  let quitado = false;
  const quitar = () => { if (!quitado) { quitado = true; marco.remove(); } };

  const doc = marco.contentDocument || marco.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  if (limpio) doc.title = limpio;

  const ventana = marco.contentWindow;
  // Se espera a que carguen las imagenes del documento (logos, firmas).
  let lanzado = false;
  const lanzar = () => {
    if (lanzado) return;
    lanzado = true;
    ventana.addEventListener("afterprint", () => { avisar(); setTimeout(quitar, 0); });
    ventana.focus();
    ventana.print();
    // En Chrome print() espera a que se cierre el dialogo; en otros vuelve de
    // inmediato y avisa afterprint.
    if (!("onafterprint" in ventana)) avisar();
    // Por si el navegador no avisa afterprint: el iframe no estorba, pero no
    // se deja colgado para siempre.
    setTimeout(quitar, 60000);
    setTimeout(() => { if (limpio && !avisado) document.title = tituloAntes; }, 60000);
  };
  if (doc.readyState === "complete") setTimeout(lanzar, 50);
  else {
    marco.addEventListener("load", lanzar, { once: true });
    setTimeout(lanzar, 1500);
  }
  return cerrado;
}

// Descarga un archivo (Blob) con su nombre, sin abrirlo en otra pestana.
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

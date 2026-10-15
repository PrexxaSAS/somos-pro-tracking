// Imprime un documento HTML sin abrir otra pestana. Antes cada impresion abria
// una pagina "about:blank" con el documento, que se quedaba abierta despues de
// imprimir. Ahora el documento se arma en un iframe invisible dentro de la
// misma pagina, se abre el dialogo de impresion y el iframe se quita al cerrar.
export function imprimirHTML(html) {
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

  const ventana = marco.contentWindow;
  // Se espera a que carguen las imagenes del documento (logos, firmas).
  let lanzado = false;
  const lanzar = () => {
    if (lanzado) return;
    lanzado = true;
    ventana.addEventListener("afterprint", () => setTimeout(quitar, 0));
    ventana.focus();
    ventana.print();
    // Por si el navegador no avisa afterprint: el iframe no estorba, pero no
    // se deja colgado para siempre.
    setTimeout(quitar, 60000);
  };
  if (doc.readyState === "complete") setTimeout(lanzar, 50);
  else {
    marco.addEventListener("load", lanzar, { once: true });
    setTimeout(lanzar, 1500);
  }
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

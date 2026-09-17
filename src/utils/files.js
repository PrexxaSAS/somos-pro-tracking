export function descargarCSV(nombre,cabecera,ejemplo){
  const blob=new Blob([cabecera+"\n"+ejemplo],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=nombre;a.click();URL.revokeObjectURL(url);
}

// Los planos se exportan a veces en ANSI (Windows-1252). Leerlos como UTF-8 dana
// las tildes y la enie: aparecen textos como "V?A AL MAGDALENA". Se intenta UTF-8
// estricto y, si el archivo no lo es, se relee como Windows-1252.
export function leerTextoCsv(file){
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("Error leyendo el archivo."));
    lector.onload = () => {
      const bytes = new Uint8Array(lector.result);
      let texto;
      try {
        texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        texto = new TextDecoder("windows-1252").decode(bytes);
      }
      resolve(texto.replace(/^\uFEFF/, ""));
    };
    lector.readAsArrayBuffer(file);
  });
}

// Detecta el separador mirando solo lo que esta FUERA de las comillas: un cliente
// como "Perez, Hijos S.A.S" no debe hacer creer que el archivo usa comas.
// Tambien reconoce el tabulador, que es lo que sale al pegar desde Excel.
export function detectarSeparadorCsv(texto){
  const primera = String(texto || "").split(/\r?\n/)[0] || "";
  const cuenta = { ";": 0, ",": 0, "\t": 0 };
  let enComillas = false;
  for (const ch of primera) {
    if (ch === '"') { enComillas = !enComillas; continue; }
    if (!enComillas && cuenta[ch] !== undefined) cuenta[ch] += 1;
  }
  if (cuenta["\t"] > cuenta[";"] && cuenta["\t"] > cuenta[","]) return "\t";
  return cuenta[";"] > cuenta[","] ? ";" : ",";
}

// Parte el CSV en filas y columnas respetando las comillas. Un campo entrecomillado
// puede contener el separador, saltos de linea y comillas escapadas ("" -> ").
//
// Antes se partia con split(sep): bastaba un telefono como "115 - ext 210, 211" para
// que esa fila se corriera una columna y el pedido quedara con el telefono en el
// nombre del cliente, la ciudad en la direccion y asi hasta el final de la fila.
export function filasCsv(texto, separador){
  const limpio = String(texto || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const sep = separador || detectarSeparadorCsv(limpio);
  const filas = [];
  let fila = [];
  let campo = "";
  let enComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (enComillas) {
      if (ch !== '"') { campo += ch; continue; }
      if (limpio[i + 1] === '"') { campo += '"'; i += 1; continue; }
      enComillas = false;
      continue;
    }
    if (ch === '"') { enComillas = true; continue; }
    if (ch === sep) { fila.push(campo); campo = ""; continue; }
    if (ch === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; continue; }
    campo += ch;
  }
  fila.push(campo);
  filas.push(fila);
  return filas
    .map(f => f.map(v => v.trim()))
    .filter(f => f.some(v => v !== ""));
}

export function fileToBase64(file){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
}

export function abrirArchivoGuardado(data, nombre = "documento") {
  if (!data) return;
  try {
    const dataUrl = String(data).startsWith("data:")
      ? String(data)
      : `data:application/octet-stream;base64,${data}`;
    const [meta, base64] = dataUrl.split(",");
    const mimeDetectado = meta.match(/data:(.*?);base64/)?.[1] || "";
    const extension = String(nombre || "").split(".").pop()?.toLowerCase();
    const mimePorExtension = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    }[extension || ""];
    const mime = mimeDetectado && mimeDetectado !== "application/octet-stream"
      ? mimeDetectado
      : (mimePorExtension || "application/pdf");
    const bin = atob(base64 || "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) console.warn("El navegador bloqueo la ventana del visor.");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error("No se pudo abrir el archivo guardado:", error);
    window.open(String(data), "_blank", "noopener,noreferrer");
  }
}

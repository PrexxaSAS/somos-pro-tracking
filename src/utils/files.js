export function descargarCSV(nombre,cabecera,ejemplo){
  const blob=new Blob([cabecera+"\n"+ejemplo],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=nombre;a.click();URL.revokeObjectURL(url);
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

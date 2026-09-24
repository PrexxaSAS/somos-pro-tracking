// Compress image to max 800px wide, quality 0.75 - keeps size under ~200KB
export function comprimirImagen(file, maxW=800, quality=0.75) {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        res(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Lee lo que entrega un <input type="file">, descarta lo que no sea imagen y
// devuelve las fotos ya comprimidas, sin pasarse del cupo que queda. La usan
// las dos pantallas que adjuntan soportes, para que el limite y la compresion
// se decidan en un solo sitio.
export async function leerFotos(files, cupo) {
  const fotos = [];
  for (const file of Array.from(files || []).slice(0, Math.max(0, cupo))) {
    if (!file.type.startsWith('image/')) continue;
    fotos.push({ data: await comprimirImagen(file), nombre: file.name });
  }
  return fotos;
}

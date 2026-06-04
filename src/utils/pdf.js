const A4 = { width: 595.28, height: 841.89 };
const encoder = new TextEncoder();

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const dataUrlToBytes = (dataUrl) => {
  const base64 = String(dataUrl).split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const imageToJpeg = (dataUrl, quality = 0.86) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpegData = canvas.toDataURL("image/jpeg", quality);
      resolve({
        data: jpegData,
        bytes: dataUrlToBytes(jpegData),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

const normalizeSupport = (support, index) => {
  if (typeof support === "string") return { data: support, nombre: `Soporte ${index + 1}` };
  return support || {};
};

const makePdf = (pedido, supports) => {
  const objects = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontObj = 3;
  const pages = [];

  supports.forEach((support, index) => {
    const imgObj = objects.length + 3;
    const imageRatio = support.width / support.height;
    const maxImageWidth = 500;
    const maxImageHeight = 560;
    let imageWidth = maxImageWidth;
    let imageHeight = imageWidth / imageRatio;
    if (imageHeight > maxImageHeight) {
      imageHeight = maxImageHeight;
      imageWidth = imageHeight * imageRatio;
    }

    const x = 50;
    const y = 170 + (maxImageHeight - imageHeight);
    const title = escapePdfText(`Soportes - ${pedido.guia_interna || pedido.id}`);
    const meta = escapePdfText(`Pedido: ${pedido.id} | Cliente: ${pedido.cliente || ""}`);
    const supportName = escapePdfText(`Soporte ${index + 1}${support.nombre ? ` - ${support.nombre}` : ""}`);
    const stream = [
      "BT",
      "/F1 20 Tf",
      `50 790 Td (${title}) Tj`,
      "/F1 11 Tf",
      `50 765 Td (${meta}) Tj`,
      "/F1 12 Tf",
      `50 735 Td (${supportName}) Tj`,
      "ET",
      "q",
      `${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`,
      `/Im${index + 1} Do`,
      "Q",
    ].join("\n");

    const streamBytes = encoder.encode(stream);
    const contentObj = addObject(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);
    const pageObj = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 ${fontObj} 0 R >> /XObject << /Im${index + 1} ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pages.push(pageObj);
    addObject([
      `<< /Type /XObject /Subtype /Image /Width ${support.width} /Height ${support.height}\n/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode\n/Length ${support.bytes.length} >>`,
      "stream\n",
      support.bytes,
      "\nendstream",
    ]);
  });

  if (!supports.length) {
    const stream = "BT /F1 20 Tf 50 790 Td (Sin soportes) Tj ET";
    const contentObj = addObject(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    pages.push(addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`));
  }

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pages.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  const parts = [encoder.encode("%PDF-1.4\n%Somos PRO Tracking\n")];
  const offsets = [0];
  let length = parts[0].length;

  objects.forEach((object, index) => {
    offsets.push(length);
    const objectNumber = index + 1;
    const objectParts = Array.isArray(object)
      ? [encoder.encode(`${objectNumber} 0 obj\n${object[0]}\n${object[1]}`), object[2], encoder.encode(object[3])]
      : [encoder.encode(`${objectNumber} 0 obj\n${object}\nendobj\n`)];
    objectParts.forEach(part => {
      parts.push(part);
      length += part.length;
    });
    if (Array.isArray(object)) {
      const end = encoder.encode("\nendobj\n");
      parts.push(end);
      length += end.length;
    }
  });

  const xrefStart = length;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefStart),
    "%%EOF",
  ].join("\n");
  parts.push(encoder.encode(xref));

  return new Blob(parts, { type: "application/pdf" });
};

export async function generarPDFSoportes(pedido, extras) {
  const win = window.open("", "_blank");
  if (!win) return;

  try {
    const rawSupports = [...(pedido.soportes_data || []), ...(extras || [])]
      .map(normalizeSupport)
      .filter(support => support.data);
    const supports = await Promise.all(rawSupports.map(async (support) => ({
      ...support,
      ...(await imageToJpeg(support.data)),
    })));
    const blob = makePdf(pedido, supports);
    const url = URL.createObjectURL(blob);
    win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    win.document.write("<p>No se pudo generar el PDF de soportes.</p>");
    win.document.close();
    console.error("PDF soportes:", error);
  }
}

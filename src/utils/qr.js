import QRCode from 'qrcode';
import { T } from '../design/tokens';

// El QR se dibuja aqui en vez de pedirselo a un servicio externo: asi la
// descarga funciona de verdad (un <a download> a otro dominio no descarga, abre
// la imagen), la direccion de la app no sale hacia un tercero y el codigo puede
// llevar los colores de la marca.

const ANCHO = 760;   // medidas logicas de la tarjeta
const ALTO = 990;
const ESCALA = 3;    // se dibuja a 3x para que la imagen descargada no pixele

const rectRedondo = (ctx, x, y, w, h, r) => {
 const radio = Math.max(0, Math.min(r, w / 2, h / 2));
 ctx.beginPath();
 ctx.moveTo(x + radio, y);
 ctx.arcTo(x + w, y, x + w, y + h, radio);
 ctx.arcTo(x + w, y + h, x, y + h, radio);
 ctx.arcTo(x, y + h, x, y, radio);
 ctx.arcTo(x, y, x + w, y, radio);
 ctx.closePath();
};

// Los tres cuadros de las esquinas guian al lector: se dibujan enteros, con su
// forma reconocible, y no modulo a modulo.
const esOjo = (fila, col, n) =>
 (fila < 7 && col < 7) || (fila < 7 && col >= n - 7) || (fila >= n - 7 && col < 7);

const dibujarOjo = (ctx, x, y, m, color, fondo) => {
 ctx.fillStyle = color;
 rectRedondo(ctx, x, y, m * 7, m * 7, m * 2.2);
 ctx.fill();
 ctx.fillStyle = fondo;
 rectRedondo(ctx, x + m, y + m, m * 5, m * 5, m * 1.5);
 ctx.fill();
 ctx.fillStyle = color;
 rectRedondo(ctx, x + m * 2, y + m * 2, m * 3, m * 3, m * 0.9);
 ctx.fill();
};

// Correccion de errores alta: tolera hasta un 30% de dano, que es lo que
// permite tapar el centro con el logo sin que el codigo deje de leerse.
export function dibujarQR(ctx, { texto, x, y, lado, color = T.color.marca, fondo = "#ffffff", hueco = 0 }) {
 const qr = QRCode.create(texto, { errorCorrectionLevel: 'H' });
 const n = qr.modules.size;
 const datos = qr.modules.data;
 const m = lado / n;

 ctx.fillStyle = fondo;
 ctx.fillRect(x, y, lado, lado);

 // Modulos que se dejan libres en el centro para el logo.
 const libres = hueco ? Math.ceil((hueco / lado) * n) : 0;
 const desde = Math.floor((n - libres) / 2);
 const hasta = desde + libres;

 ctx.fillStyle = color;
 for (let fila = 0; fila < n; fila++) {
  for (let col = 0; col < n; col++) {
   if (!datos[fila * n + col]) continue;
   if (esOjo(fila, col, n)) continue;
   if (libres && fila >= desde && fila < hasta && col >= desde && col < hasta) continue;
   rectRedondo(ctx, x + col * m, y + fila * m, m, m, m * 0.3);
   ctx.fill();
  }
 }

 dibujarOjo(ctx, x, y, m, color, fondo);
 dibujarOjo(ctx, x + (n - 7) * m, y, m, color, fondo);
 dibujarOjo(ctx, x, y + (n - 7) * m, m, color, fondo);
}

const cargarImagen = (src) => new Promise((resolve) => {
 const img = new Image();
 img.onload = () => resolve(img);
 img.onerror = () => resolve(null);  // sin logo la tarjeta sigue sirviendo
 img.src = src;
});

// Recorta el texto que no cabe para que la direccion nunca se salga de su caja.
const ajustar = (ctx, texto, max) => {
 if (ctx.measureText(texto).width <= max) return texto;
 let corto = texto;
 while (corto.length > 4 && ctx.measureText(corto + "...").width > max) corto = corto.slice(0, -1);
 return corto + "...";
};

// Compone la tarjeta que se ve en el modal y que se descarga: la misma imagen
// en los dos sitios, para que lo que el usuario ve sea lo que guarda.
export async function tarjetaQR(url, logoSrc, canvas = null) {
 const logo = logoSrc ? await cargarImagen(logoSrc) : null;
 // Sin esperar a las fuentes el canvas dibujaria con la de reserva.
 if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* sigue con la de reserva */ } }

 const lienzo = canvas || document.createElement('canvas');
 lienzo.width = ANCHO * ESCALA;
 lienzo.height = ALTO * ESCALA;
 const ctx = lienzo.getContext('2d');
 ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
 ctx.textBaseline = "alphabetic";

 // Fondo
 ctx.fillStyle = "#ffffff";
 ctx.fillRect(0, 0, ANCHO, ALTO);

 // Cabecera de marca
 ctx.fillStyle = T.color.marca;
 ctx.fillRect(0, 0, ANCHO, 140);
 ctx.fillStyle = "#ffffff";
 ctx.beginPath();
 ctx.arc(88, 70, 38, 0, Math.PI * 2);
 ctx.fill();
 if (logo) ctx.drawImage(logo, 88 - 27, 70 - 27, 54, 54);

 ctx.textAlign = "left";
 ctx.fillStyle = "#ffffff";
 ctx.font = `800 31px ${T.fuente.ui}`;
 ctx.fillText("Somos PRO", 146, 68);
 ctx.font = `600 15px ${T.fuente.ui}`;
 ctx.globalAlpha = 0.85;
 ctx.fillText("T R A C K I N G", 148, 95);
 ctx.globalAlpha = 1;

 // Titulo
 ctx.textAlign = "center";
 ctx.fillStyle = T.color.tinta;
 ctx.font = `700 28px ${T.fuente.ui}`;
 ctx.fillText("Acceso para conductores", ANCHO / 2, 214);
 ctx.fillStyle = T.color.tinta3;
 ctx.font = `500 17px ${T.fuente.ui}`;
 ctx.fillText("Escanea el código con la cámara del celular", ANCHO / 2, 246);

 // Marco y codigo
 ctx.strokeStyle = T.color.borde;
 ctx.lineWidth = 1.5;
 rectRedondo(ctx, 130, 286, 500, 500, 18);
 ctx.stroke();

 const lado = 440;
 const qx = (ANCHO - lado) / 2;
 const qy = 316;
 const hueco = lado * 0.24;
 dibujarQR(ctx, { texto: url, x: qx, y: qy, lado, hueco: logo ? hueco : 0 });

 if (logo) {
  const caja = hueco + 16;
  ctx.fillStyle = "#ffffff";
  rectRedondo(ctx, qx + (lado - caja) / 2, qy + (lado - caja) / 2, caja, caja, 16);
  ctx.fill();
  const tam = hueco * 0.92;
  ctx.drawImage(logo, qx + (lado - tam) / 2, qy + (lado - tam) / 2, tam, tam);
 }

 // Direccion
 ctx.fillStyle = T.color.superficie2;
 rectRedondo(ctx, 60, 826, ANCHO - 120, 60, 12);
 ctx.fill();
 ctx.strokeStyle = T.color.borde;
 ctx.lineWidth = 1.5;
 rectRedondo(ctx, 60, 826, ANCHO - 120, 60, 12);
 ctx.stroke();
 ctx.fillStyle = T.color.tinta2;
 ctx.font = `500 18px ${T.fuente.mono}`;
 ctx.fillText(ajustar(ctx, url, ANCHO - 160), ANCHO / 2, 863);

 // Pie
 ctx.fillStyle = T.color.tinta4;
 ctx.font = `500 15px ${T.fuente.ui}`;
 ctx.fillText("Ingresa con el usuario y la contraseña asignados", ANCHO / 2, 936);

 return lienzo;
}

export function descargarCanvas(canvas, nombre) {
 if (!canvas) return;
 if (canvas.toBlob) {
  canvas.toBlob(blob => {
   if (!blob) return;
   const href = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = href;
   a.download = nombre;
   document.body.appendChild(a);
   a.click();
   a.remove();
   setTimeout(() => URL.revokeObjectURL(href), 1000);
  }, 'image/png');
  return;
 }
 const a = document.createElement('a');
 a.href = canvas.toDataURL('image/png');
 a.download = nombre;
 a.click();
}

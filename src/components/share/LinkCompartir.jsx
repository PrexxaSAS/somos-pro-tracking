import React, { useState, useEffect, useRef } from 'react';
import { Copy, Download, MessageCircle } from 'lucide-react';
import { T } from '../../design/tokens';
import { ModalForm, Seccion } from '../ui/formularios';
import { tarjetaQR, descargarCanvas } from '../../utils/qr';
import logoSrc from '../../../Logo.png';

// Pasos que sigue el conductor en su celular. Se escriben aqui y no en la
// pantalla para que la lista no se mezcle con el diseno.
const PASOS = [
 "Abre el enlace desde el navegador del celular (Chrome o Safari).",
 "Ingresa con el usuario y la contrasena asignados.",
 "Agregar a la pantalla de inicio para usarla como app:",
];

const ATAJOS = [
 { sistema: "Android · Chrome", pasos: 'Menu ⋮ → "Anadir a pantalla de inicio"' },
 { sistema: "iPhone · Safari", pasos: 'Compartir → "Anadir a pantalla de inicio"' },
];

export function LinkCompartir({ onClose }) {
 // La URL sin parametros ni ancla: es la que hay que abrir en el celular.
 const url = window.location.href.split("?")[0].replace(/#.*$/, "");
 const [copiado, setCopiado] = useState(false);
 const [listo, setListo] = useState(false);
 const lienzo = useRef(null);

 // La tarjeta se dibuja una vez y sirve para la vista previa y para la
 // descarga: lo que se ve en el modal es exactamente el archivo que se guarda.
 useEffect(() => {
  let vivo = true;
  setListo(false);
  tarjetaQR(url, logoSrc, lienzo.current).then(() => { if (vivo) setListo(true); });
  return () => { vivo = false; };
 }, [url]);

 const descargar = () => descargarCanvas(lienzo.current, "qr-somos-pro-tracking.png");

 const copiar = async () => {
  try {
   await navigator.clipboard.writeText(url);
  } catch {
   // Sin permiso de portapapeles: se copia con un campo temporal.
   const el = document.createElement("input");
   el.value = url;
   document.body.appendChild(el);
   el.select();
   document.execCommand("copy");
   document.body.removeChild(el);
  }
  setCopiado(true);
  setTimeout(() => setCopiado(false), 2000);
 };

 const enviarPorWhatsApp = () => {
  const texto = `Accede a Somos PRO Tracking desde tu celular: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
 };

 return (
  <ModalForm
   titulo="Compartir app con conductores"
   descripcion="Acceso desde el celular con el enlace o el codigo QR"
   onClose={onClose}
   onPrimario={onClose}
   textoPrimario="Listo"
   textoCancelar="Cerrar"
  >
   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
    <div style={{
     width: 290, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta,
     overflow: "hidden", background: T.color.superficie2,
     opacity: listo ? 1 : 0, transition: "opacity .2s",
    }}>
     <canvas ref={lienzo} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
    <button onClick={descargar} disabled={!listo} style={{
     display: "inline-flex", alignItems: "center", gap: 7,
     height: 38, padding: "0 16px", borderRadius: T.radio.boton,
     border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
     color: T.color.tinta2, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
     cursor: listo ? "pointer" : "not-allowed", opacity: listo ? 1 : 0.6,
    }}>
     <Download size={15} /> Descargar imagen
    </button>
   </div>

   <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>Enlace directo</label>
    <div style={{ display: "flex", gap: 8 }}>
     <input readOnly value={url} onFocus={e => e.target.select()}
      style={{
       flex: 1, minWidth: 0, height: 40, padding: "0 12px",
       border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
       fontFamily: T.fuente.mono, fontSize: 12.5, color: T.color.tinta2,
       background: T.color.superficie2, outline: "none",
      }}/>
     <button onClick={copiar} style={{
      display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 14px",
      border: `1px solid ${copiado ? T.color.bienPunto : T.color.borde2}`,
      borderRadius: T.radio.control, cursor: "pointer", fontFamily: "inherit",
      fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
      background: copiado ? T.color.bienSuave : T.color.superficie,
      color: copiado ? T.color.bien : T.color.tinta2,
     }}>
      <Copy size={15} /> {copiado ? "Copiado" : "Copiar"}
     </button>
    </div>
   </div>

   <Seccion titulo="Instrucciones para el conductor" />
   <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
    {PASOS.map((paso, i) => (
     <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{
       width: 22, height: 22, borderRadius: 11, flexShrink: 0,
       background: T.color.marcaSuave, color: T.color.marca,
       display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
      }}>{i + 1}</span>
      <span style={{ fontSize: 13, color: T.color.tinta2, lineHeight: 1.5 }}>{paso}</span>
     </li>
    ))}
   </ol>

   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginLeft: 32 }}>
    {ATAJOS.map(a => (
     <div key={a.sistema} style={{
      background: T.color.superficie2, border: `1px solid ${T.color.borde}`,
      borderRadius: T.radio.control, padding: "10px 12px",
     }}>
      <div style={{ ...T.texto.seccion, color: T.color.placeholder, marginBottom: 5 }}>{a.sistema}</div>
      <div style={{ fontSize: 12.5, color: T.color.tinta2, lineHeight: 1.45 }}>{a.pasos}</div>
     </div>
    ))}
   </div>

   <button onClick={enviarPorWhatsApp} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    height: 38, padding: "0 16px", borderRadius: T.radio.boton,
    border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
    color: T.color.tinta2, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
   }}>
    <MessageCircle size={15} /> Enviar por WhatsApp
   </button>
  </ModalForm>
 );
}

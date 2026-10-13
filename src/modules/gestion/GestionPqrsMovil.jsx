import React, { useRef, useState } from 'react';
import { Check, FileText, HelpCircle, History, Paperclip, Plus, X } from 'lucide-react';
import { T } from '../../design/tokens';
import { fileToBase64 } from '../../utils/files';
import { fechaCorta } from '../pedidos/DetallePedidoMovil';
import { hoyLocal } from '../../utils/fechas';

// Disenio 20: admin y operador gestionan una PQRS desde el celular. Misma
// estructura que la gestion de devoluciones (19): pantalla completa, cabecera
// fija con cerrar, titulo y numero, y pie con dos acciones, "Registrar
// gestion" (primaria) y "Cerrar PQRS" (verde). Cancelar es la X.
//
// El tipo de PQRS va como rotulo y la descripcion como titulo de la tarjeta,
// no como una celda que se parte en seis lineas. Debajo, filas etiqueta/valor
// y el tiempo que lleva abierta en ambar: es lo que define la urgencia y la
// grilla de escritorio no lo muestra.
//
// La base guarda UNA gestion por PQRS (respuesta, gestionado_por,
// fecha_gestion). El disenio dibuja un historial de varias; aqui la gestion
// registrada se muestra como esa linea de tiempo, con una sola entrada, y
// despues de registrada ya solo se puede cerrar. Permitir varias es un cambio
// de datos, no de pantalla.
//
// Esta pantalla no decide nada: llama a los mismos onRegistrar y onCerrar que
// el modal de escritorio.

const MAX = 500;

const diasAbierta = (iso) => {
 if (!iso) return null;
 const a = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
 const b = new Date(`${hoyLocal()}T12:00:00`);
 return Math.max(0, Math.round((b - a) / 86400000));
};

function Fila({ etiqueta, valor, mono, ambar }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "6px 0", borderTop: `1px solid ${T.color.divisor}`, fontSize: 13 }}>
   <span style={{ width: 96, flexShrink: 0, color: T.color.tinta3, fontSize: 12, paddingTop: 1 }}>{etiqueta}</span>
   <span style={{ flex: 1, minWidth: 0, lineHeight: 1.4, color: ambar ? T.color.ojo : T.color.tinta, fontWeight: ambar ? 600 : 500, fontFamily: mono ? T.fuente.mono : "inherit" }}>{valor}</span>
  </div>
 );
}

export function GestionPqrsMovil({ item, onClose, onRegistrar, onCerrar, onSoporte, showToast, puedeGestionar = true }) {
 const [texto, setTexto] = useState("");
 const [soporte, setSoporte] = useState({ data: null, nombre: "", tamano: 0 });
 const [guardando, setGuardando] = useState(false);
 const archivoRef = useRef(null);

 const cerrada = item.estado === "cerrada" || item.estado === "rechazada";
 const yaGestionada = Boolean((item.respuesta || "").trim() || item.fecha_gestion || item.gestionado_por);
 const dias = diasAbierta(item.fecha_creacion);

 const chip = item.estado === "abierta" ? { bg: T.color.ojoSuave, color: T.color.ojo, punto: T.color.ojoPunto, label: "Abierta" }
  : item.estado === "en_gestion" ? { bg: T.color.marcaSuave, color: T.color.marca, punto: T.estado.en_transito, label: "En gestion" }
  : item.estado === "rechazada" ? { bg: T.color.superficie3, color: T.color.tinta2, punto: T.color.neutroPunto, label: "Rechazada" }
  : { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, label: "Cerrada" };

 const pista = cerrada ? "Caso cerrado"
  : yaGestionada ? `1 gestion${dias != null ? ` · abierta hace ${dias} ${dias === 1 ? "dia" : "dias"}` : ""}`
  : "Registra la respuesta al cliente";

 const elegirArchivo = async (files) => {
  const file = files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast("El archivo pesa mas de 5 MB", "error"); return; }
  const data = await fileToBase64(file);
  setSoporte({ data, nombre: file.name, tamano: file.size });
 };

 const puedeRegistrar = puedeGestionar && !cerrada && !yaGestionada && texto.trim().length > 0;
 // Igual que en escritorio: se puede cerrar con una respuesta registrada o
 // con una escrita. Ojo: cerrar no guarda lo escrito, por eso se avisa.
 const puedeCerrar = puedeGestionar && !cerrada && (yaGestionada || texto.trim().length > 0);

 const registrar = async () => {
  setGuardando(true);
  await onRegistrar(texto, { data: soporte.data, nombre: soporte.nombre });
  setGuardando(false);
 };

 const cerrar = () => {
  const aviso = !yaGestionada && texto.trim()
   ? "La respuesta escrita no se ha registrado y no quedara guardada. ¿Cerrar la PQRS de todos modos?"
   : "¿Cerrar esta PQRS? El cliente ya no podra editarla.";
  if (!window.confirm(aviso)) return;
  onCerrar();
 };

 const kb = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

 return (
  <div style={{ position: "fixed", inset: 0, zIndex: 118, background: T.color.fondo, display: "flex", flexDirection: "column", color: T.color.tinta }}>
   <header style={{ flexShrink: 0, padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10, paddingTop: `calc(14px + env(safe-area-inset-top, 0px))` }}>
    <button onClick={onClose} title="Cerrar" style={{ width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, padding: 0, background: T.color.superficie, border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2 }}>
     <X size={18} />
    </button>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
     <span style={{ fontSize: 14, fontWeight: 600 }}>PQRS</span>
     <span style={{ fontSize: 11, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{item.id}</span>
    </div>
    <span style={{ width: 38, flexShrink: 0 }} />
   </header>

   <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 2px", flexWrap: "wrap" }}>
     <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: T.radio.pastilla, background: chip.bg, color: chip.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: chip.punto }} />{chip.label}
     </span>
     <span style={{ fontSize: 12, color: T.color.tinta3 }}>{pista}</span>
    </div>

    <section style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta, padding: "4px 14px 6px", display: "flex", flexDirection: "column" }}>
     <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
       <HelpCircle size={16} style={{ color: T.color.marca }} />
       <span style={{ ...T.texto.seccion, color: T.color.placeholder }}>{item.descripcion ? item.motivo : "PQRS"}</span>
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{item.descripcion || item.motivo}</span>
     </div>
     <Fila etiqueta="Factura" valor={item.factura || "—"} mono />
     <Fila etiqueta="Pedido" valor={item.pedido_ref || "—"} mono />
     <Fila etiqueta="Reportado por" valor={item.solicitado_por || "—"} />
     <Fila etiqueta="Fecha" valor={fechaCorta(item.fecha_creacion) || "—"} />
     {!cerrada && dias != null && (
      <Fila etiqueta="Abierta hace" valor={`${dias} ${dias === 1 ? "dia" : "dias"}`} ambar />
     )}
    </section>

    {yaGestionada && (
     <section style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta, padding: "4px 14px 6px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 10px" }}>
       <History size={16} style={{ color: T.color.marca }} />
       <span style={{ fontWeight: 700, fontSize: 14 }}>Gestiones</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr)", gap: 10 }}>
       <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4, background: T.color.marca, border: `2px solid ${T.color.marca}` }} />
       </div>
       <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingBottom: 10 }}>
        <span style={{ fontSize: 13, lineHeight: 1.45 }}>{item.respuesta || "Gestion registrada"}</span>
        <span style={{ fontSize: 12, color: T.color.tinta4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
         {[item.gestionado_por, fechaCorta(item.fecha_gestion)].filter(Boolean).join(" · ")}
         {(item.soporte_nombre || item.soporte_data) && (
          <button onClick={() => onSoporte(item)} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.color.marca, fontWeight: 600, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
           <Paperclip size={12} /> {item.soporte_nombre || "Soporte"}
          </button>
         )}
        </span>
       </div>
      </div>
     </section>
    )}

    {puedeGestionar && !cerrada && !yaGestionada && (
     <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
       <span style={{ ...T.texto.seccion, color: T.color.placeholder, whiteSpace: "nowrap" }}>Gestion</span>
       <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
       <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>Respuesta / gestion realizada <span style={{ color: T.color.mal }}>•</span></span>
       <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${texto ? T.color.marca : T.color.borde2}`, boxShadow: texto ? `0 0 0 3px ${T.color.marcaSuave}` : "none", borderRadius: 12, padding: 12, background: T.color.superficie }}>
        <textarea value={texto} onChange={e => setTexto(e.target.value.slice(0, MAX))} rows={4}
         placeholder="Que se hizo y que se le respondio al cliente"
         style={{ border: "none", outline: "none", resize: "vertical", minHeight: 84, padding: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, lineHeight: 1.45, color: T.color.tinta }} />
        <span style={{ alignSelf: "flex-end", fontSize: 11, color: T.color.placeholder }}>{texto.length} / {MAX}</span>
       </div>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
       <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>Soporte de gestion <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span></span>
       {soporte.nombre ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie }}>
         <span style={{ width: 36, height: 36, borderRadius: 9, background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center", flexShrink: 0 }}><FileText size={16} /></span>
         <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{soporte.nombre}</span>
          <span style={{ fontSize: 12, color: T.color.tinta3 }}>{kb(soporte.tamano)}</span>
         </div>
         <button onClick={() => setSoporte({ data: null, nombre: "", tamano: 0 })} title="Quitar" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: T.color.placeholder, display: "grid", placeItems: "center" }}><X size={16} /></button>
        </div>
       ) : (
        <button onClick={() => archivoRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1.5px dashed ${T.color.tenue}`, borderRadius: 12, background: T.color.hoverFila, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
         <span style={{ width: 40, height: 40, borderRadius: 10, background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center", flexShrink: 0 }}><Paperclip size={18} /></span>
         <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta }}>Adjuntar archivo</span>
          <span style={{ fontSize: 12, color: T.color.tinta3 }}>PDF, JPG o PNG · maximo 5 MB</span>
         </span>
         <Plus size={18} style={{ color: T.color.marca }} />
        </button>
       )}
       <input ref={archivoRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: "none" }}
        onChange={ev => { elegirArchivo(ev.target.files); ev.target.value = ""; }} />
      </div>
     </>
    )}

    {puedeGestionar && !cerrada && yaGestionada && (
     <div style={{ padding: "10px 12px", borderRadius: 10, background: T.color.superficie3, fontSize: 12.5, color: T.color.tinta2, lineHeight: 1.45 }}>
      La respuesta ya fue registrada y no se puede editar. Lo que queda es cerrar la PQRS.
     </div>
    )}
   </div>

   <footer style={{ flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px", background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`, paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}>
    {puedeGestionar && !cerrada ? (
     <>
      <button onClick={cerrar} disabled={!puedeCerrar} style={{
       display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 48, padding: "0 14px", borderRadius: 12,
       background: yaGestionada ? T.color.bienPunto : T.color.superficie, border: `1px solid ${yaGestionada ? T.color.bienPunto : T.color.bienSuave}`,
       color: yaGestionada ? "#fff" : T.color.bien, fontFamily: "inherit", fontSize: 14, fontWeight: 600,
       cursor: puedeCerrar ? "pointer" : "not-allowed", opacity: puedeCerrar ? 1 : 0.5, flexShrink: 0,
      }}><Check size={16} /> Cerrar PQRS</button>
      <button onClick={registrar} disabled={!puedeRegistrar || guardando} style={{
       flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, border: "none",
       background: T.color.marca, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
       cursor: !puedeRegistrar || guardando ? "not-allowed" : "pointer", opacity: !puedeRegistrar || guardando ? 0.5 : 1,
      }}>{guardando ? "Registrando..." : "Registrar gestion"}</button>
     </>
    ) : (
     <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.color.borde2}`, background: T.color.superficie, color: T.color.tinta2, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
    )}
   </footer>
  </div>
 );
}

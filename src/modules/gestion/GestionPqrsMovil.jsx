import React from 'react';
import { Check, HelpCircle, Paperclip, X } from 'lucide-react';
import { T } from '../../design/tokens';
import { fechaCorta } from '../pedidos/DetallePedidoMovil';
import { hoyLocal } from '../../utils/fechas';
import { HiloPqrs } from './HiloPqrs';

// Disenio 20: la PQRS en el celular. Pantalla completa, cabecera fija con
// cerrar, titulo y numero; el tipo va como rotulo y la descripcion como titulo
// de la tarjeta, con filas etiqueta/valor y el tiempo que lleva abierta en
// ambar, que es lo que define la urgencia.
//
// Debajo, el hilo de observaciones (HiloPqrs), el mismo del escritorio:
// logistica y el cliente interno escriben cuantas veces necesiten hasta que se
// cierre. El pie lleva "Cerrar PQRS" para logistica y "Reabrir" para el admin
// cuando ya esta cerrada.
//
// Esta pantalla no decide nada: llama a los mismos onCerrar y onReabrir que el
// modal de escritorio, y el borrador lo lleva el modulo para que al cerrar se
// guarde lo que quedo escrito.

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

export function GestionPqrsMovil({
 item, onClose, onCerrar, onReabrir, onSoporte, showToast, puedeGestionar = true, esAdmin = false,
 usuarioId, puedeEscribir = false, borrador = "", setBorrador, onCambio, onCargado, hayObservaciones = 0,
}) {
 const cerrada = item.estado === "cerrada" || item.estado === "rechazada";
 const yaGestionada = Boolean((item.respuesta || "").trim() || item.fecha_gestion || item.gestionado_por);
 const dias = diasAbierta(item.fecha_creacion);

 const chip = item.estado === "abierta" ? { bg: T.color.ojoSuave, color: T.color.ojo, punto: T.color.ojoPunto, label: "Abierta" }
  : item.estado === "en_gestion" ? { bg: T.estadoTono.en_transito.bg, color: T.estadoTono.en_transito.color, punto: T.estado.en_transito, label: "En gestion" }
  : item.estado === "rechazada" ? { bg: T.color.superficie3, color: T.color.tinta2, punto: T.color.neutroPunto, label: "Rechazada" }
  : { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, label: "Cerrada" };

 const pista = cerrada ? "Caso cerrado"
  : dias != null ? `Abierta hace ${dias} ${dias === 1 ? "dia" : "dias"}` : "";

 // Se cierra con al menos una observacion, registrada o escrita.
 const puedeCerrar = puedeGestionar && !cerrada && (yaGestionada || hayObservaciones > 0 || String(borrador || "").trim().length > 0);
 const cerrar = () => {
  if (!window.confirm("¿Cerrar esta PQRS? Ya no se podrán agregar observaciones.")) return;
  onCerrar();
 };

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
      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, whiteSpace: "pre-line" }}>{item.descripcion || item.motivo}</span>
     </div>
     <Fila etiqueta="Factura" valor={item.factura || "—"} mono />
     <Fila etiqueta="Pedido" valor={item.pedido_ref || "—"} mono />
     <Fila etiqueta="Reportado por" valor={item.solicitado_por || "—"} />
     <Fila etiqueta="Fecha" valor={fechaCorta(item.fecha_creacion) || "—"} />
     {(item.soporte_nombre || item.soporte_data) && (
      <Fila etiqueta="Soporte" valor={
       <button onClick={() => onSoporte(item)} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.color.marca, fontWeight: 600, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
        <Paperclip size={13} /> {item.soporte_nombre || "Ver soporte"}
       </button>
      } />
     )}
    </section>

    <section style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta, padding: 14 }}>
     <HiloPqrs pqrs={item} usuarioId={usuarioId} puedeEscribir={puedeEscribir}
      borrador={borrador} setBorrador={setBorrador || (() => {})} onCambio={onCambio} onCargado={onCargado} showToast={showToast} />
    </section>
   </div>

   <footer style={{ flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px", background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`, paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}>
    {puedeGestionar && !cerrada ? (
     <button onClick={cerrar} disabled={!puedeCerrar} style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 12, border: "none",
      background: T.color.bienPunto, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
      cursor: puedeCerrar ? "pointer" : "not-allowed", opacity: puedeCerrar ? 1 : 0.5,
     }}><Check size={16} /> Cerrar PQRS</button>
    ) : esAdmin && cerrada ? (
     <button onClick={() => { if (window.confirm("¿Reabrir esta PQRS?")) onReabrir(); }} style={{
      flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
      color: T.color.marca, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
     }}>Reabrir PQRS</button>
    ) : (
     <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.color.borde2}`, background: T.color.superficie, color: T.color.tinta2, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
    )}
   </footer>
  </div>
 );
}

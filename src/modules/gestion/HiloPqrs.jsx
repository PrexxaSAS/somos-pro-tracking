import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { T } from '../../design/tokens';
import { supabase } from '../../supabase';

// Hilo de observaciones de una PQRS, como un chat (docs/pqrs_observaciones.sql).
// Logistica y el cliente interno que la radico escriben mientras la PQRS esta
// abierta o en gestion; cerrada, el hilo es de solo lectura. El autor y la
// fecha los pone la base. Lo usan el modal de escritorio y la pantalla del
// celular.
//
// borrador/setBorrador los lleva quien lo usa: al cerrar la PQRS con algo
// escrito, ese texto se guarda primero como observacion.

const MAX = 1000;

export async function agregarObservacionPqrs(pqrsId, mensaje) {
 const texto = String(mensaje || "").trim();
 if (!texto) return { error: { message: "Escribe la observacion" } };
 return supabase.from('pqrs_observaciones').insert({ pqrs_id: pqrsId, mensaje: texto });
}

const fechaHora = (iso) => {
 const d = iso ? new Date(iso) : null;
 if (!d || isNaN(d)) return "";
 return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function HiloPqrs({ pqrs, usuarioId, puedeEscribir, borrador, setBorrador, onCambio, onCargado, showToast }) {
 const [obs, setObs] = useState([]);
 const [cargando, setCargando] = useState(true);
 const [enviando, setEnviando] = useState(false);
 // El cuadro del chat tiene alto maximo y su propio desplazamiento.
 const caja = useRef(null);

 const cargar = async () => {
  const { data, error } = await supabase.from('pqrs_observaciones')
   .select('id,mensaje,autor_id,autor_nombre,autor_rol,created_at')
   .eq('pqrs_id', pqrs.id).order('created_at');
  if (error) showToast?.("No se pudieron cargar las observaciones", "error");
  setObs(data || []);
  setCargando(false);
  onCargado?.((data || []).length);
 };
 useEffect(() => { setCargando(true); cargar(); }, [pqrs.id]);
 // Mensaje nuevo en vivo (lo emite la app al recibirlo de la base).
 useEffect(() => {
  const alLlegar = (e) => { if (e.detail?.pqrs_id === pqrs.id) cargar(); };
  window.addEventListener('pqrs-observacion', alLlegar);
  return () => window.removeEventListener('pqrs-observacion', alLlegar);
 }, [pqrs.id]);
 // Se baja al ultimo mensaje moviendo solo el cuadro del chat; scrollIntoView
 // movia tambien la ventana o la pantalla entera.
 useEffect(() => { if (caja.current) caja.current.scrollTop = caja.current.scrollHeight; }, [obs.length, cargando]);

 // Las PQRS respondidas antes de existir el hilo tienen su respuesta solo en
 // pqrs.respuesta: se muestra como la primera observacion, salvo que ya este
 // en el hilo (la primera observacion de logistica se copia ahi).
 const respuesta = String(pqrs.respuesta || "").trim();
 const entradas = respuesta && !obs.some(o => String(o.mensaje || "").trim() === respuesta)
  ? [{ id: "respuesta", mensaje: respuesta, autor_nombre: pqrs.gestionado_por, autor_rol: "operador", fecha: pqrs.fecha_gestion }, ...obs]
  : obs;

 const enviar = async () => {
  if (!String(borrador || "").trim()) return;
  setEnviando(true);
  const { error } = await agregarObservacionPqrs(pqrs.id, borrador);
  setEnviando(false);
  if (error) { showToast?.(error.message || "No se pudo guardar la observacion", "error"); return; }
  setBorrador("");
  await cargar();
  onCambio?.();
 };

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
   <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>Observaciones</span>
   <div ref={caja} style={{
    display: "flex", flexDirection: "column", gap: 8, padding: 10, maxHeight: "min(320px, 45vh)", overflowY: "auto", overscrollBehavior: "contain",
    background: T.color.superficie2, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.control,
   }}>
    {cargando ? <span style={{ fontSize: 12.5, color: T.color.tinta3, padding: 6 }}>Cargando...</span>
     : entradas.length === 0 ? <span style={{ fontSize: 12.5, color: T.color.tinta3, padding: 6 }}>Aún no hay observaciones.</span>
     : entradas.map(o => {
      const propia = usuarioId && o.autor_id === usuarioId;
      const deLogistica = ["admin", "operador"].includes(o.autor_rol);
      return (
       <div key={o.id} style={{ display: "flex", justifyContent: propia ? "flex-end" : "flex-start", flexShrink: 0 }}>
        <div style={{
         maxWidth: "85%", padding: "8px 11px", borderRadius: 12,
         borderTopRightRadius: propia ? 4 : 12, borderTopLeftRadius: propia ? 12 : 4,
         background: propia ? T.color.marcaSuave : T.color.superficie,
         border: `1px solid ${propia ? T.color.marcaSuave : T.color.borde}`,
        }}>
         <div style={{ fontSize: 11.5, fontWeight: 700, color: deLogistica ? T.color.marca : T.color.tinta2, marginBottom: 2 }}>
          {o.autor_nombre || "—"}{deLogistica ? " · Logística" : ""}
         </div>
         <div style={{ fontSize: 13.5, lineHeight: 1.45, color: T.color.tinta, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{o.mensaje}</div>
         <div style={{ fontSize: 11, color: T.color.tinta4, marginTop: 3, textAlign: "right" }}>
          {o.created_at ? fechaHora(o.created_at) : o.fecha || ""}
         </div>
        </div>
       </div>
      );
     })}
   </div>

   {puedeEscribir ? (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
     <textarea value={borrador} onChange={e => setBorrador(e.target.value.slice(0, MAX))} rows={2}
      placeholder="Escribe una observación..." aria-label="Nueva observacion"
      style={{
       flex: 1, minWidth: 0, resize: "vertical", padding: "9px 11px", fontFamily: "inherit", fontSize: 14, lineHeight: 1.4,
       border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, color: T.color.tinta, background: T.color.superficie,
      }} />
     <button onClick={enviar} disabled={enviando || !String(borrador || "").trim()} title="Agregar observacion" style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 14px", flexShrink: 0,
      border: "none", borderRadius: T.radio.control, background: T.color.marca, color: "#fff",
      fontFamily: "inherit", fontSize: 13, fontWeight: 600,
      cursor: enviando || !String(borrador || "").trim() ? "not-allowed" : "pointer",
      opacity: enviando || !String(borrador || "").trim() ? 0.5 : 1,
     }}><Send size={15} /> {enviando ? "Enviando..." : "Agregar"}</button>
    </div>
   ) : (
    <span style={{ fontSize: 12, color: T.color.tinta3 }}>La PQRS está cerrada: el historial es de solo lectura.</span>
   )}
  </div>
 );
}

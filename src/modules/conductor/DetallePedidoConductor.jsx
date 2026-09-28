import React, { useState, useRef } from 'react';
import {
 AlertTriangle, Boxes, CalendarClock, Camera, Check, ChevronDown, ChevronLeft, FileText,
 MapPin, Navigation, PackageCheck, Plus, X,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';
import { leerFotos } from '../../utils/images';
import { Bloque, Fila, fechaCorta, sumarDias } from '../pedidos/DetallePedidoMovil';
import { abrirEnMapa } from './PantallasConductor';

// Disenio 18: el detalle del pedido para quien lo va a entregar. Pantalla
// completa, no modal. Cabecera fija con volver y el numero de parada, pie fijo
// con Guia, Mapa y la accion primaria. El orden es el de la calle: primero a
// donde va, despues que lleva, y al final el soporte.
//
// Las fotos y la novedad se eligen aqui, en la tarjeta de soporte, y la
// primaria abre el flujo de confirmacion ya con eso puesto. Con la novedad
// marcada la primaria pasa a rojo y pide el motivo antes de seguir.

const MAX_FOTOS = 3;

// Motivos frecuentes: el conductor toca uno en vez de escribir con el motor
// andando. "Otro" deja el detalle para las observaciones del flujo.
export const MOTIVOS_NOVEDAD = [
 "Entrega parcial · falto mercancia",
 "Cliente no recibio",
 "Direccion no encontrada",
 "Mercancia averiada",
 "Establecimiento cerrado",
 "Otro",
];

const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
};

const botonPie = {
 width: 48, height: 48, display: "grid", placeItems: "center", flexShrink: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`, borderRadius: 12,
 color: T.color.tinta4, cursor: "pointer", padding: 0,
};

const horaCorta = () => {
 const d = new Date();
 return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function DetallePedidoConductor({
 pedido, parada, totalParadas, promesa,
 onCerrar, onGuia, onEntregar, onVerSoportes,
 // Para que la prueba dibuje cada caso sin simular los toques.
 novedadInicial = false, fotosInicial = [],
}) {
 const [fotos, setFotos] = useState(fotosInicial);
 const [novedad, setNovedad] = useState(novedadInicial);
 const [motivo, setMotivo] = useState("");
 const camRef = useRef(null);

 const cerrado = ["entregado", "novedad"].includes(pedido.estado);
 const punto = T.estado[pedido.estado] || T.color.neutroPunto;
 const tonoChip = pedido.estado === "novedad"
  ? { bg: T.color.malSuave, color: T.color.mal }
  : cerrado ? { bg: T.color.bienSuave, color: T.color.bien }
  : { bg: T.color.marcaSuave, color: T.color.marca };

 const limite = promesa && pedido.fecha_creacion
  ? sumarDias(pedido.fecha_creacion, promesa.dias_plazo)
  : pedido.fecha_estimada || null;

 const agregar = async (files) => {
  const nuevas = await leerFotos(files, MAX_FOTOS - fotos.length);
  setFotos(prev => [...prev, ...nuevas.map(f => ({ ...f, hora: horaCorta() }))].slice(0, MAX_FOTOS));
 };
 const quitar = (i) => setFotos(prev => prev.filter((_, j) => j !== i));

 // Con novedad, el motivo es obligatorio: sin el no se abre el flujo.
 const faltaMotivo = novedad && !motivo;
 const primaria = () => onEntregar({
  fotos, conNovedad: novedad,
  observaciones: novedad && motivo ? `Novedad: ${motivo}` : "",
 });

 const soportesGuardados = (pedido.soportes || []).length;

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 110, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <button onClick={onCerrar} title="Volver" style={botonCabecera}><ChevronLeft size={18} /></button>
    <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: T.color.tinta3 }}>
     {parada && totalParadas ? `Parada ${parada} de ${totalParadas}` : cerrado ? "Entregado" : "Pedido"}
    </span>
    <span style={{ width: 38, flexShrink: 0 }} />
   </header>

   <div style={{
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
    display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 20px",
   }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0 6px" }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{pedido.guia_interna || pedido.id}</span>
      <span style={{
       display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600,
       padding: "4px 9px", borderRadius: T.radio.pastilla, background: tonoChip.bg, color: tonoChip.color,
      }}>
       <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
       {ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado}
      </span>
     </div>
     <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.color.tinta3, flexWrap: "wrap" }}>
      {pedido.guia_interna && pedido.guia_interna !== pedido.id && (
       <span style={{ fontFamily: T.fuente.mono }}>{pedido.id}</span>
      )}
      {pedido.fecha_despacho && <span>Despachado {fechaCorta(pedido.fecha_despacho)}</span>}
      {cerrado && pedido.fecha_real
       ? <span>Entregado {fechaCorta(pedido.fecha_real)}</span>
       : limite && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: T.color.ojo, fontWeight: 600 }}>
         <CalendarClock size={13} /> Estimado {fechaCorta(limite)}
        </span>
       )}
     </div>
    </div>

    <Bloque icono={MapPin} titulo="Entrega">
     <Fila etiqueta="Cliente" valor={pedido.cliente || "Sin cliente"} falta={!pedido.cliente} />
     <Fila etiqueta="Direccion" valor={pedido.direccion || "Sin direccion"} falta={!pedido.direccion}
      icono={pedido.direccion ? Navigation : null}
      onIcono={() => abrirEnMapa(pedido.direccion, pedido.ciudad_nombre)} />
     <Fila etiqueta="Ciudad" valor={pedido.ciudad_nombre || "Sin ciudad"} falta={!pedido.ciudad_nombre} />
    </Bloque>

    <Bloque icono={Boxes} titulo="Carga">
     <Fila etiqueta="Cajas" valor={pedido.cajas ? String(pedido.cajas) : "Sin registrar"} falta={!pedido.cajas} />
     <Fila etiqueta="Factura" valor={pedido.factura || "Sin factura"} falta={!pedido.factura} mono={!!pedido.factura} />
     {pedido.notas && <Fila etiqueta="Notas" valor={pedido.notas} />}
    </Bloque>

    {/* Soporte: cerrado se lee, abierto se llena. */}
    <section style={{
     background: T.color.superficie, borderRadius: T.radio.tarjeta,
     border: `1px solid ${novedad ? T.color.malBorde : T.color.borde}`,
     padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 10,
    }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 0" }}>
      <Camera size={16} style={{ color: T.color.marca }} />
      <span style={{ fontWeight: 700, fontSize: 14 }}>Soporte de entrega</span>
      <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: cerrado || fotos.length ? T.color.marca : T.color.placeholder }}>
       {cerrado ? `${soportesGuardados} ${soportesGuardados === 1 ? "foto" : "fotos"}` : `${fotos.length}/${MAX_FOTOS}`}
      </span>
     </div>

     {cerrado ? (
      soportesGuardados > 0 ? (
       <button onClick={() => onVerSoportes(pedido)} style={{
        display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, cursor: "pointer",
        border: `1px solid ${T.color.borde2}`, background: T.color.hoverFila, fontFamily: "inherit", textAlign: "left",
       }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center", flexShrink: 0 }}>
         <FileText size={18} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
         <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta }}>Ver soporte</span>
         <span style={{ fontSize: 12, color: T.color.tinta3 }}>{soportesGuardados} {soportesGuardados === 1 ? "archivo" : "archivos"} guardados</span>
        </span>
       </button>
      ) : (
       <span style={{ fontSize: 13, color: T.color.tinta3 }}>Sin soporte guardado.</span>
      )
     ) : fotos.length === 0 ? (
      <button onClick={() => camRef.current?.click()} style={{
       display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, cursor: "pointer",
       border: `1.5px dashed ${T.color.tenue}`, background: T.color.hoverFila, fontFamily: "inherit", textAlign: "left",
      }}>
       <span style={{ width: 40, height: 40, borderRadius: 10, background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Camera size={18} />
       </span>
       <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta }}>Cargar fotos de entrega</span>
        <span style={{ fontSize: 12, color: T.color.tinta3 }}>Maximo {MAX_FOTOS} · JPG o PNG</span>
       </span>
       <Plus size={18} style={{ color: T.color.marca }} />
      </button>
     ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
       {fotos.map((f, i) => (
        <div key={i} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", position: "relative", background: T.color.borde2 }}>
         <img src={f.data} alt={`Soporte ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
         <button onClick={() => quitar(i)} title="Quitar foto" style={{
          position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, padding: 0,
          background: "rgba(23,20,31,.7)", color: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center",
         }}><X size={11} /></button>
         {f.hora && (
          <span style={{ position: "absolute", left: 6, bottom: 6, fontSize: 10, fontWeight: 600, color: "#fff", background: "rgba(23,20,31,.6)", padding: "1px 6px", borderRadius: 4 }}>{f.hora}</span>
         )}
        </div>
       ))}
       {fotos.length < MAX_FOTOS && (
        <button onClick={() => camRef.current?.click()} title="Otra foto" style={{
         aspectRatio: "1", borderRadius: 10, cursor: "pointer", border: `1.5px dashed ${T.color.tenue}`,
         background: T.color.hoverFila, color: T.color.marca, display: "grid", placeItems: "center",
        }}><Plus size={20} /></button>
       )}
      </div>
     )}

     {!cerrado && (
      <>
       <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={ev => { agregar(ev.target.files); ev.target.value = ""; }} />

       <button onClick={() => setNovedad(!novedad)} style={{
        display: "flex", alignItems: "center", gap: 12, minHeight: 44, border: "none", background: "transparent",
        padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
       }}>
        <span style={{
         width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center",
         border: novedad ? "none" : `2px solid ${T.color.tenue}`, background: novedad ? T.color.mal : T.color.superficie, color: "#fff",
        }}>{novedad && <Check size={13} />}</span>
        <span style={{ fontSize: 13, color: novedad ? T.color.tinta : T.color.tinta2, fontWeight: novedad ? 600 : 400, lineHeight: 1.4 }}>
         Entregar con novedad
        </span>
       </button>

       {novedad && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
         <span style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>
          Motivo <span style={{ color: T.color.mal }}>•</span>
         </span>
         <span style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <select value={motivo} onChange={e => setMotivo(e.target.value)} style={{
           width: "100%", height: 48, boxSizing: "border-box", appearance: "none", WebkitAppearance: "none",
           border: `1px solid ${faltaMotivo ? T.color.malBorde : T.color.borde2}`, borderRadius: 12,
           padding: "0 40px 0 12px", fontSize: 14, fontFamily: "inherit", color: motivo ? T.color.tinta : T.color.placeholder,
           background: T.color.superficie, outline: "none",
          }}>
           <option value="">Elige el motivo</option>
           {MOTIVOS_NOVEDAD.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown size={15} style={{ position: "absolute", right: 12, color: T.color.tinta4, pointerEvents: "none" }} />
         </span>
        </label>
       )}
      </>
     )}
    </section>
   </div>

   <footer style={{
    flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px",
    background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button onClick={onGuia} title="Guia" style={botonPie}><FileText size={17} /></button>
    <button onClick={() => abrirEnMapa(pedido.direccion, pedido.ciudad_nombre)} title="Mapa" style={botonPie} disabled={!pedido.direccion}>
     <Navigation size={17} />
    </button>
    {cerrado ? (
     <span style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48,
      borderRadius: 12, background: T.color.superficie3, color: T.color.tinta3, fontSize: 14, fontWeight: 600,
     }}>
      {pedido.estado === "novedad" ? "Cerrado con novedad" : "Ya entregado"}
     </span>
    ) : (
     <button onClick={primaria} disabled={faltaMotivo} style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48,
      borderRadius: 12, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#fff",
      background: novedad ? T.color.mal : T.color.marca,
      cursor: faltaMotivo ? "not-allowed" : "pointer", opacity: faltaMotivo ? 0.5 : 1,
     }}>
      {novedad
       ? <><AlertTriangle size={16} /> Registrar con novedad</>
       : <><PackageCheck size={16} /> Registrar entrega</>}
     </button>
    )}
   </footer>
  </div>
 );
}

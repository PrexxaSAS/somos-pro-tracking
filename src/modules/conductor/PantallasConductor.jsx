import React, { useState } from 'react';
import {
 AlertTriangle, ArrowDown, ArrowUp, Bell, Boxes, Check, ChevronRight, Clock, MessageSquare, Navigation,
 PackageCheck, RotateCcw, Search, Undo2, UserCheck,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';
import { fechaCorta, sumarDias } from '../pedidos/DetallePedidoMovil';
import { limitePromesa } from '../../utils/promesa';

// Las pantallas del conductor siguen los disenios 15 y 16: el conductor ve solo
// lo suyo, en tarjetas orientadas a la ruta. Arriba lo que necesita para
// llegar (a quien y a donde), abajo lo que necesita para entregar (cuanto y
// cuando), y una accion directa para abrir el mapa. Nada de indicadores
// globales ni de crear: eso es de la central.
//
// Lo que el disenio muestra y los datos no tienen, no se inventa: no hay
// telefono de contacto en pedidos, devoluciones ni recogidas, asi que el boton
// de llamar no existe; y no hay ventana horaria, asi que en su lugar va la
// promesa de entrega.

// ── Cabecera ────────────────────────────────────────────────────────────────
const DIAS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
 "septiembre", "octubre", "noviembre", "diciembre"];

// "Martes 23 de septiembre", con el reloj local: nada de toISOString.
export const fechaLarga = (d = new Date()) =>
 `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

export const iniciales = (nombre) => (nombre || "?")
 .trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta, padding: 0,
 position: "relative",
};

export function CabeceraConductor({ user, sobre, titulo, avisos = 0 }) {
 return (
  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
   <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
    <span style={{ fontSize: 12, color: T.color.tinta3, lineHeight: 1.2 }}>{sobre}</span>
    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{titulo}</h1>
   </div>
   <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
    <button style={botonCabecera} title="Avisos">
     <Bell size={17} />
     {avisos > 0 && (
      <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, background: T.color.malPunto }} />
     )}
    </button>
    <span style={{
     width: 38, height: 38, borderRadius: 19, background: T.color.marcaAvatar, color: T.color.marca,
     display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
    }}>{iniciales(user?.nombre)}</span>
   </div>
  </header>
 );
}

// ── Avance de la ruta ───────────────────────────────────────────────────────
export function ProgresoRuta({ hechas, total, placa }) {
 const pct = total ? Math.round((hechas / total) * 100) : 0;
 return (
  <section style={{
   background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
   padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
  }}>
   <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
    <span style={{ fontSize: 13, color: T.color.tinta2 }}>
     <b style={{ fontSize: 16, fontWeight: 800, color: T.color.tinta }}>{hechas}</b> de {total} entregadas
    </span>
    {placa && <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{placa}</span>}
   </div>
   <div style={{ height: 6, borderRadius: 3, background: T.color.superficie3, overflow: "hidden" }}>
    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: T.color.marca }} />
   </div>
  </section>
 );
}

// ── Buscador y pestanias ────────────────────────────────────────────────────
export function BuscadorConductor({ valor, onChange, placeholder }) {
 return (
  <div style={{ position: "relative" }}>
   <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: T.color.placeholder }} />
   <input value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{
     width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px 0 34px",
     background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
     borderRadius: T.radio.control, fontSize: 16, fontFamily: "inherit",
     color: T.color.tinta, outline: "none",
    }}/>
  </div>
 );
}

// Se salen del relleno lateral para que la ultima no quede cortada al final.
export function Pestanas({ opciones, valor, onChange }) {
 return (
  <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -16px", padding: "0 16px 2px", scrollbarWidth: "none" }}>
   {opciones.map(({ clave, label, n }) => {
    const activo = valor === clave;
    return (
     <button key={clave} onClick={() => onChange(clave)} style={{
      display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px",
      borderRadius: T.radio.pastilla, cursor: "pointer", fontFamily: "inherit",
      fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
      background: activo ? T.color.marca : T.color.superficie,
      color: activo ? "#fff" : T.color.tinta2,
      border: `1px solid ${activo ? T.color.marca : T.color.borde2}`,
     }}>
      {label}
      <span style={{
       fontSize: 11, fontWeight: 700, padding: "0 6px", borderRadius: T.radio.pastilla,
       background: activo ? "rgba(255,255,255,.22)" : T.color.superficie3,
       color: activo ? "#fff" : T.color.tinta3,
      }}>{n}</span>
     </button>
    );
   })}
  </div>
 );
}

export function LineaResumen({ izquierda, derecha }) {
 return (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.color.tinta3, padding: "2px 2px 0" }}>
   <span>{izquierda}</span>
   {derecha && <span style={{ fontWeight: 600, color: T.color.tinta2 }}>{derecha}</span>}
  </div>
 );
}

export function ListaVacia({ children }) {
 return (
  <div style={{
   padding: "40px 20px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3,
   background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
  }}>{children}</div>
 );
}

// ── Piezas de tarjeta ───────────────────────────────────────────────────────
const tarjeta = (borde = T.color.borde) => ({
 background: T.color.superficie, border: `1px solid ${borde}`, borderRadius: 12,
 padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
 width: "100%", textAlign: "left", fontFamily: "inherit", color: T.color.tinta, cursor: "pointer",
});

const pie = {
 display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: T.color.tinta3,
 paddingTop: 10, borderTop: `1px solid ${T.color.divisor}`,
};

const dato = { display: "flex", alignItems: "center", gap: 5, minWidth: 0 };

function Chip({ estado, actual = false }) {
 const punto = T.estado[estado] || T.color.neutroPunto;
 return (
  <span style={{
   marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
   fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: T.radio.pastilla,
   background: actual ? T.color.marcaSuave : T.color.superficie3,
   color: actual ? T.color.marca : T.color.tinta2, whiteSpace: "nowrap", flexShrink: 0,
  }}>
   <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
   {ESTADOS_PEDIDO[estado]?.label || estado}
  </span>
 );
}

// El boton de mapa: abre la direccion en Google Maps. Es la accion directa de
// la tarjeta porque es lo unico que el conductor hace desde la lista sin abrir
// el detalle.
export const abrirEnMapa = (direccion, ciudad) => {
 const destino = [direccion, ciudad, "Colombia"].filter(Boolean).join(", ");
 window.open(`https://maps.google.com/maps?q=${encodeURIComponent(destino)}`, "_blank");
};

function BotonMapa({ direccion, ciudad }) {
 if (!direccion) return null;
 return (
  <button title="Abrir en el mapa" onClick={e => { e.stopPropagation(); abrirEnMapa(direccion, ciudad); }} style={{
   width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, flexShrink: 0,
   background: T.color.marcaSuave, color: T.color.marca, border: "none", cursor: "pointer",
  }}><Navigation size={15} /></button>
 );
}

// Una linea de dos: cliente en negrita y la direccion completa debajo. La
// direccion nunca se recorta: es a donde tiene que llegar.
function Destino({ cliente, direccion, ciudad }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
   {cliente && (
    <span style={{ fontSize: 14, fontWeight: 600, color: T.color.tinta, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
     {cliente}
    </span>
   )}
   <span style={{ fontSize: 13, color: T.color.tinta2, lineHeight: 1.4 }}>
    {direccion || "Sin direccion"}{ciudad ? ` · ${ciudad}` : ""}
   </span>
  </div>
 );
}

// ── 15a: pedido por entregar ────────────────────────────────────────────────
// "parada" es el numero en la ruta; "actual" resalta la que sigue. La promesa
// va donde el disenio pone la ventana horaria: es el dato de tiempo que existe.
export function TarjetaEntrega({ pedido, parada, actual = false, promesa, onAbrir }) {
 // La fecha limite sale de la promesa de la ciudad; sin promesa, de la fecha
 // estimada que se digita pedido a pedido. Igual que en el detalle.
 const limite = limitePromesa(pedido, promesa);
 return (
  <button onClick={() => onAbrir(pedido)} style={tarjeta(actual ? T.estado.paqueteria : T.color.borde)}>
   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{
     width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0,
     fontSize: 12, fontWeight: 700,
     background: actual ? T.color.marca : T.color.superficie3,
     color: actual ? "#fff" : T.color.tinta2,
    }}>{parada}</span>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
     {pedido.guia_interna || pedido.id}
    </span>
    <Chip estado={pedido.estado} actual={actual} />
   </div>

   <Destino cliente={pedido.cliente} direccion={pedido.direccion} ciudad={pedido.ciudad_nombre} />

   <div style={pie}>
    <span style={dato}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {pedido.cajas || 0} {Number(pedido.cajas) === 1 ? "caja" : "cajas"}
    </span>
    <span style={{ ...dato, color: actual ? T.color.ojoPunto : T.color.tinta3, fontWeight: actual ? 600 : 400 }}>
     <Clock size={14} />
     {limite ? `Promesa ${fechaCorta(limite)}` : "Sin promesa"}
    </span>
    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
     <BotonMapa direccion={pedido.direccion} ciudad={pedido.ciudad_nombre} />
    </span>
   </div>
  </button>
 );
}

// ── 15b: pedido entregado o con novedad ─────────────────────────────────────
export function TarjetaEntregada({ pedido, onAbrir, onSoporte }) {
 const conNovedad = pedido.estado === "novedad";
 const soportes = (pedido.soportes || []).length;
 return (
  <button onClick={() => onAbrir(pedido)} style={tarjeta()}>
   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{
     width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0,
     background: conNovedad ? T.color.malSuave : T.color.bienSuave,
     color: conNovedad ? T.color.mal : T.color.bien,
    }}>{conNovedad ? <AlertTriangle size={13} /> : <Check size={14} />}</span>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
     {pedido.guia_interna || pedido.id}
    </span>
    <span style={{ marginLeft: "auto", fontSize: 12, color: conNovedad ? T.color.mal : T.color.tinta3, fontWeight: conNovedad ? 600 : 400 }}>
     {conNovedad ? "Con novedad" : fechaCorta(pedido.fecha_real) || "Entregado"}
    </span>
   </div>

   <Destino cliente={pedido.cliente} direccion={pedido.direccion} ciudad={pedido.ciudad_nombre} />

   <div style={pie}>
    <span style={dato}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {pedido.cajas || 0} {Number(pedido.cajas) === 1 ? "caja" : "cajas"}
    </span>
    {pedido.recibe_nombre && (
     <span style={{ ...dato, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      <UserCheck size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} />
      {pedido.recibe_nombre}
     </span>
    )}
    {soportes > 0 && (
     <span onClick={e => { e.stopPropagation(); onSoporte(pedido); }} style={{
      marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: T.color.marca, flexShrink: 0,
     }}>Ver soporte<ChevronRight size={14} /></span>
    )}
   </div>
  </button>
 );
}

// ── 16a: devolucion ─────────────────────────────────────────────────────────
// Sin cliente en la tabla, la factura y el pedido de origen son el titulo: es
// con lo que el conductor identifica lo que recoge. El motivo va visible, es
// lo que debe verificar al recibir la mercancia.
export function TarjetaDevolucion({ d, onSoporte }) {
 return (
  <article style={{ ...tarjeta(), cursor: "default" }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", background: T.color.malSuave, color: T.color.mal, flexShrink: 0 }}>
     <Undo2 size={14} />
    </span>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{d.guia}</span>
    <Chip estado={d.estado} actual={d.estado === "en_transito"} />
   </div>

   <Destino direccion={d.dir_recogida} ciudad={d.ciudad_nombre} />

   <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.color.tinta3, flexWrap: "wrap" }}>
    <span>Factura <span style={{ fontFamily: T.fuente.mono, color: T.color.tinta2 }}>{d.factura || "-"}</span></span>
    <span>Pedido <span style={{ fontFamily: T.fuente.mono, color: T.color.tinta2 }}>{d.pedido_ref || "-"}</span></span>
   </div>

   {d.motivo && (
    <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: T.color.ojoSuave, fontSize: 12, color: T.color.ojo, lineHeight: 1.45 }}>
     <AlertTriangle size={14} style={{ color: T.color.ojoPunto, flexShrink: 0 }} />
     <span><b style={{ fontWeight: 600 }}>Motivo:</b> {d.motivo}</span>
    </div>
   )}

   <div style={pie}>
    <span style={dato}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {d.unidades || 0} uds · {d.volumen_m3 || 0} m³ · {d.peso_kg || 0} kg
    </span>
    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
     {(d.soporte_nombre || d.soporte_data) && (
      <button onClick={() => onSoporte(d)} title="Ver soporte" style={{
       width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9,
       background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, color: T.color.tinta2, cursor: "pointer",
      }}><PackageCheck size={15} /></button>
     )}
     <BotonMapa direccion={d.dir_recogida} ciudad={d.ciudad_nombre} />
    </span>
   </div>
  </article>
 );
}

// ── 16b: recogida ───────────────────────────────────────────────────────────
// Dos paradas en una tarjeta: de donde sale y a donde llega, unidas por la
// linea de ruta.
export function TarjetaRecogida({ r, onDocumento }) {
 return (
  <article style={{ ...tarjeta(), cursor: "default" }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", background: T.color.infoSuave, color: T.color.infoPunto, flexShrink: 0 }}>
     <PackageCheck size={14} />
    </span>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{r.guia}</span>
    <Chip estado={r.estado} actual={r.estado === "en_transito"} />
   </div>

   <div style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: "0 10px" }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 5 }}>
     <span style={{ width: 8, height: 8, borderRadius: 4, border: `2px solid ${T.color.marca}`, background: T.color.superficie, flexShrink: 0 }} />
     <span style={{ flex: 1, width: 2, background: T.color.borde2, margin: "3px 0" }} />
     <span style={{ width: 8, height: 8, borderRadius: 4, background: T.color.marca, flexShrink: 0 }} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
     {[["Recoge", r.dir_recogida, r.ciudad_recogida_nombre], ["Entrega", r.dir_entrega, r.ciudad_entrega_nombre]].map(([k, dir, ciu]) => (
      <div key={k} style={{ display: "flex", flexDirection: "column" }}>
       <span style={{ ...T.texto.seccion, color: T.color.placeholder }}>{k}</span>
       <span style={{ fontSize: 13, color: T.color.tinta2, lineHeight: 1.4 }}>
        {dir || "Sin direccion"}{ciu ? ` · ${ciu}` : ""}
       </span>
      </div>
     ))}
    </div>
   </div>

   <div style={pie}>
    <span style={dato}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {r.unidades || 0} uds · {r.volumen_m3 || 0} m³ · {r.peso_kg || 0} kg
    </span>
    {r.observaciones && (
     <span style={{ ...dato, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      <MessageSquare size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} />
      {r.observaciones}
     </span>
    )}
    <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
     {(r.doc_nombre || r.doc_data) && (
      <button onClick={() => onDocumento(r)} title="Ver documento" style={{
       width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9,
       background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, color: T.color.tinta2, cursor: "pointer",
      }}><PackageCheck size={15} /></button>
     )}
     <BotonMapa direccion={r.dir_recogida} ciudad={r.ciudad_recogida_nombre} />
    </span>
   </div>
  </article>
 );
}

// ── Reordenar la ruta ───────────────────────────────────────────────────────
// Subir y bajar con botones, no arrastrar: arrastrar con el pulgar en una
// lista que tambien se desplaza es poco fiable, y el conductor lo hace en la
// calle. Nada se guarda hasta "Guardar orden"; "Cancelar" deja todo como
// estaba. "Por promesa" borra el orden a mano y vuelve a la urgencia.
export function ReordenarRuta({ pedidos, aMano, onGuardar, onCancelar, onRestablecer }) {
 const [orden, setOrden] = useState(pedidos);
 const [guardando, setGuardando] = useState(false);
 const mover = (i, d) => setOrden(prev => {
  const j = i + d;
  if (j < 0 || j >= prev.length) return prev;
  const n = prev.slice();
  [n[i], n[j]] = [n[j], n[i]];
  return n;
 });
 const cambio = orden.some((p, i) => p.id !== pedidos[i]?.id);
 const guardar = async () => { setGuardando(true); await onGuardar(orden); setGuardando(false); };

 const flecha = (activa) => ({
  width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, padding: 0,
  border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
  color: activa ? T.color.tinta2 : T.color.tenue, cursor: activa ? "pointer" : "default",
 });

 return (
  <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
   <div style={{
    padding: "10px 12px", borderRadius: 10, background: T.color.marcaSuave, color: T.color.marca,
    fontSize: 12.5, lineHeight: 1.45,
   }}>
    Mueve los pedidos al orden en que vas a entregarlos. Los que te asignen despues se agregan al final, por promesa.
   </div>

   {orden.map((p, i) => (
    <div key={p.id} style={{
     display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
     background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
    }}>
     <span style={{
      width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", flexShrink: 0,
      fontSize: 12, fontWeight: 700, background: T.color.superficie3, color: T.color.tinta2,
     }}>{i + 1}</span>
     <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
       {p.cliente || p.guia_interna || p.id}
      </span>
      <span style={{ fontSize: 12, color: T.color.tinta3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
       {[p.direccion, p.ciudad_nombre].filter(Boolean).join(" · ") || "Sin direccion"}
      </span>
     </div>
     <button onClick={() => mover(i, -1)} disabled={i === 0} title="Subir" style={flecha(i > 0)}><ArrowUp size={17} /></button>
     <button onClick={() => mover(i, 1)} disabled={i === orden.length - 1} title="Bajar" style={flecha(i < orden.length - 1)}><ArrowDown size={17} /></button>
    </div>
   ))}

   <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
    <button onClick={onCancelar} style={{
     flex: 1, height: 46, borderRadius: 12, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
     color: T.color.tinta2, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
    }}>Cancelar</button>
    <button onClick={guardar} disabled={!cambio || guardando} style={{
     flex: 2, height: 46, borderRadius: 12, border: "none", background: T.color.marca, color: "#fff",
     fontFamily: "inherit", fontSize: 14, fontWeight: 600,
     cursor: !cambio || guardando ? "not-allowed" : "pointer", opacity: !cambio || guardando ? 0.5 : 1,
    }}>{guardando ? "Guardando..." : "Guardar orden"}</button>
   </div>

   {aMano && (
    <button onClick={onRestablecer} style={{
     display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 42,
     border: "none", background: "transparent", color: T.color.tinta3, fontFamily: "inherit",
     fontSize: 13, fontWeight: 600, cursor: "pointer",
    }}><RotateCcw size={14} /> Volver al orden por promesa</button>
   )}
  </section>
 );
}

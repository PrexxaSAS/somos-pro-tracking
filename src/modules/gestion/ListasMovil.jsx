import React, { useState, useEffect } from 'react';
import {
 ArrowRight, Boxes, Calendar, ChevronDown, Clock, Package, Pencil, Plus, Truck, User, UserPlus,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ALTO_BARRA } from '../../design/responsive';
import { hoyLocal } from '../../utils/fechas';
import { docReferencia } from '../../utils/solicitudes';
import { fechaCorta } from '../pedidos/DetallePedidoMovil';
import { BuscadorConductor, Pestanas, LineaResumen, ListaVacia } from '../conductor/PantallasConductor';

// Disenios 22 y 24: Devoluciones, Recogidas y PQRS en el celular, para la
// central (22) y para el cliente (24). Misma estructura que Pedidos (8a):
// cabecera, busqueda, pestanias Abiertas / Cerradas y tarjetas. Toda la tarjeta
// abre la gestion (19 / 20), o el detalle de solo lectura si es el cliente.
//
// La central crea con el "+" flotante; el cliente, con el boton del encabezado,
// porque para el crear es la accion principal del modulo.
//
// Lo que el disenio muestra y los datos no tienen no se inventa: las
// devoluciones y recogidas no guardan el nombre de la empresa cliente, asi que
// la tarjeta muestra quien la solicito.

// "J. E. Castrillon": las iniciales de los nombres y el primer apellido.
export const nombreCorto = (nombre) => {
 const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
 if (partes.length <= 2) return partes.join(" ");
 const apellido = partes[partes.length - 2];
 return partes.slice(0, partes.length - 2).map(x => x[0].toUpperCase() + ".").join(" ") + " " + apellido;
};

// Dias entre la fecha del caso y hoy, contando por el calendario local.
export const diasDesde = (iso) => {
 if (!iso) return null;
 const a = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
 const b = new Date(`${hoyLocal()}T12:00:00`);
 return Math.max(0, Math.round((b - a) / 86400000));
};

const esCerrado = (x) => x.estado === "entregado" || x.estado === "novedad";

// Estado de una devolucion o recogida. La central ve "Sin asignar" porque es lo
// que tiene que resolver; el cliente ve "Solicitada", que es lo que hizo el.
const chipEnvio = (estado, vistaCliente) => ({
 sin_asignar: vistaCliente
  ? { bg: T.color.ojoSuave, color: T.color.ojo, punto: T.color.ojoPunto, texto: "Solicitada" }
  : { bg: T.color.neutroSuave, color: T.color.neutro, punto: T.color.neutroPunto, texto: "Sin asignar" },
 en_transito: { bg: T.color.marcaSuave, color: T.color.marca, punto: T.estado.en_transito, texto: "En transito" },
 entregado: { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, texto: "Completada" },
 novedad: { bg: T.color.malSuave, color: T.color.mal, punto: T.color.malPunto, texto: "Con novedad" },
}[estado] || { bg: T.color.neutroSuave, color: T.color.neutro, punto: T.color.neutroPunto, texto: estado || "Sin estado" });

export const chipPqrs = (estado) => ({
 abierta: { bg: T.color.ojoSuave, color: T.color.ojo, punto: T.color.ojoPunto, texto: "Abierta" },
 en_gestion: { bg: T.color.marcaSuave, color: T.color.marca, punto: T.estado.en_transito, texto: "En gestion" },
 cerrada: { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, texto: "Cerrada" },
 rechazada: { bg: T.color.superficie3, color: T.color.tinta2, punto: T.color.neutroPunto, texto: "Rechazada" },
}[estado] || { bg: T.color.superficie3, color: T.color.tinta2, punto: T.color.neutroPunto, texto: estado || "Sin estado" });

export function Chip({ bg, color, punto, texto }) {
 return (
  <span style={{
   marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
   fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: T.radio.pastilla,
   background: bg, color, whiteSpace: "nowrap",
  }}>
   <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />{texto}
  </span>
 );
}

const tarjeta = {
 background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
 padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, width: "100%",
 textAlign: "left", fontFamily: "inherit", color: T.color.tinta, cursor: "pointer",
};
const pie = {
 display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: T.color.tinta3, width: "100%",
 paddingTop: 8, borderTop: `1px solid ${T.color.divisor}`,
};
const dato = { display: "flex", alignItems: "center", gap: 5, minWidth: 0 };
const corta = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const monoChico = { fontFamily: T.fuente.mono, fontSize: 11.5, color: T.color.tinta3 };

// ── Cabecera ────────────────────────────────────────────────────────────────
// La accion va a la derecha: "Solicitar" o "Nueva" para el cliente.
export function CabeceraLista({ sobre, titulo, accion, onAccion, icono: Icono = Plus }) {
 return (
  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
   <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
    <span style={{ fontSize: 12, color: T.color.tinta3, lineHeight: 1.2, ...corta }}>{sobre}</span>
    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{titulo}</h1>
   </div>
   {accion && (
    <button onClick={onAccion} style={{
     display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", flexShrink: 0,
     borderRadius: T.radio.control, border: "none", background: T.color.marca, color: "#fff",
     fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
    }}><Icono size={16} /> {accion}</button>
   )}
  </header>
 );
}

export function BotonFlotante({ onClick, titulo }) {
 return (
  <button onClick={onClick} title={titulo} style={{
   position: "fixed", right: 16, bottom: ALTO_BARRA + 20, zIndex: 90,
   width: 52, height: 52, borderRadius: 16, border: "none",
   background: T.color.marca, color: "#fff", cursor: "pointer",
   display: "grid", placeItems: "center", boxShadow: "0 8px 24px -6px rgba(91,53,213,.6)",
  }}><Plus size={24} /></button>
 );
}

// "Mas reciente" / "Mas antigua" sobre la fecha de creacion.
function SelectorOrden({ valor, onChange }) {
 return (
  <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: T.color.tinta2, cursor: "pointer" }}>
   {valor === "antigua" ? "Mas antigua" : "Mas reciente"}
   <ChevronDown size={13} />
   <select value={valor} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
    <option value="reciente">Mas reciente</option>
    <option value="antigua">Mas antigua</option>
   </select>
  </label>
 );
}

const ordenar = (lista, orden, clave) => lista.slice().sort((a, b) => {
 const fa = String(a.fecha_creacion || a.created_at || ""), fb = String(b.fecha_creacion || b.created_at || "");
 const c = fa.localeCompare(fb) || String(a[clave] || "").localeCompare(String(b[clave] || ""));
 return orden === "antigua" ? c : -c;
});

// Carga de una devolucion o recogida: "3 uds · 1 m3 · 3 kg".
const carga = (x) => [
 `${Number(x.unidades) || 0} ${Number(x.unidades) === 1 ? "ud" : "uds"}`,
 Number(x.volumen_m3) ? `${x.volumen_m3} m³` : null,
 Number(x.peso_kg) ? `${x.peso_kg} kg` : null,
].filter(Boolean).join(" · ");

// Quien lleva el envio, en una linea. Null si nadie.
const transporteEnvio = (x, conductor, conPlaca) => {
 if (x.paqueteria) return [x.paqueteria, x.guia_paqueteria].filter(Boolean).join(" · ");
 if (conductor) return conPlaca && (x.placa || conductor.placa)
  ? `${nombreCorto(conductor.nombre)} · ${x.placa || conductor.placa}` : nombreCorto(conductor.nombre);
 return null;
};

// ── Tarjeta de devolucion o recogida ────────────────────────────────────────
export function TarjetaEnvio({ tipo, item, conductor, vistaCliente, onAbrir, onEditar }) {
 const chip = chipEnvio(item.estado, vistaCliente);
 const quien = transporteEnvio(item, conductor, vistaCliente);
 const esDev = tipo === "devolucion";
 // El cliente puede corregir su solicitud mientras nadie la haya tomado.
 const editable = vistaCliente && onEditar && !item.conductor_id && item.estado === "sin_asignar";
 return (
  <div role="button" tabIndex={0} onClick={() => onAbrir(item)} style={tarjeta}>
   <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{item.guia}</span>
    {!vistaCliente && docReferencia(item) && <span style={monoChico}>{docReferencia(item)}</span>}
    {!esDev && vistaCliente && item.fecha_creacion && <span style={{ fontSize: 12, color: T.color.tinta3 }}>{fechaCorta(item.fecha_creacion)}</span>}
    <Chip {...chip} />
   </span>

   {vistaCliente && docReferencia(item) && (
    <span style={{ fontSize: 12, color: T.color.tinta3 }}>Doc. referencia <span style={monoChico}>{docReferencia(item)}</span></span>
   )}

   {!vistaCliente && (
    <span style={{ fontSize: 13, fontWeight: 600, width: "100%", ...corta }}>{item.solicitado_por || "Sin solicitante"}</span>
   )}

   {esDev ? (
    <>
     <span style={{ fontSize: 12.5, color: T.color.tinta2, width: "100%", ...corta }}>
      {vistaCliente && <span style={{ color: T.color.tinta3 }}>Recoge en </span>}
      {[item.dir_recogida, item.ciudad_nombre].filter(Boolean).join(" · ") || "Sin direccion"}
     </span>
     {item.motivo && (
      <span style={{ fontSize: 12, color: T.color.tinta3, width: "100%", ...corta }}>Motivo: {item.motivo}</span>
     )}
    </>
   ) : vistaCliente ? (
    <span style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12.5, color: T.color.tinta2, width: "100%" }}>
     <span style={corta}><span style={{ color: T.color.tinta3 }}>Recoge </span>{[item.dir_recogida, item.ciudad_recogida_nombre].filter(Boolean).join(" · ") || "—"}</span>
     <span style={corta}><span style={{ color: T.color.tinta3 }}>Entrega </span>{[item.dir_entrega, item.ciudad_entrega_nombre].filter(Boolean).join(" · ") || "—"}</span>
    </span>
   ) : (
    <span style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 14px minmax(0,1fr)", alignItems: "center", gap: 6, fontSize: 12.5, color: T.color.tinta2, width: "100%" }}>
     <span style={corta}>{[item.dir_recogida, item.ciudad_recogida_nombre].filter(Boolean).join(" · ") || "—"}</span>
     <ArrowRight size={13} style={{ color: T.color.placeholder }} />
     <span style={corta}>{[item.dir_entrega, item.ciudad_entrega_nombre].filter(Boolean).join(" · ") || "—"}</span>
    </span>
   )}

   <span style={pie}>
    <span style={{ ...dato, flexShrink: 0 }}><Boxes size={14} style={{ color: T.color.placeholder }} />{carga(item)}</span>
    {!esDev && !vistaCliente && item.fecha_creacion && (
     <span style={{ ...dato, flexShrink: 0 }}><Calendar size={14} style={{ color: T.color.placeholder }} />{fechaCorta(item.fecha_creacion)}</span>
    )}
    {vistaCliente ? (
     <span style={{ ...dato, ...corta, marginLeft: "auto", color: quien ? T.color.tinta2 : T.color.placeholder, fontWeight: quien ? 600 : 500 }}>
      <Truck size={14} style={{ flexShrink: 0 }} />{quien || "Esperando transporte"}
     </span>
    ) : (
     <span style={{ ...dato, ...corta, marginLeft: "auto", fontWeight: 600, color: quien ? T.color.tinta2 : T.color.malPunto }}>
      {quien ? (item.paqueteria ? <Package size={14} style={{ flexShrink: 0 }} /> : <User size={14} style={{ flexShrink: 0 }} />) : <UserPlus size={14} style={{ flexShrink: 0 }} />}
      {quien || "Asignar"}
     </span>
    )}
   </span>

   {editable && (
    <button onClick={e => { e.stopPropagation(); onEditar(item); }} style={{
     alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 10px",
     borderRadius: 9, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
     color: T.color.tinta2, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    }}><Pencil size={13} /> Editar solicitud</button>
   )}
  </div>
 );
}

// ── Lista de devoluciones o recogidas ───────────────────────────────────────
export function EnviosMovil({
 tipo, items, conductores = [], vistaCliente, sobre, onAbrir, onNuevo, onEditar,
}) {
 const esDev = tipo === "devolucion";
 const [busq, setBusq] = useState("");
 const [pestana, setPestana] = useState("abiertas");
 const [orden, setOrden] = useState("reciente");
 const [tope, setTope] = useState(30);
 useEffect(() => { setTope(30); }, [busq, pestana, orden]);

 const q = busq.trim().toLowerCase();
 const buscados = items.filter(x => !q || (esDev
  ? [x.guia, docReferencia(x), x.dir_recogida, x.ciudad_nombre, x.solicitado_por]
  : [x.guia, docReferencia(x), x.dir_recogida, x.ciudad_recogida_nombre, x.dir_entrega, x.ciudad_entrega_nombre, x.solicitado_por]
 ).some(v => String(v || "").toLowerCase().includes(q)));
 const abiertas = buscados.filter(x => !esCerrado(x));
 const cerradas = buscados.filter(esCerrado);
 const lista = ordenar(pestana === "abiertas" ? abiertas : cerradas, orden, "guia");
 const sinAsignar = abiertas.filter(x => x.estado === "sin_asignar").length;
 const nombre = esDev ? "devolucion" : "recogida";

 const resumen = pestana === "abiertas"
  ? `${abiertas.length} ${abiertas.length === 1 ? "abierta" : "abiertas"}${sinAsignar ? ` · ${sinAsignar} ${vistaCliente ? "esperando transporte" : "sin asignar"}` : ""}`
  : `${cerradas.length} ${cerradas.length === 1 ? "cerrada" : "cerradas"}`;

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <CabeceraLista sobre={sobre}
    titulo={vistaCliente ? (esDev ? "Mis devoluciones" : "Mis recogidas") : (esDev ? "Devoluciones" : "Recogidas")}
    accion={vistaCliente ? "Solicitar" : null} onAccion={onNuevo} />
   <BuscadorConductor valor={busq} onChange={setBusq}
    placeholder={esDev ? "Buscar devolucion o doc. referencia" : (vistaCliente ? "Buscar recogida, documento o direccion" : "Buscar recogida, documento o ciudad")} />
   <Pestanas valor={pestana} onChange={setPestana} opciones={[
    { clave: "abiertas", label: "Abiertas", n: abiertas.length },
    { clave: "cerradas", label: "Cerradas", n: cerradas.length },
   ]}/>
   <LineaResumen izquierda={resumen} derecha={vistaCliente ? null : <SelectorOrden valor={orden} onChange={setOrden} />} />
   {lista.length === 0 ? (
    <ListaVacia>
     {items.length === 0
      ? (vistaCliente ? `Aun no has solicitado ninguna ${nombre}.` : `Sin ${nombre}es registradas.`)
      : q ? `Ninguna ${nombre} coincide con la busqueda.` : (pestana === "abiertas" ? `No hay ${nombre}es abiertas.` : `No hay ${nombre}es cerradas.`)}
    </ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {lista.slice(0, tope).map(x => (
      <TarjetaEnvio key={x.id} tipo={tipo} item={x} vistaCliente={vistaCliente}
       conductor={conductores.find(c => String(c.id) === String(x.conductor_id))}
       onAbrir={onAbrir} onEditar={onEditar} />
     ))}
     {lista.length > tope && (
      <button onClick={() => setTope(t => t + 30)} style={{
       minHeight: 46, borderRadius: T.radio.control, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
       color: T.color.tinta2, fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
      }}>Ver mas</button>
     )}
    </div>
   )}
   {!vistaCliente && <BotonFlotante onClick={onNuevo} titulo={esDev ? "Nueva devolucion" : "Nueva recogida"} />}
  </div>
 );
}

// ── Tarjeta de PQRS ─────────────────────────────────────────────────────────
// Central: el motivo es el titulo y el pie dice quien reporto y hace cuanto
// esta abierta (ambar desde 3 dias). Cliente: la ultima respuesta de la
// central, que es lo que viene a ver.
export function TarjetaPqrs({ item, vistaCliente, onAbrir, onEditar }) {
 const chip = chipPqrs(item.estado);
 const abierta = ["abierta", "en_gestion"].includes(item.estado);
 const dias = diasDesde(item.fecha_creacion);
 const vieja = abierta && dias != null && dias >= 3;
 const edad = !abierta ? fechaCorta(item.fecha_creacion) || "—"
  : dias == null ? "Sin fecha" : dias === 0 ? "Hoy" : `${dias} ${dias === 1 ? "dia" : "dias"}`;
 const editable = vistaCliente && onEditar && item.estado === "abierta";
 return (
  <div role="button" tabIndex={0} onClick={() => onAbrir(item)} style={tarjeta}>
   <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <span style={{ fontFamily: T.fuente.mono, fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>{item.id}</span>
    {vistaCliente && item.fecha_creacion && <span style={{ fontSize: 12, color: T.color.tinta3 }}>{fechaCorta(item.fecha_creacion)}</span>}
    <Chip {...chip} />
   </span>
   <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, width: "100%" }}>{item.motivo || "Sin motivo"}</span>
   <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", gap: 12, flexWrap: "wrap" }}>
    <span>Factura <span style={monoChico}>{item.factura || "—"}</span></span>
    <span>Pedido <span style={monoChico}>{item.pedido_ref || "—"}</span></span>
   </span>
   {vistaCliente ? (
    item.respuesta ? (
     <span style={{ fontSize: 12.5, lineHeight: 1.45, color: T.color.tinta2, background: T.color.superficie2, borderRadius: 10, padding: "8px 10px", width: "100%", boxSizing: "border-box" }}>
      <b style={{ color: T.color.tinta }}>Central:</b> {item.respuesta}
     </span>
    ) : abierta ? (
     <span style={{ fontSize: 12, color: T.color.placeholder }}>Sin respuesta todavia</span>
    ) : null
   ) : (
    <span style={pie}>
     <span style={{ ...dato, ...corta }}><User size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} />{item.solicitado_por || "—"}</span>
     <span style={{ ...dato, flexShrink: 0, marginLeft: "auto", fontWeight: vieja ? 700 : 500, color: vieja ? T.color.ojo : T.color.tinta3 }}>
      <Clock size={14} style={{ color: vieja ? T.color.ojoPunto : T.color.placeholder }} />{edad}
     </span>
    </span>
   )}
   {editable && (
    <button onClick={e => { e.stopPropagation(); onEditar(item); }} style={{
     alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, height: 30, padding: "0 10px",
     borderRadius: 9, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
     color: T.color.tinta2, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    }}><Pencil size={13} /> Editar</button>
   )}
  </div>
 );
}

// ── Lista de PQRS ───────────────────────────────────────────────────────────
export function PqrsMovil({ items, vistaCliente, sobre, onAbrir, onNueva, onEditar }) {
 const [busq, setBusq] = useState("");
 // La central las atiende de la mas vieja a la mas nueva; el cliente las ve al reves.
 const [pestana, setPestana] = useState("abiertas");
 const [orden, setOrden] = useState(vistaCliente ? "reciente" : "antigua");
 const [tope, setTope] = useState(30);
 useEffect(() => { setTope(30); }, [busq, pestana, orden]);

 const q = busq.trim().toLowerCase();
 const buscados = items.filter(x => !q || [x.id, x.factura, x.pedido_ref, x.motivo, x.solicitado_por]
  .some(v => String(v || "").toLowerCase().includes(q)));
 const grupos = vistaCliente ? {
  abiertas: buscados.filter(x => ["abierta", "en_gestion"].includes(x.estado)),
  cerradas: buscados.filter(x => !["abierta", "en_gestion"].includes(x.estado)),
 } : {
  abiertas: buscados.filter(x => x.estado === "abierta"),
  en_gestion: buscados.filter(x => x.estado === "en_gestion"),
  cerradas: buscados.filter(x => !["abierta", "en_gestion"].includes(x.estado)),
 };
 const lista = ordenar(grupos[pestana] || [], orden, "id");
 const viejas = (grupos[pestana] || []).filter(x => ["abierta", "en_gestion"].includes(x.estado) && (diasDesde(x.fecha_creacion) ?? 0) >= 3).length;
 const n = lista.length;
 const etiqueta = { abiertas: n === 1 ? "abierta" : "abiertas", en_gestion: "en gestion", cerradas: n === 1 ? "cerrada" : "cerradas" }[pestana];

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <CabeceraLista sobre={sobre} titulo={vistaCliente ? "Mis PQRS" : "PQRS"}
    accion={vistaCliente ? "Nueva" : null} onAccion={onNueva} />
   <BuscadorConductor valor={busq} onChange={setBusq} placeholder="Buscar PQRS, factura o pedido" />
   <Pestanas valor={pestana} onChange={setPestana} opciones={vistaCliente ? [
    { clave: "abiertas", label: "Abiertas", n: grupos.abiertas.length },
    { clave: "cerradas", label: "Cerradas", n: grupos.cerradas.length },
   ] : [
    { clave: "abiertas", label: "Abiertas", n: grupos.abiertas.length },
    { clave: "en_gestion", label: "En gestion", n: grupos.en_gestion.length },
    { clave: "cerradas", label: "Cerradas", n: grupos.cerradas.length },
   ]}/>
   {!vistaCliente && (
    <LineaResumen izquierda={`${n} ${etiqueta}${viejas ? ` · ${viejas} con mas de 3 dias` : ""}`}
     derecha={<SelectorOrden valor={orden} onChange={setOrden} />} />
   )}
   {lista.length === 0 ? (
    <ListaVacia>
     {items.length === 0 ? (vistaCliente ? "Aun no has radicado ninguna PQRS." : "Sin PQRS registradas.")
      : q ? "Ninguna PQRS coincide con la busqueda." : "No hay PQRS en este grupo."}
    </ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {lista.slice(0, tope).map(x => (
      <TarjetaPqrs key={x.id} item={x} vistaCliente={vistaCliente} onAbrir={onAbrir} onEditar={onEditar} />
     ))}
     {lista.length > tope && (
      <button onClick={() => setTope(t => t + 30)} style={{
       minHeight: 46, borderRadius: T.radio.control, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
       color: T.color.tinta2, fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
      }}>Ver mas</button>
     )}
    </div>
   )}
   {!vistaCliente && <BotonFlotante onClick={onNueva} titulo="Nueva PQRS" />}
  </div>
 );
}

import React from 'react';
import { Boxes, CreditCard, Image as IconoImagen, ImageOff, Pencil, Phone, RefreshCw, Upload, User } from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';

// Disenio 21: el rol transportista en el celular. Las tres pantallas usan las
// mismas tarjetas que el resto de la app movil (8a, 15a): identificador y
// estado arriba, el dato principal en el medio y los detalles al pie.
//
// Lo que el disenio muestra y los datos no tienen no se inventa: el vehiculo
// del conductor (tipo y capacidad) no existe en la base, y la firma de quien
// recibe tampoco. Y el soporte solo se carga o reemplaza donde el permiso lo
// deja: pedidos cerrados de la propia empresa. Eso lo decide quien llama.

const iniciales = (nombre) => (nombre || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

const tarjeta = {
 background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
 padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, width: "100%",
 textAlign: "left", fontFamily: "inherit", color: T.color.tinta,
};
const pie = {
 display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.color.tinta3,
 paddingTop: 10, borderTop: `1px solid ${T.color.divisor}`,
};
const dato = { display: "flex", alignItems: "center", gap: 5, minWidth: 0 };
const botonIcono = {
 width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, flexShrink: 0,
 background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, color: T.color.tinta2,
 cursor: "pointer", padding: 0, textDecoration: "none",
};

function Avatar({ nombre, tam = 34 }) {
 return (
  <span style={{
   width: tam, height: tam, borderRadius: tam / 2, flexShrink: 0, display: "grid", placeItems: "center",
   background: T.color.marcaAvatar, color: T.color.marca, fontSize: 12, fontWeight: 700,
  }}>{iniciales(nombre)}</span>
 );
}

function Chip({ bg, color, punto, texto }) {
 return (
  <span style={{
   marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
   fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: T.radio.pastilla, background: bg, color, whiteSpace: "nowrap",
  }}>
   <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />{texto}
  </span>
 );
}

export const chipConductor = (activo, enRuta) => activo === false
 ? { bg: T.color.superficie3, color: T.color.tinta3, punto: T.color.neutroPunto, texto: "Inactivo" }
 : enRuta > 0
  ? { bg: T.color.marcaSuave, color: T.color.marca, punto: T.estado.en_transito, texto: "En ruta" }
  : { bg: T.color.bienSuave, color: T.color.bien, punto: T.color.bienPunto, texto: "Disponible" };

// ── Conteos en rejilla 2x2 ─────────────────────────────────────────────────
export function ConteosTransp({ items }) {
 return (
  <section style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
   {items.map(k => (
    <div key={k.label} style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12, padding: "12px 14px", minWidth: 0 }}>
     <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: k.punto || k.color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: T.color.tinta2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.label}</span>
     </div>
     <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: k.color }}>{Number(k.valor).toLocaleString("es-CO")}</div>
    </div>
   ))}
  </section>
 );
}

// ── Titulo de bloque con "Ver todos" ───────────────────────────────────────
export function BloqueTransp({ titulo, onVerTodos, children }) {
 return (
  <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
   <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{titulo}</h2>
    {onVerTodos && (
     <button onClick={onVerTodos} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: T.color.marca }}>Ver todos</button>
    )}
   </div>
   {children}
  </section>
 );
}

// ── 21a / 21b: un conductor ────────────────────────────────────────────────
// Resumida (21a): avatar, nombre, placa y pedidos activos, estado. Completa
// (21b): ademas cedula y las acciones Llamar y Editar.
export function TarjetaConductorTransp({ c, activos, completa = false, onVer, onEditar }) {
 const chip = chipConductor(c.activo, activos);
 const activosTxt = `${activos} ${activos === 1 ? "pedido activo" : "pedidos activos"}`;
 return (
  <article style={tarjeta}>
   <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <Avatar nombre={c.nombre} />
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
     <button onClick={() => onVer(c)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: T.color.tinta, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {c.nombre}
     </button>
     <span style={{ fontSize: 12, color: T.color.tinta3 }}>
      <span style={{ fontFamily: T.fuente.mono }}>{c.placa || "Sin placa"}</span>{!completa && ` · ${activosTxt}`}
     </span>
    </div>
    <Chip {...chip} />
   </div>
   {completa && (
    <div style={pie}>
     <span style={dato}><CreditCard size={14} style={{ color: T.color.placeholder }} />{c.cedula || "Sin cedula"}</span>
     <span style={dato}><Boxes size={14} style={{ color: T.color.placeholder }} />{activosTxt}</span>
     <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
      {c.celular && (
       <a href={`tel:${c.celular}`} title="Llamar" style={{ ...botonIcono, background: T.color.marcaSuave, border: "none", color: T.color.marca }}><Phone size={15} /></a>
      )}
      <button onClick={() => onEditar(c)} title="Editar" style={botonIcono}><Pencil size={14} /></button>
     </span>
    </div>
   )}
  </article>
 );
}

// ── 21a / 21c: un pedido ───────────────────────────────────────────────────
// El conductor es el dato principal del pie, junto con el estado del soporte.
// La accion Cargar o Reemplazar solo aparece si `puedeSoporte`.
export function TarjetaPedidoTransp({ p, conductor, soportes, puedeSoporte, completa = false, onVer, onSoporte }) {
 const estado = p.estado;
 const punto = T.estado[estado] || T.color.neutroPunto;
 const tono = estado === "en_transito" ? { bg: T.color.marcaSuave, color: T.color.marca }
  : estado === "novedad" ? { bg: T.color.malSuave, color: T.color.mal }
  : estado === "entregado" ? { bg: T.color.bienSuave, color: T.color.bien }
  : { bg: T.color.superficie3, color: T.color.tinta2 };
 return (
  <article style={tarjeta}>
   <button onClick={() => onVer(p)} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 6, color: T.color.tinta }}>
    <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
     <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{p.guia_interna || p.id}</span>
     {completa && p.guia_interna && p.guia_interna !== p.id && (
      <span style={{ fontFamily: T.fuente.mono, fontSize: 11, color: T.color.tinta4 }}>{p.id}</span>
     )}
     <Chip bg={tono.bg} color={tono.color} punto={punto} texto={ESTADOS_PEDIDO[estado]?.label || estado} />
    </span>
    <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.cliente}</span>
   </button>
   <div style={pie}>
    {completa && (
     <span style={dato}><Boxes size={14} style={{ color: T.color.placeholder }} />{p.cajas || 0} {Number(p.cajas) === 1 ? "caja" : "cajas"}</span>
    )}
    <span style={{ ...dato, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
     <User size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} />{conductor?.nombre || "Sin conductor"}
    </span>
    <span style={{ ...dato, color: soportes ? T.color.tinta2 : T.color.mal }}>
     {soportes ? <IconoImagen size={14} /> : <ImageOff size={14} />}
     {soportes ? `${soportes} ${soportes === 1 ? "foto" : "fotos"}` : "Sin soporte"}
    </span>
    {completa && puedeSoporte && (
     <button onClick={() => onSoporte(p)} style={{
      marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", borderRadius: 9, flexShrink: 0,
      background: soportes ? T.color.superficie : T.color.marcaSuave, border: `1px solid ${soportes ? T.color.borde2 : T.color.marcaSuave}`,
      color: soportes ? T.color.tinta2 : T.color.marca, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
     }}>
      {soportes ? <><RefreshCw size={13} /> Reemplazar</> : <><Upload size={13} /> Cargar</>}
     </button>
    )}
   </div>
  </article>
 );
}

import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Search, X } from 'lucide-react';
import { T, tarjeta } from '../../design/tokens';

// Piezas compartidas por las pantallas de listado (Pedidos, Conductores, Usuarios).
// Viven aqui para que las tres se vean y se comporten igual: si cambia el estilo de
// una barra de filtros o de un paginador, cambia en todas a la vez.

export const th = {
 ...T.texto.seccion, color: T.color.tinta3, textAlign: "left",
 padding: "12px 16px", whiteSpace: "nowrap", fontSize: 10.5,
};

export const td = {
 padding: "13px 16px", fontSize: 13.5, color: T.color.tinta2, verticalAlign: "middle",
};

export const mono = {
 fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: T.color.tinta3,
};

export const botonBarra = {
 display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px",
 border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
 background: T.color.superficie, cursor: "pointer", fontFamily: "inherit",
 fontSize: 13.5, fontWeight: 600, color: T.color.tinta, whiteSpace: "nowrap",
};

export const botonPrincipal = {
 ...botonBarra, background: T.color.marca, border: "none", color: "#fff", fontWeight: 700,
};

export const iconoAccion = {
 border: "none", background: "transparent", cursor: "pointer",
 color: T.color.tinta3, padding: 7, borderRadius: T.radio.chico,
 display: "grid", placeItems: "center",
};

export function Pagina({ children }) {
 return (
  <div style={{ minHeight: "100%", background: T.color.fondo, margin: "-28px -24px", padding: "24px 28px 40px", color: T.color.tinta }}>
   <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
    {children}
   </div>
  </div>
 );
}

export function Encabezado({ titulo, descripcion, acciones }) {
 return (
  <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
   <div>
    <h1 style={{ margin: 0, ...T.texto.titulo }}>{titulo}</h1>
    {descripcion && <p style={{ margin: "4px 0 0", color: T.color.tinta3, fontSize: 13.5 }}>{descripcion}</p>}
   </div>
   {acciones && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{acciones}</div>}
  </header>
 );
}

// Fila de indicadores. Cada uno puede ser un filtro: si trae onClick, se dibuja
// como tarjeta pulsable y la activa se resalta.
export function Indicadores({ items }) {
 const pulsables = items.some(i => i.onClick);
 if (pulsables) {
  return (
   <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
    {items.map(i => (
     <button key={i.label} onClick={i.onClick} style={{
      ...tarjeta, padding: "14px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${i.activo ? T.color.marca : T.color.borde}`,
      boxShadow: i.activo ? `0 0 0 3px ${T.color.marcaSuave}` : T.sombra.tarjeta,
     }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
       <span style={{ width: 7, height: 7, borderRadius: 4, background: i.color || T.color.tinta3, flexShrink: 0 }} />
       <span style={{ fontSize: 12.5, color: T.color.tinta2, lineHeight: 1.2 }}>{i.label}</span>
      </div>
      <div style={{ ...T.texto.cifra, color: i.activo ? T.color.marca : T.color.tinta }}>
       {Number(i.valor).toLocaleString("es-CO")}
      </div>
     </button>
    ))}
   </section>
  );
 }
 return (
  <section style={{ ...tarjeta, display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)` }}>
   {items.map((i, n) => (
    <div key={i.label} style={{ padding: "18px 22px", borderLeft: n === 0 ? "none" : `1px solid ${T.color.borde}` }}>
     <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: i.color || T.color.tinta3, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: T.color.tinta2, whiteSpace: "nowrap" }}>{i.label}</span>
     </div>
     <div style={{ ...T.texto.cifra, color: i.destacado ? T.color.marca : T.color.tinta }}>
      {Number(i.valor).toLocaleString("es-CO")}
     </div>
    </div>
   ))}
  </section>
 );
}

export function Buscador({ valor, onChange, placeholder, ancho = 280 }) {
 return (
  <div style={{ position: "relative", width: ancho, maxWidth: "100%" }}>
   <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: T.color.tinta3 }} />
   <input value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
    width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
    border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
    fontSize: 13, fontFamily: "inherit", color: T.color.tinta, outline: "none",
   }}/>
  </div>
 );
}

export function SelectFiltro({ valor, onChange, children, ancho = 210 }) {
 return (
  <select value={valor} onChange={e => onChange(e.target.value)} style={{
   padding: "9px 12px", border: `1px solid ${T.color.borde2}`,
   borderRadius: T.radio.control, background: T.color.superficie,
   fontSize: 13, fontFamily: "inherit", color: T.color.tinta,
   cursor: "pointer", outline: "none", maxWidth: ancho,
  }}>{children}</select>
 );
}

export function Segmentado({ valor, onChange, opciones }) {
 return (
  <div style={{
   display: "inline-flex", padding: 3, gap: 2, background: T.color.superficie2,
   borderRadius: T.radio.control, border: `1px solid ${T.color.borde}`,
  }}>
   {opciones.map(([id, label]) => (
    <button key={id} onClick={() => onChange(id)} style={{
     border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 14px",
     borderRadius: 8, fontSize: 13, fontWeight: valor === id ? 700 : 500,
     color: valor === id ? T.color.tinta : T.color.tinta2,
     background: valor === id ? T.color.superficie : "transparent",
     boxShadow: valor === id ? T.sombra.tarjeta : "none",
    }}>{label}</button>
   ))}
  </div>
 );
}

export function BarraFiltros({ children, derecha }) {
 return (
  <div style={{
   display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
   padding: 14, borderBottom: `1px solid ${T.color.borde}`,
  }}>
   {children}
   {derecha && (
    <div style={{ marginLeft: "auto", fontSize: 12.5, color: T.color.tinta3, whiteSpace: "nowrap" }}>
     {derecha}
    </div>
   )}
  </div>
 );
}

// Barra que aparece al marcar filas. Sustituye a la de filtros para que las
// acciones masivas no compitan con los controles de busqueda.
export function BarraSeleccion({ cantidad, onLimpiar, acciones }) {
 return (
  <div style={{
   display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
   padding: "10px 14px", borderBottom: `1px solid ${T.color.marcaBorde}`,
   background: T.color.marcaSuave,
  }}>
   <span style={{ fontSize: 13, fontWeight: 700, color: T.color.marca }}>
    {cantidad} seleccionado{cantidad === 1 ? "" : "s"}
   </span>
   <button onClick={onLimpiar} style={{
    ...iconoAccion, color: T.color.marca, display: "inline-flex", alignItems: "center", gap: 4,
    fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, padding: "4px 8px",
   }}><X size={13} /> Quitar seleccion</button>
   <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>{acciones}</div>
  </div>
 );
}

export function Casilla({ marcada, onChange, titulo }) {
 return (
  <input type="checkbox" checked={marcada} onChange={onChange} title={titulo}
   style={{ cursor: "pointer", width: 15, height: 15, accentColor: T.color.marca }}/>
 );
}

export function MenuFila({ opciones }) {
 const [abierto, setAbierto] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!abierto) return;
  const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
  document.addEventListener("mousedown", fuera);
  return () => document.removeEventListener("mousedown", fuera);
 }, [abierto]);

 return (
  <div ref={ref} style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
   <button onClick={() => setAbierto(!abierto)} title="Acciones" style={iconoAccion}>
    <MoreHorizontal size={17} />
   </button>
   {abierto && (
    <div style={{
     position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, minWidth: 190,
     ...tarjeta, boxShadow: T.sombra.flotante, padding: 6,
    }}>
     {opciones.map(o => (
      <button key={o.texto} onClick={() => { setAbierto(false); o.accion(); }} disabled={o.inactivo} style={{
       width: "100%", textAlign: "left", border: "none", background: "transparent",
       cursor: o.inactivo ? "not-allowed" : "pointer", fontFamily: "inherit",
       padding: "8px 10px", borderRadius: T.radio.chico, fontSize: 13,
       color: o.peligro ? T.color.mal : T.color.tinta2, opacity: o.inactivo ? 0.5 : 1,
      }}>{o.texto}</button>
     ))}
    </div>
   )}
  </div>
 );
}

// Paginador con numeros y saltos. Con miles de filas, poder ir a una pagina
// concreta importa mas que avanzar de una en una.
export function Paginador({ total, page, setPage, pageSize }) {
 const paginas = Math.max(1, Math.ceil(total / pageSize));
 if (paginas <= 1) return null;

 const numeros = [];
 const agregar = (n) => { if (!numeros.includes(n)) numeros.push(n); };
 agregar(1);
 for (let n = page - 1; n <= page + 1; n++) if (n > 1 && n < paginas) agregar(n);
 agregar(paginas);
 numeros.sort((a, b) => a - b);

 const boton = (contenido, alPulsar, activo, inactivo, clave) => (
  <button key={clave} onClick={alPulsar} disabled={inactivo} style={{
   minWidth: 30, height: 30, padding: "0 8px", borderRadius: T.radio.chico,
   border: activo ? "none" : `1px solid ${T.color.borde2}`,
   background: activo ? T.color.marca : T.color.superficie,
   color: activo ? "#fff" : inactivo ? T.color.borde2 : T.color.tinta2,
   cursor: inactivo ? "not-allowed" : "pointer", fontFamily: "inherit",
   fontSize: 13, fontWeight: activo ? 700 : 500,
  }}>{contenido}</button>
 );

 const piezas = [];
 numeros.forEach((n, i) => {
  if (i > 0 && n - numeros[i - 1] > 1) {
   piezas.push(<span key={"e" + n} style={{ color: T.color.tinta3, padding: "0 4px" }}>...</span>);
  }
  piezas.push(boton(String(n), () => setPage(n), n === page, false, "p" + n));
 });

 return (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
   {boton("<", () => setPage(Math.max(1, page - 1)), false, page === 1, "ant")}
   {piezas}
   {boton(">", () => setPage(Math.min(paginas, page + 1)), false, page === paginas, "sig")}
  </div>
 );
}

export function PieTabla({ izquierda, derecha }) {
 return (
  <div style={{
   display: "flex", alignItems: "center", justifyContent: "space-between",
   gap: 12, padding: "12px 16px", borderTop: `1px solid ${T.color.borde}`,
  }}>
   <span style={{ fontSize: 12.5, color: T.color.tinta3 }}>{izquierda}</span>
   {derecha}
  </div>
 );
}

// Maneja las filas marcadas de una tabla: alternar una, alternar la pagina
// completa y limpiar. Lo usan los listados que permiten seleccion masiva.
export function useSeleccion(idsVisibles) {
 const [seleccion, setSeleccion] = useState(() => new Set());

 const alternar = (id) => setSeleccion(prev => {
  const s = new Set(prev);
  if (s.has(id)) s.delete(id); else s.add(id);
  return s;
 });

 const todosMarcados = idsVisibles.length > 0 && idsVisibles.every(id => seleccion.has(id));

 const alternarPagina = () => setSeleccion(prev => {
  const s = new Set(prev);
  if (todosMarcados) idsVisibles.forEach(id => s.delete(id));
  else idsVisibles.forEach(id => s.add(id));
  return s;
 });

 const limpiar = () => setSeleccion(new Set());

 return { seleccion, alternar, alternarPagina, todosMarcados, limpiar, setSeleccion };
}

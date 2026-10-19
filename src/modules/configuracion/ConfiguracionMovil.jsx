import React, { useState, useEffect, useRef } from 'react';
import {
 Boxes, Calendar, ChevronDown, ChevronRight, Download, FileDown, FileText, Map as IconoMapa,
 MapPin, MoreHorizontal, Printer, Trash2,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { fechaCorta } from '../pedidos/DetallePedidoMovil';
import { HojaCiudades } from '../pedidos/NuevoPedidoMovil';
import { BuscadorConductor, Pestanas, LineaResumen, ListaVacia, iniciales } from '../conductor/PantallasConductor';
import { BotonFlotante, Chip } from '../gestion/ListasMovil';

// Disenio 26: Facturas proveedor, Promesas de servicio, Ciudades / DANE y
// Resumen transportador en el celular. Cada pantalla dibuja lo que ya calcula
// su modulo y llama a sus mismas funciones de guardar, borrar e imprimir.

// El departamento sale de los dos primeros digitos del codigo DANE, que es
// como el DANE numera los municipios. No es un dato guardado: es el codigo.
export const DEPARTAMENTOS = {
 "05": "Antioquia", "08": "Atlantico", "11": "Bogota D.C.", "13": "Bolivar", "15": "Boyaca",
 "17": "Caldas", "18": "Caqueta", "19": "Cauca", "20": "Cesar", "23": "Cordoba",
 "25": "Cundinamarca", "27": "Choco", "41": "Huila", "44": "La Guajira", "47": "Magdalena",
 "50": "Meta", "52": "Narino", "54": "Norte de Santander", "63": "Quindio", "66": "Risaralda",
 "68": "Santander", "70": "Sucre", "73": "Tolima", "76": "Valle del Cauca", "81": "Arauca",
 "85": "Casanare", "86": "Putumayo", "88": "San Andres", "91": "Amazonas", "94": "Guainia",
 "95": "Guaviare", "97": "Vaupes", "99": "Vichada",
};
export const departamento = (code) => DEPARTAMENTOS[String(code || "").padStart(5, "0").slice(0, 2)] || "";

const fmtCOP = (n) => "$ " + Number(n || 0).toLocaleString("es-CO");
const corta = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tarjeta = {
 background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
 padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, color: T.color.tinta,
};
const pie = {
 display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: T.color.tinta3,
 paddingTop: 8, borderTop: `1px solid ${T.color.divisor}`,
};
const botonIcono = {
 width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, flexShrink: 0, padding: 0,
 background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, color: T.color.tinta2, cursor: "pointer",
};
const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, padding: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
 color: T.color.tinta2, cursor: "pointer",
};
const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", gap: 8, fontSize: 15, fontFamily: "inherit", color: T.color.tinta, outline: "none",
};
const botonGrande = (primario) => ({
 display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 12,
 fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
 background: primario ? T.color.marca : T.color.superficie, color: primario ? "#fff" : T.color.tinta2,
 border: primario ? "none" : `1px solid ${T.color.borde2}`,
});

// ── Hoja inferior ───────────────────────────────────────────────────────────
export function Hoja({ titulo, onClose, children }) {
 const [dentro, setDentro] = useState(false);
 useEffect(() => { const id = requestAnimationFrame(() => setDentro(true)); return () => cancelAnimationFrame(id); }, []);
 useEffect(() => {
  const previo = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previo; };
 }, []);
 const cerrar = () => { setDentro(false); setTimeout(onClose, 180); };
 return (
  <div onClick={cerrar} style={{
   position: "fixed", inset: 0, zIndex: 130, display: "flex", flexDirection: "column", justifyContent: "flex-end",
   background: dentro ? "rgba(23,20,31,.35)" : "rgba(23,20,31,0)", transition: "background .18s ease",
  }}>
   <div onClick={e => e.stopPropagation()} style={{
    background: T.color.superficie, borderRadius: "20px 20px 0 0", padding: "10px 16px 24px",
    display: "flex", flexDirection: "column", gap: 14, maxHeight: "88vh", overflowY: "auto",
    boxShadow: "0 -10px 40px rgba(23,20,31,.15)", transform: dentro ? "translateY(0)" : "translateY(100%)",
    transition: "transform .2s ease", paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <span style={{ width: 40, height: 4, borderRadius: 2, background: T.color.tenue, margin: "0 auto", flexShrink: 0 }} />
    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{titulo}</span>
    {typeof children === "function" ? children(cerrar) : children}
   </div>
  </div>
 );
}

export function Etiqueta({ children }) {
 return <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>{children}</span>;
}

// Menu "···" de la cabecera.
export function MenuMas({ opciones }) {
 const [abierto, setAbierto] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!abierto) return undefined;
  const fuera = e => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
  document.addEventListener("mousedown", fuera);
  document.addEventListener("touchstart", fuera);
  return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("touchstart", fuera); };
 }, [abierto]);
 return (
  <div ref={ref} style={{ position: "relative" }}>
   <button onClick={() => setAbierto(!abierto)} title="Mas acciones" style={botonCabecera}><MoreHorizontal size={17} /></button>
   {abierto && (
    <div style={{
     position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40, minWidth: 200, padding: 6,
     background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta, boxShadow: T.sombra.flotante,
    }}>
     {opciones.map(([texto, accion]) => (
      <button key={texto} onClick={() => { setAbierto(false); accion(); }} style={{
       width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", display: "block",
       fontFamily: "inherit", padding: "11px 10px", borderRadius: T.radio.chico, fontSize: 13.5, color: T.color.tinta2,
      }}>{texto}</button>
     ))}
    </div>
   )}
  </div>
 );
}

export function Cabecera({ sobre, titulo, derecha }) {
 return (
  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
   <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
    <span style={{ fontSize: 12, color: T.color.tinta3, lineHeight: 1.2, ...corta }}>{sobre}</span>
    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{titulo}</h1>
   </div>
   {derecha && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{derecha}</div>}
  </header>
 );
}

export function VerMas({ onClick }) {
 return (
  <button onClick={onClick} style={{
   minHeight: 46, borderRadius: T.radio.control, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
   color: T.color.tinta2, fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  }}>Ver mas</button>
 );
}

// ── 26a: Facturas proveedor ─────────────────────────────────────────────────
export function FacturasMovil({
 facturas, filtradas, transportistas = [], busq, setBusq, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
 onInforme, onGestionar, onCSV, onEliminar, onNueva,
}) {
 const [hojaFechas, setHojaFechas] = useState(false);
 const [tope, setTope] = useState(30);
 useEffect(() => { setTope(30); }, [busq, fechaDesde, fechaHasta]);
 const valor = filtradas.reduce((a, f) => a + Number(f.valor_total || 0), 0);
 const guias = filtradas.reduce((a, f) => a + (f.factura_guias || []).length, 0);
 const conFechas = Boolean(fechaDesde || fechaHasta);
 const textoFechas = conFechas ? [fechaCorta(fechaDesde) || "…", fechaCorta(fechaHasta) || "…"].join(" – ") : "Fechas";

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${filtradas.length} ${filtradas.length === 1 ? "factura" : "facturas"} · ${guias} ${guias === 1 ? "guia" : "guias"}`} titulo="Facturas proveedor" />
   <section style={{ ...tarjeta, flexDirection: "row", alignItems: "center", gap: 12 }}>
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
     <span style={{ fontSize: 12, color: T.color.tinta3 }}>Valor total</span>
     <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", ...corta }}>{fmtCOP(valor)}</span>
    </div>
    <button onClick={onInforme} disabled={filtradas.length === 0} style={{
     ...botonGrande(false), minHeight: 40, padding: "0 12px", flexShrink: 0, opacity: filtradas.length ? 1 : 0.5,
    }}><FileDown size={16} /> Informe</button>
   </section>
   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}><BuscadorConductor valor={busq} onChange={setBusq} placeholder="Factura o transportista" /></div>
    <button onClick={() => setHojaFechas(true)} style={{
     display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px", flexShrink: 0, maxWidth: 150,
     borderRadius: T.radio.control, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
     background: conFechas ? T.color.marcaSuave : T.color.superficie, color: conFechas ? T.color.marca : T.color.tinta2,
     border: `1px solid ${conFechas ? T.color.marcaSuave : T.color.borde2}`,
    }}><Calendar size={15} style={{ flexShrink: 0 }} /><span style={corta}>{textoFechas}</span></button>
   </div>
   {filtradas.length === 0 ? (
    <ListaVacia>{facturas.length === 0 ? "Sin facturas registradas." : "Ninguna factura coincide con los filtros."}</ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {filtradas.slice(0, tope).map(fac => {
      const trans = transportistas.find(x => x.id === fac.transportista_id);
      const gs = fac.factura_guias || [];
      const cajas = gs.reduce((a, g) => a + (g.pedidos?.cajas || 0), 0);
      const ruta = [...new Set(gs.map(g => g.pedidos?.ciudad_nombre).filter(Boolean))];
      return (
       <article key={fac.id} style={tarjeta}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
         <span style={{ fontFamily: T.fuente.mono, fontSize: 13.5, fontWeight: 700 }}>{fac.numero_factura}</span>
         <span style={{ fontSize: 12, color: T.color.tinta3 }}>{fechaCorta(fac.fecha_factura) || "Sin fecha"}</span>
         <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCOP(fac.valor_total)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
         <span style={{ fontSize: 13, fontWeight: 600, ...corta }}>{trans?.nombre || "Sin transportista"}</span>
         {ruta.length > 0 && (
          <span style={{ fontSize: 12, color: T.color.tinta3, ...corta }}>{ruta.slice(0, 3).join(" / ")}{ruta.length > 3 ? ` y ${ruta.length - 3} mas` : ""}</span>
         )}
        </div>
        <div style={pie}>
         <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: gs.length ? 500 : 600, color: gs.length ? T.color.tinta3 : T.color.ojo }}>
          <FileText size={14} style={{ color: gs.length ? T.color.placeholder : T.color.ojoPunto }} />
          {gs.length ? `${gs.length} ${gs.length === 1 ? "guia" : "guias"}` : "Sin guias"}
         </span>
         <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Boxes size={14} style={{ color: T.color.placeholder }} />{cajas} cajas</span>
         <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {gs.length > 0 && <button onClick={() => onCSV(fac)} title="Descargar CSV" style={botonIcono}><Download size={15} /></button>}
          <button onClick={() => onEliminar(fac)} title="Eliminar factura" style={botonIcono}><Trash2 size={15} /></button>
          <button onClick={() => onGestionar(fac)} style={{
           height: 34, padding: "0 12px", borderRadius: 9, border: "none", background: T.color.marcaSuave,
           color: T.color.marca, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Gestionar</button>
         </span>
        </div>
       </article>
      );
     })}
     {filtradas.length > tope && <VerMas onClick={() => setTope(t => t + 30)} />}
    </div>
   )}
   <BotonFlotante onClick={onNueva} titulo="Nueva factura" />
   {hojaFechas && (
    <Hoja titulo="Fechas de factura" onClose={() => setHojaFechas(false)}>
     {cerrar => (
      <>
       <Etiqueta>Desde</Etiqueta>
       <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={entrada} />
       <Etiqueta>Hasta</Etiqueta>
       <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={entrada} />
       <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setFechaDesde(""); setFechaHasta(""); }} style={{ ...botonGrande(false), flex: 1 }}>Limpiar</button>
        <button onClick={cerrar} style={{ ...botonGrande(true), flex: 2 }}>Ver {filtradas.length} {filtradas.length === 1 ? "factura" : "facturas"}</button>
       </div>
      </>
     )}
    </Hoja>
   )}
  </div>
 );
}

// ── 26b: Promesas de servicio ───────────────────────────────────────────────
// Verde hasta 2 dias, purpura 3 a 4, ambar desde 5.
const tonoDias = (d) => d <= 2 ? { bg: T.color.bienSuave, color: T.color.bien }
 : d <= 4 ? { bg: T.color.marcaSuave, color: T.color.marca } : { bg: T.color.ojoSuave, color: T.color.ojo };

function FilaCiudad({ ciudad, derecha, onClick }) {
 const depto = departamento(ciudad.code);
 const Contenedor = onClick ? "button" : "div";
 return (
  <Contenedor onClick={onClick} style={{
   display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 56, padding: "8px 14px",
   border: "none", borderBottom: `1px solid ${T.color.divisor}`, background: "transparent",
   fontFamily: "inherit", textAlign: "left", cursor: onClick ? "pointer" : "default", color: T.color.tinta,
  }}>
   <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
    <span style={{ fontSize: 14, fontWeight: 600, ...corta }}>{ciudad.name}</span>
    <span style={{ fontSize: 12, color: T.color.tinta3, ...corta }}>
     <span style={{ fontFamily: T.fuente.mono }}>{ciudad.code}</span>{depto ? ` · ${depto}` : ""}
    </span>
   </span>
   {derecha}
  </Contenedor>
 );
}

const lista = { background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12, overflow: "hidden" };

export function PromesasMovil({ ciudades = [], promMap, onAgregar, onEditar, onEliminar }) {
 const [busq, setBusq] = useState("");
 const [pestana, setPestana] = useState("todas");
 const [tope, setTope] = useState(60);
 const [hoja, setHoja] = useState(null); // { ciudad, nueva }
 const [dias, setDias] = useState("");
 const [hojaCiudad, setHojaCiudad] = useState(false);
 useEffect(() => { setTope(60); }, [busq, pestana]);

 const q = busq.trim().toLowerCase();
 const buscadas = ciudades.filter(c => !q || (c.name || "").toLowerCase().includes(q) || String(c.code).includes(q))
  .slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
 const con = buscadas.filter(c => promMap[c.code]);
 const grupos = {
  todas: con,
  "1_2": con.filter(c => Number(promMap[c.code]) <= 2),
  "3_4": con.filter(c => Number(promMap[c.code]) >= 3 && Number(promMap[c.code]) <= 4),
  "5": con.filter(c => Number(promMap[c.code]) >= 5),
  sin: buscadas.filter(c => !promMap[c.code]),
 };
 const configuradas = ciudades.filter(c => promMap[c.code]).length;
 const visibles = grupos[pestana] || [];

 const abrir = (ciudad) => { setHoja({ ciudad, nueva: !promMap[ciudad?.code] }); setDias(ciudad && promMap[ciudad.code] ? String(promMap[ciudad.code]) : ""); };

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${configuradas} de ${ciudades.length} configuradas`} titulo="Promesas de servicio" />
   <BuscadorConductor valor={busq} onChange={setBusq} placeholder="Buscar ciudad o codigo DANE" />
   <Pestanas valor={pestana} onChange={setPestana} opciones={[
    { clave: "todas", label: "Todas", n: grupos.todas.length },
    { clave: "1_2", label: "1–2 dias", n: grupos["1_2"].length },
    { clave: "3_4", label: "3–4 dias", n: grupos["3_4"].length },
    { clave: "5", label: "5+ dias", n: grupos["5"].length },
    ...(grupos.sin.length ? [{ clave: "sin", label: "Sin promesa", n: grupos.sin.length }] : []),
   ]}/>
   {visibles.length === 0 ? (
    <ListaVacia>{configuradas === 0 && pestana !== "sin" ? "Aun no hay promesas configuradas. Sin promesa, el riesgo de un pedido se calcula con su fecha estimada." : "Ninguna ciudad en este grupo."}</ListaVacia>
   ) : (
    <div style={lista}>
     {visibles.slice(0, tope).map(c => {
      const d = Number(promMap[c.code]);
      const tono = d ? tonoDias(d) : { bg: T.color.neutroSuave, color: T.color.tinta3 };
      return (
       <FilaCiudad key={c.code} ciudad={c} onClick={() => abrir(c)} derecha={<>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: T.radio.pastilla, background: tono.bg, color: tono.color, whiteSpace: "nowrap", flexShrink: 0 }}>
         {d ? `${d} ${d === 1 ? "dia" : "dias"}` : "Sin promesa"}
        </span>
        <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
       </>} />
      );
     })}
    </div>
   )}
   {visibles.length > tope && <VerMas onClick={() => setTope(t => t + 60)} />}
   <BotonFlotante onClick={() => abrir(null)} titulo="Agregar promesa" />

   {hoja && (
    <Hoja titulo={hoja.nueva ? "Agregar promesa" : "Editar promesa"} onClose={() => setHoja(null)}>
     {cerrar => (
      <>
       <Etiqueta>Ciudad destino</Etiqueta>
       {hoja.nueva ? (
        <button onClick={() => setHojaCiudad(true)} style={{ ...entrada, cursor: "pointer", textAlign: "left", color: hoja.ciudad ? T.color.tinta : T.color.placeholder }}>
         <MapPin size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
         <span style={{ flex: 1, minWidth: 0, ...corta }}>{hoja.ciudad ? `${hoja.ciudad.name} · ${hoja.ciudad.code}` : "Buscar ciudad"}</span>
         <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
        </button>
       ) : (
        <span style={{ fontSize: 15, fontWeight: 700 }}>{hoja.ciudad.name} <span style={{ fontFamily: T.fuente.mono, fontSize: 13, fontWeight: 500, color: T.color.tinta3 }}>{hoja.ciudad.code}</span></span>
       )}
       <Etiqueta>Dias de plazo</Etiqueta>
       <input value={dias} onChange={e => setDias(e.target.value)} type="number" inputMode="numeric" placeholder="2" style={entrada} />
       <button onClick={async () => {
        const ok = hoja.nueva
         ? await onAgregar({ ciudad_codigo: hoja.ciudad?.code || "", dias_plazo: dias })
         : await onEditar(hoja.ciudad.code, dias);
        if (ok) cerrar();
       }} style={botonGrande(true)}>{hoja.nueva ? "Agregar promesa" : "Guardar"}</button>
       {!hoja.nueva && (
        <button onClick={async () => { if (await onEliminar(hoja.ciudad.code, hoja.ciudad.name)) cerrar(); }}
         style={{ ...botonGrande(false), color: T.color.mal }}><Trash2 size={15} /> Quitar promesa</button>
       )}
      </>
     )}
    </Hoja>
   )}
   {hojaCiudad && (
    <HojaCiudades ciudades={ciudades} titulo="Ciudad destino" seleccionada={hoja?.ciudad?.code}
     onElegir={c => { setHoja({ ciudad: c, nueva: true }); if (promMap[c.code]) setDias(String(promMap[c.code])); }}
     onClose={() => setHojaCiudad(false)} />
   )}
  </div>
 );
}

// ── 26c: Ciudades / DANE ────────────────────────────────────────────────────
// La base no tiene como editar una ciudad (solo crear e importar), asi que en
// lugar del lapiz la fila muestra cuantos pedidos van a ella.
export function CiudadesMovil({ ciudades = [], usos, onNueva, onImportar }) {
 const [busq, setBusq] = useState("");
 const [depto, setDepto] = useState("");
 const [tope, setTope] = useState(60);
 useEffect(() => { setTope(60); }, [busq, depto]);
 const q = busq.trim().toLowerCase();
 const deptos = [...new Set(ciudades.map(c => departamento(c.code)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
 const filt = ciudades
  .filter(c => (!q || (c.name || "").toLowerCase().includes(q) || String(c.code).includes(q)) && (!depto || departamento(c.code) === depto))
  .slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre={`${ciudades.length} ${ciudades.length === 1 ? "ciudad" : "ciudades"}`} titulo="Ciudades / DANE"
    derecha={<MenuMas opciones={[["Importar CSV", onImportar]]} />} />
   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}><BuscadorConductor valor={busq} onChange={setBusq} placeholder="Ciudad o codigo DANE" /></div>
    <label style={{
     position: "relative", display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 10px", flexShrink: 0, maxWidth: 150,
     borderRadius: T.radio.control, fontSize: 13, fontWeight: 600, cursor: "pointer",
     background: depto ? T.color.marcaSuave : T.color.superficie, color: depto ? T.color.marca : T.color.tinta2,
     border: `1px solid ${depto ? T.color.marcaSuave : T.color.borde2}`,
    }}>
     <IconoMapa size={15} style={{ flexShrink: 0 }} /><span style={corta}>{depto || "Depto."}</span><ChevronDown size={14} style={{ flexShrink: 0 }} />
     <select value={depto} onChange={e => setDepto(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
      <option value="">Todos los departamentos</option>
      {deptos.map(d => <option key={d} value={d}>{d}</option>)}
     </select>
    </label>
   </div>
   <LineaResumen izquierda={`${filt.length} de ${ciudades.length} · orden A-Z`} />
   {filt.length === 0 ? (
    <ListaVacia>{ciudades.length === 0 ? "Sin ciudades registradas." : "Ninguna ciudad coincide con la busqueda."}</ListaVacia>
   ) : (
    <div style={lista}>
     {filt.slice(0, tope).map(c => {
      const n = usos(c.code);
      return (
       <FilaCiudad key={c.code} ciudad={c} derecha={
        <span style={{ fontSize: 12, color: n ? T.color.tinta2 : T.color.tinta4, fontWeight: n ? 600 : 500, flexShrink: 0 }}>
         {n} {n === 1 ? "pedido" : "pedidos"}
        </span>
       } />
      );
     })}
    </div>
   )}
   {filt.length > tope && <VerMas onClick={() => setTope(t => t + 60)} />}
   <BotonFlotante onClick={onNueva} titulo="Nueva ciudad" />
  </div>
 );
}

// ── 26d: Resumen transportador ──────────────────────────────────────────────
// El conductor es el encabezado y se cambia tocandolo; los tres conteos son
// pestanias y lo que lleva son tarjetas numeradas con el total al pie.
export function ResumenMovil({ condOpts = [], selCond, setSelCond, cond, misPeds, misDV, misRC, totalCajas, gpsFresco, onImprimir }) {
 const [pestana, setPestana] = useState("pedidos");
 const opciones = condOpts.slice().sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
 const selector = (
  <select value={selCond} onChange={e => setSelCond(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}>
   <option value="">Seleccione un conductor</option>
   {opciones.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.placa || "sin placa"}</option>)}
  </select>
 );
 const filas = pestana === "pedidos" ? misPeds : pestana === "devoluciones" ? misDV : misRC;
 const unidades = filas.reduce((a, x) => a + (parseInt(pestana === "pedidos" ? x.cajas : x.unidades) || 0), 0);
 const nombre = { pedidos: ["pedido", "pedidos"], devoluciones: ["devolucion", "devoluciones"], recogidas: ["recogida", "recogidas"] }[pestana];

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <Cabecera sobre="Lo que cada conductor lleva en ruta" titulo="Resumen transportador"
    derecha={<button onClick={onImprimir} disabled={!cond} title="Imprimir resumen" style={{ ...botonCabecera, opacity: cond ? 1 : 0.5 }}><Printer size={17} /></button>} />
   {!cond ? (
    <label style={{ ...tarjeta, position: "relative", flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" }}>
     <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: condOpts.length ? T.color.marca : T.color.tinta3 }}>
      {condOpts.length ? "Elegir conductor" : "No hay pedidos con conductor asignado."}
     </span>
     {condOpts.length > 0 && <ChevronDown size={16} style={{ color: T.color.marca }} />}
     {condOpts.length > 0 && selector}
    </label>
   ) : (
    <>
     <section style={{ ...tarjeta, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, display: "grid", placeItems: "center", background: T.color.marcaAvatar, color: T.color.marca, fontSize: 13, fontWeight: 800 }}>{iniciales(cond.nombre)}</span>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
       <span style={{ fontSize: 14.5, fontWeight: 700, ...corta }}>{cond.nombre}</span>
       <span style={{ fontSize: 12, color: T.color.tinta3, ...corta }}>
        <span style={{ fontFamily: T.fuente.mono }}>{cond.placa || "sin placa"}</span>{cond.empresa ? ` · ${cond.empresa}` : ""}
       </span>
       <span style={{ fontSize: 11.5, fontWeight: 600, color: gpsFresco ? T.color.bien : T.color.tinta4 }}>{gpsFresco ? "GPS activo" : "Sin reporte GPS"}</span>
      </div>
      <label style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: T.color.marca, cursor: "pointer", flexShrink: 0 }}>
       Cambiar <ChevronDown size={14} />{selector}
      </label>
     </section>
     <Pestanas valor={pestana} onChange={setPestana} opciones={[
      { clave: "pedidos", label: "Pedidos", n: misPeds.length },
      { clave: "devoluciones", label: "Devoluciones", n: misDV.length },
      { clave: "recogidas", label: "Recogidas", n: misRC.length },
     ]}/>
     {filas.length === 0 ? (
      <ListaVacia>Nada asignado en este momento.</ListaVacia>
     ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
       {filas.map((x, i) => (
        <article key={x.id} style={{ ...tarjeta, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
         <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: T.color.superficie3, color: T.color.tinta2, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
         <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
           <span style={{ fontWeight: 700, fontSize: 13.5, ...corta }}>{x.guia_interna || x.guia || x.id}</span>
           <Chip bg={T.color.marcaSuave} color={T.color.marca} punto={T.estado.en_transito} texto="En transito" />
          </div>
          {pestana === "pedidos" ? (
           <>
            <span style={{ fontSize: 13, fontWeight: 600, ...corta }}>{x.cliente}</span>
            <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", gap: 10, flexWrap: "wrap" }}>
             {x.guia_interna && x.guia_interna !== x.id && <span style={{ fontFamily: T.fuente.mono }}>{x.id}</span>}
             {x.factura && <span>Factura <span style={{ fontFamily: T.fuente.mono }}>{x.factura}</span></span>}
            </span>
           </>
          ) : (
           <span style={{ fontSize: 12.5, color: T.color.tinta2, ...corta }}>{x.dir_recogida || x.dir_entrega || "—"}</span>
          )}
          <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", gap: 12, alignItems: "center" }}>
           <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, ...corta }}><MapPin size={13} style={{ flexShrink: 0 }} />{x.ciudad_nombre || x.ciudad_entrega_nombre || x.ciudad_recogida_nombre || "—"}</span>
           {x.fecha_estimada && <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}><Calendar size={13} />{fechaCorta(x.fecha_estimada)}</span>}
           <span style={{ marginLeft: "auto", fontWeight: 700, color: T.color.tinta, flexShrink: 0 }}>{(pestana === "pedidos" ? x.cajas : x.unidades) || 0} {pestana === "pedidos" ? "cajas" : "uds"}</span>
          </span>
         </div>
        </article>
       ))}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.color.superficie2, borderRadius: 12, fontSize: 13 }}>
        <span style={{ color: T.color.tinta3 }}>{`${filas.length} ${filas.length === 1 ? nombre[0] : nombre[1]}`}</span>
        <span style={{ fontWeight: 700 }}>{`Total ${pestana === "pedidos" ? totalCajas : unidades} ${pestana === "pedidos" ? "cajas" : "uds"}`}</span>
       </div>
      </div>
     )}
    </>
   )}
  </div>
 );
}

import React, { useState, useEffect, useRef } from 'react';
import {
 Bell, Boxes, ChevronDown, MapPin, MoreHorizontal, Package, Plus,
 Search, SlidersHorizontal, User, UserPlus,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ALTO_BARRA } from '../../design/responsive';
import { ESTADOS_PEDIDO } from '../../Constants';
import { transportePedido } from '../../utils/transporte';

// La tabla de pedidos no cabe en un telefono. Cada fila pasa a ser una tarjeta
// de tres lineas -- numero y estado arriba, cliente en medio, carga y conductor
// abajo -- y los filtros que ocupaban la barra se mudan a una hoja inferior.

// Fondo y tinta de la pastilla de estado. El punto sale de T.estado, que ya
// lleva la secuencia de color validada de la barra del dashboard.
const TONO_ESTADO = {
 sin_asignar:   { bg: T.color.neutroSuave, color: T.color.neutro },
 pendiente:     { bg: T.color.neutroSuave, color: T.color.neutro },
 en_transito:   { bg: T.color.marcaSuave,  color: T.color.marca },
 paqueteria:    { bg: T.color.marcaSuave,  color: T.color.marca },
 entregado:     { bg: T.color.bienSuave,   color: T.color.bien },
 novedad:       { bg: T.color.malSuave,    color: T.color.mal },
 solo_facturar: { bg: T.color.bienSuave,   color: T.color.bien },
 cliente_recoge:{ bg: T.color.infoSuave,   color: T.color.info },
};

const RANGOS = [
 { id: "todo", corto: "Todo" },
 { id: "7", corto: "7 dias" },
 { id: "30", corto: "30 dias" },
 { id: "90", corto: "90 dias" },
];

const TIPOS = [
 { id: "", label: "Todos" },
 { id: "propio", label: "Transporte propio" },
 { id: "paqueteria", label: "Paqueteria" },
];

const campo = {
 display: "flex", alignItems: "center", gap: 8, height: 44,
 border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
 padding: "0 12px", fontSize: 14, background: T.color.superficie,
};

const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2,
 position: "relative", padding: 0,
};

function useCerrarAlTocarFuera(abierto, cerrar) {
 const ref = useRef(null);
 useEffect(() => {
  if (!abierto) return;
  const fuera = e => { if (ref.current && !ref.current.contains(e.target)) cerrar(); };
  document.addEventListener("mousedown", fuera);
  document.addEventListener("touchstart", fuera);
  return () => {
   document.removeEventListener("mousedown", fuera);
   document.removeEventListener("touchstart", fuera);
  };
 }, [abierto, cerrar]);
 return ref;
}

// ── Hoja de filtros ─────────────────────────────────────────────────────────
export function HojaFiltros({
 ciudades, pedidos, conductoresActivos, total,
 rango, setRango, ciudadF, setCiudadF, conductorF, setConductorF, tipoF, setTipoF,
 onLimpiar, onClose,
}) {
 const [dentro, setDentro] = useState(false);

 useEffect(() => {
  const id = requestAnimationFrame(() => setDentro(true));
  return () => cancelAnimationFrame(id);
 }, []);

 useEffect(() => {
  const previo = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previo; };
 }, []);

 const cerrar = () => { setDentro(false); setTimeout(onClose, 180); };

 const ciudadesUsadas = [...new Set(pedidos.map(p => p.ciudad_codigo).filter(Boolean))]
  .map(code => [code, (ciudades || []).find(c => c.code === code)?.name || code])
  .sort((a, b) => a[1].localeCompare(b[1], "es"));

 return (
  <div onClick={cerrar} style={{
   position: "fixed", inset: 0, zIndex: 130,
   background: dentro ? "rgba(23,20,31,.35)" : "rgba(23,20,31,0)",
   transition: "background .18s ease",
   display: "flex", flexDirection: "column", justifyContent: "flex-end",
  }}>
   <div onClick={e => e.stopPropagation()} style={{
    background: T.color.superficie, borderRadius: "20px 20px 0 0",
    padding: "10px 16px 24px", display: "flex", flexDirection: "column", gap: 16,
    maxHeight: "88vh", overflowY: "auto",
    boxShadow: "0 -10px 40px rgba(23,20,31,.15)",
    transform: dentro ? "translateY(0)" : "translateY(100%)",
    transition: "transform .2s ease",
    paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <span style={{ width: 40, height: 4, borderRadius: 2, background: T.color.tenue, margin: "0 auto", flexShrink: 0 }} />

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
     <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Filtros</span>
     <button onClick={onLimpiar} style={{
      border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
      fontSize: 13, fontWeight: 600, color: T.color.marca, padding: 0,
     }}>Limpiar</button>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     <span style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>Fecha</span>
     <div style={{
      display: "flex", background: T.color.superficie2,
      border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, padding: 3,
     }}>
      {RANGOS.map(r => {
       const activo = rango === r.id;
       return (
        <button key={r.id} onClick={() => setRango(r.id)} style={{
         flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 7,
         border: "none", cursor: "pointer", fontFamily: "inherit",
         fontSize: 13, fontWeight: activo ? 600 : 500,
         background: activo ? T.color.superficie : "transparent",
         color: activo ? T.color.tinta : T.color.tinta3,
         boxShadow: activo ? "0 1px 2px rgba(0,0,0,.08)" : "none",
        }}>{r.corto}</button>
       );
      })}
     </div>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     <span style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>Ciudad</span>
     <label style={{ ...campo, position: "relative", color: ciudadF ? T.color.tinta : T.color.placeholder }}>
      <MapPin size={15} style={{ color: T.color.tinta4, flexShrink: 0 }} />
      {ciudadF ? (ciudadesUsadas.find(c => c[0] === ciudadF)?.[1] || ciudadF) : "Todas las ciudades"}
      <ChevronDown size={15} style={{ color: T.color.tinta4, marginLeft: "auto", flexShrink: 0 }} />
      <select value={ciudadF} onChange={e => setCiudadF(e.target.value)} style={selectInvisible}>
       <option value="">Todas las ciudades</option>
       {ciudadesUsadas.map(([code, nombre]) => <option key={code} value={code}>{nombre}</option>)}
      </select>
     </label>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     <span style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>Conductor</span>
     <label style={{ ...campo, position: "relative", color: conductorF ? T.color.tinta : T.color.placeholder }}>
      <User size={15} style={{ color: T.color.tinta4, flexShrink: 0 }} />
      {conductorF === "sin" ? "Sin asignar"
       : conductorF ? (conductoresActivos.find(c => String(c.id) === conductorF)?.nombre || conductorF)
       : "Todos los conductores"}
      <ChevronDown size={15} style={{ color: T.color.tinta4, marginLeft: "auto", flexShrink: 0 }} />
      <select value={conductorF} onChange={e => setConductorF(e.target.value)} style={selectInvisible}>
       <option value="">Todos los conductores</option>
       <option value="sin">Sin asignar</option>
       {conductoresActivos.slice()
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"))
        .map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
      </select>
     </label>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     <span style={{ fontSize: 12, fontWeight: 600, color: T.color.tinta2 }}>Tipo de envio</span>
     <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {TIPOS.map(t => {
       const activo = tipoF === t.id;
       return (
        <button key={t.id || "todos"} onClick={() => setTipoF(t.id)} style={{
         height: 36, padding: "0 12px", display: "flex", alignItems: "center",
         borderRadius: T.radio.pastilla, cursor: "pointer", fontFamily: "inherit",
         fontSize: 13, fontWeight: activo ? 600 : 500,
         background: activo ? T.color.marca : T.color.superficie,
         border: activo ? "none" : `1px solid ${T.color.borde2}`,
         color: activo ? "#fff" : T.color.tinta2,
        }}>{t.label}</button>
       );
      })}
     </div>
    </div>

    <button onClick={cerrar} style={{
     display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48,
     borderRadius: 12, border: "none", background: T.color.marca, color: "#fff",
     fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
    }}>
     Ver {total.toLocaleString("es-CO")} {total === 1 ? "pedido" : "pedidos"}
    </button>
   </div>
  </div>
 );
}

// El <select> nativo se estira invisible sobre el campo: conserva el selector
// del sistema, que en el celular es el comodo, sin heredar su aspecto.
const selectInvisible = {
 position: "absolute", inset: 0, width: "100%", height: "100%",
 opacity: 0, border: "none", appearance: "none", cursor: "pointer",
};

// ── Tarjeta de un pedido ────────────────────────────────────────────────────
function TarjetaPedido({ pedido, conductor, onAbrir }) {
 const tr = transportePedido(pedido, conductor);
 const tono = TONO_ESTADO[pedido.estado] || TONO_ESTADO.sin_asignar;
 const punto = T.estado[pedido.estado] || T.color.neutroPunto;
 const esPaqueteria = pedido.tipo === "paqueteria";
 const sinConductor = !tr.principal;

 const IconoTransporte = sinConductor ? UserPlus : esPaqueteria ? Package : User;
 const colorTransporte = sinConductor ? T.color.malPunto : T.color.tinta2;

 return (
  <button onClick={() => onAbrir(pedido)} style={{
   background: T.color.superficie, border: `1px solid ${T.color.borde}`,
   borderRadius: 12, padding: "12px 14px", width: "100%",
   display: "flex", flexDirection: "column", gap: 8,
   cursor: "pointer", fontFamily: "inherit", textAlign: "left",
  }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums", color: T.color.tinta }}>
     {pedido.guia_interna || pedido.id}
    </span>
    {pedido.guia_interna && pedido.guia_interna !== pedido.id && (
     <span style={{ fontFamily: T.fuente.mono, fontSize: 11, color: T.color.tinta4 }}>{pedido.id}</span>
    )}
    <span style={{
     marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
     fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: T.radio.pastilla,
     background: tono.bg, color: tono.color, whiteSpace: "nowrap", flexShrink: 0,
    }}>
     <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
     {ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado}
    </span>
   </div>

   <span style={{
    fontSize: 13, fontWeight: 500, color: T.color.tinta, width: "100%",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
   }}>{pedido.cliente}</span>

   <div style={{
    display: "flex", alignItems: "center", gap: 14, width: "100%",
    fontSize: 12, color: T.color.tinta3,
    paddingTop: 8, borderTop: `1px solid ${T.color.divisor}`,
   }}>
    <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {pedido.cajas || 0} {Number(pedido.cajas) === 1 ? "caja" : "cajas"}
    </span>
    <span style={{
     display: "flex", alignItems: "center", gap: 5, minWidth: 0,
     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
     <MapPin size={14} style={{ color: T.color.placeholder, flexShrink: 0 }} />
     {pedido.ciudad_nombre || "Sin ciudad"}
    </span>
    <span style={{
     marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
     fontWeight: 600, color: colorTransporte, maxWidth: 130,
     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
     <IconoTransporte size={14} style={{ flexShrink: 0 }} />
     {tr.noAplica ? "No aplica" : tr.principal || "Asignar"}
    </span>
   </div>
  </button>
 );
}

// ── Listado ─────────────────────────────────────────────────────────────────
export function PedidosMovil({
 pedidos, filtrados, conductores, ciudades, conductoresActivos,
 busq, setBusq, filtro, setFiltro, conteoPorEstado, estadosOrden,
 rango, setRango, ciudadF, setCiudadF, conductorF, setConductorF, tipoF, setTipoF,
 onAbrir, onNuevo, onPlanilla, onCSV, onCargarGuias, avisos = 0,
}) {
 const [hoja, setHoja] = useState(false);
 const [menu, setMenu] = useState(false);
 const [tope, setTope] = useState(40);
 const refMenu = useCerrarAlTocarFuera(menu, () => setMenu(false));

 // Se muestra de a 40 y crece al llegar al final: en el celular un paginador
 // con numeros es mas trabajo que seguir bajando.
 useEffect(() => { setTope(40); }, [busq, filtro, rango, ciudadF, conductorF, tipoF]);

 const activos = [rango !== "todo", !!ciudadF, !!conductorF, !!tipoF].filter(Boolean).length;
 const visibles = filtrados.slice(0, tope);
 const pie = ALTO_BARRA + 16;

 const limpiar = () => { setRango("todo"); setCiudadF(""); setConductorF(""); setTipoF(""); };

 const etiquetaFiltro = filtro === "todos"
  ? "pedidos"
  : `pedidos · ${(ESTADOS_PEDIDO[filtro]?.label || filtro).toLowerCase()}`;

 return (
  <div style={{
   minHeight: "100%", background: T.color.fondo, color: T.color.tinta,
   margin: `-16px -16px -${pie}px`,
   padding: `14px 16px ${pie + 12}px`,
   display: "flex", flexDirection: "column", gap: 12,
  }}>
   <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div style={{ minWidth: 0 }}>
     <div style={{ fontSize: 12, color: T.color.tinta3, lineHeight: 1.2 }}>Somos PRO · Tracking</div>
     <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Pedidos</h1>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
     <button style={botonCabecera} title="Avisos">
      <Bell size={17} />
      {avisos > 0 && (
       <span style={{
        position: "absolute", top: 8, right: 9, width: 7, height: 7,
        borderRadius: 4, background: T.color.malPunto,
       }} />
      )}
     </button>
     <div ref={refMenu} style={{ position: "relative" }}>
      <button onClick={() => setMenu(!menu)} style={botonCabecera} title="Mas acciones">
       <MoreHorizontal size={17} />
      </button>
      {menu && (
       <div style={{
        position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40, minWidth: 210,
        background: T.color.superficie, border: `1px solid ${T.color.borde}`,
        borderRadius: T.radio.tarjeta, boxShadow: T.sombra.flotante, padding: 6,
       }}>
        {[
         ["Imprimir planilla", onPlanilla],
         ["Descargar CSV", onCSV],
         ["Cargar guias paqueteria", onCargarGuias],
        ].map(([texto, accion]) => (
         <button key={texto} onClick={() => { setMenu(false); accion(); }} style={{
          width: "100%", textAlign: "left", border: "none", background: "transparent",
          cursor: "pointer", fontFamily: "inherit", padding: "11px 10px",
          borderRadius: T.radio.chico, fontSize: 13.5, color: T.color.tinta2, display: "block",
         }}>{texto}</button>
        ))}
       </div>
      )}
     </div>
    </div>
   </header>

   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
     <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: T.color.tinta4 }} />
     <input value={busq} onChange={e => setBusq(e.target.value)}
      placeholder="Buscar pedido, factura o cliente"
      style={{
       width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px 0 34px",
       background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
       borderRadius: T.radio.control, fontSize: 16, fontFamily: "inherit",
       color: T.color.tinta, outline: "none",
      }}/>
    </div>
    <button onClick={() => setHoja(true)} style={{
     display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px",
     background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
     borderRadius: T.radio.control, cursor: "pointer", fontFamily: "inherit",
     fontSize: 13, fontWeight: 600, color: T.color.tinta2,
     position: "relative", flexShrink: 0,
    }}>
     <SlidersHorizontal size={16} style={{ color: T.color.tinta4 }} />
     Filtros
     {activos > 0 && (
      <span style={{
       position: "absolute", top: -5, right: -5, width: 18, height: 18,
       borderRadius: 9, background: T.color.marca, color: "#fff",
       fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center",
      }}>{activos}</span>
     )}
    </button>
   </div>

   {/* Las pestanas se salen del relleno lateral para que la ultima no quede
       cortada al final del desplazamiento. */}
   <div style={{
    display: "flex", gap: 6, overflowX: "auto",
    margin: "0 -16px", padding: "0 16px 2px", scrollbarWidth: "none",
   }}>
    {[["todos", "Todos"], ...estadosOrden.map(k => [k, ESTADOS_PEDIDO[k]?.label || k])].map(([clave, label]) => {
     const activo = filtro === clave;
     const n = conteoPorEstado(clave);
     return (
      <button key={clave} onClick={() => setFiltro(clave)} style={{
       display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px",
       borderRadius: T.radio.pastilla, cursor: "pointer", fontFamily: "inherit",
       fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
       background: activo ? T.color.marca : T.color.superficie,
       color: activo ? "#fff" : T.color.tinta2,
       border: activo ? "1px solid transparent" : `1px solid ${T.color.borde2}`,
      }}>
       {label}
       <span style={{
        fontSize: 11, fontWeight: 700, padding: "0 6px", borderRadius: T.radio.pastilla,
        background: activo ? "rgba(255,255,255,.22)" : T.color.superficie2,
        color: activo ? "#fff" : T.color.tinta3,
       }}>{n}</span>
      </button>
     );
    })}
   </div>

   <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 12, color: T.color.tinta3, padding: "2px 2px 0",
   }}>
    <span>{filtrados.length.toLocaleString("es-CO")} {etiquetaFiltro}</span>
    {filtrados.length > visibles.length && (
     <span>mostrando {visibles.length.toLocaleString("es-CO")}</span>
    )}
   </div>

   <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {filtrados.length === 0 ? (
     <div style={{
      padding: "40px 20px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3,
      background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
     }}>Ningun pedido coincide con los filtros.</div>
    ) : visibles.map(p => (
     <TarjetaPedido
      key={p.id}
      pedido={p}
      conductor={conductores.find(c => String(c.id) === String(p.conductor_id))}
      onAbrir={onAbrir}
     />
    ))}

    {filtrados.length > visibles.length && (
     <button onClick={() => setTope(t => t + 40)} style={{
      minHeight: 46, borderRadius: T.radio.control, cursor: "pointer", fontFamily: "inherit",
      background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
      color: T.color.tinta2, fontSize: 13.5, fontWeight: 600, marginTop: 4,
     }}>Ver mas pedidos</button>
    )}
   </div>

   <button onClick={onNuevo} title="Nuevo pedido" style={{
    position: "fixed", right: 16, bottom: ALTO_BARRA + 20, zIndex: 90,
    width: 52, height: 52, borderRadius: 16, border: "none",
    background: T.color.marca, color: "#fff", cursor: "pointer",
    display: "grid", placeItems: "center",
    boxShadow: "0 8px 24px -6px rgba(91,53,213,.6)",
   }}>
    <Plus size={24} />
   </button>

   {hoja && (
    <HojaFiltros
     ciudades={ciudades}
     pedidos={pedidos}
     conductoresActivos={conductoresActivos}
     total={filtrados.length}
     rango={rango} setRango={setRango}
     ciudadF={ciudadF} setCiudadF={setCiudadF}
     conductorF={conductorF} setConductorF={setConductorF}
     tipoF={tipoF} setTipoF={setTipoF}
     onLimpiar={limpiar}
     onClose={() => setHoja(false)}
    />
   )}
  </div>
 );
}

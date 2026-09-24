import React, { useState, useMemo } from 'react';
import {
 Calendar, Check, ChevronDown, FileText, Info, Lock, Map as IconoMapa, Minus, Phone,
 Plus, Search, UserCheck, UserPlus, X,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO, ESTADOS_SIN_DESPACHO } from '../../Constants';
import { usePedidoEditable } from './usePedidoEditable';

// El formulario de escritorio cabe en un modal de 640px; en el celular ocupa la
// pantalla entera, con cabecera y pie fijos. Los campos suben a 48px para el
// pulgar, solo los pares cortos van en dos columnas, y lo que falta se marca con
// un punto rojo en la etiqueta -- no en un resumen aparte que hay que ir a leer.

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

const TIPOS = [
 { id: "propio", label: "Propio" },
 { id: "empresa_transporte", label: "Empresa" },
 { id: "paqueteria", label: "Paqueteria" },
];

const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", gap: 8, fontSize: 15, fontFamily: "inherit", color: T.color.tinta,
 outline: "none",
};

const iniciales = (nombre) =>
 (nombre || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

function Seccion({ children }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
   <span style={{
    fontSize: 11, fontWeight: 600, color: T.color.placeholder,
    letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
   }}>{children}</span>
   <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
  </div>
 );
}

// El punto rojo va en la etiqueta del campo que falta, junto al dato que hay que
// llenar, y no en un aviso al principio de la pantalla.
function Etiqueta({ children, falta, opcional }) {
 return (
  <span style={{
   fontSize: 13, fontWeight: 600, color: T.color.tinta2,
   display: "flex", alignItems: "center", gap: 6, minWidth: 0,
  }}>
   {children}
   {opcional && <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span>}
   {falta && <span style={{ width: 6, height: 6, borderRadius: 3, background: T.color.malPunto }} />}
  </span>
 );
}

function Campo({ etiqueta, falta, opcional, ayuda, children }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
   <Etiqueta falta={falta} opcional={opcional}>{etiqueta}</Etiqueta>
   {children}
   {ayuda && <span style={{ fontSize: 12, color: T.color.tinta4 }}>{ayuda}</span>}
  </div>
 );
}

// ── Hoja para elegir conductor ──────────────────────────────────────────────
export function HojaConductores({ conductores, pedidos = [], tipo, seleccionado, onElegir, onClose }) {
 const [dentro, setDentro] = useState(false);
 const [busq, setBusq] = useState("");
 const [filtro, setFiltro] = useState("disponibles");
 const [elegido, setElegido] = useState(seleccionado ? String(seleccionado) : "");

 React.useEffect(() => {
  const id = requestAnimationFrame(() => setDentro(true));
  return () => cancelAnimationFrame(id);
 }, []);

 React.useEffect(() => {
  const previo = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previo; };
 }, []);

 const cerrar = () => { setDentro(false); setTimeout(onClose, 180); };

 // "En ruta" y "Disponible" salen de los pedidos que cada conductor lleva
 // encima ahora mismo. Es el dato que de verdad decide a quien se le carga uno
 // mas; los conductores no tienen ciudad registrada, asi que no se agrupan por
 // ella sino por la empresa que los transporta.
 const enRuta = useMemo(() => {
  const cuenta = {};
  for (const p of pedidos) {
   if (p.estado === "en_transito" && p.conductor_id) {
    cuenta[String(p.conductor_id)] = (cuenta[String(p.conductor_id)] || 0) + 1;
   }
  }
  return cuenta;
 }, [pedidos]);

 const lista = useMemo(() => {
  const q = busq.trim().toLowerCase();
  return conductores
   .filter(c => c.activo !== false)
   .filter(c => {
    const n = enRuta[String(c.id)] || 0;
    if (filtro === "disponibles") return n === 0;
    if (filtro === "ruta") return n > 0;
    return true;
   })
   .filter(c => !q
    || (c.nombre || "").toLowerCase().includes(q)
    || (c.placa || "").toLowerCase().includes(q)
    || String(c.cedula || "").toLowerCase().includes(q))
   .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
 }, [conductores, busq, filtro, enRuta]);

 // Agrupados por la empresa que los transporta, que es lo que consta.
 const grupos = useMemo(() => {
  const m = new Map();
  for (const c of lista) {
   const k = c.empresa || "Transporte propio";
   if (!m.has(k)) m.set(k, []);
   m.get(k).push(c);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
 }, [lista]);

 const cond = conductores.find(c => String(c.id) === elegido);

 return (
  <div onClick={cerrar} style={{
   position: "fixed", inset: 0, zIndex: 140,
   background: dentro ? "rgba(23,20,31,.35)" : "rgba(23,20,31,0)",
   transition: "background .18s ease",
  }}>
   <div onClick={e => e.stopPropagation()} style={{
    position: "absolute", left: 0, right: 0, bottom: 0, top: 120,
    background: T.color.superficie, borderRadius: "20px 20px 0 0",
    display: "flex", flexDirection: "column",
    boxShadow: "0 -10px 40px rgba(23,20,31,.15)",
    transform: dentro ? "translateY(0)" : "translateY(100%)",
    transition: "transform .2s ease",
   }}>
    <div style={{
     flexShrink: 0, padding: "10px 16px 12px", display: "flex", flexDirection: "column",
     gap: 12, borderBottom: `1px solid ${T.color.divisor}`,
    }}>
     <span style={{ width: 40, height: 4, borderRadius: 2, background: T.color.tenue, margin: "0 auto" }} />
     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Elegir conductor</span>
      <span style={{ fontSize: 13, color: T.color.tinta3 }}>
       {tipo === "empresa_transporte" ? "Empresa de transporte" : "Transporte propio"}
      </span>
     </div>
     <div style={{ position: "relative" }}>
      <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: T.color.placeholder }} />
      <input value={busq} onChange={e => setBusq(e.target.value)}
       placeholder="Nombre, placa o cedula"
       style={{
        width: "100%", boxSizing: "border-box", height: 44, padding: "0 12px 0 36px",
        background: T.color.superficie2, border: `1px solid ${T.color.borde2}`,
        borderRadius: 12, fontSize: 16, fontFamily: "inherit", color: T.color.tinta, outline: "none",
       }}/>
     </div>
     <div style={{ display: "flex", gap: 6 }}>
      {[["disponibles", "Disponibles"], ["ruta", "En ruta"], ["todos", "Todos"]].map(([id, label]) => {
       const activo = filtro === id;
       return (
        <button key={id} onClick={() => setFiltro(id)} style={{
         height: 34, padding: "0 12px", display: "flex", alignItems: "center",
         borderRadius: T.radio.pastilla, cursor: "pointer", fontFamily: "inherit",
         fontSize: 13, fontWeight: activo ? 600 : 500,
         background: activo ? T.color.marca : T.color.superficie,
         border: activo ? "1px solid transparent" : `1px solid ${T.color.borde2}`,
         color: activo ? "#fff" : T.color.tinta2,
        }}>{label}</button>
       );
      })}
     </div>
    </div>

    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px" }}>
     {lista.length === 0 ? (
      <div style={{ padding: "36px 8px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3 }}>
       Ningun conductor coincide.
      </div>
     ) : grupos.map(([empresa, items]) => (
      <div key={empresa}>
       <div style={{
        fontSize: 11, fontWeight: 600, color: T.color.placeholder,
        letterSpacing: "0.06em", textTransform: "uppercase", padding: "14px 0 6px",
       }}>{empresa}</div>
       {items.map(c => {
        const n = enRuta[String(c.id)] || 0;
        const sel = String(c.id) === elegido;
        return (
         <button key={c.id} onClick={() => setElegido(String(c.id))} style={{
          display: "flex", alignItems: "center", gap: 12, minHeight: 60, width: "100%",
          padding: "8px 0", borderBottom: `1px solid ${T.color.divisor}`,
          border: "none", borderBottomStyle: "solid", background: "transparent",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
         }}>
          <span style={{
           width: 40, height: 40, borderRadius: 20, flexShrink: 0,
           background: T.color.marcaAvatar, color: T.color.marca,
           display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
          }}>{iniciales(c.nombre)}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
           <span style={{
            fontSize: 14, fontWeight: 600, color: T.color.tinta,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
           }}>{c.nombre}</span>
           <span style={{ fontSize: 12, color: T.color.tinta4, display: "flex", gap: 8, alignItems: "center" }}>
            {c.placa && <span style={{ fontFamily: T.fuente.mono }}>{c.placa}</span>}
            <span style={{
             display: "flex", alignItems: "center", gap: 4,
             color: n > 0 ? T.color.ojo : T.color.bien,
            }}>
             <span style={{ width: 6, height: 6, borderRadius: 3, background: n > 0 ? T.color.ojoPunto : T.color.bienPunto }} />
             {n > 0 ? `${n} en ruta` : "Disponible"}
            </span>
           </span>
          </span>
          <span style={{
           width: 24, height: 24, borderRadius: 12, flexShrink: 0,
           display: "grid", placeItems: "center", color: "#fff",
           border: sel ? `2px solid ${T.color.marca}` : `2px solid ${T.color.tenue}`,
           background: sel ? T.color.marca : "transparent",
          }}>{sel && <Check size={13} />}</span>
         </button>
        );
       })}
      </div>
     ))}
    </div>

    <div style={{
     flexShrink: 0, padding: "12px 16px", borderTop: `1px solid ${T.color.divisor}`,
     paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
    }}>
     <button
      onClick={() => { if (elegido) { onElegir(elegido); cerrar(); } }}
      disabled={!elegido}
      style={{
       display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
       width: "100%", height: 52, borderRadius: 12, border: "none",
       background: T.color.marca, color: "#fff", fontFamily: "inherit",
       fontSize: 15, fontWeight: 600,
       cursor: elegido ? "pointer" : "not-allowed", opacity: elegido ? 1 : 0.5,
      }}>
      <UserCheck size={17} />
      {cond ? `Asignar a ${cond.nombre}` : "Elige un conductor"}
     </button>
    </div>
   </div>
  </div>
 );
}

// ── Pantalla de edicion ─────────────────────────────────────────────────────
export function EditarPedidoMovil({
 pedido, pedidos = [], conductores, ciudades, paqueterias = [], transportistas = [],
 promesas = [], setPedidos, showToast, onClose, onGuia, onMapa,
 canEdit, canBasicEdit = false, canAssign = false, canDeliver = false,
}) {
 const e = usePedidoEditable({
  pedido, conductores, ciudades, promesas, setPedidos, showToast, onClose,
  canEdit, canBasicEdit, canAssign, canDeliver,
 });
 const [hoja, setHoja] = useState(false);

 const tono = TONO_ESTADO[pedido.estado] || TONO_ESTADO.sin_asignar;
 const punto = T.estado[pedido.estado] || T.color.neutroPunto;
 const bloqueado = e.pedidoBloqueadoEdicion;
 const esPaqueteria = e.tipoModal === "paqueteria";

 // Lo que hay que llenar para que el pedido pueda salir y medirse.
 const faltantes = [
  !e.direccion.trim() && "direccion",
  !e.facturaEdit.trim() && "factura",
  !e.fechaEdit && "fecha",
  !e.sinTransporte && !esPaqueteria && !e.condId && e.tipoModal === "propio" && "conductor",
 ].filter(Boolean);

 const elegirConductor = (id) => {
  e.setCondId(id);
  const c = conductores.find(x => String(x.id) === String(id));
  if (c?.empresa && e.tipoModal === "empresa_transporte") e.setEmpTrans(c.empresa);
 };

 const paso = (n) => {
  const actual = parseInt(e.cajas) || 0;
  e.setCajas(String(Math.max(0, actual + n)));
 };

 const ciudadesOrdenadas = (ciudades || []).slice()
  .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 115, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
    background: T.color.fondo, borderBottom: `1px solid ${T.color.borde}`,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <button onClick={onClose} title="Cerrar" style={{
     width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
     background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
     borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
    }}><X size={18} /></button>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
     <span style={{ fontSize: 14, fontWeight: 700 }}>Editar pedido</span>
     <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>
      {pedido.guia_interna || pedido.id}
     </span>
    </div>
    <span style={{
     display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
     fontSize: 11, fontWeight: 600, padding: "4px 9px",
     borderRadius: T.radio.pastilla, background: tono.bg, color: tono.color,
    }}>
     <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
     {ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado}
    </span>
   </header>

   <div style={{
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
    display: "flex", flexDirection: "column", gap: 16, padding: "14px 16px 20px",
   }}>
    <div style={{
     display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
     background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
    }}>
     <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
      <span style={{
       fontSize: 14, fontWeight: 700,
       whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{pedido.cliente || "Sin cliente"}</span>
      <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", gap: 8, flexWrap: "wrap" }}>
       <span style={{ fontFamily: T.fuente.mono }}>{pedido.id}</span>
       {pedido.cajas ? <span>{pedido.cajas} cajas</span> : null}
      </span>
     </div>
     {faltantes.length > 0 && (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
       <span style={{ fontSize: 11, color: T.color.tinta3 }}>Faltan</span>
       <span style={{ fontSize: 12, fontWeight: 700, color: T.color.mal }}>
        {faltantes.length} {faltantes.length === 1 ? "dato" : "datos"}
       </span>
      </div>
     )}
    </div>

    {pedido.notas && (
     <div style={{
      display: "flex", gap: 10, padding: "10px 12px", borderRadius: T.radio.control,
      background: T.color.ojoSuave, fontSize: 13, color: T.color.ojo, lineHeight: 1.45,
     }}>
      <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      <span><b>Notas:</b> {pedido.notas}</span>
     </div>
    )}

    {/* Transporte: se elige cuando falta, y queda bloqueado en transito. */}
    {!e.sinTransporte && (bloqueado ? (
     <section style={{
      display: "flex", flexDirection: "column", gap: 10, padding: 14,
      background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta,
     }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
       <span style={{
        fontSize: 11, fontWeight: 600, color: T.color.placeholder,
        letterSpacing: "0.06em", textTransform: "uppercase",
       }}>Transporte</span>
       <span style={{
        marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, fontWeight: 600, color: T.color.tinta4,
       }}>
        <Lock size={12} /> {e.pedidoCerrado ? "Pedido cerrado" : "Bloqueado en transito"}
       </span>
      </div>
      {e.cond && (
       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
         width: 40, height: 40, borderRadius: 20, flexShrink: 0,
         background: T.color.marcaAvatar, color: T.color.marca,
         display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
        }}>{iniciales(e.cond.nombre)}</span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
         <span style={{ fontSize: 14, fontWeight: 700 }}>{e.cond.nombre}</span>
         <span style={{ fontSize: 12, color: T.color.tinta4, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {e.cond.placa && <span style={{ fontFamily: T.fuente.mono }}>{e.cond.placa}</span>}
          {e.cond.empresa && <span>{e.cond.empresa}</span>}
         </span>
        </span>
        {e.cond.celular && (
         <a href={`tel:${e.cond.celular}`} title="Llamar" style={{
          width: 40, height: 40, borderRadius: T.radio.control, flexShrink: 0,
          background: T.color.marcaSuave, color: T.color.marca,
          display: "grid", placeItems: "center", textDecoration: "none",
         }}><Phone size={17} /></a>
        )}
       </div>
      )}
      <div style={{
       display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8,
       background: T.color.superficie2, fontSize: 12, color: T.color.tinta2, lineHeight: 1.45,
      }}>
       <Info size={14} style={{ color: T.color.marca, flexShrink: 0, marginTop: 2 }} />
       {e.pedidoCerrado
        ? "El pedido ya se cerro: sus datos no se pueden modificar."
        : "Solo el conductor asignado puede registrar la entrega o una novedad desde su app."}
      </div>
     </section>
    ) : (
     <section style={{
      display: "flex", flexDirection: "column", gap: 10, padding: 14,
      background: T.color.superficie, borderRadius: T.radio.tarjeta,
      border: `1px solid ${faltantes.includes("conductor") ? T.color.malBorde : T.color.borde}`,
     }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
       <span style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center",
        background: faltantes.includes("conductor") ? T.color.malSuave : T.color.marcaSuave,
        color: faltantes.includes("conductor") ? T.color.mal : T.color.marca,
       }}>{e.cond ? <UserCheck size={15} /> : <UserPlus size={15} />}</span>
       <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Conductor</span>
        <span style={{
         fontSize: 12, color: T.color.tinta3,
         whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
         {e.cond ? `${e.cond.nombre}${e.cond.placa ? ` · ${e.cond.placa}` : ""}`
          : esPaqueteria ? "El despacho va por paqueteria"
          : "Sin asignar · el pedido no puede salir"}
        </span>
       </span>
      </div>

      {canEdit && (
       <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Etiqueta>Tipo de transporte</Etiqueta>
        <div style={{
         display: "flex", background: T.color.superficie2,
         border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, padding: 3,
        }}>
         {TIPOS.map(t => {
          const activo = e.tipoModal === t.id;
          return (
           <button key={t.id} onClick={() => e.setTipoModal(t.id)} style={{
            flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 7,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 13, fontWeight: activo ? 600 : 500,
            background: activo ? T.color.superficie : "transparent",
            color: activo ? T.color.tinta : T.color.tinta3,
            boxShadow: activo ? "0 1px 2px rgba(0,0,0,.08)" : "none",
           }}>{t.label}</button>
          );
         })}
        </div>
       </div>
      )}

      {esPaqueteria ? (
       <>
        <Campo etiqueta="Transportadora" falta={!e.paqModal}>
         <div style={{ position: "relative" }}>
          <span style={{ ...entrada, color: e.paqModal ? T.color.tinta : T.color.placeholder }}>
           {e.paqModal || "Seleccionar transportadora"}
           <ChevronDown size={16} style={{ color: T.color.tinta4, marginLeft: "auto" }} />
          </span>
          <select value={e.paqModal} onChange={ev => e.setPaqModal(ev.target.value)} style={selectInvisible}>
           <option value="">Seleccionar transportadora</option>
           {(paqueterias || []).map(p => (
            <option key={p.id || p.nombre} value={p.nombre}>{p.nombre}</option>
           ))}
          </select>
         </div>
        </Campo>
        <Campo etiqueta="No. de guia" falta={!e.guiaPaq}>
         <input value={e.guiaPaq} onChange={ev => e.setGuiaPaq(ev.target.value)}
          placeholder="SRV-2026-0001"
          style={{ ...entrada, fontFamily: T.fuente.mono }}/>
        </Campo>
       </>
      ) : e.tipoModal === "empresa_transporte" ? (
       <Campo etiqueta="Empresa de transporte" falta={!e.empTrans}>
        <div style={{ position: "relative" }}>
         <span style={{ ...entrada, color: e.empTrans ? T.color.tinta : T.color.placeholder }}>
          {e.empTrans || "Seleccionar empresa"}
          <ChevronDown size={16} style={{ color: T.color.tinta4, marginLeft: "auto" }} />
         </span>
         <select value={e.empTrans} onChange={ev => e.setEmpTrans(ev.target.value)} style={selectInvisible}>
          <option value="">Seleccionar empresa</option>
          {(transportistas || []).map(t => (
           <option key={t.id || t.nombre} value={t.nombre}>{t.nombre}</option>
          ))}
         </select>
        </div>
       </Campo>
      ) : null}

      {!esPaqueteria && (canEdit || canAssign) && (
       <button onClick={() => setHoja(true)} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        height: 48, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
        background: T.color.marca, color: "#fff", fontSize: 14, fontWeight: 600,
       }}>
        <Search size={16} /> {e.cond ? "Cambiar conductor" : "Elegir conductor"}
       </button>
      )}
     </section>
    ))}

    <Seccion>Entrega</Seccion>

    <Campo etiqueta="Direccion" falta={faltantes.includes("direccion")}>
     <input value={e.direccion} onChange={ev => e.setDireccion(ev.target.value)}
      placeholder="Calle 34 #8A - 115" disabled={bloqueado}
      style={{ ...entrada, opacity: bloqueado ? 0.6 : 1 }}/>
    </Campo>

    <Campo etiqueta="Ciudad">
     <div style={{ position: "relative" }}>
      <span style={{ ...entrada, color: e.ciudadEdit ? T.color.tinta : T.color.placeholder }}>
       {ciudadesOrdenadas.find(c => c.code === e.ciudadEdit)?.name || "Seleccionar ciudad"}
       <ChevronDown size={16} style={{ color: T.color.tinta4, marginLeft: "auto" }} />
      </span>
      <select value={e.ciudadEdit} onChange={ev => e.setCiudadEdit(ev.target.value)}
       disabled={bloqueado} style={selectInvisible}>
       <option value="">Seleccionar ciudad</option>
       {ciudadesOrdenadas.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
     </div>
    </Campo>

    <Seccion>Carga</Seccion>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
     <Campo etiqueta="Cajas">
      {/* Se escribe y ademas se ajusta de a uno: con cien cajas nadie va a
          pulsar el boton cien veces. */}
      <div style={{ ...entrada, padding: "0 4px 0 14px" }}>
       <input
        value={e.cajas}
        onChange={ev => e.setCajas(ev.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        placeholder="0"
        disabled={bloqueado}
        style={{
         flex: 1, minWidth: 0, border: "none", outline: "none", padding: 0,
         background: "transparent", fontFamily: "inherit", fontSize: 15,
         color: T.color.tinta, opacity: bloqueado ? 0.6 : 1,
        }}/>
       <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button onClick={() => paso(-1)} disabled={bloqueado} title="Quitar una caja" style={{
         width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
         background: T.color.superficie3, color: T.color.tinta2, display: "grid", placeItems: "center",
        }}><Minus size={14} /></button>
        <button onClick={() => paso(1)} disabled={bloqueado} title="Agregar una caja" style={{
         width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
         background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center",
        }}><Plus size={14} /></button>
       </span>
      </div>
     </Campo>

     <Campo etiqueta="No. factura" falta={faltantes.includes("factura")}>
      <input value={e.facturaEdit} onChange={ev => e.setFacturaEdit(ev.target.value)}
       placeholder="FAC-3000" disabled={bloqueado}
       style={{ ...entrada, fontFamily: T.fuente.mono, opacity: bloqueado ? 0.6 : 1 }}/>
     </Campo>
    </div>

    <Campo
     etiqueta="Fecha estimada de entrega"
     falta={faltantes.includes("fecha")}
     ayuda="Define la promesa; sin ella el pedido no entra en riesgo ni vence."
    >
     <div style={{ position: "relative" }}>
      <Calendar size={16} style={{ position: "absolute", left: 14, top: 16, color: T.color.tinta4, pointerEvents: "none" }} />
      <input type="date" value={e.fechaEdit} onChange={ev => e.setFechaEdit(ev.target.value)}
       disabled={bloqueado}
       style={{ ...entrada, paddingLeft: 40, opacity: bloqueado ? 0.6 : 1 }}/>
     </div>
    </Campo>

    <Campo etiqueta="Notas" opcional>
     <textarea value={e.notasEdit} onChange={ev => e.setNotasEdit(ev.target.value)}
      placeholder="Instrucciones especiales de entrega" rows={3} disabled={bloqueado}
      style={{
       ...entrada, height: "auto", minHeight: 72, padding: "12px 14px",
       fontSize: 14, lineHeight: 1.5, resize: "vertical", opacity: bloqueado ? 0.6 : 1,
      }}/>
    </Campo>
   </div>

   <footer style={{
    flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
    background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button onClick={onGuia} style={enlacePie}>
     <FileText size={16} /> Guia
    </button>
    <button onClick={onMapa} style={enlacePie}>
     <IconoMapa size={16} /> Mapa
    </button>
    <button onClick={e.guardar} disabled={bloqueado} style={{
     marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center",
     height: 48, padding: "0 22px", borderRadius: 12, border: "none",
     background: T.color.marca, color: "#fff", fontFamily: "inherit",
     fontSize: 14, fontWeight: 600,
     cursor: bloqueado ? "not-allowed" : "pointer", opacity: bloqueado ? 0.5 : 1,
    }}>Guardar</button>
   </footer>

   {hoja && (
    <HojaConductores
     conductores={e.conductoresOpciones}
     pedidos={pedidos}
     tipo={e.tipoModal}
     seleccionado={e.condId}
     onElegir={elegirConductor}
     onClose={() => setHoja(false)}
    />
   )}
  </div>
 );
}

// El <select> del sistema se estira invisible sobre el campo: en el celular su
// selector es el comodo, pero su aspecto no encaja con el resto.
const selectInvisible = {
 position: "absolute", inset: 0, width: "100%", height: "100%",
 opacity: 0, border: "none", appearance: "none", cursor: "pointer",
};

const enlacePie = {
 display: "flex", alignItems: "center", gap: 6, padding: "0 6px",
 border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
 fontSize: 13, fontWeight: 600, color: T.color.marca,
};

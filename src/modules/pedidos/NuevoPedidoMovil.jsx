import React, { useState, useMemo, useEffect } from 'react';
import {
 ArrowRight, Calendar, ChevronRight, MapPin, Minus, Plus, Search, User, X,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { HojaConductores } from './EditarPedidoMovil';

// Crear un pedido pide doce datos, y doce campos seguidos en un telefono se
// abandonan a la mitad. Se parten en dos: lo que no puede faltar -- numero,
// factura, cliente y ciudad -- y el transporte, que se puede dejar para
// despues. Asi el pedido entra aunque todavia no se sepa quien lo lleva.

const PASOS = ["Pedido", "Transporte"];

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

function Seccion({ children, derecha }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
   <span style={{
    fontSize: 11, fontWeight: 600, color: T.color.placeholder,
    letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
   }}>{children}</span>
   <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
   {derecha}
  </div>
 );
}

function Campo({ etiqueta, obligatorio, opcional, ayuda, children }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
   <span style={{
    fontSize: 13, fontWeight: 600, color: T.color.tinta2,
    display: "flex", alignItems: "center", gap: 6, minWidth: 0,
   }}>
    {etiqueta}
    {obligatorio && <span style={{ color: T.color.mal }}>*</span>}
    {opcional && <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span>}
   </span>
   {children}
   {ayuda && <span style={{ fontSize: 12, color: T.color.tinta4 }}>{ayuda}</span>}
  </div>
 );
}

// El pais tiene mas de mil municipios: un desplegable nativo los corta y obliga
// a buscar a ciegas. La hoja busca por nombre o por codigo DANE.
export function HojaCiudades({ ciudades, titulo = "Buscar ciudad", seleccionada, onElegir, onClose }) {
 const [dentro, setDentro] = useState(false);
 const [busq, setBusq] = useState("");

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

 const lista = useMemo(() => {
  const q = busq.trim().toLowerCase();
  return (ciudades || [])
   .filter(c => !q || (c.name || "").toLowerCase().includes(q) || String(c.code || "").includes(q))
   .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))
   .slice(0, 120);
 }, [ciudades, busq]);

 return (
  <div onClick={cerrar} style={{
   position: "fixed", inset: 0, zIndex: 145,
   background: dentro ? "rgba(23,20,31,.35)" : "rgba(23,20,31,0)",
   transition: "background .18s ease",
  }}>
   <div onClick={e => e.stopPropagation()} style={{
    position: "absolute", left: 0, right: 0, bottom: 0, top: 110,
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
     <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{titulo}</span>
     <div style={{ position: "relative" }}>
      <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: T.color.placeholder }} />
      <input value={busq} onChange={e => setBusq(e.target.value)} autoFocus
       placeholder="Nombre o codigo DANE"
       style={{
        width: "100%", boxSizing: "border-box", height: 44, padding: "0 12px 0 36px",
        background: T.color.superficie2, border: `1px solid ${T.color.borde2}`,
        borderRadius: 12, fontSize: 16, fontFamily: "inherit", color: T.color.tinta, outline: "none",
       }}/>
     </div>
    </div>

    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px" }}>
     {lista.length === 0 ? (
      <div style={{ padding: "36px 8px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3 }}>
       Ninguna ciudad coincide.
      </div>
     ) : lista.map(c => {
      const sel = c.code === seleccionada;
      return (
       <button key={c.code} onClick={() => { onElegir(c); cerrar(); }} style={{
        display: "flex", alignItems: "center", gap: 12, minHeight: 52, width: "100%",
        padding: "8px 0", borderBottom: `1px solid ${T.color.divisor}`,
        border: "none", borderBottomStyle: "solid", background: "transparent",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
       }}>
        <MapPin size={16} style={{ color: sel ? T.color.marca : T.color.tinta4, flexShrink: 0 }} />
        <span style={{
         flex: 1, minWidth: 0, fontSize: 14, fontWeight: sel ? 700 : 500,
         color: sel ? T.color.marca : T.color.tinta,
         overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{c.name}</span>
        <span style={{ fontFamily: T.fuente.mono, fontSize: 12, color: T.color.tinta4, flexShrink: 0 }}>
         {c.code}
        </span>
       </button>
      );
     })}
     {lista.length === 120 && (
      <div style={{ padding: "12px 4px", fontSize: 12, color: T.color.tinta4 }}>
       Se muestran las primeras 120; escribe para afinar.
      </div>
     )}
    </div>
   </div>
  </div>
 );
}

export function NuevoPedidoMovil({
 form, setForm, ciudades, conductores, conductoresActivos, paqueterias = [],
 transportistas = [], pedidos = [], onCrear, onClose, guardando = false,
}) {
 const [paso, setPaso] = useState(0);
 const [hoja, setHoja] = useState(null); // "destino" | "origen" | "conductor"

 const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

 const ciudad = (ciudades || []).find(c => c.code === form.ciudad_codigo);
 const ciudadOrigen = (ciudades || []).find(c => c.code === form.ciudad_origen_codigo);
 const cond = (conductores || []).find(c => String(c.id) === String(form.conductor_id));
 const esPaqueteria = form.tipo === "paqueteria";

 const paso1Completo = form.id.trim() && form.factura.trim()
  && form.cliente.trim() && form.ciudad_codigo;

 const cajas = (n) => {
  const actual = parseInt(form.cajas) || 0;
  setForm(p => ({ ...p, cajas: String(Math.max(0, actual + n)) }));
 };

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 118, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 12px", display: "flex", flexDirection: "column", gap: 12,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
     <button onClick={paso === 0 ? onClose : () => setPaso(0)}
      title={paso === 0 ? "Cerrar" : "Volver"} style={{
      width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
      background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
      borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
     }}><X size={18} /></button>
     <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>Nuevo pedido</span>
      <span style={{ fontSize: 12, color: T.color.tinta3 }}>Paso {paso + 1} de 2</span>
     </div>
     <span style={{ width: 38, flexShrink: 0 }} />
    </div>

    <div style={{ display: "flex", gap: 6 }}>
     {PASOS.map((p, i) => (
      <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
       <span style={{ height: 4, borderRadius: 2, background: i <= paso ? T.color.marca : T.color.borde2 }} />
       <span style={{ fontSize: 11, fontWeight: 600, color: i <= paso ? T.color.marca : T.color.tinta4 }}>{p}</span>
      </div>
     ))}
    </div>
   </header>

   <div style={{
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
    display: "flex", flexDirection: "column", gap: 16, padding: "4px 16px 20px",
   }}>
    {paso === 0 ? (
     <>
      <Seccion>Identificacion</Seccion>

      <Campo etiqueta="N° de pedido" obligatorio>
       <input value={form.id} onChange={e => f("id")(e.target.value)} autoFocus
        placeholder="PED-012" style={{ ...entrada, fontFamily: T.fuente.mono }}/>
      </Campo>

      <Campo etiqueta="N° de factura" obligatorio>
       <input value={form.factura} onChange={e => f("factura")(e.target.value)}
        placeholder="FAC-3000" style={{ ...entrada, fontFamily: T.fuente.mono }}/>
      </Campo>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
       <Campo etiqueta="Cajas">
        <div style={{ ...entrada, padding: "0 4px 0 14px" }}>
         <input value={form.cajas} onChange={e => f("cajas")(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric" placeholder="0"
          style={{
           flex: 1, minWidth: 0, border: "none", outline: "none", padding: 0,
           background: "transparent", fontFamily: "inherit", fontSize: 15, color: T.color.tinta,
          }}/>
         <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button onClick={() => cajas(-1)} title="Quitar una caja" style={{
           width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
           background: T.color.superficie3, color: T.color.tinta2, display: "grid", placeItems: "center",
          }}><Minus size={14} /></button>
          <button onClick={() => cajas(1)} title="Agregar una caja" style={{
           width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
           background: T.color.marcaSuave, color: T.color.marca, display: "grid", placeItems: "center",
          }}><Plus size={14} /></button>
         </span>
        </div>
       </Campo>

       <Campo etiqueta="Fecha estimada">
        <div style={{ position: "relative" }}>
         <Calendar size={16} style={{ position: "absolute", left: 12, top: 16, color: T.color.tinta4, pointerEvents: "none" }} />
         <input type="date" value={form.fecha_estimada} onChange={e => f("fecha_estimada")(e.target.value)}
          style={{ ...entrada, paddingLeft: 36, fontSize: 14 }}/>
        </div>
       </Campo>
      </div>

      <Seccion>Destino</Seccion>

      <Campo etiqueta="Cliente / destinatario" obligatorio>
       <input value={form.cliente} onChange={e => f("cliente")(e.target.value)}
        placeholder="Empresa Destino S.A.S" style={entrada}/>
      </Campo>

      <Campo etiqueta="Ciudad de entrega (DANE)" obligatorio>
       <button onClick={() => setHoja("destino")} style={{
        ...entrada, cursor: "pointer", textAlign: "left",
        color: ciudad ? T.color.tinta : T.color.placeholder,
       }}>
        <MapPin size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
         {ciudad ? `${ciudad.name} · ${ciudad.code}` : "Buscar ciudad"}
        </span>
        <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
       </button>
      </Campo>

      <Campo etiqueta="Direccion de entrega">
       <input value={form.direccion} onChange={e => f("direccion")(e.target.value)}
        placeholder="Cra 15 #93-47 Of 302" style={entrada}/>
      </Campo>
     </>
    ) : (
     <>
      {/* Lo del primer paso, resumido, para no perderlo de vista al volver. */}
      <div style={{
       display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
       background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
      }}>
       <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{
         fontSize: 14, fontWeight: 700,
         overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{form.id} · {form.cliente}</span>
        <span style={{ fontSize: 12, color: T.color.tinta3 }}>
         {[ciudad?.name, form.cajas ? `${form.cajas} cajas` : null, form.factura]
          .filter(Boolean).join(" · ")}
        </span>
       </div>
       <button onClick={() => setPaso(0)} style={{
        border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
        fontSize: 12, fontWeight: 600, color: T.color.marca, padding: 0, flexShrink: 0,
       }}>Editar</button>
      </div>

      <Seccion>Origen / CEDI</Seccion>

      <Campo etiqueta="Ciudad origen (DANE)">
       <button onClick={() => setHoja("origen")} style={{
        ...entrada, cursor: "pointer", textAlign: "left",
        color: ciudadOrigen ? T.color.tinta : T.color.placeholder,
       }}>
        <MapPin size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
         {ciudadOrigen ? `${ciudadOrigen.name} · ${ciudadOrigen.code}` : "Buscar ciudad"}
        </span>
        <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
       </button>
      </Campo>

      <Campo etiqueta="Direccion origen / CEDI">
       <input value={form.direccion_origen || ""} onChange={e => f("direccion_origen")(e.target.value)}
        placeholder="Bodega principal" style={entrada}/>
      </Campo>

      <Seccion>Transporte</Seccion>

      <Campo etiqueta="Tipo de envio">
       <div style={{
        display: "flex", background: T.color.superficie2,
        border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, padding: 3,
       }}>
        {TIPOS.map(t => {
         const activo = form.tipo === t.id;
         return (
          <button key={t.id} onClick={() => f("tipo")(t.id)} style={{
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
      </Campo>

      {esPaqueteria ? (
       <>
        <Campo etiqueta="Transportadora">
         <select value={form.paqueteria || ""} onChange={e => f("paqueteria")(e.target.value)}
          style={{ ...entrada, appearance: "none" }}>
          <option value="">Seleccionar transportadora</option>
          {(paqueterias || []).map(p => (
           <option key={p.id || p.nombre} value={p.nombre}>{p.nombre}</option>
          ))}
         </select>
        </Campo>
        <Campo etiqueta="No. de guia">
         <input value={form.guia_paqueteria || ""} onChange={e => f("guia_paqueteria")(e.target.value)}
          placeholder="SRV-2026-0001" style={{ ...entrada, fontFamily: T.fuente.mono }}/>
        </Campo>
       </>
      ) : form.tipo === "empresa_transporte" ? (
       <Campo etiqueta="Empresa de transporte">
        <select value={form.empresa_transporte || ""} onChange={e => f("empresa_transporte")(e.target.value)}
         style={{ ...entrada, appearance: "none" }}>
         <option value="">Seleccionar empresa</option>
         {(transportistas || []).map(t => (
          <option key={t.id || t.nombre} value={t.nombre}>{t.nombre}</option>
         ))}
        </select>
       </Campo>
      ) : (
       <Campo
        etiqueta="Conductor" opcional
        ayuda={cond ? undefined : 'El pedido quedara "Sin asignar" hasta que elijas conductor.'}
       >
        <button onClick={() => setHoja("conductor")} style={{
         ...entrada, cursor: "pointer", textAlign: "left",
         color: cond ? T.color.tinta : T.color.placeholder,
        }}>
         <User size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
         <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cond ? `${cond.nombre}${cond.placa ? ` · ${cond.placa}` : ""}` : "Asignar despues"}
         </span>
         <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
        </button>
       </Campo>
      )}

      <Campo etiqueta="Notas" opcional>
       <textarea value={form.notas} onChange={e => f("notas")(e.target.value)}
        placeholder="Instrucciones especiales de entrega" rows={3}
        style={{
         ...entrada, height: "auto", minHeight: 72, padding: "12px 14px",
         fontSize: 14, lineHeight: 1.5, resize: "vertical", alignItems: "stretch",
        }}/>
      </Campo>
     </>
    )}
   </div>

   <footer style={{
    flexShrink: 0, padding: "12px 16px", background: T.color.superficie,
    borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button
     onClick={paso === 0 ? () => setPaso(1) : onCrear}
     disabled={(paso === 0 && !paso1Completo) || guardando}
     style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      width: "100%", height: 52, borderRadius: 12, border: "none", fontFamily: "inherit",
      fontSize: 15, fontWeight: 600, color: "#fff", background: T.color.marca,
      cursor: ((paso === 0 && !paso1Completo) || guardando) ? "not-allowed" : "pointer",
      opacity: ((paso === 0 && !paso1Completo) || guardando) ? 0.5 : 1,
     }}>
     {paso === 0
      ? <>Continuar <ArrowRight size={17} /></>
      : <><Plus size={17} /> {guardando ? "Creando..." : "Crear pedido"}</>}
    </button>
   </footer>

   {hoja === "destino" && (
    <HojaCiudades
     ciudades={ciudades} titulo="Ciudad de entrega" seleccionada={form.ciudad_codigo}
     onElegir={c => f("ciudad_codigo")(c.code)} onClose={() => setHoja(null)}
    />
   )}
   {hoja === "origen" && (
    <HojaCiudades
     ciudades={ciudades} titulo="Ciudad origen" seleccionada={form.ciudad_origen_codigo}
     onElegir={c => f("ciudad_origen_codigo")(c.code)} onClose={() => setHoja(null)}
    />
   )}
   {hoja === "conductor" && (
    <HojaConductores
     conductores={conductoresActivos || conductores} pedidos={pedidos}
     tipo={form.tipo} seleccionado={form.conductor_id}
     onElegir={id => f("conductor_id")(id)} onClose={() => setHoja(null)}
    />
   )}
  </div>
 );
}

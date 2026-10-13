import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, ChevronDown, ChevronRight, FileText, MapPin, Paperclip, Search, Send, X } from 'lucide-react';
import { T } from '../../design/tokens';
import { HojaCiudades } from '../pedidos/NuevoPedidoMovil';

// Disenio 25: solicitar devolucion, solicitar recogida y nueva PQRS en el
// celular. Pantalla completa, cabecera fija y una sola accion al pie.
//
// Son los mismos campos del formulario de escritorio y guardan con la misma
// funcion del modulo: esta pantalla solo cambia como se piden. Por eso lo que el
// disenio muestra y la base no guarda no aparece -- la fecha deseada de la
// recogida, las observaciones de la devolucion y el tipo de PQRS (peticion,
// queja...) no tienen columna -- y lo que la base exige se sigue pidiendo aunque
// el disenio no lo muestre, como la sede destino de la devolucion.
//
// El cliente no elige transporte: eso lo asigna la central en la gestion (19).
// Cuando es la central quien crea desde el celular, `conTransporte` agrega esa
// seccion con las mismas opciones del escritorio.

const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", gap: 8, fontSize: 15, fontFamily: "inherit", color: T.color.tinta, outline: "none",
};
const corta = { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

function Seccion({ children }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
   <span style={{ fontSize: 11, fontWeight: 600, color: T.color.placeholder, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
   <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
  </div>
 );
}

function Campo({ etiqueta, obligatorio, opcional, ayuda, children }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
   <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
    {etiqueta}
    {obligatorio && <span style={{ color: T.color.mal }}>•</span>}
    {opcional && <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span>}
   </span>
   {children}
   {ayuda && <span style={{ fontSize: 12, color: T.color.tinta4 }}>{ayuda}</span>}
  </div>
 );
}

function Texto({ valor, onChange, placeholder, mono, tipo = "text", modo }) {
 return (
  <input value={valor ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={tipo} inputMode={modo}
   style={{ ...entrada, ...(mono ? { fontFamily: T.fuente.mono, fontSize: 14 } : {}) }} />
 );
}

function Area({ valor, onChange, placeholder, filas = 4 }) {
 return (
  <textarea value={valor ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={filas}
   style={{ ...entrada, height: "auto", minHeight: 110, padding: "12px 14px", fontSize: 14, lineHeight: 1.5, resize: "vertical", alignItems: "stretch" }} />
 );
}

// El <select> nativo invisible sobre el campo: el selector del sistema, que en
// el celular es el comodo, con el aspecto de los demas campos.
function Opciones({ valor, onChange, opciones, placeholder = "Seleccione", mono }) {
 const actual = opciones.find(o => String(o.value) === String(valor));
 return (
  <label style={{ ...entrada, position: "relative", cursor: "pointer", color: actual ? T.color.tinta : T.color.placeholder }}>
   <span style={{ ...corta, ...(mono && actual ? { fontFamily: T.fuente.mono, fontSize: 14 } : {}) }}>{actual ? actual.label : placeholder}</span>
   <ChevronDown size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
   <select value={valor ?? ""} onChange={e => onChange(e.target.value)}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", appearance: "none", cursor: "pointer" }}>
    <option value="">{placeholder}</option>
    {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
   </select>
  </label>
 );
}

// Tres cifras cortas en una fila: unidades, volumen y peso.
function Carga({ form, f }) {
 const cifra = (clave, etiqueta, unidad, placeholder) => (
  <Campo etiqueta={etiqueta} obligatorio>
   <div style={{ ...entrada, padding: "0 10px 0 12px" }}>
    <input value={form[clave] ?? ""} onChange={e => f(clave)(e.target.value)} type="number" inputMode="decimal" placeholder={placeholder}
     style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: 0, background: "transparent", fontFamily: "inherit", fontSize: 15, color: T.color.tinta }} />
    {unidad && <span style={{ fontSize: 12.5, color: T.color.tinta4, flexShrink: 0 }}>{unidad}</span>}
   </div>
  </Campo>
 );
 return (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
   {cifra("unidades", "Unidades", "", "5")}
   {cifra("volumen_m3", "Volumen", "m³", "0.5")}
   {cifra("peso_kg", "Peso", "kg", "10")}
  </div>
 );
}

function BotonCiudad({ ciudades, codigo, onClick }) {
 const c = (ciudades || []).find(x => x.code === codigo);
 return (
  <button type="button" onClick={onClick} style={{ ...entrada, cursor: "pointer", textAlign: "left", color: c ? T.color.tinta : T.color.placeholder }}>
   <MapPin size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
   <span style={corta}>{c ? `${c.name} · DANE ${c.code}` : "Buscar ciudad"}</span>
   <ChevronRight size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
  </button>
 );
}

function Adjunto({ etiqueta, icono: Icono = Paperclip, cta, nombre, onArchivo, acepta = "image/*,.pdf" }) {
 const ref = useRef(null);
 return (
  <Campo etiqueta={etiqueta} opcional>
   <button type="button" onClick={() => ref.current && ref.current.click()} style={{
    ...entrada, height: "auto", minHeight: 64, justifyContent: "center", cursor: "pointer",
    border: `1.5px dashed ${nombre ? T.color.marca : T.color.borde2}`, background: nombre ? T.color.marcaSuave : T.color.superficie2,
    color: nombre ? T.color.marca : T.color.tinta2, flexDirection: "column", gap: 2, padding: "10px 14px",
   }}>
    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, maxWidth: "100%" }}>
     <Icono size={16} style={{ flexShrink: 0 }} />
     <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre || cta}</span>
    </span>
    <span style={{ fontSize: 12, color: T.color.tinta4, fontWeight: 400 }}>{nombre ? "Toca para cambiarlo" : "PDF, JPG o PNG"}</span>
   </button>
   <input ref={ref} type="file" accept={acepta} style={{ display: "none" }}
    onChange={e => { const file = e.target.files && e.target.files[0]; if (file) onArchivo(file); e.target.value = ""; }} />
  </Campo>
 );
}

// ── Hoja para elegir el pedido ──────────────────────────────────────────────
// Busca entre los pedidos que el usuario puede ver. Si el que busca no esta
// (un pedido viejo, o de otra fuente), puede usar lo que escribio tal cual:
// el campo siempre fue de texto libre.
export function HojaPedidos({ pedidos = [], seleccionado, onElegir, onEscrito, onClose }) {
 const [dentro, setDentro] = useState(false);
 const [busq, setBusq] = useState("");
 useEffect(() => { const id = requestAnimationFrame(() => setDentro(true)); return () => cancelAnimationFrame(id); }, []);
 useEffect(() => {
  const previo = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previo; };
 }, []);
 const cerrar = () => { setDentro(false); setTimeout(onClose, 180); };

 const q = busq.trim().toLowerCase();
 const lista = useMemo(() => pedidos
  .filter(p => !q || [p.id, p.guia_interna, p.factura, p.cliente].some(v => String(v || "").toLowerCase().includes(q)))
  .slice(0, 80), [pedidos, q]);

 return (
  <div onClick={cerrar} style={{ position: "fixed", inset: 0, zIndex: 145, background: dentro ? "rgba(23,20,31,.35)" : "rgba(23,20,31,0)", transition: "background .18s ease" }}>
   <div onClick={e => e.stopPropagation()} style={{
    position: "absolute", left: 0, right: 0, bottom: 0, top: 110, background: T.color.superficie, borderRadius: "20px 20px 0 0",
    display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(23,20,31,.15)",
    transform: dentro ? "translateY(0)" : "translateY(100%)", transition: "transform .2s ease",
   }}>
    <div style={{ flexShrink: 0, padding: "10px 16px 12px", display: "flex", flexDirection: "column", gap: 12, borderBottom: `1px solid ${T.color.divisor}` }}>
     <span style={{ width: 40, height: 4, borderRadius: 2, background: T.color.tenue, margin: "0 auto" }} />
     <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Elegir pedido</span>
     <div style={{ position: "relative" }}>
      <Search size={16} style={{ position: "absolute", left: 12, top: 14, color: T.color.placeholder }} />
      <input value={busq} onChange={e => setBusq(e.target.value)} autoFocus placeholder="Pedido, guia, factura o destinatario"
       style={{ width: "100%", boxSizing: "border-box", height: 44, padding: "0 12px 0 36px", background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, borderRadius: 12, fontSize: 16, fontFamily: "inherit", color: T.color.tinta, outline: "none" }} />
     </div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px" }}>
     {q && !lista.some(p => String(p.id).toLowerCase() === q) && (
      <button onClick={() => { onEscrito(busq.trim()); cerrar(); }} style={{
       display: "flex", alignItems: "center", gap: 10, minHeight: 52, width: "100%", padding: "8px 0", border: "none",
       borderBottom: `1px solid ${T.color.divisor}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: T.color.marca,
      }}>
       <FileText size={16} style={{ flexShrink: 0 }} />
       <span style={{ fontSize: 14, fontWeight: 600 }}>Usar «{busq.trim()}»</span>
      </button>
     )}
     {lista.length === 0 && !q && (
      <div style={{ padding: "36px 8px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3 }}>No hay pedidos para elegir. Escribe el numero arriba.</div>
     )}
     {lista.map(p => {
      const sel = String(p.id) === String(seleccionado);
      return (
       <button key={p.id} onClick={() => { onElegir(p); cerrar(); }} style={{
        display: "flex", flexDirection: "column", gap: 2, minHeight: 56, width: "100%", padding: "9px 0", border: "none",
        borderBottom: `1px solid ${T.color.divisor}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
       }}>
        <span style={{ display: "flex", gap: 8, alignItems: "baseline", width: "100%" }}>
         <span style={{ fontSize: 14, fontWeight: 700, color: sel ? T.color.marca : T.color.tinta }}>{p.id}</span>
         {p.guia_interna && p.guia_interna !== p.id && <span style={{ fontFamily: T.fuente.mono, fontSize: 11.5, color: T.color.tinta4 }}>{p.guia_interna}</span>}
         {p.factura && <span style={{ marginLeft: "auto", fontFamily: T.fuente.mono, fontSize: 11.5, color: T.color.tinta3 }}>{p.factura}</span>}
        </span>
        <span style={{ fontSize: 12.5, color: T.color.tinta3, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
         {[p.cliente, p.ciudad_nombre].filter(Boolean).join(" · ")}
        </span>
       </button>
      );
     })}
    </div>
   </div>
  </div>
 );
}

function BotonPedido({ valor, pedidos, onClick }) {
 const p = pedidos.find(x => String(x.id) === String(valor));
 return (
  <button type="button" onClick={onClick} style={{ ...entrada, cursor: "pointer", textAlign: "left", color: valor ? T.color.tinta : T.color.placeholder }}>
   <FileText size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
   <span style={corta}>
    {valor ? <><span style={{ fontFamily: T.fuente.mono, fontSize: 14 }}>{valor}</span>{p?.cliente ? ` · ${p.cliente}` : ""}</> : "Elegir pedido"}
   </span>
   <ChevronDown size={16} style={{ color: T.color.tinta4, flexShrink: 0 }} />
  </button>
 );
}

// ── Pantalla ────────────────────────────────────────────────────────────────
function Pantalla({ titulo, subtitulo, onClose, cta, onEnviar, pie, children }) {
 const [enviando, setEnviando] = useState(false);
 const enviar = async () => {
  if (enviando) return;
  setEnviando(true);
  try { await onEnviar(); } finally { setEnviando(false); }
 };
 return (
  <div style={{ position: "fixed", inset: 0, zIndex: 118, background: T.color.fondo, display: "flex", flexDirection: "column", color: T.color.tinta }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`, borderBottom: `1px solid ${T.color.divisor}`, background: T.color.superficie,
   }}>
    <button onClick={onClose} title="Cerrar" style={{
     width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, background: T.color.superficie,
     border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
    }}><X size={18} /></button>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
     <span style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</span>
     {subtitulo && <span style={{ fontSize: 12, color: T.color.tinta3 }}>{subtitulo}</span>}
    </div>
   </header>
   <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 16, padding: "16px 16px 24px" }}>
    {children}
   </div>
   <footer style={{
    flexShrink: 0, padding: "12px 16px", background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 8,
   }}>
    <button onClick={enviar} disabled={enviando} style={{
     display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 52, borderRadius: 12, border: "none",
     fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "#fff", background: T.color.marca,
     cursor: enviando ? "not-allowed" : "pointer", opacity: enviando ? 0.6 : 1,
    }}><Send size={17} /> {enviando ? "Enviando..." : cta}</button>
    {pie && <span style={{ fontSize: 12, color: T.color.tinta4, textAlign: "center" }}>{pie}</span>}
   </footer>
  </div>
 );
}

// Mismas opciones de transporte que el formulario de escritorio.
function SeccionTransporte({ form, f, conductores = [], paqueterias = [] }) {
 const tipo = form.tipo_envio || "conductor";
 return (
  <>
   <Seccion>Transporte</Seccion>
   <Campo etiqueta="Tipo de envio">
    <Opciones valor={tipo} onChange={f("tipo_envio")} placeholder="Conductor propio" opciones={[
     { value: "conductor", label: "Conductor propio" },
     { value: "empresa_transporte", label: "Empresa transportista" },
     { value: "mensajeria", label: "Mensajeria" },
     { value: "paqueteria", label: "Paqueteria tercero" },
    ]} />
   </Campo>
   {tipo === "paqueteria" ? (
    <>
     <Campo etiqueta="Paqueteria">
      <Opciones valor={form.paqueteria || ""} onChange={f("paqueteria")}
       opciones={(paqueterias || []).filter(x => typeof x === "string" && x).map(x => ({ value: x, label: x }))} />
     </Campo>
     <Campo etiqueta="No. guia de paqueteria">
      <Texto valor={form.guia_paqueteria || ""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-0001" mono />
     </Campo>
    </>
   ) : (
    <Campo etiqueta="Conductor" opcional ayuda={form.conductor_id ? null : 'Queda "Sin asignar" hasta que elijas conductor.'}>
     <Opciones valor={form.conductor_id || ""} onChange={f("conductor_id")} placeholder="Sin asignar"
      opciones={conductores.filter(c => c.activo !== false).map(c => ({ value: c.id, label: `${c.nombre}${c.placa ? ` · ${c.placa}` : ""}` }))} />
    </Campo>
   )}
  </>
 );
}

// ── 25a: devolucion ─────────────────────────────────────────────────────────
// Motivo como selector para que la central pueda reportar; "Otro motivo" deja
// escribirlo, porque el campo sigue siendo texto y hay motivos viejos libres.
export const MOTIVOS_DEVOLUCION = [
 "Referencia equivocada",
 "Producto averiado en transporte",
 "Cliente no acepto la mercancia",
 "Incidente",
];
const OTRO = "__otro__";

export function FormDevolucionMovil({
 form, setForm, ciudades, pedidos = [], sedes = [], editando = false,
 conTransporte = false, conductores = [], paqueterias = [], onArchivo, onEnviar, onClose,
}) {
 const [hoja, setHoja] = useState(null); // "pedido" | "ciudad"
 const f = k => v => setForm(p => ({ ...p, [k]: v }));
 const [otro, setOtro] = useState(Boolean(form.motivo) && !MOTIVOS_DEVOLUCION.includes(form.motivo));

 // Un solo campo: al elegir el pedido su factura se toma de el (no se pide
 // aparte) y se llenan la direccion y la ciudad, que se pueden corregir.
 const elegirPedido = (p) => setForm(x => ({
  ...x, pedido_ref: String(p.id),
  factura: p.factura || "",
  dir_recogida: p.direccion || x.dir_recogida,
  ciudad_codigo: p.ciudad_codigo || x.ciudad_codigo,
 }));

 return (
  <Pantalla titulo={editando ? "Editar devolucion" : "Solicitar devolucion"}
   subtitulo={editando ? form.guia || null : `Se generara la guia DV-${new Date().getFullYear()}-XXXX`}
   onClose={onClose} onEnviar={onEnviar} cta={editando ? "Guardar cambios" : (conTransporte ? "Crear devolucion" : "Solicitar devolucion")}
   pie={conTransporte ? null : "La central asigna el transporte"}>
   <Seccion>Pedido</Seccion>
   <Campo etiqueta="Pedido" obligatorio ayuda={form.factura ? `Factura ${form.factura} · se toma del pedido`
    : form.pedido_ref ? "Sin factura: el pedido todavia no la tiene."
    : "Al elegirlo se completan su factura y la direccion"}>
    <BotonPedido valor={form.pedido_ref} pedidos={pedidos} onClick={() => setHoja("pedido")} />
   </Campo>
   <Campo etiqueta="Motivo" obligatorio>
    <Opciones valor={otro ? OTRO : form.motivo} placeholder="Seleccione el motivo"
     onChange={v => { if (v === OTRO) { setOtro(true); f("motivo")(""); } else { setOtro(false); f("motivo")(v); } }}
     opciones={[...MOTIVOS_DEVOLUCION.map(m => ({ value: m, label: m })), { value: OTRO, label: "Otro motivo" }]} />
   </Campo>
   {otro && (
    <Campo etiqueta="Describe el motivo" obligatorio>
     <Area valor={form.motivo} onChange={f("motivo")} placeholder="Describe el motivo de la devolucion..." filas={3} />
    </Campo>
   )}

   <Seccion>Carga</Seccion>
   <Carga form={form} f={f} />

   <Seccion>Recogida</Seccion>
   <Campo etiqueta="Direccion de recogida" obligatorio>
    <Texto valor={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47" />
   </Campo>
   <Campo etiqueta="Ciudad" obligatorio>
    <BotonCiudad ciudades={ciudades} codigo={form.ciudad_codigo} onClick={() => setHoja("ciudad")} />
   </Campo>
   <Campo etiqueta="Sede destino" obligatorio>
    <Opciones valor={form.dir_entrega} onChange={f("dir_entrega")} opciones={[
     ...sedes.map(x => ({ value: x, label: x })),
     ...(form.dir_entrega && !sedes.includes(form.dir_entrega) ? [{ value: form.dir_entrega, label: form.dir_entrega }] : []),
    ]} />
   </Campo>

   {conTransporte && <SeccionTransporte form={form} f={f} conductores={conductores} paqueterias={paqueterias} />}

   <Adjunto etiqueta="Fotos o soporte" icono={Camera} cta="Adjuntar soporte" nombre={form.soporte_nombre} onArchivo={onArchivo} />

   {hoja === "pedido" && (
    <HojaPedidos pedidos={pedidos} seleccionado={form.pedido_ref} onElegir={elegirPedido}
     onEscrito={v => setForm(x => ({ ...x, pedido_ref: v, factura: "" }))} onClose={() => setHoja(null)} />
   )}
   {hoja === "ciudad" && (
    <HojaCiudades ciudades={ciudades} titulo="Ciudad de recogida" seleccionada={form.ciudad_codigo}
     onElegir={c => f("ciudad_codigo")(c.code)} onClose={() => setHoja(null)} />
   )}
  </Pantalla>
 );
}

// ── 25b: recogida ───────────────────────────────────────────────────────────
export function FormRecogidaMovil({
 form, setForm, ciudades, editando = false,
 conTransporte = false, conductores = [], paqueterias = [], onArchivo, onEnviar, onClose,
}) {
 const [hoja, setHoja] = useState(null); // "recogida" | "entrega"
 const f = k => v => setForm(p => ({ ...p, [k]: v }));
 return (
  <Pantalla titulo={editando ? "Editar recogida" : "Solicitar recogida"}
   subtitulo={editando ? form.guia || null : "Programa una recogida y su entrega"}
   onClose={onClose} onEnviar={onEnviar} cta={editando ? "Guardar cambios" : (conTransporte ? "Registrar recogida" : "Solicitar recogida")}
   pie={conTransporte ? null : "La central asigna el transporte"}>
   <Seccion>Recogida</Seccion>
   <Campo etiqueta="Direccion de recogida" obligatorio>
    <Texto valor={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 70 #44-22, Local 2" />
   </Campo>
   <Campo etiqueta="Ciudad de recogida" obligatorio>
    <BotonCiudad ciudades={ciudades} codigo={form.ciudad_recogida_cod} onClick={() => setHoja("recogida")} />
   </Campo>

   <Seccion>Entrega</Seccion>
   <Campo etiqueta="Direccion de entrega" obligatorio>
    <Texto valor={form.dir_entrega} onChange={f("dir_entrega")} placeholder="Ej. CEDI Itagui · Bodega principal" />
   </Campo>
   <Campo etiqueta="Ciudad de entrega" obligatorio>
    <BotonCiudad ciudades={ciudades} codigo={form.ciudad_entrega_cod} onClick={() => setHoja("entrega")} />
   </Campo>

   <Seccion>Carga</Seccion>
   <Carga form={form} f={f} />

   <Seccion>Notas</Seccion>
   <Campo etiqueta="Observaciones" opcional>
    <Area valor={form.observaciones} onChange={f("observaciones")} placeholder="Instrucciones especiales..." filas={3} />
   </Campo>

   {conTransporte && <SeccionTransporte form={form} f={f} conductores={conductores} paqueterias={paqueterias} />}

   <Adjunto etiqueta="Documento de soporte" cta="Adjuntar documento" nombre={form.doc_nombre} onArchivo={onArchivo} />

   {hoja === "recogida" && (
    <HojaCiudades ciudades={ciudades} titulo="Ciudad de recogida" seleccionada={form.ciudad_recogida_cod}
     onElegir={c => f("ciudad_recogida_cod")(c.code)} onClose={() => setHoja(null)} />
   )}
   {hoja === "entrega" && (
    <HojaCiudades ciudades={ciudades} titulo="Ciudad de entrega" seleccionada={form.ciudad_entrega_cod}
     onElegir={c => f("ciudad_entrega_cod")(c.code)} onClose={() => setHoja(null)} />
   )}
  </Pantalla>
 );
}

// ── 25c: PQRS ───────────────────────────────────────────────────────────────
// Pedido y factura siguen siendo obligatorios, como en el escritorio.
export function FormPqrsMovil({ form, setForm, pedidos = [], motivos = [], editando = false, onEnviar, onClose }) {
 const [hoja, setHoja] = useState(false);
 const f = k => v => setForm(p => ({ ...p, [k]: v }));
 const elegirPedido = (p) => setForm(x => ({ ...x, pedido_ref: String(p.id), factura: p.factura || x.factura }));
 const largo = (form.descripcion || "").length;
 return (
  <Pantalla titulo={editando ? "Editar PQRS" : "Nueva PQRS"}
   subtitulo={editando ? null : "Peticion, queja, reclamo o sugerencia"}
   onClose={onClose} onEnviar={onEnviar} cta={editando ? "Guardar cambios" : "Enviar PQRS"}>
   <Seccion>Motivo</Seccion>
   <Campo etiqueta="Motivo" obligatorio>
    <Opciones valor={form.motivo} onChange={f("motivo")} placeholder="Seleccione el motivo" opciones={motivos.map(m => ({ value: m, label: m }))} />
   </Campo>

   <Seccion>Referencia</Seccion>
   <Campo etiqueta="Pedido" obligatorio>
    <BotonPedido valor={form.pedido_ref} pedidos={pedidos} onClick={() => setHoja(true)} />
   </Campo>
   <Campo etiqueta="N° factura" obligatorio>
    <Texto valor={form.factura} onChange={f("factura")} placeholder="FAC-2200" mono />
   </Campo>

   <Seccion>Detalle</Seccion>
   <Campo etiqueta="Descripcion" obligatorio ayuda={`${largo} ${largo === 1 ? "caracter" : "caracteres"}`}>
    <Area valor={form.descripcion} onChange={f("descripcion")} placeholder="Describe la situacion, la fecha del evento y las personas involucradas..." filas={5} />
   </Campo>

   {hoja && (
    <HojaPedidos pedidos={pedidos} seleccionado={form.pedido_ref} onElegir={elegirPedido}
     onEscrito={v => f("pedido_ref")(v)} onClose={() => setHoja(false)} />
   )}
  </Pantalla>
 );
}

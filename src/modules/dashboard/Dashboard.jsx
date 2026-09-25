import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle, Bell, CalendarDays, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { T, tarjeta } from '../../design/tokens';
import { useEsMovil, ALTO_BARRA } from '../../design/responsive';
import { ESTADOS_PEDIDO } from '../../Constants';

// Rangos del filtro de fecha. Se compara contra fecha_creacion del pedido.
const RANGOS = [
 { id: "7",   label: "Ultimos 7 dias",  dias: 7 },
 { id: "30",  label: "Ultimos 30 dias", dias: 30 },
 { id: "90",  label: "Ultimos 90 dias", dias: 90 },
 { id: "todo", label: "Todo el historico", dias: null },
];

// Orden de los estados en la barra apilada y en la leyenda. La secuencia de colores
// esta validada en este orden (ver T.estado): no reordenar sin volver a comprobarla.
const ORDEN_ESTADOS = [
 "sin_asignar", "pendiente", "en_transito", "paqueteria",
 "entregado", "novedad", "solo_facturar", "cliente_recoge",
];

const botonCabecera = {
 position: "relative", padding: 9, border: "1px solid " + T.color.borde2,
 borderRadius: T.radio.control, background: T.color.superficie,
 cursor: "pointer", display: "grid", placeItems: "center", color: T.color.tinta2,
 flexShrink: 0,
};

// A quien mira el dashboard cuando se busca un cliente, un conductor o un
// transportista. Cada lista se relaciona con el sujeto por un campo distinto, y
// algunas no se relacionan: las devoluciones no guardan el cliente, asi que con
// un cliente enfocado ese dato no se puede filtrar y se dice, en vez de dar un
// numero que seria el de todos.
const DEL_FOCO = {
 cliente: {
  pedidos: (x, f) => (x.cliente || "") === f.valor,
  pqrs: (x, f) => (x.cliente || "") === f.valor,
  devoluciones: null,
 },
 conductor: {
  pedidos: (x, f) => String(x.conductor_id || "") === f.valor,
  pqrs: (x, f) => String(x.conductor_id || "") === f.valor,
  devoluciones: (x, f) => String(x.conductor_id || "") === f.valor,
 },
 transportista: {
  pedidos: (x, f) => String(x.nit_proveedor || "") === f.valor
   || (x.empresa_transporte || "") === f.etiqueta,
  pqrs: (x, f) => String(x.nit || "") === f.valor,
  devoluciones: (x, f) => String(x.nit_proveedor || "") === f.valor
   || (x.empresa || "") === f.etiqueta,
 },
};

// Filtra una lista por el sujeto enfocado. Devuelve null cuando esa lista no
// guarda con que relacionarse, para que la pantalla lo diga en vez de mentir.
const porFoco = (lista, foco, cual) => {
 if (!foco) return lista;
 const prueba = DEL_FOCO[foco.tipo]?.[cual];
 if (!prueba) return null;
 return lista.filter(x => prueba(x, foco));
};

const hoyISO = () => new Date().toISOString().split("T")[0];
const restarDias = (n) => {
 const d = new Date();
 d.setDate(d.getDate() - n);
 return d.toISOString().split("T")[0];
};
const diasEntre = (desde, hasta) =>
 Math.round((new Date(hasta) - new Date(desde)) / 86400000);

// Cierra un desplegable al hacer clic fuera de el.
function useCerrarAlClicFuera(abierto, cerrar) {
 const ref = useRef(null);
 useEffect(() => {
  if (!abierto) return;
  const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) cerrar(); };
  document.addEventListener("mousedown", fuera);
  return () => document.removeEventListener("mousedown", fuera);
 }, [abierto, cerrar]);
 return ref;
}

function Tarjeta({ children, style = {} }) {
 return <section style={{ ...tarjeta, padding: 20, ...style }}>{children}</section>;
}

function TituloTarjeta({ children, accion }) {
 return (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
   <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.color.tinta }}>{children}</h2>
   {accion}
  </div>
 );
}

function Enlace({ children, onClick }) {
 return (
  <button onClick={onClick} style={{
   border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
   color: T.color.marca, fontSize: 13, fontWeight: 600, padding: 0,
   display: "inline-flex", alignItems: "center", gap: 4,
  }}>{children}</button>
 );
}

// ── Controles del encabezado ────────────────────────────────────────────────

function Buscador({ pedidos, conductores = [], transportistas = [], onAbrirPedido, onFoco, compacto = false }) {
 const [texto, setTexto] = useState("");
 const [abierto, setAbierto] = useState(false);
 const ref = useCerrarAlClicFuera(abierto, () => setAbierto(false));

 const consulta = texto.trim().toLowerCase();

 // Se busca primero a quien: los sujetos filtran el tablero entero. Los
 // pedidos siguen al final, y abren ese pedido como antes.
 const resultados = useMemo(() => {
  if (consulta.length < 2) return [];
  const coincide = (v) => String(v || "").toLowerCase().includes(consulta);

  const clientes = [...new Set(pedidos.map(p => p.cliente).filter(Boolean))]
   .filter(coincide).slice(0, 4)
   .map(c => ({ clase: "foco", tipo: "cliente", valor: c, etiqueta: c, detalle: "Cliente" }));

  const conds = conductores
   .filter(c => coincide(c.nombre) || coincide(c.placa) || coincide(c.cedula)).slice(0, 4)
   .map(c => ({
    clase: "foco", tipo: "conductor", valor: String(c.id), etiqueta: c.nombre,
    detalle: ["Conductor", c.placa].filter(Boolean).join(" · "),
   }));

  const trans = transportistas
   .filter(x => coincide(x.nombre) || coincide(x.nit)).slice(0, 4)
   .map(x => ({
    clase: "foco", tipo: "transportista", valor: String(x.nit || ""), etiqueta: x.nombre,
    detalle: ["Transportista", x.nit].filter(Boolean).join(" · "),
   }));

  const peds = pedidos.filter(p =>
   coincide(p.id) || coincide(p.guia_interna) || coincide(p.guia_paqueteria) || coincide(p.factura)
  ).slice(0, 4).map(p => ({
   clase: "pedido", valor: p.id, etiqueta: p.guia_interna || p.id,
   detalle: [p.cliente, p.factura].filter(Boolean).join(" · "),
  }));

  return [...clientes, ...conds, ...trans, ...peds].slice(0, 8);
 }, [pedidos, conductores, transportistas, consulta]);

 const elegir = (r) => {
  setTexto("");
  setAbierto(false);
  if (typeof r === "string") { onAbrirPedido(r); return; }
  if (r.clase === "foco") onFoco({ tipo: r.tipo, valor: r.valor, etiqueta: r.etiqueta });
  else onAbrirPedido(r.valor);
 };

 const campo = (
  <>
   <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: T.color.tinta3 }} />
   <input
    value={texto}
    autoFocus={compacto}
    onChange={e => { setTexto(e.target.value); setAbierto(true); }}
    onFocus={() => setAbierto(true)}
    onKeyDown={e => { if (e.key === "Enter" && resultados.length) elegir(resultados[0]); }}
    placeholder="Buscar pedido, guia o cliente"
    style={{
     width: "100%", boxSizing: "border-box",
     padding: "9px 12px 9px 34px",
     border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
     fontSize: 16, fontFamily: "inherit", color: T.color.tinta,
     background: T.color.superficie, outline: "none",
    }}/>
  </>
 );

 // El campo entero no cabe en la cabecera del celular: ahi es un boton que
 // despliega la busqueda sobre el contenido.
 if (compacto) {
  return (
   <div ref={ref} style={{ position: "relative" }}>
    <button onClick={() => setAbierto(!abierto)} title="Buscar pedido" style={botonCabecera}>
     <Search size={18} />
    </button>
    {abierto && (
     <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 40,
      width: "78vw", maxWidth: 330, minWidth: 220,
      ...tarjeta, boxShadow: T.sombra.flotante, padding: 8,
     }}>
      <div style={{ position: "relative" }}>{campo}</div>
      {consulta.length >= 2 && (
       <div style={{ marginTop: 6, maxHeight: 300, overflowY: "auto" }}>
        {resultados.length === 0 ? (
         <div style={{ padding: "10px 12px", fontSize: 13, color: T.color.tinta3 }}>Sin resultados</div>
        ) : resultados.map((r, i) => (
         <button key={r.clase + r.valor + i} onClick={() => elegir(r)} style={{
          width: "100%", textAlign: "left", border: "none", background: "transparent",
          cursor: "pointer", fontFamily: "inherit", padding: "9px 10px",
          borderRadius: T.radio.chico, display: "block",
         }}>
          <div style={{
           fontSize: 13, fontWeight: 700, color: T.color.tinta,
           overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{r.etiqueta}</div>
          <div style={{ fontSize: 12, color: T.color.tinta3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
           {r.detalle}
          </div>
         </button>
        ))}
       </div>
      )}
     </div>
    )}
   </div>
  );
 }

 return (
  <div ref={ref} style={{ position: "relative", width: 300 }}>
   {campo}
   {abierto && consulta.length >= 2 && (
    <div style={{
     position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40,
     ...tarjeta, boxShadow: T.sombra.flotante, padding: 6, maxHeight: 320, overflowY: "auto",
    }}>
     {resultados.length === 0 ? (
      <div style={{ padding: "10px 12px", fontSize: 13, color: T.color.tinta3 }}>Sin resultados</div>
     ) : resultados.map((r, i) => (
      <button key={r.clase + r.valor + i} onClick={() => elegir(r)} style={{
       width: "100%", textAlign: "left", border: "none", background: "transparent",
       cursor: "pointer", fontFamily: "inherit", padding: "8px 10px",
       borderRadius: T.radio.chico, display: "block",
      }}>
       <div style={{
        fontSize: 13, fontWeight: 700, color: T.color.tinta,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
       }}>{r.etiqueta}</div>
       <div style={{ fontSize: 12, color: T.color.tinta3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {r.detalle}
       </div>
      </button>
     ))}
    </div>
   )}
  </div>
 );
}

function SelectorRango({ rango, setRango, ancho = false }) {
 const [abierto, setAbierto] = useState(false);
 const ref = useCerrarAlClicFuera(abierto, () => setAbierto(false));
 const actual = RANGOS.find(r => r.id === rango) || RANGOS[3];

 return (
  <div ref={ref} style={{ position: "relative", width: ancho ? "100%" : undefined }}>
   <button onClick={() => setAbierto(!abierto)} style={{
    display: "flex", alignItems: "center", gap: 8,
    width: ancho ? "100%" : undefined, boxSizing: "border-box",
    padding: ancho ? "11px 14px" : "9px 12px", border: `1px solid ${T.color.borde2}`,
    borderRadius: T.radio.control, background: T.color.superficie,
    cursor: "pointer", fontFamily: "inherit", fontSize: 13.5,
    fontWeight: 600, color: T.color.tinta,
   }}>
    <CalendarDays size={15} style={{ color: T.color.tinta3, flexShrink: 0 }} />
    {actual.label}
    {ancho && <ChevronDown size={16} style={{ color: T.color.tinta3, marginLeft: "auto" }} />}
   </button>
   {abierto && (
    <div style={{
     position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40,
     left: ancho ? 0 : undefined, minWidth: ancho ? undefined : 190,
     ...tarjeta, boxShadow: T.sombra.flotante, padding: 6,
    }}>
     {RANGOS.map(r => (
      <button key={r.id} onClick={() => { setRango(r.id); setAbierto(false); }} style={{
       width: "100%", textAlign: "left", border: "none", cursor: "pointer",
       fontFamily: "inherit", padding: "8px 10px", borderRadius: T.radio.chico,
       fontSize: 13, fontWeight: r.id === rango ? 700 : 500,
       color: r.id === rango ? T.color.marca : T.color.tinta2,
       background: r.id === rango ? T.color.marcaSuave : "transparent",
      }}>{r.label}</button>
     ))}
    </div>
   )}
  </div>
 );
}

function Campana({ avisos, onIr }) {
 const [abierto, setAbierto] = useState(false);
 const ref = useCerrarAlClicFuera(abierto, () => setAbierto(false));
 const total = avisos.reduce((s, a) => s + a.cantidad, 0);

 return (
  <div ref={ref} style={{ position: "relative" }}>
   <button onClick={() => setAbierto(!abierto)} title="Avisos" style={{
    position: "relative", padding: 9, border: `1px solid ${T.color.borde2}`,
    borderRadius: T.radio.control, background: T.color.superficie,
    cursor: "pointer", display: "grid", placeItems: "center", color: T.color.tinta2,
   }}>
    <Bell size={16} />
    {total > 0 && (
     <span style={{
      position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px",
      borderRadius: T.radio.pastilla, background: T.color.mal, color: "#fff",
      fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center",
     }}>{total > 99 ? "99+" : total}</span>
    )}
   </button>
   {abierto && (
    <div style={{
     position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 40, width: 280,
     ...tarjeta, boxShadow: T.sombra.flotante, padding: 6,
    }}>
     <div style={{ ...T.texto.seccion, color: T.color.tinta3, padding: "8px 10px 6px" }}>Avisos</div>
     {total === 0 ? (
      <div style={{ padding: "10px", fontSize: 13, color: T.color.tinta3 }}>Nada pendiente por ahora.</div>
     ) : avisos.filter(a => a.cantidad > 0).map(a => (
      <div key={a.id} style={{ marginBottom: 4 }}>
       <button onClick={() => { setAbierto(false); onIr(a.tab); }} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
        padding: "9px 10px", borderRadius: T.radio.chico, textAlign: "left",
       }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: a.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: T.color.tinta2 }}>{a.texto}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.color.tinta }}>{a.cantidad}</span>
       </button>
       {/* Los pedidos concretos del aviso: se abre el que se toca, no la lista entera. */}
       {(a.items || []).map(it => (
        <button key={it.id} onClick={() => { setAbierto(false); a.onItem(it.id); }} style={{
         width: "100%", display: "flex", alignItems: "baseline", gap: 8,
         border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
         padding: "5px 10px 5px 28px", borderRadius: T.radio.chico, textAlign: "left",
        }}>
         <span style={{ fontSize: 12.5, fontWeight: 700, color: T.color.tinta }}>{it.id}</span>
         <span style={{ fontSize: 12, color: T.color.tinta3 }}>{it.detalle}</span>
        </button>
       ))}
       {a.cantidad > (a.items || []).length && (
        <div style={{ padding: "2px 10px 6px 28px", fontSize: 12, color: T.color.tinta3 }}>
         y {a.cantidad - (a.items || []).length} mas
        </div>
       )}
      </div>
     ))}
    </div>
   )}
  </div>
 );
}

// ── Graficas ────────────────────────────────────────────────────────────────

// Donut de cumplimiento. Dos segmentos separados por un hueco del color de la
// superficie, con el porcentaje como cifra central y la leyenda al lado: el color
// nunca es el unico portador del dato.
function DonutCumplimiento({ pct, aTiempo, tarde }) {
 const total = aTiempo + tarde;
 const r = 52, grosor = 14, C = 2 * Math.PI * r;
 const hueco = total > 0 && aTiempo > 0 && tarde > 0 ? 6 : 0;
 const largoATiempo = total > 0 ? (aTiempo / total) * C : 0;
 const [sobre, setSobre] = useState(null);

 const arco = (color, largo, desfase, clave, etiqueta, valor) => (
  <circle
   cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth={grosor}
   strokeDasharray={`${Math.max(largo - hueco, 0)} ${C}`}
   strokeDashoffset={-desfase}
   strokeLinecap={hueco ? "round" : "butt"}
   onMouseEnter={() => setSobre({ etiqueta, valor })}
   onMouseLeave={() => setSobre(null)}
   style={{ cursor: "default", transition: "stroke-width .12s" }}
  />
 );

 return (
  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
   <svg viewBox="0 0 140 140" style={{ width: 128, height: 128, flexShrink: 0, transform: "rotate(-90deg)" }}>
    <circle cx="70" cy="70" r={r} fill="none" stroke={T.color.borde} strokeWidth={grosor} />
    {total > 0 && arco(T.color.bien, largoATiempo, 0, "aTiempo", "A tiempo", aTiempo)}
    {total > 0 && arco(T.color.ojo, C - largoATiempo, largoATiempo, "tarde", "Tarde", tarde)}
    <text x="70" y="64" textAnchor="middle" fontSize="24" fontWeight="800"
     fill={T.color.tinta} transform="rotate(90 70 70)">{pct}%</text>
    <text x="70" y="82" textAnchor="middle" fontSize="11"
     fill={T.color.tinta3} transform="rotate(90 70 70)">a tiempo</text>
   </svg>

   <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
    {[["A tiempo", aTiempo, T.color.bien], ["Tarde", tarde, T.color.ojo]].map(([etiqueta, valor, color]) => (
     <div key={etiqueta} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: T.color.tinta2, flex: 1 }}>{etiqueta}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.color.tinta }}>{valor.toLocaleString("es-CO")}</span>
     </div>
    ))}
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: `1px solid ${T.color.borde}` }}>
     <span style={{ fontSize: 13, color: T.color.tinta3, flex: 1 }}>Entregados</span>
     <span style={{ fontSize: 13, fontWeight: 700, color: T.color.tinta }}>{total.toLocaleString("es-CO")}</span>
    </div>
   </div>

   {sobre && (
    <div style={{
     position: "absolute", top: -6, left: 0, zIndex: 20,
     background: T.color.tinta, color: "#fff", fontSize: 12, fontWeight: 600,
     padding: "5px 9px", borderRadius: T.radio.chico, pointerEvents: "none",
    }}>{sobre.etiqueta}: {sobre.valor.toLocaleString("es-CO")}</div>
   )}
  </div>
 );
}

// Barra apilada de pedidos por estado. Los segmentos se separan con 2px de la
// superficie para que se distingan aunque dos colores queden pegados, y cada uno
// aparece ademas en la leyenda con su nombre y su cifra.
function BarraEstados({ conteos, total, onIrAEstado }) {
 const [sobre, setSobre] = useState(null);
 const visibles = ORDEN_ESTADOS.filter(k => conteos[k] > 0);

 return (
  <div>
   <div style={{ position: "relative", display: "flex", gap: 2, height: 14, marginBottom: 18 }}
    onMouseLeave={() => setSobre(null)}>
    {total === 0 ? (
     <div style={{ flex: 1, background: T.color.borde, borderRadius: T.radio.pastilla }} />
    ) : visibles.map((k, i) => {
     const pct = (conteos[k] / total) * 100;
     const primero = i === 0, ultimo = i === visibles.length - 1;
     return (
      <div
       key={k}
       onMouseEnter={() => setSobre(k)}
       onClick={() => onIrAEstado && onIrAEstado(k)}
       title={`${ESTADOS_PEDIDO[k]?.label || k}: ${conteos[k]}`}
       style={{
        width: `${pct}%`, minWidth: 4, background: T.estado[k],
        borderTopLeftRadius: primero ? 7 : 2, borderBottomLeftRadius: primero ? 7 : 2,
        borderTopRightRadius: ultimo ? 7 : 2, borderBottomRightRadius: ultimo ? 7 : 2,
        cursor: onIrAEstado ? "pointer" : "default",
        outline: sobre === k ? `2px solid ${T.color.tinta}` : "none",
        outlineOffset: 2,
       }}/>
     );
    })}
   </div>

   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "12px 20px" }}>
    {ORDEN_ESTADOS.map(k => {
     const n = conteos[k] || 0;
     const pct = total > 0 ? Math.round((n / total) * 100) : 0;
     return (
      <div key={k}
       onMouseEnter={() => setSobre(k)}
       onMouseLeave={() => setSobre(null)}
       style={{ display: "flex", alignItems: "center", gap: 8, opacity: n === 0 ? 0.45 : 1 }}>
       <span style={{ width: 9, height: 9, borderRadius: 3, background: T.estado[k], flexShrink: 0 }} />
       <span style={{ fontSize: 13, color: T.color.tinta2, flex: 1, whiteSpace: "nowrap" }}>
        {ESTADOS_PEDIDO[k]?.label || k}
       </span>
       <span style={{ fontSize: 13, fontWeight: 700, color: T.color.tinta }}>{n.toLocaleString("es-CO")}</span>
       <span style={{ fontSize: 12, color: T.color.tinta3, width: 34, textAlign: "right" }}>{pct}%</span>
      </div>
     );
    })}
   </div>
  </div>
 );
}

// Sin esto, con un cliente enfocado las cifras bajan y no hay como saber por
// que: la franja dice a quien se esta mirando y como volver a verlo todo.
function FranjaFoco({ foco, cuantos, onQuitar }) {
 const comoSeLlama = { cliente: "Cliente", conductor: "Conductor", transportista: "Transportista" };
 return (
  <div style={{
   display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
   padding: "10px 14px", borderRadius: T.radio.control,
   background: T.color.marcaSuave, border: `1px solid ${T.color.marcaBorde}`,
  }}>
   <span style={{ ...T.texto.seccion, color: T.color.marca, whiteSpace: "nowrap" }}>
    {comoSeLlama[foco.tipo] || "Foco"}
   </span>
   <span style={{
    fontSize: 14, fontWeight: 700, color: T.color.tinta, minWidth: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
   }}>{foco.etiqueta}</span>
   <span style={{ fontSize: 12.5, color: T.color.tinta3, whiteSpace: "nowrap" }}>
    {cuantos.toLocaleString("es-CO")} {cuantos === 1 ? "pedido" : "pedidos"}
   </span>
   <button onClick={onQuitar} style={{
    marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
    height: 30, padding: "0 10px", borderRadius: T.radio.chico,
    border: `1px solid ${T.color.marcaBorde}`, background: T.color.superficie,
    color: T.color.marca, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", flexShrink: 0,
   }}>
    <X size={14} /> Ver todo
   </button>
  </div>
 );
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export function Dashboard({
 pedidos, conductores, devoluciones = [], recogidas = [], pqrs = [],
 promesas = [], ciudades = [], transportistas = [],
 setActiveTab, onBuscarPedido, onVerEstado,
 // Con que sujeto abrir. Siempre vacio en la aplicacion; existe para que la
 // prueba pueda dibujar el tablero ya enfocado sin simular la busqueda.
 focoInicial = null,
}) {
 // El dashboard abre con todo el historico: es la foto completa de la operacion.
 // Los rangos cortos sirven para mirar un periodo, no para ser el punto de partida.
 const [rango, setRango] = useState("todo");
 // A quien se esta mirando. Sin foco, la operacion entera; con foco, solo lo
 // de ese cliente, conductor o transportista.
 const [foco, setFoco] = useState(focoInicial);
 const esMovil = useEsMovil();

 const irA = (tab) => { if (setActiveTab) setActiveTab(tab); };
 const abrirPedido = (texto) => {
  if (onBuscarPedido) onBuscarPedido(texto);
  else irA("pedidos");
 };

 const m = useMemo(() => {
  const dias = (RANGOS.find(r => r.id === rango) || RANGOS[3]).dias;
  const desde = dias ? restarDias(dias) : null;
  const suyos = porFoco(pedidos, foco, "pedidos") || [];
  const enRango = desde
   ? suyos.filter(p => (p.fecha_creacion || p.created_at || "").slice(0, 10) >= desde)
   : suyos;

  const hoy = hoyISO();
  const promMap = Object.fromEntries((promesas || []).map(p => [p.ciudad_codigo, Number(p.dias_plazo || 0)]));
  const tienePromesa = (p) => promMap[p.ciudad_codigo] !== undefined;
  const fechaLimite = (p) => {
   if (!tienePromesa(p) || !p.fecha_creacion) return p.fecha_estimada || null;
   const d = new Date(p.fecha_creacion);
   d.setDate(d.getDate() + promMap[p.ciudad_codigo]);
   return d.toISOString().split("T")[0];
  };

  const entregados = enRango.filter(p => p.estado === "entregado" || p.estado === "novedad");
  const activos = enRango.filter(p => ["en_transito", "pendiente", "sin_asignar"].includes(p.estado));

  const vencidos = activos
   .filter(p => { const l = fechaLimite(p); return l && l < hoy; })
   .map(p => ({ ...p, limite: fechaLimite(p) }))
   .sort((a, b) => a.limite.localeCompare(b.limite));

  const manana = restarDias(-1);
  const enRiesgo = activos.filter(p => {
   const l = fechaLimite(p);
   return l && (l === hoy || l === manana);
  });

  const tiempos = entregados
   .filter(p => p.fecha_real && p.fecha_creacion)
   .map(p => diasEntre(p.fecha_creacion, p.fecha_real))
   .filter(d => d >= 0);
  const promedio = tiempos.length ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1) : "0.0";
  const promesaProm = promesas.length
   ? (promesas.reduce((s, p) => s + Number(p.dias_plazo || 0), 0) / promesas.length).toFixed(1)
   : "0.0";

  const conPromesa = entregados.filter(p => tienePromesa(p) && p.fecha_real && p.fecha_creacion);
  const sinPromesa = entregados.filter(p => !tienePromesa(p) && p.fecha_real && p.fecha_estimada);
  const aTiempo = conPromesa.filter(p => p.fecha_real <= fechaLimite(p)).length
   + sinPromesa.filter(p => p.fecha_real <= p.fecha_estimada).length;
  const totalCumpl = conPromesa.length + sinPromesa.length;
  const tarde = totalCumpl - aTiempo;
  const pctCumpl = totalCumpl > 0 ? Math.round((aTiempo / totalCumpl) * 100) : 0;

  const conteos = {};
  ORDEN_ESTADOS.forEach(k => { conteos[k] = 0; });
  enRango.forEach(p => { if (conteos[p.estado] !== undefined) conteos[p.estado] += 1; });

  return {
   enRango, entregados, activos, vencidos, enRiesgo,
   promedio, promesaProm, aTiempo, tarde, pctCumpl, totalCumpl, conteos,
  };
 }, [pedidos, promesas, rango, foco]);

 // Las PQRS y las devoluciones del sujeto. Las devoluciones no guardan el
 // cliente: con un cliente enfocado no hay con que filtrarlas, y porFoco
 // devuelve null para que el indicador lo diga.
 const pqrsFoco = porFoco(pqrs, foco, "pqrs") || [];
 const devolucionesFoco = porFoco(devoluciones, foco, "devoluciones");

 const pqrsAbiertas = pqrsFoco.filter(p => p.estado === "abierta").length;
 const pqrsGestion = pqrsFoco.filter(p => p.estado === "en_gestion").length;
 const pqrsCerradas = pqrsFoco.filter(p => p.estado === "cerrada").length;

 // Cada aviso lista sus primeros pedidos para poder abrir uno directamente; el
 // titulo del grupo sigue llevando a la vista completa.
 const avisos = [
  {
   id: "venc", texto: "Pedidos fuera de promesa", cantidad: m.vencidos.length,
   color: T.color.mal, tab: "pedidos", onItem: abrirPedido,
   items: m.vencidos.slice(0, 4).map(p => ({ id: p.id, detalle: `vencio ${p.limite}` })),
  },
  {
   id: "riesgo", texto: "En riesgo de vencer", cantidad: m.enRiesgo.length,
   color: T.color.ojo, tab: "pedidos", onItem: abrirPedido,
   items: m.enRiesgo.slice(0, 4).map(p => ({ id: p.id, detalle: p.fecha_estimada || "" })),
  },
  { id: "pqrs", texto: "PQRS abiertas", cantidad: pqrsAbiertas, color: T.color.mal, tab: "pqrs" },
 ];

 const kpis = [
  { label: "Total pedidos", valor: m.enRango.length, color: T.color.tinta3 },
  { label: "Activos", valor: m.activos.length, color: T.color.marca, destacado: true },
  { label: "Entregados", valor: m.entregados.length, color: T.color.bien },
  { label: "En riesgo", valor: m.enRiesgo.length, color: T.color.ojo, resalta: true },
  { label: "Vencidos", valor: m.vencidos.length, color: T.color.mal, resalta: true },
  {
   label: "Devoluciones",
   valor: devolucionesFoco ? devolucionesFoco.length : null,
   nota: "Las devoluciones no registran el cliente",
   color: T.color.tinta3,
  },
 ];

 const pie = ALTO_BARRA + 16;

 return (
  <div style={{
   minHeight: "100%", background: T.color.fondo, color: T.color.tinta,
   margin: esMovil ? `-16px -16px -${pie}px` : "-28px -24px",
   padding: esMovil ? `14px 16px ${pie + 12}px` : "24px 28px 40px",
  }}>
   <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: esMovil ? 12 : 18 }}>

    {esMovil ? (
     <>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
       <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: `linear-gradient(135deg,${T.color.marca},${T.color.marcaFuerte})`,
        color: "#fff", display: "grid", placeItems: "center",
        fontWeight: 800, fontSize: 12, letterSpacing: "-0.02em",
       }}>PRO</div>
       <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11.5, color: T.color.tinta3, lineHeight: 1.2 }}>Somos PRO · Tracking</div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Dashboard</h1>
       </div>
       <Buscador pedidos={pedidos} conductores={conductores} transportistas={transportistas}
       onAbrirPedido={abrirPedido} onFoco={setFoco} compacto />
       <Campana avisos={avisos} onIr={irA} />
      </header>
      <SelectorRango rango={rango} setRango={setRango} ancho />
      {foco && <FranjaFoco foco={foco} cuantos={m.enRango.length} onQuitar={() => setFoco(null)} />}
     </>
    ) : (
     <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <div>
       <h1 style={{ margin: 0, ...T.texto.titulo }}>Dashboard</h1>
       <p style={{ margin: "4px 0 0", color: T.color.tinta3, fontSize: 13.5 }}>
        Resumen operativo de seguimiento y entregas
       </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
       <Buscador pedidos={pedidos} conductores={conductores} transportistas={transportistas}
        onAbrirPedido={abrirPedido} onFoco={setFoco} />
       <SelectorRango rango={rango} setRango={setRango} />
       <Campana avisos={avisos} onIr={irA} />
      </div>
     </header>
    )}

    {!esMovil && foco && (
     <FranjaFoco foco={foco} cuantos={m.enRango.length} onQuitar={() => setFoco(null)} />
    )}

    {esMovil ? (
     // En dos columnas las seis cifras se leen de un vistazo sin desplazarse.
     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {kpis.map(k => (
       <div key={k.label} style={{ ...tarjeta, padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
         <span style={{ width: 7, height: 7, borderRadius: 4, background: k.color, flexShrink: 0 }} />
         <span style={{
          fontSize: 12, color: T.color.tinta2, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
         }}>{k.label}</span>
        </div>
        <div title={k.valor === null ? k.nota : undefined} style={{
         fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1,
         color: k.valor === null ? T.color.tenue
          : k.destacado ? T.color.marca : k.resalta ? k.color : T.color.tinta,
        }}>{k.valor === null ? "—" : k.valor.toLocaleString("es-CO")}</div>
       </div>
      ))}
     </div>
    ) : (
     <Tarjeta style={{ padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length},1fr)` }}>
       {kpis.map((k, i) => (
        <div key={k.label} style={{
         padding: "18px 22px",
         borderLeft: i === 0 ? "none" : `1px solid ${T.color.borde}`,
        }}>
         <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: k.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: T.color.tinta2, whiteSpace: "nowrap" }}>{k.label}</span>
         </div>
         <div title={k.valor === null ? k.nota : undefined}
          style={{ ...T.texto.cifra, color: k.valor === null ? T.color.tenue : k.destacado ? T.color.marca : T.color.tinta }}>
          {k.valor === null ? "—" : k.valor.toLocaleString("es-CO")}
         </div>
        </div>
       ))}
      </div>
     </Tarjeta>
    )}

    <div style={{
     display: "grid", alignItems: "start",
     gridTemplateColumns: esMovil ? "1fr" : "1.15fr 1fr 0.85fr",
     gap: esMovil ? 12 : 18,
    }}>

     <Tarjeta>
      <TituloTarjeta accion={
       <span style={{
        background: m.vencidos.length ? T.color.malSuave : T.color.bienSuave,
        color: m.vencidos.length ? T.color.mal : T.color.bien,
        borderRadius: T.radio.pastilla, padding: "2px 10px", fontSize: 12.5, fontWeight: 800,
       }}>{m.vencidos.length}</span>
      }>
       <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <AlertTriangle size={16} style={{ color: m.vencidos.length ? T.color.mal : T.color.tinta3 }} />
        Fuera de promesa
       </span>
      </TituloTarjeta>

      {m.vencidos.length === 0 ? (
       <p style={{ margin: 0, fontSize: 13, color: T.color.tinta3 }}>
        Ningun pedido activo paso su fecha limite en este rango.
       </p>
      ) : (
       <>
        <div style={{ display: "flex", flexDirection: "column" }}>
         {m.vencidos.slice(0, 5).map((p, i) => {
          const dias = diasEntre(p.limite, hoyISO());
          return (
           <button key={p.id} onClick={() => abrirPedido(p.id)} style={{
            display: "flex", alignItems: "center", gap: 12,
            border: "none", borderTop: i === 0 ? "none" : `1px solid ${T.color.borde}`,
            background: "transparent", cursor: "pointer", fontFamily: "inherit",
            padding: "11px 0", textAlign: "left", width: "100%",
           }}>
            <span style={{ flex: 1, minWidth: 0 }}>
             <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.color.tinta }}>{p.id}</span>
             <span style={{ display: "block", fontSize: 12.5, color: T.color.tinta3 }}>vencio {p.limite}</span>
            </span>
            <span style={{
             background: T.color.malSuave, color: T.color.mal, borderRadius: T.radio.pastilla,
             padding: "2px 9px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
            }}>{dias} {dias === 1 ? "dia" : "dias"}</span>
            <ChevronRight size={15} style={{ color: T.color.tinta3, flexShrink: 0 }} />
           </button>
          );
         })}
        </div>
        {m.vencidos.length > 5 && (
         <div style={{ marginTop: 14 }}>
          <Enlace onClick={() => irA("pedidos")}>Ver los {m.vencidos.length} pedidos <ChevronRight size={14} /></Enlace>
         </div>
        )}
       </>
      )}
     </Tarjeta>

     <Tarjeta>
      <TituloTarjeta accion={
       <span style={{ fontSize: 12, color: T.color.tinta3 }}>Segun promesas</span>
      }>Cumplimiento</TituloTarjeta>
      <DonutCumplimiento pct={m.pctCumpl} aTiempo={m.aTiempo} tarde={m.tarde} />
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.color.borde}`, fontSize: 13, color: T.color.tinta2 }}>
       Tiempo medio de entrega{" "}
       <strong style={{ color: T.color.tinta, fontSize: 15 }}>{m.promedio} d</strong>
       <span style={{ color: T.color.tinta3 }}> / {m.promesaProm} prom.</span>
      </div>
     </Tarjeta>

     <Tarjeta>
      <TituloTarjeta accion={<Enlace onClick={() => irA("pqrs")}>Abrir</Enlace>}>PQRS</TituloTarjeta>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
       {[
        { label: "Abiertas", valor: pqrsAbiertas, color: T.color.mal, fondo: T.color.malSuave },
        { label: "En gestion", valor: pqrsGestion, color: T.color.ojo, fondo: T.color.ojoSuave },
        { label: "Cerradas", valor: pqrsCerradas, color: T.color.bien, fondo: T.color.bienSuave },
       ].map(f => (
        <div key={f.label} style={{
         display: "flex", alignItems: "center", gap: 10,
         padding: "11px 14px", borderRadius: T.radio.control,
         background: f.valor > 0 ? f.fondo : T.color.superficie2,
        }}>
         <span style={{ width: 8, height: 8, borderRadius: 4, background: f.color, flexShrink: 0 }} />
         <span style={{ flex: 1, fontSize: 13, color: T.color.tinta2 }}>{f.label}</span>
         <span style={{ fontSize: 15, fontWeight: 800, color: T.color.tinta }}>{f.valor}</span>
        </div>
       ))}
      </div>
     </Tarjeta>
    </div>

    <Tarjeta>
     <TituloTarjeta accion={
      <span style={{ fontSize: 12.5, color: T.color.tinta3 }}>
       {m.enRango.length.toLocaleString("es-CO")} pedidos
      </span>
     }>Pedidos por estado</TituloTarjeta>
     <BarraEstados conteos={m.conteos} total={m.enRango.length}
      onIrAEstado={(estado) => (onVerEstado ? onVerEstado(estado) : irA("pedidos"))} />
    </Tarjeta>

   </div>
  </div>
 );
}

import React from 'react';
import { Boxes, CalendarDays, MapPin, Paperclip } from 'lucide-react';
import { T } from '../../design/tokens';
import { ChipEstado } from '../../components/ui/listas';

// Las pantallas del conductor se ven casi siempre desde un celular, en la calle
// y con una mano. Por eso aqui no hay tablas: una tabla en un telefono obliga a
// desplazarse de lado para leer una sola fila, y el conductor necesita ver de un
// vistazo a donde va y que tiene que hacer.
//
// Las piezas siguen el mismo lenguaje que PedidosMovil: tarjeta con borde suave,
// el identificador y el estado arriba, el dato importante en el medio y los
// detalles al pie, separados por una linea.

const tarjetaBase = {
 background: T.color.superficie,
 border: `1px solid ${T.color.borde}`,
 borderRadius: 12,
 padding: "12px 14px",
 width: "100%",
 display: "flex",
 flexDirection: "column",
 gap: 8,
 textAlign: "left",
};

const pie = {
 display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", width: "100%",
 fontSize: 12, color: T.color.tinta3,
 paddingTop: 8, borderTop: `1px solid ${T.color.divisor}`,
};

const dato = { display: "flex", alignItems: "center", gap: 5, minWidth: 0 };

export function ListaVacia({ children }) {
 return (
  <div style={{
   padding: "36px 20px", textAlign: "center", fontSize: 13.5, color: T.color.tinta3,
   border: `1px dashed ${T.color.borde2}`, borderRadius: T.radio.tarjeta,
  }}>{children}</div>
 );
}

// Boton de accion de una tarjeta. Alto 40 para que se pueda tocar sin apuntar.
function Accion({ onClick, children, principal = false }) {
 return (
  <button onClick={onClick} style={{
   flex: 1, minHeight: 40, borderRadius: T.radio.control, cursor: "pointer",
   fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
   background: principal ? T.color.bienPunto : T.color.superficie,
   color: principal ? "#fff" : T.color.tinta2,
   border: principal ? "none" : `1px solid ${T.color.borde2}`,
  }}>{children}</button>
 );
}

// ── Un pedido asignado ─────────────────────────────────────────────────────
// Cerrado se dibuja igual pero sin acciones: el historial se lee, no se toca.
export function TarjetaPedidoConductor({ pedido, onVer, onEntregar, cerrado = false }) {
 return (
  <article style={tarjetaBase}>
   <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <span style={{ fontWeight: 700, fontSize: 14, color: T.color.tinta, fontVariantNumeric: "tabular-nums" }}>
     {pedido.guia_interna || pedido.id}
    </span>
    {pedido.factura && (
     <span style={{ fontFamily: T.fuente.mono, fontSize: 11, color: T.color.tinta4 }}>{pedido.factura}</span>
    )}
    <span style={{ marginLeft: "auto", flexShrink: 0 }}>
     <ChipEstado estado={pedido.estado} novedad={pedido.novedad} />
    </span>
   </div>

   <span style={{
    fontSize: 13, fontWeight: 500, color: T.color.tinta, width: "100%",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
   }}>{pedido.cliente}</span>

   {/* La direccion es a donde tiene que llegar: va completa, sin recortar. */}
   <span style={{ display: "flex", gap: 6, fontSize: 12.5, color: T.color.tinta2, lineHeight: 1.45 }}>
    <MapPin size={14} style={{ color: T.color.placeholder, flexShrink: 0, marginTop: 2 }} />
    <span style={{ minWidth: 0 }}>
     {pedido.direccion || "Sin direccion"}
     {pedido.ciudad_nombre && <span style={{ color: T.color.tinta3 }}> · {pedido.ciudad_nombre}</span>}
    </span>
   </span>

   <div style={pie}>
    <span style={dato}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />
     {pedido.cajas || 0} {Number(pedido.cajas) === 1 ? "caja" : "cajas"}
    </span>
    <span style={dato}>
     <CalendarDays size={14} style={{ color: T.color.placeholder }} />
     {cerrado
      ? (pedido.fecha_real || "Sin fecha")
      : (pedido.fecha_estimada || "Sin fecha estimada")}
    </span>
    {cerrado && (pedido.soportes || []).length > 0 && (
     <span style={dato}>
      <Paperclip size={14} style={{ color: T.color.placeholder }} />
      {pedido.soportes.length}
     </span>
    )}
   </div>

   {!cerrado && (
    <div style={{ display: "flex", gap: 8, width: "100%" }}>
     <Accion onClick={() => onVer(pedido)}>Ver</Accion>
     <Accion onClick={() => onEntregar(pedido)} principal>Registrar entrega</Accion>
    </div>
   )}
  </article>
 );
}

// ── Una devolucion o una recogida ──────────────────────────────────────────
// Las dos tienen la misma forma: una guia, un estado, un par de lineas de
// detalle y a veces un archivo adjunto. Se dibujan con la misma pieza para que
// el conductor no tenga que aprenderse dos pantallas distintas.
export function TarjetaEnvio({ guia, estado, novedad, acento, lineas = [], medidas, nota, adjunto }) {
 return (
  <article style={{ ...tarjetaBase, borderLeft: `3px solid ${acento}` }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
    <span style={{ fontFamily: T.fuente.mono, fontWeight: 700, fontSize: 13.5, color: acento }}>{guia}</span>
    <span style={{ marginLeft: "auto", flexShrink: 0 }}>
     <ChipEstado estado={estado} novedad={novedad} />
    </span>
   </div>

   {lineas.filter(Boolean).map((l, i) => (
    <span key={i} style={{ fontSize: 12.5, color: i === 0 ? T.color.tinta : T.color.tinta2, lineHeight: 1.45 }}>
     {l}
    </span>
   ))}

   {nota && (
    <span style={{ fontSize: 12, color: T.color.tinta3, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{nota}</span>
   )}

   {(medidas || adjunto) && (
    <div style={pie}>
     {medidas && <span style={dato}>{medidas}</span>}
     {adjunto && (
      <button onClick={adjunto.onClick} style={{
       marginLeft: "auto", minHeight: 34, padding: "0 12px", borderRadius: T.radio.control,
       border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
       color: T.color.marca, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
       cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
      }}>
       <Paperclip size={14} /> {adjunto.texto}
      </button>
     )}
    </div>
   )}
  </article>
 );
}

// ── Bloque de lista con su titulo y su cuenta ──────────────────────────────
export function Bloque({ titulo, descripcion, cuenta, children }) {
 return (
  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
   <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
    <h2 style={{ margin: 0, ...T.texto.tarjeta }}>{titulo}</h2>
    {cuenta !== undefined && (
     <span style={{ fontSize: 12.5, color: T.color.tinta3 }}>{cuenta}</span>
    )}
   </div>
   {descripcion && (
    <p style={{ margin: "-4px 0 0", fontSize: 12.5, color: T.color.tinta3 }}>{descripcion}</p>
   )}
   {children}
  </section>
 );
}

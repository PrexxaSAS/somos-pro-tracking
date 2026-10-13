import React, { useState, useEffect } from 'react';
import { Boxes, Calendar, ChevronDown, FileText, HelpCircle, Image as IconoImagen, MapPin, Truck } from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';
import { transportePedido } from '../../utils/transporte';
import { BuscadorConductor, LineaResumen, ListaVacia } from '../conductor/PantallasConductor';
import { CabeceraLista, Chip, nombreCorto } from '../gestion/ListasMovil';

// Disenio 23: Estado de pedidos del cliente en el celular. Los mismos cuatro
// conteos del escritorio en una rejilla 2x2, y tocar uno filtra la lista; por
// eso no hay pestanias. La tarjeta es de solo lectura: el cliente no crea ni
// edita pedidos. Guia siempre; Rastrear, en purpura, solo si el pedido se
// mueve. "Nueva PQRS" va en el encabezado.
//
// Todo el filtrado lo hace Consultas, que es la misma logica del escritorio;
// esta pantalla solo lo dibuja.

const TONO = {
 sin_asignar: { bg: T.color.neutroSuave, color: T.color.neutro },
 pendiente: { bg: T.color.neutroSuave, color: T.color.neutro },
 en_transito: { bg: T.color.marcaSuave, color: T.color.marca },
 paqueteria: { bg: T.color.marcaSuave, color: T.color.marca },
 entregado: { bg: T.color.bienSuave, color: T.color.bien },
 novedad: { bg: T.color.malSuave, color: T.color.mal },
 solo_facturar: { bg: T.color.bienSuave, color: T.color.bien },
 cliente_recoge: { bg: T.color.infoSuave, color: T.color.info },
};

const botonIcono = (activo) => ({
 width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, flexShrink: 0, padding: 0, cursor: "pointer",
 background: activo ? T.color.marcaSuave : T.color.superficie2,
 border: activo ? "none" : `1px solid ${T.color.borde2}`,
 color: activo ? T.color.marca : T.color.tinta2,
});

function Conteos({ items }) {
 return (
  <section style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
   {items.map(k => (
    <button key={k.clave} onClick={k.onClick} style={{
     background: T.color.superficie, border: `1.5px solid ${k.activo ? T.color.marca : T.color.borde}`, borderRadius: 12,
     padding: "10px 12px", minWidth: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: T.color.tinta,
    }}>
     <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: k.color }}>{Number(k.valor).toLocaleString("es-CO")}</div>
     <div style={{ fontSize: 12, color: T.color.tinta2, marginTop: 2 }}>{k.label}</div>
    </button>
   ))}
  </section>
 );
}

function TarjetaPedidoCliente({ p, conductor, abierto, onRastrear, onGuia, onSoportes, mapa }) {
 const tr = transportePedido(p, conductor);
 const tono = TONO[p.estado] || TONO.sin_asignar;
 const rastreable = ["en_transito", "paqueteria"].includes(p.estado);
 const soportes = (p.soportes || p.soportes_data || []).length;
 const transporte = tr.noAplica ? "No aplica"
  : !tr.principal ? "Sin asignar"
  : [conductor ? nombreCorto(tr.principal) : tr.principal, tr.detalle].filter(Boolean).join(" · ");
 return (
  <article style={{
   background: T.color.superficie, border: `1px solid ${abierto ? T.color.marca : T.color.borde}`, borderRadius: 12,
   padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, color: T.color.tinta,
  }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{p.guia_interna || p.id}</span>
    <span style={{ fontFamily: T.fuente.mono, fontSize: 11.5, color: p.factura ? T.color.tinta3 : T.color.placeholder }}>{p.factura || "Sin factura"}</span>
    <Chip bg={tono.bg} color={tono.color} punto={T.estado[p.estado] || T.color.neutroPunto} texto={ESTADOS_PEDIDO[p.estado]?.label || p.estado} />
   </div>
   <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
    <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</span>
    <span style={{ fontSize: 12.5, color: T.color.tinta3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
     {[p.direccion, p.ciudad_nombre].filter(Boolean).join(" · ") || "Sin direccion"}
    </span>
   </div>
   <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: T.color.tinta3, paddingTop: 8, borderTop: `1px solid ${T.color.divisor}` }}>
    <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
     <Boxes size={14} style={{ color: T.color.placeholder }} />{p.cajas || 0} {Number(p.cajas) === 1 ? "caja" : "cajas"}
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1, color: tr.principal ? T.color.tinta2 : T.color.placeholder, fontWeight: tr.principal ? 600 : 500 }}>
     <Truck size={14} style={{ flexShrink: 0 }} />
     <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{transporte}</span>
    </span>
    <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
     {soportes > 0 && (
      <button onClick={() => onSoportes(p)} title={`Soportes (${soportes})`} style={botonIcono(false)}><IconoImagen size={15} /></button>
     )}
     <button onClick={() => onGuia(p)} title="Guia" style={botonIcono(false)}><FileText size={15} /></button>
     {rastreable && (
      <button onClick={() => onRastrear(p)} title={abierto ? "Ocultar mapa" : "Rastrear"} style={botonIcono(true)}><MapPin size={15} /></button>
     )}
    </span>
   </div>
   {abierto && mapa}
  </article>
 );
}

export function EstadoPedidosMovil({
 sobre, conteo, filtro, setFiltro, busq, setBusq, rango, setRango, rangos,
 filtrados, totalCajas, conductores = [], onNuevaPQRS, onGuia, onSoportes, renderMapa,
}) {
 const [mapa, setMapa] = useState(null);
 const [tope, setTope] = useState(20);
 useEffect(() => { setTope(20); }, [busq, rango, filtro]);

 const kpi = (clave, label, color) => ({
  clave, label, color, valor: conteo[clave], activo: filtro === clave,
  onClick: () => setFiltro(filtro === clave && clave !== "todos" ? "todos" : clave),
 });
 const rangoActual = rangos.find(r => r.id === rango);
 const corto = rangoActual?.dias ? `${rangoActual.dias} dias` : "Todo";

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
   <CabeceraLista sobre={sobre} titulo="Estado de pedidos"
    accion={onNuevaPQRS ? "PQRS" : null} icono={HelpCircle} onAccion={onNuevaPQRS} />
   <Conteos items={[
    kpi("todos", "Total", T.color.tinta),
    kpi("activos", "Activos", T.color.marca),
    kpi("entregados", "Entregados", T.color.bien),
    kpi("novedades", "Novedades", T.color.mal),
   ]}/>
   <div style={{ display: "flex", gap: 8 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
     <BuscadorConductor valor={busq} onChange={setBusq} placeholder="Pedido, guia, factura o destino" />
    </div>
    <label style={{
     position: "relative", display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 10px", flexShrink: 0,
     border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, background: T.color.superficie,
     fontSize: 13, fontWeight: 600, color: T.color.tinta2, cursor: "pointer",
    }}>
     <Calendar size={15} style={{ color: T.color.tinta4 }} />{corto}<ChevronDown size={14} style={{ color: T.color.tinta4 }} />
     <select value={rango} onChange={e => setRango(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
      {rangos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
     </select>
    </label>
   </div>
   <LineaResumen izquierda={`${filtrados.length.toLocaleString("es-CO")} ${filtrados.length === 1 ? "pedido" : "pedidos"} · ${totalCajas} cajas`} />
   {filtrados.length === 0 ? (
    <ListaVacia>{conteo.todos === 0 ? "No hay pedidos en este periodo." : "Ningun pedido coincide con los filtros."}</ListaVacia>
   ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     {filtrados.slice(0, tope).map(p => {
      const cond = conductores.find(c => String(c.id) === String(p.conductor_id));
      const abierto = mapa === p.id;
      return (
       <TarjetaPedidoCliente key={p.id} p={p} conductor={cond} abierto={abierto}
        onRastrear={x => setMapa(abierto ? null : x.id)} onGuia={onGuia} onSoportes={onSoportes}
        mapa={abierto ? renderMapa(p, cond) : null} />
      );
     })}
     {filtrados.length > tope && (
      <button onClick={() => setTope(t => t + 20)} style={{
       minHeight: 46, borderRadius: T.radio.control, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
       color: T.color.tinta2, fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
      }}>Ver mas pedidos</button>
     )}
    </div>
   )}
  </div>
 );
}

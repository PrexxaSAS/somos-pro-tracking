import React from 'react';
import {
 AlertTriangle, Boxes, Check, ChevronLeft, ChevronRight, FileText, History,
 MapPin, MoreHorizontal, Package, Pencil, Phone, Truck, UserPlus,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO, ESTADOS_SIN_DESPACHO } from '../../Constants';
import { transportePedido } from '../../utils/transporte';

// El detalle de escritorio es un formulario de veinte campos. En el celular se
// lee antes de editarse: esta vista muestra el pedido por bloques y deja una
// sola accion principal segun el estado. Lo que falta -- conductor, factura --
// aparece en rojo como accion, no como dato vacio.

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

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-09-23" -> "23 sep". Se parte el texto en vez de usar Date porque
// new Date("2026-09-23") se interpreta en UTC y en Colombia resta un dia.
const fechaCorta = (iso) => {
 if (!iso) return null;
 const [a, m, d] = String(iso).slice(0, 10).split("-");
 if (!a || !m || !d) return String(iso);
 return `${Number(d)} ${MESES[Number(m) - 1] || m}`;
};

const hoyISO = () => new Date().toISOString().split("T")[0];

const sumarDias = (iso, dias) => {
 if (!iso) return null;
 const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
 d.setDate(d.getDate() + Number(dias || 0));
 return d.toISOString().split("T")[0];
};

const diasEntre = (desde, hasta) =>
 Math.round((new Date(`${hasta}T12:00:00`) - new Date(`${desde}T12:00:00`)) / 86400000);

const botonCabecera = {
 width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
 background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
};

// ── Bloque de datos ─────────────────────────────────────────────────────────
function Bloque({ icono: Icono, titulo, accion, onAccion, children }) {
 return (
  <section style={{
   background: T.color.superficie, border: `1px solid ${T.color.borde}`,
   borderRadius: T.radio.tarjeta, padding: "4px 14px",
   display: "flex", flexDirection: "column",
  }}>
   <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 6px" }}>
    <Icono size={16} style={{ color: T.color.marca, flexShrink: 0 }} />
    <span style={{ fontWeight: 700, fontSize: 14 }}>{titulo}</span>
    {accion && (
     <button onClick={onAccion} style={{
      marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer",
      fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: T.color.marca, padding: 0,
     }}>{accion}</button>
    )}
   </div>
   {children}
  </section>
 );
}

// Una fila etiqueta/valor. Sin valor, el texto sale en rojo como pendiente.
function Fila({ etiqueta, valor, falta, mono, icono: Icono, onIcono }) {
 return (
  <div style={{
   display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "6px 0",
   borderTop: `1px solid ${T.color.divisor}`, fontSize: 13,
  }}>
   <span style={{ width: 96, flexShrink: 0, color: T.color.tinta3, fontSize: 12, paddingTop: 1 }}>
    {etiqueta}
   </span>
   <span style={{
    flex: 1, minWidth: 0, lineHeight: 1.4,
    color: falta ? T.color.malPunto : T.color.tinta,
    fontWeight: falta ? 600 : 500,
    fontFamily: mono ? T.fuente.mono : "inherit",
   }}>{valor}</span>
   {Icono && (
    <button onClick={onIcono} style={{
     width: 32, height: 32, margin: "-6px 0", borderRadius: 8, border: "none",
     background: T.color.marcaSuave, color: T.color.marca,
     display: "grid", placeItems: "center", flexShrink: 0, cursor: "pointer",
    }}><Icono size={15} /></button>
   )}
  </div>
 );
}

// ── Vista ───────────────────────────────────────────────────────────────────
export function DetallePedidoMovil({
 pedido, conductor, promesa, onCerrar, onEditar, onGuia, onAcciones,
 puedeEntregar = false,
}) {
 const tr = transportePedido(pedido, conductor);
 const tono = TONO_ESTADO[pedido.estado] || TONO_ESTADO.sin_asignar;
 const punto = T.estado[pedido.estado] || T.color.neutroPunto;
 const cerrado = ["entregado", "novedad"].includes(pedido.estado);
 const sinDespacho = ESTADOS_SIN_DESPACHO.includes(pedido.estado);
 const esPaqueteria = pedido.tipo === "paqueteria";
 const faltaConductor = !conductor && !esPaqueteria && !sinDespacho && !cerrado;

 // La fecha limite sale de la promesa de la ciudad; sin promesa, de la fecha
 // estimada que se digita pedido a pedido.
 const limite = promesa && pedido.fecha_creacion
  ? sumarDias(pedido.fecha_creacion, promesa.dias_plazo)
  : pedido.fecha_estimada || null;

 const hoy = hoyISO();
 const dias = limite ? diasEntre(hoy, limite) : null;
 const tonoPromesa = !limite ? T.color.tinta3
  : cerrado ? T.color.tinta3
  : dias < 0 ? T.color.mal
  : dias <= 1 ? T.color.ojo
  : T.color.bien;
 const textoPromesa = !limite ? "Sin promesa"
  : cerrado ? `Promesa ${fechaCorta(limite)}`
  : dias < 0 ? `Vencio ${fechaCorta(limite)}`
  : `Promesa ${fechaCorta(limite)}${dias === 0 ? " · hoy" : dias === 1 ? " · manana" : ""}`;

 const creado = pedido.fecha_pedido || pedido.fecha_creacion;
 const hora = pedido.hora_pedido ? String(pedido.hora_pedido).slice(0, 5) : null;

 // El historial se arma con las fechas que el pedido ya trae: no hay una tabla
 // de eventos, asi que se muestra lo que consta y nada mas.
 const eventos = [];
 if (creado) eventos.push({ titulo: "Pedido creado", meta: `${fechaCorta(creado)}${hora ? `, ${hora}` : ""}`, hecho: true });
 if (pedido.fecha_despacho) {
  eventos.push({
   titulo: esPaqueteria ? "Entregado a paqueteria" : "Despachado",
   meta: `${fechaCorta(pedido.fecha_despacho)}${tr.principal ? ` · ${tr.principal}` : ""}`,
   hecho: true,
  });
 }
 if (pedido.fecha_real) {
  eventos.push({
   titulo: pedido.estado === "novedad" ? "Cerrado con novedad" : "Entregado",
   meta: fechaCorta(pedido.fecha_real),
   hecho: true,
   mal: pedido.estado === "novedad",
  });
 } else if (limite && !cerrado) {
  eventos.push({ titulo: "Entrega prometida", meta: fechaCorta(limite), hecho: false });
 }

 const abrirMapa = () => {
  const destino = [pedido.direccion, pedido.ciudad_nombre, "Colombia"].filter(Boolean).join(", ");
  window.open(`https://maps.google.com/maps?q=${encodeURIComponent(destino)}`, "_blank");
 };

 // Una sola accion principal, la que toca segun el estado. Registrar la
 // entrega solo lo ofrece a quien de verdad puede hacerlo: un pedido en
 // transito esta bloqueado para todos menos su conductor, asi que a los demas
 // el boton los llevaria a una pantalla donde no pueden guardar nada.
 const principal = faltaConductor ? { texto: "Asignar conductor", icono: UserPlus, fondo: T.color.marca }
  : cerrado ? null
  : puedeEntregar ? { texto: "Registrar entrega", icono: Check, fondo: T.color.bienPunto }
  : { texto: "Editar pedido", icono: Pencil, fondo: T.color.marca };

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 110, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <button onClick={onCerrar} title="Volver" style={botonCabecera}>
     <ChevronLeft size={18} />
    </button>
    <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: T.color.tinta3 }}>
     Pedido
    </span>
    <button onClick={onAcciones} title="Mas acciones" style={botonCabecera}>
     <MoreHorizontal size={17} />
    </button>
   </header>

   <div style={{
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
    display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 20px",
   }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0 6px" }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
       {pedido.guia_interna || pedido.id}
      </span>
      <span style={{
       display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600,
       padding: "4px 9px", borderRadius: T.radio.pastilla, background: tono.bg, color: tono.color,
      }}>
       <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
       {ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado}
      </span>
      {pedido.novedad && pedido.estado !== "novedad" && (
       <span style={{
        padding: "4px 9px", borderRadius: T.radio.pastilla,
        background: T.color.malSuave, color: T.color.mal, fontSize: 11, fontWeight: 700,
       }}>Novedad</span>
      )}
     </div>
     <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.color.tinta3, flexWrap: "wrap" }}>
      {pedido.guia_interna && pedido.guia_interna !== pedido.id && (
       <span style={{ fontFamily: T.fuente.mono }}>{pedido.id}</span>
      )}
      {creado && <span>Creado {fechaCorta(creado)}{hora ? `, ${hora}` : ""}</span>}
      <span style={{ display: "flex", alignItems: "center", gap: 4, color: tonoPromesa, fontWeight: 600 }}>
       {textoPromesa}
      </span>
     </div>
    </div>

    {faltaConductor ? (
     <button onClick={onEditar} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      padding: "12px 14px", background: T.color.superficie,
      border: `1px solid ${T.color.malBorde}`, borderRadius: 12,
      cursor: "pointer", fontFamily: "inherit",
     }}>
      <span style={{
       width: 30, height: 30, borderRadius: 8, flexShrink: 0,
       background: T.color.malSuave, color: T.color.mal, display: "grid", placeItems: "center",
      }}><UserPlus size={15} /></span>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
       <span style={{ fontSize: 13, fontWeight: 700 }}>Sin conductor asignado</span>
       <span style={{ fontSize: 12, color: T.color.tinta3 }}>
        {dias == null ? "Sin fecha de promesa"
         : dias < 0 ? `La promesa vencio hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
         : dias === 0 ? "La promesa vence hoy"
         : `Faltan ${dias} ${dias === 1 ? "dia" : "dias"} para la promesa`}
       </span>
      </span>
      <ChevronRight size={15} style={{ color: T.color.placeholder, flexShrink: 0 }} />
     </button>
    ) : tr.principal && !tr.noAplica ? (
     <section style={{
      background: T.color.superficie, border: `1px solid ${T.color.borde}`,
      borderRadius: T.radio.tarjeta, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
     }}>
      <span style={{
       width: 40, height: 40, borderRadius: 20, flexShrink: 0,
       background: T.color.marcaAvatar, color: T.color.marca,
       display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
      }}>
       {esPaqueteria
        ? <Package size={18} />
        : (tr.principal || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase()}
      </span>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
       <span style={{
        fontSize: 14, fontWeight: 700,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
       }}>{tr.principal}</span>
       <span style={{ fontSize: 12, color: T.color.tinta4, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tr.detalle && <span style={{ fontFamily: T.fuente.mono }}>{tr.detalle}</span>}
        <span>{esPaqueteria ? "Paqueteria" : "Transporte propio"}</span>
       </span>
      </span>
      {conductor?.celular && (
       <a href={`tel:${conductor.celular}`} title="Llamar al conductor" style={{
        width: 40, height: 40, borderRadius: T.radio.control, flexShrink: 0,
        background: T.color.marcaSuave, color: T.color.marca,
        display: "grid", placeItems: "center", textDecoration: "none",
       }}><Phone size={17} /></a>
      )}
     </section>
    ) : null}

    <Bloque icono={MapPin} titulo="Entrega">
     <Fila etiqueta="Cliente" valor={pedido.cliente || "Sin cliente"} falta={!pedido.cliente} />
     <Fila
      etiqueta="Direccion"
      valor={pedido.direccion || "Sin direccion"}
      falta={!pedido.direccion}
      icono={pedido.direccion ? MapPin : null}
      onIcono={abrirMapa}
     />
     <Fila etiqueta="Ciudad" valor={pedido.ciudad_nombre || "Sin ciudad"} falta={!pedido.ciudad_nombre} />
     {pedido.fecha_real && (
      <Fila etiqueta="Entregado" valor={fechaCorta(pedido.fecha_real)} />
     )}
    </Bloque>

    <Bloque icono={Boxes} titulo="Carga">
     <Fila
      etiqueta="Cajas"
      valor={pedido.cajas ? String(pedido.cajas) : "Sin registrar"}
      falta={!pedido.cajas}
     />
     <Fila
      etiqueta="Factura"
      valor={pedido.factura || "Sin factura"}
      falta={!pedido.factura}
      mono={!!pedido.factura}
     />
     {pedido.notas && <Fila etiqueta="Notas" valor={pedido.notas} />}
    </Bloque>

    {esPaqueteria && (
     <Bloque icono={Truck} titulo="Transporte">
      <Fila
       etiqueta="Transportadora"
       valor={pedido.paqueteria || "Sin transportadora"}
       falta={!pedido.paqueteria}
      />
      <Fila
       etiqueta="Guia"
       valor={pedido.guia_paqueteria || "Sin guia"}
       falta={!pedido.guia_paqueteria}
       mono={!!pedido.guia_paqueteria}
      />
     </Bloque>
    )}

    <section style={{
     background: T.color.superficie, border: `1px solid ${T.color.borde}`,
     borderRadius: T.radio.tarjeta, padding: "4px 14px 14px",
     display: "flex", flexDirection: "column",
    }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 10px" }}>
      <History size={16} style={{ color: T.color.marca }} />
      <span style={{ fontWeight: 700, fontSize: 14 }}>Historial</span>
     </div>
     <div style={{ display: "flex", flexDirection: "column" }}>
      {eventos.map((e, i) => {
       const ultimo = i === eventos.length - 1;
       const color = e.mal ? T.color.malPunto : e.hecho ? T.color.marca : T.color.tenue;
       return (
        <div key={e.titulo} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 10 }}>
         <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{
           width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 4,
           background: e.hecho ? color : T.color.superficie,
           border: `2px solid ${color}`,
          }} />
          {!ultimo && <span style={{ width: 2, flex: 1, background: T.color.divisor }} />}
         </div>
         <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: ultimo ? 0 : 14 }}>
          <span style={{
           fontSize: 13, fontWeight: e.hecho ? 600 : 500,
           color: e.hecho ? T.color.tinta : T.color.tinta3,
          }}>{e.titulo}</span>
          <span style={{ fontSize: 12, color: T.color.tinta4 }}>{e.meta}</span>
         </div>
        </div>
       );
      })}
     </div>
    </section>
   </div>

   <footer style={{
    flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px",
    background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button onClick={onGuia} style={{
     display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
     height: 48, padding: "0 16px", background: T.color.superficie,
     border: `1px solid ${T.color.borde2}`, borderRadius: 12,
     fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: T.color.tinta2, cursor: "pointer",
    }}>
     <FileText size={16} style={{ color: T.color.tinta4 }} /> Guia
    </button>
    <button onClick={onEditar} style={{
     flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
     height: 48, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
     fontSize: 14, fontWeight: 600, color: "#fff",
     background: principal ? principal.fondo : T.color.marca,
    }}>
     {principal
      ? <><principal.icono size={16} /> {principal.texto}</>
      : <><AlertTriangle size={16} /> Ver todo el pedido</>}
    </button>
   </footer>
  </div>
 );
}

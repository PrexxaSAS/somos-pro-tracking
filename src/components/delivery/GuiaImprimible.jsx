import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Printer, Share2, X } from 'lucide-react';
import { T } from '../../design/tokens';
import { useEsMovil } from '../../design/responsive';
import { ESTADOS_PEDIDO } from '../../Constants';
import { dibujarQR } from '../../utils/qr';

// La guia se imprime y se firma a mano en el punto de entrega, asi que el
// documento es blanco y negro con un solo acento en el numero: los bloques se
// separan con lineas finas, no con tarjetas de color, para que salga limpio en
// una impresora laser. Lo que no se sabe todavia se deja como linea punteada
// para completar con boligrafo, no en rojo como si fuera un error.

const TINTA = "#17141f";

const fechaLarga = () => new Date().toLocaleDateString("es-CO", {
 day: "2-digit", month: "long", year: "numeric",
});

const fechaHora = () => `${fechaLarga()}, ${new Date().toLocaleTimeString("es-CO", {
 hour: "2-digit", minute: "2-digit", hour12: false,
})}`;

const fechaCorta = () => new Date().toLocaleDateString("es-CO", {
 day: "2-digit", month: "short", year: "numeric",
});

const rotulo = {
 fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
 textTransform: "uppercase", color: T.color.tinta3,
};

// El QR lleva a este mismo pedido dentro de la aplicacion. Se dibuja aqui y no
// se pide a un servicio externo para que la guia se pueda imprimir sin red.
function CodigoQR({ texto, lado }) {
 const lienzo = useRef(null);
 useEffect(() => {
  const c = lienzo.current;
  if (!c) return;
  const escala = 3;
  c.width = lado * escala;
  c.height = lado * escala;
  const ctx = c.getContext("2d");
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  dibujarQR(ctx, { texto, x: 0, y: 0, lado, color: TINTA });
 }, [texto, lado]);
 return <canvas ref={lienzo} style={{ width: lado, height: lado, display: "block" }} />;
}

// Una fila etiqueta/valor. Sin dato, una linea punteada para llenar a mano.
function Fila({ etiqueta, valor, mono, ancho = 72 }) {
 return (
  <div style={{
   display: "grid", gridTemplateColumns: `${ancho}px minmax(0,1fr)`,
   gap: 8, fontSize: 12, lineHeight: 1.4,
  }}>
   <span style={{ color: T.color.tinta3 }}>{etiqueta}</span>
   <span style={{
    fontWeight: 500, minWidth: 0,
    fontFamily: mono ? T.fuente.mono : "inherit",
    color: valor ? TINTA : "transparent",
    borderBottom: valor ? "none" : `1px dotted ${T.color.tenue}`,
   }}>{valor || " "}</span>
  </div>
 );
}

function Seccion({ titulo, principal, gris, children }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
   <span style={{ ...rotulo, paddingBottom: 6, borderBottom: `1px solid ${T.color.borde2}` }}>
    {titulo}
   </span>
   <span style={{
    fontSize: 15, fontWeight: 700, lineHeight: 1.3,
    color: gris ? T.color.placeholder : TINTA,
   }}>{principal}</span>
   {children}
  </div>
 );
}

export function GuiaImprimible({ pedido, conductores, ciudades, onClose }) {
 const esMovil = useEsMovil();
 // La copia para imprimir se cuelga del body con un portal, que solo existe en
 // el navegador: se monta despues del primer dibujo.
 const [montado, setMontado] = useState(false);
 useEffect(() => { setMontado(true); }, []);
 const cond = (conductores || []).find(c => String(c.id) === String(pedido.conductor_id));
 const ciudad = (ciudades || []).find(c => c.code === pedido.ciudad_codigo);
 const guia = pedido.guia_interna || pedido.id;

 // Enlace al pedido dentro de la aplicacion; SomosProTracking lo abre al
 // arrancar cuando la direccion trae ?pedido=.
 const enlace = typeof window !== "undefined"
  ? `${window.location.href.split("?")[0].replace(/#.*$/, "")}?pedido=${encodeURIComponent(pedido.id)}`
  : "";

 const esPaqueteria = pedido.tipo === "paqueteria";
 const transportista = esPaqueteria ? (pedido.paqueteria || "")
  : cond?.nombre || pedido.empresa_transporte || "";

 const cifras = [
  { k: "Cajas", v: pedido.cajas ? String(pedido.cajas) : "", grande: true },
  { k: "Factura", v: pedido.factura || "", mono: true },
  { k: "Fecha estimada", v: pedido.fecha_estimada || "" },
  { k: "Estado", v: ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado || "" },
 ];

 const documento = (paraImprimir = false) => (
  <div
   id={paraImprimir ? "guia-print-document" : "guia-screen-document"}
   className={paraImprimir ? "guia-print-document" : ""}
   style={{
    width: esMovil && !paraImprimir ? "100%" : 680,
    maxWidth: "100%", boxSizing: "border-box",
    background: "#fff", color: TINTA,
    padding: esMovil && !paraImprimir ? "20px 18px" : "40px 44px",
    borderRadius: esMovil && !paraImprimir ? 12 : 0,
    display: "flex", flexDirection: "column", gap: esMovil && !paraImprimir ? 18 : 22,
    boxShadow: paraImprimir ? "none"
     : "0 1px 3px rgba(0,0,0,.08), 0 8px 24px -12px rgba(0,0,0,.2)",
   }}>

   {/* Membrete */}
   <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 24, paddingBottom: 20, borderBottom: `2px solid ${TINTA}`,
    flexWrap: esMovil && !paraImprimir ? "wrap" : "nowrap",
   }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
     <span style={{
      width: 44, height: 44, borderRadius: 11, flexShrink: 0,
      background: T.color.marca, color: "#fff",
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13,
     }}>PRO</span>
     <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>Somos PRO Tracking</span>
      <span style={{ fontSize: 11, color: T.color.tinta3 }}>Sistema de gestion de transporte</span>
     </span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
     <span style={rotulo}>Guia de transporte N°</span>
     <span style={{
      fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em",
      color: T.color.marca, fontVariantNumeric: "tabular-nums",
     }}>{guia}</span>
     <span style={{ fontFamily: T.fuente.mono, fontSize: 11, color: T.color.tinta2 }}>
      Ref. {pedido.id} · {fechaCorta()}
     </span>
    </div>
   </div>

   {/* Destinatario, transportista y codigo */}
   <div style={{
    display: "grid", gap: 24,
    gridTemplateColumns: esMovil && !paraImprimir
     ? "minmax(0,1fr)"
     : "minmax(0,1fr) minmax(0,1fr) 150px",
   }}>
    <Seccion titulo="Destinatario" principal={pedido.cliente || "Sin cliente"} gris={!pedido.cliente}>
     <Fila etiqueta="Direccion" valor={pedido.direccion} />
     <Fila etiqueta="Ciudad" valor={ciudad?.name || pedido.ciudad_nombre} />
     <Fila etiqueta="DANE" valor={pedido.ciudad_codigo} mono />
     <Fila etiqueta="Factura" valor={pedido.factura} mono />
    </Seccion>

    <Seccion
     titulo="Transportista"
     principal={transportista || "Por asignar"}
     gris={!transportista}
    >
     {esPaqueteria ? (
      <>
       <Fila etiqueta="Guia" valor={pedido.guia_paqueteria} mono />
       <Fila etiqueta="Tipo" valor="Paqueteria" />
      </>
     ) : (
      <>
       <Fila etiqueta="Cedula" valor={cond?.cedula} mono />
       <Fila etiqueta="Placa" valor={pedido.placa || cond?.placa} mono />
       <Fila etiqueta="Telefono" valor={cond?.celular} mono />
       <Fila etiqueta="Empresa" valor={cond?.empresa || pedido.empresa_transporte} />
      </>
     )}
     <Fila etiqueta="Origen" valor={pedido.ciudad_origen_nombre} />
    </Seccion>

    <div style={{
     display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 4,
    }}>
     <div style={{
      border: `1px solid ${T.color.borde2}`, borderRadius: 8, padding: 8,
      display: "grid", placeItems: "center",
     }}>
      <CodigoQR texto={enlace} lado={104} />
     </div>
     <span style={{ fontSize: 10, color: T.color.tinta4, textAlign: "center", lineHeight: 1.4 }}>
      Escanea para ver el seguimiento en linea
     </span>
    </div>
   </div>

   {/* Lo que importa al recibir */}
   <div style={{
    display: "grid", overflow: "hidden",
    gridTemplateColumns: esMovil && !paraImprimir ? "1fr 1fr" : "repeat(4,minmax(0,1fr))",
    border: `1px solid ${T.color.borde2}`, borderRadius: 8,
   }}>
    {cifras.map((f, i) => (
     <div key={f.k} style={{
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0,
      borderLeft: i === 0 ? "none" : `1px solid ${T.color.borde2}`,
      borderTop: esMovil && !paraImprimir && i >= 2 ? `1px solid ${T.color.borde2}` : "none",
     }}>
      <span style={{ ...rotulo, letterSpacing: "0.06em" }}>{f.k}</span>
      <span style={{
       fontSize: f.grande ? 20 : 14, fontWeight: 700, letterSpacing: "-0.01em",
       fontFamily: f.mono ? T.fuente.mono : "inherit",
       color: f.v ? TINTA : T.color.tenue,
      }}>{f.v || "—"}</span>
     </div>
    ))}
   </div>

   <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={rotulo}>Observaciones</span>
    <div style={{
     minHeight: 44, fontSize: 12, lineHeight: 1.5,
     borderBottom: `1px dotted ${T.color.tenue}`,
    }}>{pedido.notas || ""}</div>
   </div>

   {/* Firmas: se llenan a mano al entregar */}
   <div style={{
    display: "grid", gap: 24, paddingTop: esMovil && !paraImprimir ? 0 : 26,
    gridTemplateColumns: esMovil && !paraImprimir ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))",
   }}>
    {["Entrega (despacho)", "Transporta (conductor)", "Recibe (cliente)"].map(s => (
     <div key={s} style={{
      display: "flex", flexDirection: "column", gap: 6,
      paddingTop: 8, borderTop: `1px solid ${TINTA}`,
      marginTop: esMovil && !paraImprimir ? 22 : 0,
     }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{s}</span>
      <span style={{ fontSize: 10, color: T.color.tinta4 }}>Nombre · Cedula · Fecha y hora</span>
     </div>
    ))}
   </div>

   <div style={{
    display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    paddingTop: 14, borderTop: `1px solid ${T.color.borde2}`,
    fontSize: 10, color: T.color.tinta4,
   }}>
    <span>Somos PRO Tracking · Generado el {fechaHora()}</span>
    <span style={{ fontFamily: T.fuente.mono }}>{guia} · 1/1</span>
   </div>
  </div>
 );

 const compartir = async () => {
  const texto = `Guia ${guia} · pedido ${pedido.id}`;
  if (navigator.share) {
   try { await navigator.share({ title: texto, text: texto, url: enlace }); return; } catch { /* cancelado */ }
  }
  try { await navigator.clipboard.writeText(enlace); } catch { /* sin permiso */ }
 };

 const botonCompartir = (
  <button onClick={compartir} style={{
   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
   height: esMovil ? 48 : 38, padding: "0 16px",
   background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
   borderRadius: esMovil ? 12 : T.radio.control, cursor: "pointer", fontFamily: "inherit",
   fontSize: esMovil ? 14 : 13, fontWeight: 600, color: T.color.tinta2, flexShrink: 0,
  }}>
   <Share2 size={16} style={{ color: T.color.tinta4 }} /> Compartir
  </button>
 );

 const botonImprimir = (
  <button onClick={() => window.print()} style={{
   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
   height: esMovil ? 48 : 38, padding: "0 16px", flex: esMovil ? 1 : "0 0 auto",
   background: T.color.marca, color: "#fff", border: "none",
   borderRadius: esMovil ? 12 : T.radio.control, cursor: "pointer", fontFamily: "inherit",
   fontSize: esMovil ? 14 : 13, fontWeight: 600,
  }}>
   <Printer size={16} /> Imprimir / PDF
  </button>
 );

 const estilosImpresion = (
  <style>{`
   .guia-print-portal{display:none}
   @media print{
    @page{size:letter;margin:0}
    html,body{
     width:auto!important;
     margin:0!important;
     padding:0!important;
     background:#fff!important;
    }
    body > *:not(.guia-print-portal){display:none!important}
    .guia-print-portal{display:block!important;background:#fff!important;width:100%!important}
    .guia-print-document{
     width:100%!important;
     max-width:190mm!important;
     margin:0 auto!important;
     /* Los margenes de la hoja, puestos por el documento: arriba algo mas,
        que es donde va el membrete. A los lados los da el centrado. */
     padding:14mm 0 12mm!important;
     box-sizing:border-box!important;
     border:none!important;
     border-radius:0!important;
     box-shadow:none!important;
     page-break-after:avoid!important;
     break-after:avoid!important;
    }
    /* Sin esto el navegador descarta los fondos y el escudo de la marca sale
       gris. Solo hay dos: el escudo y el codigo, que deben salir como son. */
    .guia-print-document, .guia-print-document *{
     -webkit-print-color-adjust:exact!important;
     print-color-adjust:exact!important;
    }
   }
  `}</style>
 );

 const copiaParaImprimir = montado && typeof document !== "undefined" && document.body
  ? createPortal(<div className="guia-print-portal">{documento(true)}</div>, document.body)
  : null;

 if (esMovil) {
  return (
   <>
    <div style={{
     position: "fixed", inset: 0, zIndex: 125, background: "#eeedf2",
     display: "flex", flexDirection: "column", color: TINTA,
    }}>
     <header style={{
      flexShrink: 0, padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
      paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
     }}>
      <button onClick={onClose} title="Volver" style={{
       width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
       background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
       borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
      }}><ChevronLeft size={18} /></button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
       <span style={{ fontSize: 14, fontWeight: 700 }}>Guia de transporte</span>
       <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{guia}</span>
      </div>
      <span style={{ width: 38, flexShrink: 0 }} />
     </header>

     <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0 16px 20px" }}>
      {documento()}
     </div>

     <footer style={{
      flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px",
      background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`,
      paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
     }}>
      {botonCompartir}
      {botonImprimir}
     </footer>
    </div>
    {copiaParaImprimir}
    {estilosImpresion}
   </>
  );
 }

 return (
  <>
   <div onClick={onClose} style={{
    position: "fixed", inset: 0, zIndex: 125, background: "rgba(23,20,31,.45)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
   }}>
    <div onClick={e => e.stopPropagation()} style={{
     width: 900, maxWidth: "100%", maxHeight: "92vh",
     background: T.color.superficie, borderRadius: 16, overflow: "hidden",
     display: "flex", flexDirection: "column",
     boxShadow: "0 20px 50px -20px rgba(23,20,31,.35), 0 0 0 1px rgba(0,0,0,.06)",
    }}>
     <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, padding: "18px 24px", borderBottom: `1px solid ${T.color.divisor}`, flexShrink: 0,
     }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
       <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Guia de transporte</span>
       <span style={{ fontFamily: T.fuente.mono, fontSize: 13, color: T.color.tinta3 }}>{guia}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
       {botonCompartir}
       {botonImprimir}
       <button onClick={onClose} title="Cerrar" style={{
        width: 32, height: 32, borderRadius: 8, marginLeft: 4,
        display: "grid", placeItems: "center", color: T.color.tinta4,
        border: "none", background: "transparent", cursor: "pointer",
       }}><X size={16} /></button>
      </div>
     </div>

     <div style={{
      background: "#eeedf2", padding: 28, overflowY: "auto",
      display: "flex", justifyContent: "center",
     }}>
      {documento()}
     </div>
    </div>
   </div>
   {copiaParaImprimir}
   {estilosImpresion}
  </>
 );
}

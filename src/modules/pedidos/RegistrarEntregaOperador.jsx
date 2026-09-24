import React, { useState, useRef } from 'react';
import { AlertTriangle, Camera, Check, Clock, ImagePlus, Image as Imagen, X } from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';
import { usePedidoEditable } from './usePedidoEditable';
import { leerFotos } from '../../utils/images';

// La entrega que registra el operador, no el conductor: los pedidos de Solo
// facturar y Cliente recoge nunca salen con nadie, asi que el soporte lo sube
// quien lo recibe por otro medio -- muchas veces una foto que el cliente mando
// por WhatsApp. Por eso aqui, a diferencia de la pantalla del conductor, se
// puede elegir la fecha real y anotar quien recibio: se registra despues del
// hecho y el dia puede no ser hoy.

const MAX_FOTOS = 3;

const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", gap: 8, fontSize: 15, fontFamily: "inherit", color: T.color.tinta,
 outline: "none",
};

const hoyISO = () => new Date().toISOString().split("T")[0];

export function RegistrarEntregaOperador({
 pedido, conductores, ciudades, promesas = [], setPedidos, showToast, onClose,
 canEdit, canBasicEdit = false, canAssign = false, canDeliver = false,
}) {
 const e = usePedidoEditable({
  pedido, conductores, ciudades, promesas, setPedidos, showToast, onClose,
  canEdit, canBasicEdit, canAssign, canDeliver,
 });

 const [fotos, setFotos] = useState([]);
 const [fecha, setFecha] = useState(hoyISO());
 const [recibio, setRecibio] = useState("");
 const [novedad, setNovedad] = useState(false);
 const [guardando, setGuardando] = useState(false);
 const camRef = useRef(null);
 const galeriaRef = useRef(null);

 const guardados = (pedido.soportes || []).length;
 const cupo = Math.max(0, MAX_FOTOS - guardados - fotos.length);

 const agregar = async (files, origen) => {
  const nuevas = await leerFotos(files, cupo);
  setFotos(prev => [...prev, ...nuevas.map(f => ({ ...f, origen }))].slice(0, MAX_FOTOS));
 };

 const confirmar = async () => {
  setGuardando(true);
  await e.registrarEntrega({
   fotos: fotos.map(f => ({ data: f.data, nombre: f.nombre })),
   conNovedad: novedad,
   fechaReal: fecha,
   recibe: { recibe_nombre: recibio.trim() },
  });
  setGuardando(false);
 };

 const modalidad = ESTADOS_PEDIDO[pedido.estado]?.label || pedido.estado;

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 122, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10,
    borderBottom: `1px solid ${T.color.borde}`,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <button onClick={onClose} title="Cerrar" style={{
     width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0,
     background: T.color.superficie, border: `1px solid ${T.color.borde2}`,
     borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2, padding: 0,
    }}><X size={18} /></button>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
     <span style={{ fontSize: 14, fontWeight: 700 }}>Registrar entrega</span>
     <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>
      {pedido.guia_interna || pedido.id}
     </span>
    </div>
    <span style={{ width: 38, flexShrink: 0 }} />
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
       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{pedido.cliente || "Sin cliente"}</span>
      <span style={{ fontSize: 12, color: T.color.tinta3, display: "flex", gap: 8, flexWrap: "wrap" }}>
       <span style={{ fontFamily: T.fuente.mono }}>{pedido.id}</span>
       {pedido.cajas ? <span>{pedido.cajas} cajas</span> : null}
       <span>{modalidad}</span>
      </span>
     </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
     <span style={{
      fontSize: 11, fontWeight: 600, color: T.color.placeholder,
      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
     }}>Entrega</span>
     <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
     <span style={{ fontSize: 11, fontWeight: 600, color: T.color.tinta4, whiteSpace: "nowrap" }}>
      Registro por operador
     </span>
    </div>

    <section style={{
     display: "flex", flexDirection: "column", gap: 10, padding: 14,
     background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta,
    }}>
     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>Fotos de soporte</span>
      <span style={{ fontSize: 12, color: T.color.tinta4 }}>{guardados + fotos.length} / {MAX_FOTOS}</span>
     </div>

     <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {fotos.map((f, i) => (
       <div key={i} style={{
        aspectRatio: "1", borderRadius: 12, overflow: "hidden", position: "relative",
        background: T.color.marcaAvatar,
       }}>
        <img src={f.data} alt={`Soporte ${i + 1}`}
         style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
        <button title="Quitar" onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
         style={{
          position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
          background: "rgba(23,20,31,.7)", color: "#fff", border: "none", cursor: "pointer",
          display: "grid", placeItems: "center", padding: 0,
         }}><X size={12} /></button>
        <span style={{
         position: "absolute", left: 6, bottom: 6, fontSize: 10, fontWeight: 600,
         color: "#fff", background: "rgba(23,20,31,.7)", padding: "2px 6px", borderRadius: 999,
        }}>{f.origen}</span>
       </div>
      ))}

      {guardados > 0 && fotos.length === 0 && (
       <div style={{
        aspectRatio: "1", borderRadius: 12, background: T.color.superficie2,
        border: `1px solid ${T.color.borde}`, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 4, color: T.color.tinta3,
       }}>
        <Imagen size={22} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>{guardados} guardado{guardados === 1 ? "" : "s"}</span>
       </div>
      )}

      {cupo > 0 && (
       <button onClick={() => camRef.current?.click()} style={{
        aspectRatio: "1", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
        border: `1.5px dashed ${T.color.tenue}`, background: T.color.superficie,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, color: T.color.marca,
       }}>
        <Camera size={24} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Camara</span>
       </button>
      )}

      {cupo > 0 && (
       <button onClick={() => galeriaRef.current?.click()} style={{
        aspectRatio: "1", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
        border: `1.5px dashed ${T.color.tenue}`, background: T.color.superficie,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, color: T.color.marca,
       }}>
        <ImagePlus size={24} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Galeria</span>
       </button>
      )}
     </div>

     <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
      onChange={async ev => { const f = ev.target.files; ev.target.value = ""; await agregar(f, "Camara"); }}/>
     <input ref={galeriaRef} type="file" accept="image/*" multiple style={{ display: "none" }}
      onChange={async ev => { const f = ev.target.files; ev.target.value = ""; await agregar(f, "Galeria"); }}/>

     <span style={{ fontSize: 12, color: T.color.tinta4, lineHeight: 1.45 }}>
      JPG o PNG · quedan registradas con la fecha de entrega que elijas.
     </span>
    </section>

    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
     <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>Fecha real de entrega</span>
     <div style={{ position: "relative" }}>
      <Clock size={16} style={{ position: "absolute", left: 14, top: 16, color: T.color.tinta4, pointerEvents: "none" }} />
      <input type="date" value={fecha} max={hoyISO()} onChange={ev => setFecha(ev.target.value)}
       style={{ ...entrada, paddingLeft: 40 }}/>
     </div>
     <span style={{ fontSize: 12, color: T.color.tinta4 }}>
      Es la fecha con la que el pedido cuenta para la promesa, no la de hoy.
     </span>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
     <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>
      Recibio <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span>
     </span>
     <input value={recibio} onChange={ev => setRecibio(ev.target.value)}
      placeholder="Nombre de quien recibe" style={entrada}/>
    </div>

    <button onClick={() => setNovedad(!novedad)} style={{
     display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
     borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
     background: novedad ? T.color.malSuave : T.color.superficie,
     border: `1px solid ${novedad ? T.color.malBorde : T.color.borde}`,
    }}>
     <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: novedad ? T.color.mal : T.color.tinta }}>
       Entregar con novedad
      </span>
      <span style={{ fontSize: 12, color: T.color.tinta3 }}>
       Marca si hubo faltantes, danos o rechazo parcial
      </span>
     </span>
     <span style={{
      width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center",
      background: novedad ? T.color.mal : "transparent",
      border: `2px solid ${novedad ? T.color.mal : T.color.tenue}`, color: "#fff",
     }}>{novedad && <Check size={13} />}</span>
    </button>

    {fotos.length > 0 && (
     <div style={{
      display: "flex", gap: 10, padding: "10px 12px", borderRadius: T.radio.control,
      background: T.color.ojoSuave, fontSize: 13, color: T.color.ojo, lineHeight: 1.45,
     }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>Al confirmar, el pedido queda <b>{novedad ? "con novedad" : "entregado"}</b> con fecha {fecha}.</span>
     </div>
    )}
   </div>

   <footer style={{
    flexShrink: 0, padding: "12px 16px", background: T.color.superficie,
    borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button onClick={confirmar} disabled={fotos.length === 0 || guardando} style={{
     display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
     width: "100%", height: 52, borderRadius: 12, border: "none", fontFamily: "inherit",
     fontSize: 15, fontWeight: 600, color: "#fff", background: T.color.bienPunto,
     cursor: (fotos.length === 0 || guardando) ? "not-allowed" : "pointer",
     opacity: (fotos.length === 0 || guardando) ? 0.5 : 1,
    }}>
     <Check size={18} /> {guardando ? "Registrando..." : "Confirmar entrega"}
    </button>
   </footer>
  </div>
 );
}

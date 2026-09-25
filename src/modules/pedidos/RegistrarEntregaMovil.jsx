import React, { useState, useEffect, useRef } from 'react';
import {
 AlertTriangle, ArrowRight, Camera, Check, CheckCircle2, Image as Imagen,
 MapPin, Plus, X,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { leerFotos } from '../../utils/images';

// La entrega se registra en el punto de entrega, de pie y con una mano: tres
// pasos cortos en vez de un formulario. Cada paso pide una sola cosa, el boton
// vive fijo abajo y nada obliga a desplazarse para continuar.

const MAX_FOTOS = 3;
// Dos pasos: la foto y la confirmacion. A quien recibe no se le piden datos --
// en la puerta, con el motor andando, nadie teclea un nombre y una cedula.
const PASOS = ["Evidencia", "Confirmar"];

const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", fontSize: 15, fontFamily: "inherit", color: T.color.tinta, outline: "none",
};

const hoyISO = () => new Date().toISOString().split("T")[0];

const horaCorta = () => {
 const d = new Date();
 return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Titulo({ children, ayuda }) {
 return (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
   <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{children}</span>
   {ayuda && <span style={{ fontSize: 14, color: T.color.tinta3, lineHeight: 1.45 }}>{ayuda}</span>}
  </div>
 );
}

export function RegistrarEntregaMovil({
 pedido, promesa, onConfirmar, onClose,
 // Por que paso abrir y con que novedad. En la aplicacion son siempre 0 y
 // false; existen para que la prueba pueda dibujar cada caso sin simular los
 // toques.
 pasoInicial = 0, novedadInicial = false,
}) {
 const [paso, setPaso] = useState(pasoInicial);
 // La novedad viaja con la confirmacion, no aparte: el conductor la marca, la
 // ve en el resumen y confirma una sola vez.
 const [novedad, setNovedad] = useState(novedadInicial);
 const [fotos, setFotos] = useState([]);
 const [observaciones, setObservaciones] = useState("");
 const [ubicacion, setUbicacion] = useState(null);
 const [permisoUbicacion, setPermisoUbicacion] = useState("pidiendo");
 const [guardando, setGuardando] = useState(false);
 const camRef = useRef(null);
 const galeriaRef = useRef(null);

 // La ubicacion se pide al abrir para que este lista al confirmar. Si el
 // conductor la niega, la entrega se registra igual: es un dato de apoyo, no
 // un requisito.
 useEffect(() => {
  if (!navigator.geolocation) { setPermisoUbicacion("no"); return; }
  let vivo = true;
  navigator.geolocation.getCurrentPosition(
   pos => { if (vivo) { setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setPermisoUbicacion("si"); } },
   () => { if (vivo) setPermisoUbicacion("no"); },
   { enableHighAccuracy: true, timeout: 10000 },
  );
  return () => { vivo = false; };
 }, []);

 const agregar = async (files) => {
  const nuevas = await leerFotos(files, MAX_FOTOS - fotos.length);
  const conHora = nuevas.map(f => ({ ...f, hora: horaCorta() }));
  setFotos(prev => [...prev, ...conHora].slice(0, MAX_FOTOS));
 };

 const quitar = (i) => setFotos(prev => prev.filter((_, j) => j !== i));

 const confirmar = async () => {
  setGuardando(true);
  await onConfirmar({
   fotos: fotos.map(f => ({ data: f.data, nombre: f.nombre })),
   conNovedad: novedad,
   entrega_observaciones: observaciones.trim(),
   entrega_lat: ubicacion?.lat ?? null,
   entrega_lng: ubicacion?.lng ?? null,
  });
  setGuardando(false);
 };

 const puedeSeguir = paso === 0 ? fotos.length > 0 : true;

 // Comparacion con la promesa, para que el conductor vea si llego a tiempo.
 const limite = promesa && pedido.fecha_creacion
  ? (() => {
   const d = new Date(`${String(pedido.fecha_creacion).slice(0, 10)}T12:00:00`);
   d.setDate(d.getDate() + Number(promesa.dias_plazo || 0));
   return d.toISOString().split("T")[0];
  })()
  : pedido.fecha_estimada || null;
 const aTiempo = limite ? hoyISO() <= limite : null;

 return (
  <div style={{
   position: "fixed", inset: 0, zIndex: 120, background: T.color.fondo,
   display: "flex", flexDirection: "column", color: T.color.tinta,
  }}>
   <header style={{
    flexShrink: 0, padding: "14px 16px 12px", display: "flex", flexDirection: "column", gap: 12,
    paddingTop: `calc(14px + env(safe-area-inset-top, 0px))`,
   }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
     <button onClick={paso === 0 ? onClose : () => setPaso(p => p - 1)}
      title={paso === 0 ? "Cerrar" : "Volver"} style={{
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
    </div>

    <div style={{ display: "flex", gap: 6 }}>
     {PASOS.map((p, i) => (
      <div key={p} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
       <span style={{
        height: 4, borderRadius: 2,
        background: i <= paso ? T.color.marca : T.color.borde2,
       }} />
       <span style={{
        fontSize: 11, fontWeight: 600,
        color: i <= paso ? T.color.marca : T.color.tinta4,
       }}>{p}</span>
      </div>
     ))}
    </div>
   </header>

   <div style={{
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
    display: "flex", flexDirection: "column", gap: 14, padding: "4px 16px 20px",
   }}>
    {paso === 0 && (
     <>
      <Titulo ayuda="Toma al menos una foto de la mercancia en el punto de entrega.">
       Fotos de la entrega
      </Titulo>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
       {fotos.map((f, i) => (
        <div key={i} style={{
         aspectRatio: "1", borderRadius: 12, overflow: "hidden", position: "relative",
         background: T.color.marcaAvatar,
        }}>
         <img src={f.data} alt={`Soporte ${i + 1}`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
         <button onClick={() => quitar(i)} title="Quitar foto" style={{
          position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
          background: "rgba(23,20,31,.7)", color: "#fff", border: "none", cursor: "pointer",
          display: "grid", placeItems: "center", padding: 0,
         }}><X size={12} /></button>
         <span style={{
          position: "absolute", left: 6, bottom: 6, fontSize: 10, fontWeight: 600,
          color: "#fff", background: "rgba(23,20,31,.7)", padding: "2px 6px", borderRadius: 999,
         }}>{f.hora}</span>
        </div>
       ))}

       {fotos.length < MAX_FOTOS && (
        <button onClick={() => camRef.current?.click()} style={{
         aspectRatio: "1", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
         border: `1.5px dashed ${fotos.length === 0 ? T.color.tenue : T.color.borde2}`,
         background: fotos.length === 0 ? T.color.superficie : T.color.hoverFila,
         display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
         gap: 6, color: fotos.length === 0 ? T.color.marca : T.color.placeholder,
        }}>
         {fotos.length === 0 ? <Camera size={26} /> : <Plus size={22} />}
         <span style={{ fontSize: 12, fontWeight: fotos.length === 0 ? 600 : 400 }}>
          {fotos.length === 0 ? "Tomar foto" : "Opcional"}
         </span>
        </button>
       )}

       {fotos.length === 0 && (
        <button onClick={() => galeriaRef.current?.click()} style={{
         aspectRatio: "1", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
         border: `1.5px dashed ${T.color.borde2}`, background: T.color.hoverFila,
         display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
         gap: 6, color: T.color.placeholder,
        }}>
         <Imagen size={22} />
         <span style={{ fontSize: 12 }}>Galeria</span>
        </button>
       )}
      </div>

      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
       onChange={ev => { agregar(ev.target.files); ev.target.value = ""; }}/>
      <input ref={galeriaRef} type="file" accept="image/*" multiple style={{ display: "none" }}
       onChange={ev => { agregar(ev.target.files); ev.target.value = ""; }}/>

      <span style={{ fontSize: 12, color: T.color.tinta4 }}>
       {fotos.length} de {MAX_FOTOS} fotos
       {permisoUbicacion === "si" ? " · la ubicacion se guarda con la entrega" : ""}
      </span>

      {/* Se dice lo que consta: que la ubicacion quedo registrada. La distancia
          al destino necesitaria geocodificar la direccion, que la app no hace. */}
      <div style={{
       display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
       background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: 12,
      }}>
       <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center",
        background: permisoUbicacion === "si" ? T.color.bienSuave : T.color.superficie2,
        color: permisoUbicacion === "si" ? T.color.bien : T.color.tinta4,
       }}><MapPin size={16} /></span>
       <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
         {permisoUbicacion === "si" ? "Ubicacion registrada"
          : permisoUbicacion === "no" ? "Sin ubicacion"
          : "Obteniendo ubicacion..."}
        </span>
        <span style={{ fontSize: 12, color: T.color.tinta3, overflow: "hidden", textOverflow: "ellipsis" }}>
         {permisoUbicacion === "no"
          ? "La entrega se registra igual"
          : [pedido.direccion, pedido.ciudad_nombre].filter(Boolean).join(", ") || "Sin direccion"}
        </span>
       </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
       <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>
        Observaciones <span style={{ color: T.color.placeholder, fontWeight: 400 }}>· opcional</span>
       </span>
       <textarea value={observaciones} onChange={ev => setObservaciones(ev.target.value)}
        placeholder="Ej. Se dejo en porteria con el vigilante" rows={3}
        style={{
         ...entrada, height: "auto", minHeight: 72, padding: 12,
         fontSize: 14, lineHeight: 1.5, resize: "vertical", alignItems: "stretch",
        }}/>
      </div>

      <button onClick={() => setNovedad(!novedad)} style={{
       display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
       minHeight: 44, padding: "0 12px", borderRadius: T.radio.control, cursor: "pointer",
       fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: T.color.mal,
       background: novedad ? T.color.malSuave : "transparent",
       border: `1px solid ${novedad ? T.color.malBorde : "transparent"}`,
      }}>
       <AlertTriangle size={16} />
       {novedad ? "Se reportara con novedad · quitar" : "No se pudo entregar · reportar novedad"}
      </button>
     </>
    )}

    {paso === 1 && (
     <>
      <Titulo ayuda={novedad
       ? "Al confirmar, el pedido queda Con Novedad."
       : "Al confirmar, el pedido pasa a Entregado."}>Revisa y confirma</Titulo>

      <section style={{
       background: T.color.superficie, border: `1px solid ${T.color.borde}`,
       borderRadius: T.radio.tarjeta, padding: "4px 14px",
       display: "flex", flexDirection: "column",
      }}>
       {[
        ["Observaciones", observaciones || "Sin observaciones", 0],
        ["Estado", novedad ? "Con novedad" : "Entregado", 0],
       ].map(([k, v, volver]) => (
        <div key={k} style={{
         display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "6px 0",
         borderTop: `1px solid ${T.color.divisor}`, fontSize: 14,
        }}>
         <span style={{ width: 96, flexShrink: 0, color: T.color.tinta3, fontSize: 12 }}>{k}</span>
         <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{v}</span>
         <button onClick={() => setPaso(volver)} style={{
          border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
          fontSize: 12, fontWeight: 600, color: T.color.marca, padding: 0, flexShrink: 0,
         }}>Editar</button>
        </div>
       ))}

       <div style={{
        display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "6px 0",
        borderTop: `1px solid ${T.color.divisor}`, fontSize: 14,
       }}>
        <span style={{ width: 96, flexShrink: 0, color: T.color.tinta3, fontSize: 12 }}>Evidencia</span>
        <div style={{ flex: 1, display: "flex", gap: 6, minWidth: 0 }}>
         {fotos.map((f, i) => (
          <img key={i} src={f.data} alt={`Soporte ${i + 1}`}
           style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", display: "block" }}/>
         ))}
        </div>
        <button onClick={() => setPaso(0)} style={{
         border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
         fontSize: 12, fontWeight: 600, color: T.color.marca, padding: 0, flexShrink: 0,
        }}>Editar</button>
       </div>
      </section>

      {aTiempo !== null && (
       <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12,
        background: aTiempo ? T.color.bienSuave : T.color.malSuave,
        color: aTiempo ? T.color.bien : T.color.mal,
       }}>
        {aTiempo ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 13, lineHeight: 1.4 }}>
         <b>{aTiempo ? "Dentro de la promesa." : "Fuera de la promesa."}</b>{" "}
         Fecha prometida {limite}, entrega hoy {hoyISO()} {horaCorta()}.
        </span>
       </div>
      )}
     </>
    )}
   </div>

   <footer style={{
    flexShrink: 0, padding: "12px 16px", background: T.color.superficie,
    borderTop: `1px solid ${T.color.borde}`,
    paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
   }}>
    <button
     onClick={paso === 1 ? confirmar : () => setPaso(p => p + 1)}
     disabled={!puedeSeguir || guardando}
     style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      width: "100%", height: 52, borderRadius: 12, border: "none", fontFamily: "inherit",
      fontSize: 15, fontWeight: 600, color: "#fff",
      background: paso === 1 ? T.color.bienPunto : T.color.marca,
      cursor: (!puedeSeguir || guardando) ? "not-allowed" : "pointer",
      opacity: (!puedeSeguir || guardando) ? 0.5 : 1,
     }}>
     {paso === 1
      ? <><Check size={18} /> {guardando ? "Registrando..." : "Confirmar entrega"}</>
      : <>Continuar <ArrowRight size={17} /></>}
    </button>
   </footer>
  </div>
 );
}

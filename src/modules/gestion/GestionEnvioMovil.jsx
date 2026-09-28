import React, { useState } from 'react';
import {
 AlertTriangle, Check, ChevronDown, MessageSquare, PackageCheck, Search, Undo2, UserPlus, X,
} from 'lucide-react';
import { T } from '../../design/tokens';
import { ESTADOS_PEDIDO } from '../../Constants';
import { HojaConductores } from '../pedidos/EditarPedidoMovil';
import { fechaCorta } from '../pedidos/DetallePedidoMovil';

// Disenio 19: admin y operador gestionan una devolucion o una recogida desde el
// celular. Pantalla completa, no modal: cabecera fija con cerrar, titulo y
// numero; cuerpo con desplazamiento; pie fijo con dos acciones, "Guardar
// asignacion" (primaria) y "Completada" (secundaria en verde). Cancelar es la X.
//
// El resumen va en filas etiqueta/valor y no en la grilla de tres columnas del
// escritorio: en 393px los valores largos se partian. El motivo o las
// observaciones van como nota ambar dentro de la tarjeta.
//
// Esta pantalla no decide nada: llama a los mismos onAsignar y onEntregado que
// el modal de escritorio, con los mismos datos. Lo que cambia es como se ve.

const TIPOS = [
 { id: "propio", label: "Propio" },
 { id: "empresa_transporte", label: "Empresa" },
 { id: "paqueteria", label: "Paqueteria" },
];

const entrada = {
 display: "flex", alignItems: "center", height: 48, width: "100%", boxSizing: "border-box",
 border: `1px solid ${T.color.borde2}`, borderRadius: 12, background: T.color.superficie,
 padding: "0 14px", gap: 8, fontSize: 15, fontFamily: "inherit", color: T.color.tinta, outline: "none",
};

const iniciales = (nombre) => (nombre || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

function Fila({ etiqueta, valor, falta, mono }) {
 return (
  <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "6px 0", borderTop: `1px solid ${T.color.divisor}`, fontSize: 13 }}>
   <span style={{ width: 96, flexShrink: 0, color: T.color.tinta3, fontSize: 12, paddingTop: 1 }}>{etiqueta}</span>
   <span style={{
    flex: 1, minWidth: 0, lineHeight: 1.4, color: falta ? T.color.mal : T.color.tinta,
    fontWeight: falta ? 600 : 500, fontFamily: mono ? T.fuente.mono : "inherit",
   }}>{valor}</span>
  </div>
 );
}

function Etiqueta({ children }) {
 return <span style={{ fontSize: 13, fontWeight: 600, color: T.color.tinta2 }}>{children}</span>;
}

export function GestionEnvioMovil({
 tipo, item, conductores = [], transportistas = [], paqueterias = [], pedidos = [],
 onClose, onAsignar, onEntregado, showToast, canEdit = true,
}) {
 const esDev = tipo === "devolucion";
 const inicialTipo = item.tipo || (item.paqueteria ? "paqueteria" : "propio");
 const [tipoEnvio, setTipoEnvio] = useState(inicialTipo);
 const [empresa, setEmpresa] = useState(item.nit_proveedor || "");
 const [condId, setCondId] = useState(item.conductor_id || "");
 const [paqSel, setPaqSel] = useState(item.paqueteria || "");
 const [guiaPaq, setGuiaPaq] = useState(item.guia_paqueteria || "");
 const [novedad, setNovedad] = useState(item.novedad || false);
 const [hoja, setHoja] = useState(false);
 const [guardando, setGuardando] = useState(false);

 const conductoresActivos = conductores.filter(c => c.activo !== false);
 // Con empresa transportista, solo SUS conductores. Igual que en escritorio.
 const conductoresElegibles = tipoEnvio === "empresa_transporte"
  ? (empresa ? conductoresActivos.filter(c => c.nit_proveedor === empresa) : [])
  : conductoresActivos;
 const cond = conductores.find(c => String(c.id) === String(condId));
 const esPaq = tipoEnvio === "paqueteria";
 const cerrado = ["entregado", "novedad"].includes(item.estado);

 // El tipo "mensajeria" existe en escritorio; aqui solo se ofrece si el envio
 // ya venia asi, para no perderlo sin quitarle un segmento a los demas.
 const tipos = inicialTipo === "mensajeria" ? [...TIPOS, { id: "mensajeria", label: "Mensajeria" }] : TIPOS;

 const cambiarTipo = (valor) => {
  setTipoEnvio(valor);
  if (valor === "paqueteria") { setEmpresa(""); setCondId(""); }
  else { setPaqSel(""); setGuiaPaq(""); if (valor !== "empresa_transporte") setEmpresa(""); }
 };

 const cambio = tipoEnvio !== inicialTipo
  || String(condId || "") !== String(item.conductor_id || "")
  || (paqSel || "") !== (item.paqueteria || "")
  || (guiaPaq || "") !== (item.guia_paqueteria || "")
  || Boolean(novedad) !== Boolean(item.novedad);

 const guardar = async () => {
  if (esPaq && !paqSel) { showToast("Selecciona la paqueteria", "error"); return; }
  setGuardando(true);
  await onAsignar(item.id, {
   tipo: tipoEnvio,
   conductorId: esPaq ? "" : condId,
   paqueteria: esPaq ? paqSel : "",
   guiaPaqueteria: esPaq ? guiaPaq : "",
   novedad,
  });
  setGuardando(false);
  showToast(esDev ? "Devolucion actualizada" : "Recogida actualizada", "success");
  onClose();
 };

 const completar = () => {
 const que = esDev ? "la devolucion" : "la recogida";
  if (!window.confirm(novedad ? `¿Cerrar ${que} con novedad?` : `¿Marcar ${que} como completada?`)) return;
  onEntregado(item.id, novedad, condId);
  showToast(novedad ? "Marcada con novedad" : (esDev ? "Devolucion completada" : "Recogida completada"), "success");
  onClose();
 };

 const punto = T.estado[item.estado] || T.color.neutroPunto;
 const chip = item.estado === "en_transito"
  ? { bg: T.color.marcaSuave, color: T.color.marca }
  : item.estado === "novedad" ? { bg: T.color.malSuave, color: T.color.mal }
  : item.estado === "entregado" ? { bg: T.color.bienSuave, color: T.color.bien }
  : { bg: T.color.superficie3, color: T.color.tinta2 };

 const faltaConductor = canEdit && !cerrado && !esPaq && !cond;
 const Icono = esDev ? Undo2 : PackageCheck;
 const titulo = esDev
  ? (item.factura ? `Factura ${item.factura}` : item.guia)
  : [item.ciudad_recogida_nombre, item.ciudad_entrega_nombre].filter(Boolean).join(" → ") || item.guia;
 const filas = esDev ? [
  ["Pedido", item.pedido_ref || "Sin registrar", !item.pedido_ref, true],
  ["Carga", `${item.unidades || 0} uds · ${item.peso_kg || 0} kg`],
  ["Ciudad", item.ciudad_nombre || "Sin definir", !item.ciudad_nombre],
  ["Recoge en", item.dir_recogida || "Sin registrar", !item.dir_recogida],
 ] : [
  ["Recoge en", [item.dir_recogida, item.ciudad_recogida_nombre].filter(Boolean).join(" · ") || "Sin registrar", !item.dir_recogida],
  ["Entrega en", [item.dir_entrega, item.ciudad_entrega_nombre].filter(Boolean).join(" · ") || "Sin registrar", !item.dir_entrega],
  ["Carga", `${item.unidades || 0} uds · ${item.peso_kg || 0} kg`],
  ["Volumen", `${item.volumen_m3 || 0} m³`],
  ["Solicitada", [fechaCorta(item.fecha_creacion), item.solicitado_por].filter(Boolean).join(" · ") || "Sin registrar"],
 ];
 const nota = esDev ? item.motivo : item.observaciones;

 return (
  <div style={{ position: "fixed", inset: 0, zIndex: 118, background: T.color.fondo, display: "flex", flexDirection: "column", color: T.color.tinta }}>
   <header style={{ flexShrink: 0, padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10, paddingTop: `calc(14px + env(safe-area-inset-top, 0px))` }}>
    <button onClick={onClose} title="Cerrar" style={{
     width: 38, height: 38, display: "grid", placeItems: "center", flexShrink: 0, padding: 0,
     background: T.color.superficie, border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, cursor: "pointer", color: T.color.tinta2,
    }}><X size={18} /></button>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
     <span style={{ fontSize: 14, fontWeight: 600 }}>{esDev ? "Devolucion" : "Recogida"}</span>
     <span style={{ fontSize: 11, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{item.guia}</span>
    </div>
    <span style={{ width: 38, flexShrink: 0 }} />
   </header>

   <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: "0 16px 20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 2px", flexWrap: "wrap" }}>
     <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: T.radio.pastilla, background: chip.bg, color: chip.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: punto }} />
      {ESTADOS_PEDIDO[item.estado]?.label || item.estado}
     </span>
     <span style={{ fontSize: 12, color: T.color.tinta3 }}>
      {canEdit && !cerrado ? `Asigna transporte o cierra ${esDev ? "la devolucion" : "la recogida"}` : `Detalle de ${esDev ? "la devolucion" : "la recogida"}`}
     </span>
    </div>

    <section style={{ background: T.color.superficie, border: `1px solid ${T.color.borde}`, borderRadius: T.radio.tarjeta, padding: "4px 14px 14px", display: "flex", flexDirection: "column" }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 6px" }}>
      <Icono size={16} style={{ color: T.color.marca, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titulo}</span>
     </div>
     {filas.map(([k, v, falta, mono]) => <Fila key={k} etiqueta={k} valor={v} falta={falta} mono={mono} />)}
     {nota && (
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", marginTop: 8, borderRadius: 10, background: T.color.ojoSuave, fontSize: 12, color: T.color.ojo, lineHeight: 1.45 }}>
       {esDev ? <AlertTriangle size={14} style={{ color: T.color.ojoPunto, flexShrink: 0 }} /> : <MessageSquare size={14} style={{ color: T.color.ojoPunto, flexShrink: 0 }} />}
       <span><b style={{ fontWeight: 600 }}>{esDev ? "Motivo:" : "Observaciones:"}</b> {nota}</span>
      </div>
     )}
    </section>

    {canEdit && !cerrado && (
     <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
       <span style={{ ...T.texto.seccion, color: T.color.placeholder, whiteSpace: "nowrap" }}>Transporte</span>
       <div style={{ flex: 1, height: 1, background: T.color.borde2 }} />
      </div>

      <section style={{
       display: "flex", flexDirection: "column", gap: 10, padding: 14, background: T.color.superficie,
       border: `1px solid ${faltaConductor ? T.color.malBorde : T.color.borde}`, borderRadius: T.radio.tarjeta,
      }}>
       {faltaConductor && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
         <div style={{ width: 30, height: 30, borderRadius: 8, background: T.color.malSuave, color: T.color.malPunto, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <UserPlus size={15} />
         </div>
         <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Sin conductor asignado</span>
          <span style={{ fontSize: 12, color: T.color.tinta3 }}>Requerido para pasar a "En transito"</span>
         </div>
        </div>
       )}

       <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Etiqueta>Tipo de transporte</Etiqueta>
        <div style={{ display: "flex", background: T.color.superficie2, border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control, padding: 3 }}>
         {tipos.map(t => {
          const activo = tipoEnvio === t.id;
          return (
           <button key={t.id} onClick={() => cambiarTipo(t.id)} style={{
            flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 7, border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: activo ? 600 : 500,
            background: activo ? T.color.superficie : "transparent", color: activo ? T.color.tinta : T.color.tinta3,
            boxShadow: activo ? "0 1px 2px rgba(0,0,0,.08)" : "none",
           }}>{t.label}</button>
          );
         })}
        </div>
       </div>

       {esPaq ? (
        <>
         <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Etiqueta>Paqueteria</Etiqueta>
          <span style={{ position: "relative", display: "flex" }}>
           <select value={paqSel} onChange={e => setPaqSel(e.target.value)} style={{ ...entrada, appearance: "none", WebkitAppearance: "none", paddingRight: 40, color: paqSel ? T.color.tinta : T.color.placeholder }}>
            <option value="">Seleccionar paqueteria</option>
            {(paqueterias || []).filter(x => typeof x === "string" && x).map(x => <option key={x} value={x}>{x}</option>)}
           </select>
           <ChevronDown size={15} style={{ position: "absolute", right: 12, top: 16, color: T.color.tinta4, pointerEvents: "none" }} />
          </span>
         </label>
         <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Etiqueta>No. de guia</Etiqueta>
          <input value={guiaPaq} onChange={e => setGuiaPaq(e.target.value)} placeholder="SRV-2026-0001" style={{ ...entrada, fontFamily: T.fuente.mono }} />
         </label>
        </>
       ) : (
        <>
         {tipoEnvio === "empresa_transporte" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
           <Etiqueta>Empresa transportista</Etiqueta>
           <span style={{ position: "relative", display: "flex" }}>
            <select value={empresa} onChange={e => { setEmpresa(e.target.value); setCondId(""); }} style={{ ...entrada, appearance: "none", WebkitAppearance: "none", paddingRight: 40, color: empresa ? T.color.tinta : T.color.placeholder }}>
             <option value="">Seleccionar la empresa</option>
             {(transportistas || []).filter(e => e?.nit).map(e => <option key={e.nit} value={e.nit}>{e.nombre || e.empresa || e.nit}</option>)}
            </select>
            <ChevronDown size={15} style={{ position: "absolute", right: 12, top: 16, color: T.color.tinta4, pointerEvents: "none" }} />
           </span>
           {empresa && conductoresElegibles.length === 0 && (
            <span style={{ fontSize: 12, color: T.color.tinta4 }}>Esa empresa no tiene conductores activos registrados.</span>
           )}
          </label>
         )}

         {cond ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
           <Etiqueta>Conductor</Etiqueta>
           <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 12px", border: `1px solid ${T.color.borde2}`, borderRadius: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: T.color.marcaAvatar, color: T.color.marca, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{iniciales(cond.nombre)}</span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
             <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cond.nombre}</span>
             <span style={{ fontSize: 12, color: T.color.tinta3, fontFamily: T.fuente.mono }}>{cond.placa || "Sin placa"}</span>
            </div>
            <button onClick={() => setHoja(true)} disabled={tipoEnvio === "empresa_transporte" && !empresa} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: T.color.marca }}>Cambiar</button>
           </div>
          </div>
         ) : (
          <button onClick={() => setHoja(true)} disabled={tipoEnvio === "empresa_transporte" && !empresa} style={{
           display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, border: "none",
           background: T.color.marca, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
           cursor: tipoEnvio === "empresa_transporte" && !empresa ? "not-allowed" : "pointer",
           opacity: tipoEnvio === "empresa_transporte" && !empresa ? 0.5 : 1,
          }}><Search size={16} /> Elegir conductor</button>
         )}
        </>
       )}
      </section>

      <button onClick={() => setNovedad(!novedad)} style={{
       display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "0 14px", textAlign: "left",
       background: T.color.superficie, border: `1px solid ${novedad ? T.color.malBorde : T.color.borde}`, borderRadius: 12,
       cursor: "pointer", fontFamily: "inherit",
      }}>
       <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", border: novedad ? "none" : `2px solid ${T.color.tenue}`, background: novedad ? T.color.mal : T.color.superficie, color: "#fff" }}>
        {novedad && <Check size={13} />}
       </span>
       <span style={{ fontSize: 13, color: novedad ? T.color.tinta : T.color.tinta2, fontWeight: novedad ? 600 : 400 }}>Marcar con novedad</span>
      </button>
     </>
    )}
   </div>

   <footer style={{ flexShrink: 0, display: "flex", gap: 10, padding: "12px 16px", background: T.color.superficie, borderTop: `1px solid ${T.color.borde}`, paddingBottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}>
    {canEdit && !cerrado ? (
     <>
      <button onClick={completar} style={{
       display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 48, padding: "0 14px", borderRadius: 12,
       background: T.color.superficie, border: `1px solid ${T.color.bienSuave}`, color: T.color.bien,
       fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0,
      }}><Check size={16} /> Completada</button>
      <button onClick={guardar} disabled={!cambio || guardando} style={{
       flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, border: "none",
       background: T.color.marca, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
       cursor: !cambio || guardando ? "not-allowed" : "pointer", opacity: !cambio || guardando ? 0.5 : 1,
      }}>{guardando ? "Guardando..." : "Guardar asignacion"}</button>
     </>
    ) : (
     <button onClick={onClose} style={{
      flex: 1, height: 48, borderRadius: 12, border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
      color: T.color.tinta2, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
     }}>Cerrar</button>
    )}
   </footer>

   {hoja && (
    <HojaConductores
     conductores={conductoresElegibles} pedidos={pedidos}
     tipo={tipoEnvio} seleccionado={condId}
     onElegir={id => setCondId(id)} onClose={() => setHoja(false)}
    />
   )}
  </div>
 );
}

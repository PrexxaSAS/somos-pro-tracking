import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
 ChevronLeft, ChevronRight, Download, MoreHorizontal, Plus, Search, Truck,
} from 'lucide-react';
import { supabase } from '../../supabase';
import { T, tarjeta } from '../../design/tokens';
import { Modal, Field, Btn } from '../../Subcomponentes';
import { descargarCSV } from '../../utils/files';
import { mensajeErrorFuncion } from '../../utils/errors';

const POR_PAGINA = 10;

const iniciales = (nombre) => (nombre || "?")
 .trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

// Orden alfabetico con las reglas del espanol: la enie va despues de la n y los
// acentos no cambian el lugar de la palabra.
const porNombre = (a, b) =>
 (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });

function Chip({ children, color = T.color.tinta2, fondo = T.color.superficie2, mono = false }) {
 return (
  <span style={{
   display: "inline-flex", alignItems: "center", justifyContent: "center",
   minWidth: 26, padding: "3px 9px", borderRadius: T.radio.chico,
   background: fondo, color, fontSize: 12, fontWeight: 700,
   fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
   letterSpacing: mono ? "0.02em" : 0,
  }}>{children}</span>
 );
}

function MenuFila({ opciones }) {
 const [abierto, setAbierto] = useState(false);
 const ref = useRef(null);
 useEffect(() => {
  if (!abierto) return;
  const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
  document.addEventListener("mousedown", fuera);
  return () => document.removeEventListener("mousedown", fuera);
 }, [abierto]);

 return (
  <div ref={ref} style={{ position: "relative", display: "flex", justifyContent: "flex-end" }}>
   <button onClick={() => setAbierto(!abierto)} title="Acciones" style={{
    border: "none", background: "transparent", cursor: "pointer",
    color: T.color.tinta3, padding: 6, borderRadius: T.radio.chico,
    display: "grid", placeItems: "center",
   }}><MoreHorizontal size={17} /></button>
   {abierto && (
    <div style={{
     position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 30, minWidth: 190,
     ...tarjeta, boxShadow: T.sombra.flotante, padding: 6,
    }}>
     {opciones.map(o => (
      <button key={o.texto} onClick={() => { setAbierto(false); o.accion(); }} disabled={o.inactivo} style={{
       width: "100%", textAlign: "left", border: "none", background: "transparent",
       cursor: o.inactivo ? "not-allowed" : "pointer", fontFamily: "inherit",
       padding: "8px 10px", borderRadius: T.radio.chico, fontSize: 13,
       color: o.inactivo ? T.color.tinta3 : T.color.tinta2, opacity: o.inactivo ? 0.6 : 1,
      }}>{o.texto}</button>
     ))}
    </div>
   )}
  </div>
 );
}

export function Conductores({ conductores, pedidos, showToast, transportistas = [], recargar, onVerPedidos }) {
 const [modal, setModal] = useState(false);
 const [guardando, setGuardando] = useState(false);
 const [busq, setBusq] = useState("");
 const [empresa, setEmpresa] = useState("");
 const [vista, setVista] = useState("todos");
 const [pagina, setPagina] = useState(1);

 const vacio = { nombre: "", cedula: "", placa: "", celular: "", nit_proveedor: "", empresa: "", user_login: "", pass_login: "" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p => ({ ...p, [k]: v }));

 // Cada conductor con sus conteos de pedidos, ya ordenados alfabeticamente.
 const filas = useMemo(() => {
  const asignadosPorId = {}, transitoPorId = {};
  (pedidos || []).forEach(p => {
   const id = String(p.conductor_id || "");
   if (!id) return;
   asignadosPorId[id] = (asignadosPorId[id] || 0) + 1;
   if (p.estado === "en_transito") transitoPorId[id] = (transitoPorId[id] || 0) + 1;
  });
  return conductores
   .filter(c => c.activo !== false)
   .map(c => ({
    ...c,
    asignados: asignadosPorId[String(c.id)] || 0,
    transito: transitoPorId[String(c.id)] || 0,
    transportista: (transportistas || []).find(t => t.nit === c.nit_proveedor)?.nombre || c.empresa || "",
   }))
   .sort(porNombre);
 }, [conductores, pedidos, transportistas]);

 const filtradas = useMemo(() => {
  const q = busq.trim().toLowerCase();
  return filas.filter(c => {
   const okBusq = !q ||
    (c.nombre || "").toLowerCase().includes(q) ||
    (c.cedula || "").toLowerCase().includes(q) ||
    (c.placa || "").toLowerCase().includes(q);
   const okEmpresa = !empresa || c.nit_proveedor === empresa;
   const okVista = vista === "todos"
    || (vista === "ruta" && c.transito > 0)
    || (vista === "libres" && c.transito === 0);
   return okBusq && okEmpresa && okVista;
  });
 }, [filas, busq, empresa, vista]);

 useEffect(() => { setPagina(1); }, [busq, empresa, vista]);

 const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
 const visibles = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

 const kpis = [
  { label: "Conductores", valor: filas.length, color: T.color.tinta3 },
  { label: "En ruta", valor: filas.filter(c => c.transito > 0).length, color: T.color.marca, destacado: true },
  { label: "Pedidos asignados", valor: filas.reduce((s, c) => s + c.asignados, 0), color: T.color.bien },
  { label: "En transito", valor: filas.reduce((s, c) => s + c.transito, 0), color: T.color.ojo },
 ];

 const exportar = () => {
  const escapar = (v) => {
   const t = String(v ?? "");
   return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filasCsv = filtradas.map(c => [
   c.nombre, c.cedula, c.placa, c.transportista, c.celular, c.asignados, c.transito,
  ].map(escapar).join(","));
  descargarCSV(
   `conductores_${new Date().toISOString().slice(0, 10)}.csv`,
   "nombre,cedula,placa,transportista,celular,asignados,en_transito",
   filasCsv.join("\n"),
  );
 };

 const copiar = async (valor, que) => {
  if (!valor) { showToast(`Este conductor no tiene ${que} registrado`, "error"); return; }
  try {
   await navigator.clipboard.writeText(valor);
   showToast(`${que} copiado: ${valor}`, "success");
  } catch { showToast("El navegador no permitio copiar", "error"); }
 };

 const guardar = async () => {
  if (!form.nombre.trim() || !form.cedula.trim() || !form.placa.trim()) {
   showToast("Nombre, cedula y placa son obligatorios", "error"); return;
  }
  if (!form.user_login.trim() || !form.pass_login.trim()) {
   showToast("Usuario y contrasena son obligatorios", "error"); return;
  }
  if (form.nit_proveedor.trim()) {
   const existe = (transportistas || []).find(t => t.nit === form.nit_proveedor.trim());
   if (!existe) { showToast("El NIT no corresponde a ninguna empresa registrada", "error"); return; }
  }
  setGuardando(true);
  try {
   const { data, error } = await supabase.functions.invoke('create-system-user', {
    body: {
     type: 'conductor',
     nombre: form.nombre.trim(),
     cedula: form.cedula.trim(),
     placa: form.placa.trim(),
     celular: form.celular.trim(),
     user_login: form.user_login.trim(),
     pass_login: form.pass_login.trim(),
     nit_proveedor: form.nit_proveedor.trim(),
     empresa: form.empresa.trim(),
    },
   });
   if (error) { showToast(await mensajeErrorFuncion(error, "el acceso del conductor"), "error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: " + data.error, "error"); setGuardando(false); return; }
   setModal(false); setForm(vacio);
   showToast("Conductor y usuario creados", "success");
   if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  } catch (e) {
   showToast("Error inesperado: " + e.message, "error");
  }
  setGuardando(false);
 };

 const th = {
  ...T.texto.seccion, color: T.color.tinta3, textAlign: "left",
  padding: "12px 16px", whiteSpace: "nowrap", fontSize: 10.5,
 };
 const td = { padding: "12px 16px", fontSize: 13.5, color: T.color.tinta2, verticalAlign: "middle" };

 return (
  <div style={{ minHeight: "100%", background: T.color.fondo, margin: "-28px -24px", padding: "24px 28px 40px", color: T.color.tinta }}>
   <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
     <div>
      <h1 style={{ margin: 0, ...T.texto.titulo }}>Conductores</h1>
      <p style={{ margin: "4px 0 0", color: T.color.tinta3, fontSize: 13.5 }}>
       Gestion de conductores, placas y disponibilidad operativa
      </p>
     </div>
     <div style={{ display: "flex", gap: 10 }}>
      <button onClick={exportar} style={{
       display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px",
       border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
       background: T.color.superficie, cursor: "pointer", fontFamily: "inherit",
       fontSize: 13.5, fontWeight: 600, color: T.color.tinta,
      }}><Download size={15} /> Exportar</button>
      <button onClick={() => setModal(true)} style={{
       display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px",
       border: "none", borderRadius: T.radio.control, background: T.color.marca,
       cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "#fff",
      }}><Plus size={16} /> Registrar conductor</button>
     </div>
    </header>

    <section style={{ ...tarjeta, display: "grid", gridTemplateColumns: `repeat(${kpis.length},1fr)` }}>
     {kpis.map((k, i) => (
      <div key={k.label} style={{ padding: "18px 22px", borderLeft: i === 0 ? "none" : `1px solid ${T.color.borde}` }}>
       <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: k.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: T.color.tinta2, whiteSpace: "nowrap" }}>{k.label}</span>
       </div>
       <div style={{ ...T.texto.cifra, color: k.destacado ? T.color.marca : T.color.tinta }}>
        {k.valor.toLocaleString("es-CO")}
       </div>
      </div>
     ))}
    </section>

    <section style={{ ...tarjeta, overflow: "hidden" }}>
     <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: 14, borderBottom: `1px solid ${T.color.borde}`,
     }}>
      <div style={{ position: "relative", width: 270 }}>
       <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: T.color.tinta3 }} />
       <input value={busq} onChange={e => setBusq(e.target.value)}
        placeholder="Buscar nombre, cedula o placa"
        style={{
         width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px",
         border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
         fontSize: 13, fontFamily: "inherit", color: T.color.tinta, outline: "none",
        }}/>
      </div>

      <div style={{ position: "relative" }}>
       <Truck size={15} style={{ position: "absolute", left: 12, top: 11, color: T.color.tinta3, pointerEvents: "none" }} />
       <select value={empresa} onChange={e => setEmpresa(e.target.value)} style={{
        appearance: "none", padding: "9px 32px 9px 34px", minWidth: 230,
        border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
        background: T.color.superficie, fontSize: 13, fontFamily: "inherit",
        color: T.color.tinta, cursor: "pointer", outline: "none",
       }}>
        <option value="">Todos los transportistas</option>
        {(transportistas || []).filter(t => t?.nit).map(t => (
         <option key={t.nit} value={t.nit}>{t.nombre || t.empresa || t.nit}</option>
        ))}
       </select>
      </div>

      <div style={{
       display: "inline-flex", padding: 3, gap: 2,
       background: T.color.superficie2, borderRadius: T.radio.control,
       border: `1px solid ${T.color.borde}`,
      }}>
       {[["todos", "Todos"], ["ruta", "En ruta"], ["libres", "Disponibles"]].map(([id, label]) => (
        <button key={id} onClick={() => setVista(id)} style={{
         border: "none", cursor: "pointer", fontFamily: "inherit",
         padding: "6px 14px", borderRadius: 8, fontSize: 13,
         fontWeight: vista === id ? 700 : 500,
         color: vista === id ? T.color.tinta : T.color.tinta2,
         background: vista === id ? T.color.superficie : "transparent",
         boxShadow: vista === id ? T.sombra.tarjeta : "none",
        }}>{label}</button>
       ))}
      </div>

      <div style={{ marginLeft: "auto", fontSize: 12.5, color: T.color.tinta3, whiteSpace: "nowrap" }}>
       {filtradas.length} {filtradas.length === 1 ? "conductor" : "conductores"} · orden A-Z
      </div>
     </div>

     <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
       <thead>
        <tr style={{ borderBottom: `1px solid ${T.color.borde}` }}>
         <th style={th}>Conductor</th>
         <th style={th}>Placa</th>
         <th style={th}>Transportista</th>
         <th style={th}>Telefono</th>
         <th style={{ ...th, textAlign: "right" }}>Asignados</th>
         <th style={{ ...th, textAlign: "right" }}>En transito</th>
         <th style={{ ...th, width: 44 }} />
        </tr>
       </thead>
       <tbody>
        {visibles.length === 0 && (
         <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 40, color: T.color.tinta3 }}>
          {filas.length === 0 ? "Sin conductores registrados." : "Ningun conductor coincide con el filtro."}
         </td></tr>
        )}
        {visibles.map(c => (
         <tr key={c.id} style={{ borderBottom: `1px solid ${T.color.borde}` }}>
          <td style={td}>
           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
             width: 34, height: 34, borderRadius: T.radio.pastilla, flexShrink: 0,
             background: T.color.marcaSuave, color: T.color.marca,
             display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800,
            }}>{iniciales(c.nombre)}</span>
            <div style={{ minWidth: 0 }}>
             <div style={{ fontSize: 13.5, fontWeight: 700, color: T.color.tinta }}>{c.nombre}</div>
             {c.cedula && <div style={{ fontSize: 12, color: T.color.tinta3 }}>CC {c.cedula}</div>}
            </div>
           </div>
          </td>
          <td style={td}>{c.placa ? <Chip mono>{c.placa}</Chip> : <span style={{ color: T.color.tinta3 }}>-</span>}</td>
          <td style={td}>{c.transportista || <span style={{ color: T.color.tinta3 }}>Sin asignar</span>}</td>
          <td style={td}>{c.celular || <span style={{ color: T.color.tinta3 }}>-</span>}</td>
          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: T.color.tinta }}>{c.asignados}</td>
          <td style={{ ...td, textAlign: "right" }}>
           <Chip color={c.transito ? T.color.marca : T.color.tinta3}
            fondo={c.transito ? T.color.marcaSuave : T.color.superficie2}>{c.transito}</Chip>
          </td>
          <td style={td}>
           <MenuFila opciones={[
            { texto: "Ver sus pedidos", accion: () => onVerPedidos && onVerPedidos(c), inactivo: !onVerPedidos || !c.placa },
            { texto: "Copiar celular", accion: () => copiar(c.celular, "celular") },
            { texto: "Copiar placa", accion: () => copiar(c.placa, "placa") },
           ]}/>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>

     <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "12px 16px", borderTop: `1px solid ${T.color.borde}`,
     }}>
      <span style={{ fontSize: 12.5, color: T.color.tinta3 }}>
       {filtradas.length} {filtradas.length === 1 ? "conductor" : "conductores"}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
       <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={botonPagina(pagina === 1)}>
        <ChevronLeft size={15} />
       </button>
       <span style={{
        minWidth: 30, height: 30, borderRadius: T.radio.chico, display: "grid", placeItems: "center",
        background: T.color.marca, color: "#fff", fontSize: 13, fontWeight: 700,
       }}>{pagina}</span>
       <button onClick={() => setPagina(p => Math.min(paginas, p + 1))} disabled={pagina === paginas} style={botonPagina(pagina === paginas)}>
        <ChevronRight size={15} />
       </button>
      </div>
     </div>
    </section>
   </div>

   {modal && (
    <Modal title="Registrar conductor" onClose={() => setModal(false)}>
     <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
       background: T.color.marcaSuave, borderRadius: T.radio.control, padding: 12,
       fontSize: 13, color: T.color.tinta2, border: `1px solid ${T.color.marcaBorde}`,
      }}>
       Se creara automaticamente el usuario de acceso al sistema.
      </div>
      <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required placeholder="Juan Perez" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
       <Field label="Cedula *" value={form.cedula} onChange={f("cedula")} required placeholder="1012345678" />
       <Field label="Celular" value={form.celular} onChange={f("celular")} placeholder="3001234567" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
       <Field label="Placa *" value={form.placa} onChange={f("placa")} required placeholder="ABC-123" />
       <Field label="Transportista" value={form.nit_proveedor} onChange={f("nit_proveedor")} as="select"
        options={[{ value: "", label: "Sin asignar" },
         ...(transportistas || []).filter(t => t?.nit).map(t => ({ value: t.nit, label: t.nombre || t.empresa || t.nit }))]}/>
      </div>
      <Field label="Empresa de transporte" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ S.A.S" />
      <div style={{ borderTop: `1px solid ${T.color.borde}`, paddingTop: 12 }}>
       <p style={{ ...T.texto.seccion, color: T.color.tinta3, margin: "0 0 10px" }}>Acceso al sistema</p>
       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Usuario (login) *" value={form.user_login} onChange={f("user_login")} required placeholder="juan.perez" name="spt_driver_login" autoComplete="off" />
        <Field label="Contrasena *" value={form.pass_login} onChange={f("pass_login")} required type="password" name="spt_driver_password" autoComplete="new-password" />
       </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
       <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
       <Btn onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : "Guardar y crear usuario"}</Btn>
      </div>
     </div>
    </Modal>
   )}
  </div>
 );
}

const botonPagina = (inactivo) => ({
 width: 30, height: 30, borderRadius: T.radio.chico,
 border: `1px solid ${T.color.borde2}`, background: T.color.superficie,
 color: inactivo ? T.color.borde2 : T.color.tinta2,
 cursor: inactivo ? "not-allowed" : "pointer",
 display: "grid", placeItems: "center",
});

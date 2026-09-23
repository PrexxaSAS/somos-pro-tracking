import React, { useState, useMemo, useEffect } from 'react';
import { Download, Plus } from 'lucide-react';
import { supabase } from '../../supabase';
import { T, tarjeta } from '../../design/tokens';
import { Modal, Field, Btn } from '../../Subcomponentes';
import { descargarCSV } from '../../utils/files';
import { mensajeErrorFuncion } from '../../utils/errors';
import {
 Pagina, Encabezado, Indicadores, BarraFiltros, BarraSeleccion, Buscador, SelectFiltro,
 Segmentado, Casilla, MenuFila, Paginador, PieTabla, useSeleccion,
 th, td, mono, botonBarra, botonPrincipal,
} from '../../components/ui/listas';

const POR_PAGINA = 50;

const iniciales = (nombre) => (nombre || "?")
 .trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

// Orden alfabetico con las reglas del espanol: la enie va despues de la n y los
// acentos no cambian el lugar de la palabra.
const porNombre = (a, b) =>
 (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });

const escaparCsv = (v) => {
 const t = String(v ?? "");
 return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

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
 const sel = useSeleccion(visibles.map(c => c.id));
 const marcados = filas.filter(c => sel.seleccion.has(c.id));

 const kpis = [
  { label: "Conductores", valor: filas.length },
  { label: "En ruta", valor: filas.filter(c => c.transito > 0).length, color: T.color.marca, destacado: true },
  { label: "Pedidos asignados", valor: filas.reduce((s, c) => s + c.asignados, 0), color: T.color.bien },
  { label: "En transito", valor: filas.reduce((s, c) => s + c.transito, 0), color: T.color.ojo },
 ];

 // Con conductores marcados se exportan esos; si no, lo que este filtrado.
 const exportar = () => {
  const lista = marcados.length > 0 ? marcados : filtradas;
  const filasCsv = lista.map(c => [
   c.nombre, c.cedula, c.placa, c.transportista, c.celular, c.asignados, c.transito,
  ].map(escaparCsv).join(","));
  descargarCSV(
   `conductores_${new Date().toISOString().slice(0, 10)}.csv`,
   "nombre,cedula,placa,transportista,celular,asignados,en_transito",
   filasCsv.join("\n"),
  );
  showToast(`${lista.length} conductor(es) exportados`, "success");
 };

 const copiar = async (valor, que) => {
  if (!valor) { showToast(`No hay ${que} para copiar`, "error"); return; }
  try {
   await navigator.clipboard.writeText(valor);
   showToast(`${que} copiado`, "success");
  } catch { showToast("El navegador no permitio copiar", "error"); }
 };

 const copiarCelularesMarcados = () => {
  const nums = marcados.map(c => c.celular).filter(Boolean);
  if (nums.length === 0) { showToast("Ninguno de los seleccionados tiene celular", "error"); return; }
  copiar(nums.join(", "), `${nums.length} celular(es)`);
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

 return (
  <Pagina>
   <Encabezado
    titulo="Conductores"
    descripcion="Gestion de conductores, placas y disponibilidad operativa"
    acciones={<>
     <button onClick={exportar} style={botonBarra}>
      <Download size={15} /> Exportar{marcados.length > 0 ? ` (${marcados.length})` : ""}
     </button>
     <button onClick={() => setModal(true)} style={botonPrincipal}>
      <Plus size={16} /> Registrar conductor
     </button>
    </>}
   />

   <Indicadores items={kpis} />

   <section style={{ ...tarjeta, overflow: "hidden" }}>
    {sel.seleccion.size > 0 ? (
     <BarraSeleccion
      cantidad={sel.seleccion.size}
      onLimpiar={sel.limpiar}
      acciones={<>
       <button onClick={copiarCelularesMarcados} style={botonBarra}>Copiar celulares</button>
       <button onClick={exportar} style={botonBarra}><Download size={15} /> Exportar CSV</button>
      </>}
     />
    ) : (
     <BarraFiltros derecha={`${filtradas.length} ${filtradas.length === 1 ? "conductor" : "conductores"} · orden A-Z`}>
      <Buscador valor={busq} onChange={setBusq} placeholder="Buscar nombre, cedula o placa" ancho={270} />
      <SelectFiltro valor={empresa} onChange={setEmpresa} ancho={230}>
       <option value="">Todos los transportistas</option>
       {(transportistas || []).filter(t => t?.nit).map(t => (
        <option key={t.nit} value={t.nit}>{t.nombre || t.empresa || t.nit}</option>
       ))}
      </SelectFiltro>
      <Segmentado valor={vista} onChange={setVista}
       opciones={[["todos", "Todos"], ["ruta", "En ruta"], ["libres", "Disponibles"]]} />
     </BarraFiltros>
    )}

    <div style={{ overflowX: "auto" }}>
     <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
       <tr style={{ borderBottom: `1px solid ${T.color.borde}` }}>
        <th style={{ ...th, width: 42 }}>
         <Casilla marcada={sel.todosMarcados} onChange={sel.alternarPagina} titulo="Seleccionar los de esta pagina" />
        </th>
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
        <tr><td colSpan={8} style={{ ...td, textAlign: "center", padding: 40, color: T.color.tinta3 }}>
         {filas.length === 0 ? "Sin conductores registrados." : "Ningun conductor coincide con el filtro."}
        </td></tr>
       )}
       {visibles.map(c => {
        const marcado = sel.seleccion.has(c.id);
        return (
         <tr key={c.id} style={{ borderBottom: `1px solid ${T.color.borde}`, background: marcado ? T.color.marcaSuave : "transparent" }}>
          <td style={td}><Casilla marcada={marcado} onChange={() => sel.alternar(c.id)} /></td>
          <td style={td}>
           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
             width: 34, height: 34, borderRadius: T.radio.pastilla, flexShrink: 0,
             background: T.color.marcaSuave, color: T.color.marca,
             display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800,
            }}>{iniciales(c.nombre)}</span>
            <div style={{ minWidth: 0 }}>
             <div style={{ fontSize: 13.5, fontWeight: 700, color: T.color.tinta }}>{c.nombre}</div>
             {c.cedula && <div style={mono}>CC {c.cedula}</div>}
            </div>
           </div>
          </td>
          <td style={td}>
           {c.placa
            ? <span style={{ ...mono, color: T.color.tinta2, background: T.color.superficie2, padding: "3px 9px", borderRadius: T.radio.chico }}>{c.placa}</span>
            : <span style={{ color: T.color.tinta3 }}>-</span>}
          </td>
          <td style={td}>{c.transportista || <span style={{ color: T.color.tinta3 }}>Sin asignar</span>}</td>
          <td style={td}>{c.celular || <span style={{ color: T.color.tinta3 }}>-</span>}</td>
          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: T.color.tinta }}>{c.asignados}</td>
          <td style={{ ...td, textAlign: "right" }}>
           <span style={{
            display: "inline-flex", minWidth: 26, justifyContent: "center", padding: "3px 9px",
            borderRadius: T.radio.chico, fontSize: 12, fontWeight: 700,
            background: c.transito ? T.color.marcaSuave : T.color.superficie2,
            color: c.transito ? T.color.marca : T.color.tinta3,
           }}>{c.transito}</span>
          </td>
          <td style={td}>
           <MenuFila opciones={[
            { texto: "Ver sus pedidos", accion: () => onVerPedidos && onVerPedidos(c), inactivo: !onVerPedidos || !c.placa },
            { texto: "Copiar celular", accion: () => copiar(c.celular, "Celular") },
            { texto: "Copiar placa", accion: () => copiar(c.placa, "Placa") },
           ]}/>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${filtradas.length} ${filtradas.length === 1 ? "conductor" : "conductores"}`}
     derecha={<Paginador total={filtradas.length} page={pagina} setPage={setPagina} pageSize={POR_PAGINA} />}
    />
   </section>

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
  </Pagina>
 );
}

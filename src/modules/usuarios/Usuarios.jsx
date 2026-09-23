import React, { useState, useMemo, useEffect } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { P, ROLES } from '../../Constants';
import { Btn, Card, Field, Modal } from '../../Subcomponentes';
import { T, tarjeta } from '../../design/tokens';
import { supabase } from '../../supabase';
import { mensajeErrorFuncion } from '../../utils/errors';
import {
 Pagina, Encabezado, Indicadores, BarraFiltros, BarraSeleccion, Buscador, SelectFiltro,
 Segmentado, Casilla, Paginador, PieTabla, useSeleccion,
 th, td, mono, botonBarra, botonPrincipal, iconoAccion,
} from '../../components/ui/listas';

const POR_PAGINA = 50;

// Color por rol, para el punto de la pastilla y la inicial del avatar.
const COLOR_ROL = {
 admin: T.color.marca,
 operador: "#7c3aed",
 transportista: "#0891b2",
 conductor: "#15803d",
 cliente: "#d97706",
 cartera: "#16161d",
};

const inicialesUsuario = (nombre) => (nombre || "?")
 .trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

export function Usuarios({ usuarios, transportistas = [], showToast, recargar }) {
 const vacio = {nombre:"",user:"",pass:"",rol:"operador",nit:"",empresa:"",cedula:"",placa:"",nit_proveedor:"",celular:""};
 const [modal,   setModal]   = useState(false);
 const [modEditar, setModEditar] = useState(null);
 const [form,   setForm]   = useState(vacio);
 const [guardando, setGuardando] = useState(false);
 const [eliminando, setEliminando] = useState(null);
 const [ocultos,  setOcultos]  = useState([]);
 const [busq, setBusq] = useState("");
 const [rolFiltro, setRolFiltro] = useState("todos");
 // "Acceso" no es lo mismo que activo/inactivo: mira si el usuario tiene cuenta en
 // Supabase Auth (auth_user_id). Sin ella no puede entrar al sistema.
 const [acceso, setAcceso] = useState("todos");
 const [pagina, setPagina] = useState(1);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const roleColors = {admin:P[600],operador:P[400],transportista:"#0891b2",conductor:"#059669",cliente:"#d97706"};
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };

 const abrirNuevo = () => { setForm(vacio); setModal(true); };
 const abrirEditar = (u) => {
  setForm({nombre:u.nombre,user:u.user,pass:"",rol:u.rol,nit:u.nit||"",empresa:u.empresa||"",cedula:u.cedula||"",placa:u.placa||"",nit_proveedor:u.nit_proveedor||"",celular:u.celular||""});
  setModEditar(u);
 };

 const crearUsuario = async () => {
  if (!form.nombre.trim()||!form.user.trim()||!form.pass.trim()) { showToast("Nombre, usuario y contrasea son obligatorios","error"); return; }
  if (usuarios.find(u=>u.user===form.user.trim())) { showToast("Ese usuario ya existe","error"); return; }
  if (form.rol==="conductor" && (!form.cedula.trim()||!form.placa.trim()||!form.nit_proveedor.trim())) {
   showToast("Cedula, placa y NIT proveedor son obligatorios para conductor","error");
   return;
  }
  if (form.rol==="transportista" && !form.nit.trim()) {
   showToast("NIT es obligatorio para transportista","error");
   return;
  }
  setGuardando(true);
  const { data, error } = await supabase.functions.invoke('create-system-user', {
   body: {
    type: "system_user",
    nombre: form.nombre.trim(),
    rol: form.rol,
    user_login: form.user.trim(),
    pass_login: form.pass.trim(),
    nit: form.nit.trim(),
    empresa: form.empresa.trim(),
    cedula: form.cedula.trim(),
    placa: form.placa.trim(),
    celular: form.celular.trim(),
    nit_proveedor: form.nit_proveedor.trim(),
   },
  });
  if (error) { showToast(await mensajeErrorFuncion(error, "el acceso"),"error"); setGuardando(false); return; }
  if (data?.error) { showToast("Error creando acceso: "+data.error,"error"); setGuardando(false); return; }
  setModal(false); setForm(vacio);
  showToast(" Usuario creado","success");
  if(recargar) await recargar(); setGuardando(false);
 };

 const guardarEdicion = async () => {
  if (!form.nombre.trim()||!form.user.trim()) { showToast("Nombre y usuario son obligatorios","error"); return; }
  if (usuarios.find(u=>u.user===form.user.trim()&&u.id!==modEditar.id)) { showToast("Ese usuario ya existe","error"); return; }
  if (form.rol==="conductor" && (!form.cedula.trim()||!form.placa.trim()||!form.nit_proveedor.trim())) {
   showToast("Cedula, placa y NIT proveedor son obligatorios para conductor","error");
   return;
  }
  if (form.rol==="transportista" && !form.nit.trim()) {
   showToast("NIT es obligatorio para transportista","error");
   return;
  }
  setGuardando(true);
  const { data, error } = await supabase.functions.invoke('create-system-user', {
   body: {
    type: "update_system_user",
    user_id: modEditar.id,
    nombre: form.nombre.trim(),
    rol: form.rol,
    user_login: form.user.trim(),
    pass_login: form.pass.trim(),
    nit: form.nit.trim(),
    empresa: form.empresa.trim(),
    cedula: form.cedula.trim(),
    placa: form.placa.trim(),
    celular: form.celular.trim(),
    nit_proveedor: form.nit_proveedor.trim(),
   },
  });
  if (error) { showToast(await mensajeErrorFuncion(error, "el usuario"),"error"); setGuardando(false); return; }
  if (data?.error) { showToast("Error actualizando usuario: "+data.error,"error"); setGuardando(false); return; }
  setModEditar(null);
  showToast(form.pass.trim()?" Usuario y contrasea actualizados":" Usuario actualizado","success");
  if(recargar) await recargar(); setGuardando(false);
 };

 // Borrado masivo: se confirma una sola vez y se van eliminando uno a uno, porque
 // la Edge Function recibe un usuario por llamada. El admin principal nunca entra.
 const eliminarSeleccionados = async (ids) => {
  const objetivo = usuarios.filter(u => ids.has(u.id) && u.user !== "admin");
  if (objetivo.length === 0) { showToast("La seleccion solo tiene al admin principal", "error"); return; }
  if (!window.confirm(`Eliminar ${objetivo.length} usuario(s)? Esta accion no se puede deshacer.`)) return;

  let ok = 0;
  const fallos = [];
  for (const u of objetivo) {
   const { data, error } = await supabase.functions.invoke('create-system-user', {
    body: { type: "delete_system_user", user_id: u.id },
   });
   if (error || data?.error) fallos.push(u.user);
   else { ok += 1; setOcultos(prev => [...prev, u.id]); }
  }
  showToast(
   fallos.length === 0
    ? `${ok} usuario(s) eliminados`
    : `${ok} eliminados. Fallaron: ${fallos.join(", ")}`,
   fallos.length === 0 ? "success" : "error",
  );
  if (recargar) await recargar();
 };

 const eliminar = async (uid, uname) => {
  if (uname==="admin") { showToast("No se puede eliminar el admin principal","error"); return; }
  if (!window.confirm("Eliminar este usuario?")) return;
  setEliminando(uid);
  const { data, error } = await supabase.functions.invoke('create-system-user', {
   body: {
    type: "delete_system_user",
    user_id: uid,
   },
  });
  if (error) { showToast(await mensajeErrorFuncion(error, "el usuario"),"error"); setEliminando(null); return; }
  if (data?.error) { showToast("Error eliminando usuario: "+data.error,"error"); setEliminando(null); return; }
  // La tarjeta desaparece de inmediato; el refresco ocurre despues sin hacer esperar.
  setOcultos(prev=>[...prev, uid]);
  setEliminando(null);
  showToast("Usuario eliminado","info");
  if (recargar) await recargar();
 };

 const camposRol = () => {
  const transportistaOpciones = (transportistas || [])
   .filter(t => t?.nit)
   .map(t => ({ value:t.nit, label:t.nombre || t.empresa || t.nit }));
  const transportistaActualExiste = !form.nit_proveedor || transportistaOpciones.some(t => t.value === form.nit_proveedor);
  const opcionesEmpresaConductor = [
   { value:"", label:"Seleccione" },
   ...(!transportistaActualExiste ? [{ value:form.nit_proveedor, label:form.empresa || "Empresa actual" }] : []),
   ...transportistaOpciones,
  ];
  const seleccionarEmpresaConductor = (nit) => {
   const empresa = (transportistas || []).find(t => t.nit === nit);
   setForm(p => ({
    ...p,
    nit_proveedor:nit,
    empresa:empresa?.nombre || empresa?.empresa || "",
   }));
  };

  if (form.rol==="transportista") return (
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
    <Field label="NIT" value={form.nit} onChange={f("nit")} placeholder="900123456-1"/>
    <Field label="Empresa" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ"/>
   </div>
  );
  if (form.rol==="conductor") return (
   <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
     <Field label="Cedula" value={form.cedula} onChange={f("cedula")} placeholder="1012345678"/>
     <Field label="Placa" value={form.placa} onChange={f("placa")} placeholder="ABC-123"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
     <Field label="Celular" value={form.celular} onChange={f("celular")} placeholder="3001234567"/>
     <Field label="Empresa" value={form.nit_proveedor} onChange={seleccionarEmpresaConductor} as="select" options={opcionesEmpresaConductor}/>
    </div>
    {form.nit_proveedor && <div style={{background:"#f8fafc",border:`1px solid ${border}`,borderRadius:12,padding:"10px 12px",fontSize:13,color:"#4b5563"}}>NIT proveedor: <strong>{form.nit_proveedor}</strong></div>}
   </>
  );
  return null;
 };

 const listaBase = useMemo(() => usuarios
  .filter(u => !ocultos.includes(u.id))
  .slice()
  .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })),
 [usuarios, ocultos]);

 const porRol = (rol) => rol === "todos"
  ? listaBase.length
  : listaBase.filter(u => u.rol === rol).length;

 const filtrados = useMemo(() => {
  const q = busq.trim().toLowerCase();
  return listaBase.filter(u => {
   const okRol = rolFiltro === "todos" || u.rol === rolFiltro;
   const conAcceso = Boolean(u.auth_user_id);
   const okAcceso = acceso === "todos"
    || (acceso === "con" && conAcceso)
    || (acceso === "sin" && !conAcceso);
   const okBusq = !q ||
    (u.nombre || "").toLowerCase().includes(q) ||
    (u.user || "").toLowerCase().includes(q) ||
    (u.cedula || "").toLowerCase().includes(q) ||
    (u.nit || "").toLowerCase().includes(q) ||
    (u.empresa || "").toLowerCase().includes(q);
   return okRol && okAcceso && okBusq;
  });
 }, [listaBase, busq, rolFiltro, acceso]);

 const tarjetasRol = [["todos", "Todos"], ...Object.entries(ROLES)];

 useEffect(() => { setPagina(1); }, [busq, rolFiltro, acceso]);
 const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
 const sel = useSeleccion(visibles.map(u => u.id));

 return (
  <Pagina>
   <Encabezado
    titulo="Usuarios"
    descripcion="Administracion de accesos, roles y perfiles del sistema"
    acciones={
     <button onClick={abrirNuevo} style={botonPrincipal}>
      <Plus size={16} /> Nuevo usuario
     </button>
    }
   />

   {/* Cada tarjeta es tambien el filtro por rol. */}
   <Indicadores items={tarjetasRol.map(([rol, label]) => ({
    label,
    valor: porRol(rol),
    color: rol === "todos" ? T.color.tinta : (COLOR_ROL[rol] || T.color.tinta3),
    activo: rolFiltro === rol,
    onClick: () => setRolFiltro(rol),
   }))} />

   <section style={{ ...tarjeta, overflow: "hidden" }}>
    {sel.seleccion.size > 0 ? (
     <BarraSeleccion
      cantidad={sel.seleccion.size}
      onLimpiar={sel.limpiar}
      acciones={
       <button
        onClick={async () => { await eliminarSeleccionados(sel.seleccion); sel.limpiar(); }}
        style={{ ...botonBarra, color: T.color.mal, borderColor: "#fca5a5" }}>
        <Trash2 size={15} /> Eliminar seleccionados
       </button>
      }
     />
    ) : (
     <BarraFiltros derecha={`${filtrados.length} ${filtrados.length === 1 ? "usuario" : "usuarios"} · orden A-Z`}>
      <Buscador valor={busq} onChange={setBusq} placeholder="Buscar nombre, usuario, cedula o NIT" ancho={300} />
      <SelectFiltro valor={rolFiltro} onChange={setRolFiltro} ancho={190}>
       <option value="todos">Todos los roles</option>
       {Object.entries(ROLES).map(([rol, label]) => (
        <option key={rol} value={rol}>{label}</option>
       ))}
      </SelectFiltro>
      <Segmentado valor={acceso} onChange={setAcceso}
       opciones={[["todos", "Todos"], ["con", "Con acceso"], ["sin", "Sin acceso"]]} />
     </BarraFiltros>
    )}

    <div style={{ overflowX: "auto" }}>
     <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
       <tr style={{ borderBottom: `1px solid ${T.color.borde}` }}>
        <th style={{ ...th, width: 42 }}>
         <Casilla marcada={sel.todosMarcados} onChange={sel.alternarPagina} titulo="Seleccionar los de esta pagina" />
        </th>
        <th style={th}>Usuario</th>
        <th style={th}>Rol</th>
        <th style={th}>Vinculacion</th>
        <th style={th}>Acceso</th>
        <th style={{ ...th, textAlign: "right" }}>Acciones</th>
       </tr>
      </thead>
      <tbody>
       {visibles.length === 0 && (
        <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 40, color: T.color.tinta3 }}>
         Ningun usuario coincide con el filtro.
        </td></tr>
       )}
       {visibles.map(u => {
        const color = COLOR_ROL[u.rol] || T.color.tinta3;
        const conAcceso = Boolean(u.auth_user_id);
        const marcado = sel.seleccion.has(u.id);
        return (
         <tr key={u.id} style={{ borderBottom: `1px solid ${T.color.borde}`, background: marcado ? T.color.marcaSuave : "transparent" }}>
          <td style={td}>
           <Casilla marcada={marcado} onChange={() => sel.alternar(u.id)}
            titulo={u.user === "admin" ? "El admin principal no se puede eliminar" : undefined} />
          </td>
          <td style={td}>
           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
             width: 34, height: 34, borderRadius: T.radio.pastilla, flexShrink: 0,
             background: `${color}18`, color, display: "grid", placeItems: "center",
             fontSize: 12, fontWeight: 800,
            }}>{inicialesUsuario(u.nombre)}</span>
            <div style={{ minWidth: 0 }}>
             <div style={{ fontSize: 13.5, fontWeight: 700, color: T.color.tinta }}>{u.nombre}</div>
             <div style={mono}>@{u.user}</div>
            </div>
           </div>
          </td>
          <td style={td}>
           <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
            borderRadius: T.radio.pastilla, background: `${color}14`, color,
            fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
           }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
            {ROLES[u.rol] || u.rol}
           </span>
          </td>
          <td style={td}>
           {u.empresa || u.nit || u.cedula || u.placa ? (
            <>
             <div>{u.empresa || "Somos PRO"}</div>
             <div style={mono}>
              {[u.nit && `NIT ${u.nit}`, u.cedula && `CC ${u.cedula}`, u.placa]
               .filter(Boolean).join("  ·  ")}
             </div>
            </>
           ) : <span style={{ color: T.color.tinta3 }}>-</span>}
          </td>
          <td style={td}>
           <span style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: conAcceso ? T.color.bien : T.color.borde2 }} />
            <span style={{ color: conAcceso ? T.color.tinta2 : T.color.tinta3 }}>
             {conAcceso ? "Con acceso" : "Sin acceso"}
            </span>
           </span>
          </td>
          <td style={{ ...td, textAlign: "right" }}>
           <div style={{ display: "inline-flex", gap: 4 }}>
            <button onClick={() => abrirEditar(u)} title="Editar" style={iconoAccion}>
             <Pencil size={15} />
            </button>
            {u.user !== "admin" && (
             <button onClick={() => eliminar(u.id, u.user)} title="Eliminar"
              disabled={eliminando === u.id}
              style={{ ...iconoAccion, color: T.color.mal, opacity: eliminando === u.id ? 0.5 : 1 }}>
              <Trash2 size={15} />
             </button>
            )}
           </div>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${filtrados.length} ${filtrados.length === 1 ? "usuario" : "usuarios"}`}
     derecha={<Paginador total={filtrados.length} page={pagina} setPage={setPagina} pageSize={POR_PAGINA} />}
    />
   </section>

   {modal&&(
    <Modal title="Nuevo Usuario" onClose={()=>setModal(false)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Usuario (login) *" value={form.user} onChange={f("user")} required placeholder="usuario123" name="spt_admin_user_login" autoComplete="off" data-lpignore="true"/>
       <Field label="Contrasena *" value={form.pass} onChange={f("pass")} required type="password" placeholder="" name="spt_admin_user_password" autoComplete="new-password" data-lpignore="true"/>
      </div>
      <Field label="Rol" value={form.rol} onChange={f("rol")} as="select" options={Object.entries(ROLES).map(([k,v])=>({value:k,label:v}))}/>
      {camposRol()}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
       <Btn onClick={crearUsuario} disabled={guardando}>{guardando?"Guardando...":" Crear Usuario"}</Btn>
      </div>
     </div>
    </Modal>
   )}

   {modEditar&&(
    <Modal title={`Editar ${modEditar.nombre}`} onClose={()=>setModEditar(null)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Usuario *" value={form.user} onChange={f("user")} required name="username" autoComplete="username"/>
       <Field label="Nueva contrasea (vaco = sin cambio)" value={form.pass} onChange={f("pass")} type="password" placeholder="Nueva contrasea..." name="password" autoComplete="current-password"/>
      </div>
      <Field label="Rol" value={form.rol} onChange={f("rol")} as="select" options={Object.entries(ROLES).map(([k,v])=>({value:k,label:v}))}/>
      {camposRol()}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModEditar(null)}>Cancelar</Btn>
       <Btn onClick={guardarEdicion} disabled={guardando}>{guardando?"Guardando...":" Guardar Cambios"}</Btn>
      </div>
     </div>
    </Modal>
   )}
  </Pagina>
 );
}


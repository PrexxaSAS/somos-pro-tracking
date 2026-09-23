import React, { useState, useMemo } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { P, ROLES } from '../../Constants';
import { Btn, Card, Field, Modal } from '../../Subcomponentes';
import { T, tarjeta } from '../../design/tokens';
import { supabase } from '../../supabase';
import { mensajeErrorFuncion } from '../../utils/errors';

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

 const th = { ...T.texto.seccion, color: T.color.tinta3, textAlign: "left", padding: "12px 16px", whiteSpace: "nowrap", fontSize: 10.5 };
 const td = { padding: "13px 16px", fontSize: 13.5, color: T.color.tinta2, verticalAlign: "middle" };
 const mono = { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: T.color.tinta3 };

 const tarjetasRol = [["todos", "Todos"], ...Object.entries(ROLES)];

 return (
  <div style={{ minHeight:"100%", background:T.color.fondo, margin:"-28px -24px", padding:"24px 28px 40px", color:T.color.tinta }}>
   <div style={{ maxWidth:1320, margin:"0 auto", display:"flex", flexDirection:"column", gap:18 }}>

    <header style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap" }}>
     <div>
      <h1 style={{ margin:0, ...T.texto.titulo }}>Usuarios</h1>
      <p style={{ margin:"4px 0 0", color:T.color.tinta3, fontSize:13.5 }}>
       Administracion de accesos, roles y perfiles del sistema
      </p>
     </div>
     <button onClick={abrirNuevo} style={{
      display:"inline-flex", alignItems:"center", gap:8, padding:"10px 16px",
      border:"none", borderRadius:T.radio.control, background:T.color.marca,
      cursor:"pointer", fontFamily:"inherit", fontSize:13.5, fontWeight:700, color:"#fff",
     }}><Plus size={16} /> Nuevo usuario</button>
    </header>

    {/* Cada tarjeta es tambien el filtro por rol. */}
    <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
     {tarjetasRol.map(([rol, label]) => {
      const activo = rolFiltro === rol;
      return (
       <button key={rol} onClick={() => setRolFiltro(rol)} style={{
        ...tarjeta, padding:"14px 16px", textAlign:"left", cursor:"pointer",
        fontFamily:"inherit",
        border:`1px solid ${activo ? T.color.marca : T.color.borde}`,
        boxShadow: activo ? `0 0 0 3px ${T.color.marcaSuave}` : T.sombra.tarjeta,
       }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
         <span style={{ width:7, height:7, borderRadius:4, flexShrink:0,
          background: rol === "todos" ? T.color.tinta : (COLOR_ROL[rol] || T.color.tinta3) }} />
         <span style={{ fontSize:12.5, color:T.color.tinta2, lineHeight:1.2 }}>{label}</span>
        </div>
        <div style={{ ...T.texto.cifra, color: activo ? T.color.marca : T.color.tinta }}>{porRol(rol)}</div>
       </button>
      );
     })}
    </section>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", padding:14, borderBottom:`1px solid ${T.color.borde}` }}>
      <div style={{ position:"relative", width:300 }}>
       <Search size={15} style={{ position:"absolute", left:12, top:11, color:T.color.tinta3 }} />
       <input value={busq} onChange={e => setBusq(e.target.value)}
        placeholder="Buscar nombre, usuario, cedula o NIT"
        style={{
         width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 34px",
         border:`1px solid ${T.color.borde2}`, borderRadius:T.radio.control,
         fontSize:13, fontFamily:"inherit", color:T.color.tinta, outline:"none",
        }}/>
      </div>

      <div style={{ display:"inline-flex", padding:3, gap:2, background:T.color.superficie2,
       borderRadius:T.radio.control, border:`1px solid ${T.color.borde}` }}>
       {[["todos","Todos"], ["con","Con acceso"], ["sin","Sin acceso"]].map(([id,label]) => (
        <button key={id} onClick={() => setAcceso(id)} style={{
         border:"none", cursor:"pointer", fontFamily:"inherit", padding:"6px 14px",
         borderRadius:8, fontSize:13, fontWeight: acceso === id ? 700 : 500,
         color: acceso === id ? T.color.tinta : T.color.tinta2,
         background: acceso === id ? T.color.superficie : "transparent",
         boxShadow: acceso === id ? T.sombra.tarjeta : "none",
        }}>{label}</button>
       ))}
      </div>

      <div style={{ marginLeft:"auto", fontSize:12.5, color:T.color.tinta3, whiteSpace:"nowrap" }}>
       {filtrados.length} {filtrados.length === 1 ? "usuario" : "usuarios"} · orden A-Z
      </div>
     </div>

     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
         <th style={th}>Usuario</th>
         <th style={th}>Rol</th>
         <th style={th}>Vinculacion</th>
         <th style={th}>Acceso</th>
         <th style={{ ...th, textAlign:"right" }}>Acciones</th>
        </tr>
       </thead>
       <tbody>
        {filtrados.length === 0 && (
         <tr><td colSpan={5} style={{ ...td, textAlign:"center", padding:40, color:T.color.tinta3 }}>
          Ningun usuario coincide con el filtro.
         </td></tr>
        )}
        {filtrados.map(u => {
         const color = COLOR_ROL[u.rol] || T.color.tinta3;
         const conAcceso = Boolean(u.auth_user_id);
         return (
          <tr key={u.id} style={{ borderBottom:`1px solid ${T.color.borde}` }}>
           <td style={td}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
             <span style={{
              width:34, height:34, borderRadius:T.radio.pastilla, flexShrink:0,
              background:`${color}18`, color, display:"grid", placeItems:"center",
              fontSize:12, fontWeight:800,
             }}>{inicialesUsuario(u.nombre)}</span>
             <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:T.color.tinta }}>{u.nombre}</div>
              <div style={mono}>@{u.user}</div>
             </div>
            </div>
           </td>
           <td style={td}>
            <span style={{
             display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
             borderRadius:T.radio.pastilla, background:`${color}14`, color,
             fontSize:12, fontWeight:700, whiteSpace:"nowrap",
            }}>
             <span style={{ width:6, height:6, borderRadius:3, background:color }} />
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
            ) : <span style={{ color:T.color.tinta3 }}>-</span>}
           </td>
           <td style={td}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, whiteSpace:"nowrap" }}>
             <span style={{ width:7, height:7, borderRadius:4, background: conAcceso ? T.color.bien : T.color.borde2 }} />
             <span style={{ color: conAcceso ? T.color.tinta2 : T.color.tinta3 }}>
              {conAcceso ? "Con acceso" : "Sin acceso"}
             </span>
            </span>
           </td>
           <td style={{ ...td, textAlign:"right" }}>
            <div style={{ display:"inline-flex", gap:4 }}>
             <button onClick={() => abrirEditar(u)} title="Editar" style={iconoAccion}>
              <Pencil size={15} />
             </button>
             {u.user !== "admin" && (
              <button onClick={() => eliminar(u.id, u.user)} title="Eliminar"
               disabled={eliminando === u.id}
               style={{ ...iconoAccion, color:T.color.mal, opacity: eliminando === u.id ? 0.5 : 1 }}>
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

     <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.color.borde}`, fontSize:12.5, color:T.color.tinta3 }}>
      {filtrados.length} {filtrados.length === 1 ? "usuario" : "usuarios"}
     </div>
    </section>
   </div>

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
  </div>
 );
}

const iconoAccion = {
 border: "none", background: "transparent", cursor: "pointer",
 color: T.color.tinta3, padding: 7, borderRadius: T.radio.chico,
 display: "grid", placeItems: "center",
};

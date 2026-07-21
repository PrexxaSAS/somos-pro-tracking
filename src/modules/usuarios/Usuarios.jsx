import React, { useState } from 'react';
import { P, ROLES } from '../../Constants';
import { Btn, Card, Field, Modal } from '../../Subcomponentes';
import { supabase } from '../../supabase';
import { mensajeError } from '../../utils/errors';

export function Usuarios({ usuarios, transportistas = [], showToast, recargar }) {
 const vacio = {nombre:"",user:"",pass:"",rol:"operador",nit:"",empresa:"",cedula:"",placa:"",nit_proveedor:"",celular:""};
 const [modal,   setModal]   = useState(false);
 const [modEditar, setModEditar] = useState(null);
 const [form,   setForm]   = useState(vacio);
 const [guardando, setGuardando] = useState(false);
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
  if (error) { showToast(mensajeError(error, "el acceso"),"error"); setGuardando(false); return; }
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
  if (error) {
   let detalle = error.message;
   try {
    const body = await error.context?.json?.();
    if (body?.error) detalle = body.error;
   } catch {}
   showToast(mensajeError(detalle, "el usuario"),"error");
   setGuardando(false);
   return;
  }
  if (data?.error) { showToast("Error actualizando usuario: "+data.error,"error"); setGuardando(false); return; }
  setModEditar(null);
  showToast(form.pass.trim()?" Usuario y contrasea actualizados":" Usuario actualizado","success");
  if(recargar) await recargar(); setGuardando(false);
 };

 const eliminar = async (uid, uname) => {
  if (uname==="admin") { showToast("No se puede eliminar el admin principal","error"); return; }
  if (!window.confirm("Eliminar este usuario?")) return;
  const { data, error } = await supabase.functions.invoke('create-system-user', {
   body: {
    type: "delete_system_user",
    user_id: uid,
   },
  });
  if (error) {
   let detalle = error.message;
   try {
    const body = await error.context?.json?.();
    if (body?.error) detalle = body.error;
   } catch {}
   showToast(mensajeError(detalle, "el usuario"),"error");
   return;
  }
  if (data?.error) { showToast("Error eliminando usuario: "+data.error,"error"); return; }
  showToast("Usuario eliminado","info");
  if (recargar) await recargar();
 };

 const camposRol = () => {
  const transportistaOpciones = (transportistas || [])
   .filter(t => t?.nit)
   .map(t => ({ value:t.nit, label:`${t.nombre || t.empresa || t.nit} - ${t.nit}` }));
  const transportistaActualExiste = !form.nit_proveedor || transportistaOpciones.some(t => t.value === form.nit_proveedor);
  const opcionesEmpresaConductor = [
   { value:"", label:"Seleccione empresa transportista" },
   ...(!transportistaActualExiste ? [{ value:form.nit_proveedor, label:`${form.empresa || "Empresa actual"} - ${form.nit_proveedor}` }] : []),
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

 return (
  <div style={{ minHeight:"100%", background:"#fafafa", margin:"-28px -24px", color:"#111827" }}>
   <header style={{ background:"#fff", borderBottom:`1px solid ${border}`, padding:"16px 32px", display:"flex", justifyContent:"space-between", gap:16, alignItems:"center", flexWrap:"wrap" }}>
    <div>
     <h1 style={{ margin:0, fontSize:22, lineHeight:1.2, fontWeight:850 }}>Usuarios</h1>
     <p style={{ margin:"5px 0 0", color:"#6b7280", fontSize:14 }}>Administracion de accesos, roles y perfiles del sistema</p>
    </div>
    <button style={primaryButton} onClick={abrirNuevo}>+ Nuevo Usuario</button>
   </header>
   <main style={{ maxWidth:1216, margin:"0 auto", padding:"24px 24px 42px", display:"flex", flexDirection:"column", gap:18 }}>
    <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14 }}>
     {Object.entries(ROLES).map(([rol,label]) => (
      <div key={rol} style={{ ...cardStyle, padding:16 }}>
       <div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>{label}</div>
       <div style={{ color:roleColors[rol] || "#111827", fontSize:28, fontWeight:900, marginTop:8 }}>{usuarios.filter(u=>u.rol===rol).length}</div>
      </div>
     ))}
    </section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
    {usuarios.map(u=>(
     <article key={u.id} style={{ ...cardStyle, padding:18, borderTop:`3px solid ${roleColors[u.rol]||P[400]}` }}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
       <div style={{width:42,height:42,borderRadius:14,background:`${roleColors[u.rol] || "#6d42d8"}18`,display:"flex",alignItems:"center",justifyContent:"center",color:roleColors[u.rol] || "#6d42d8",fontWeight:900,fontSize:16}}>
        {u.nombre[0].toUpperCase()}
       </div>
       <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:850,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.nombre}</div>
        <div style={{fontSize:12,color:"#64748b"}}>@{u.user}</div>
       </div>
      </div>
      <span style={{background:`${roleColors[u.rol]}18`,color:roleColors[u.rol],borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{ROLES[u.rol]||u.rol}</span>
      {u.cedula &&<p style={{margin:"6px 0 0",fontSize:12,color:"#64748b"}}>CC: {u.cedula}</p>}
      {u.nit  &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>NIT: {u.nit}</p>}
      {u.placa &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Placa: {u.placa}</p>}
      {u.celular&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}> {u.celular}</p>}
      {u.empresa&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>{u.empresa}</p>}
      <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
       <button style={{ ...buttonBase, padding:"7px 12px", fontSize:13 }} onClick={()=>abrirEditar(u)}>Editar</button>
       {u.user!=="admin"&&<button style={{ ...buttonBase, padding:"7px 12px", fontSize:13, color:"#dc2626" }} onClick={()=>eliminar(u.id,u.user)}>Eliminar</button>}
      </div>
     </article>
    ))}
    </section>
   </main>

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




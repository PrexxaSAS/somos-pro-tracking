import React, { useState } from 'react';
import { P, ROLES } from '../../Constants';
import { Btn, Card, Field, Modal } from '../../Subcomponentes';
import { supabase } from '../../supabase';
import { mensajeError } from '../../utils/errors';

export function Usuarios({ usuarios, showToast, recargar }) {
 const vacio = {nombre:"",user:"",pass:"",rol:"operador",nit:"",empresa:"",cedula:"",placa:"",nit_proveedor:"",celular:""};
 const [modal,   setModal]   = useState(false);
 const [modEditar, setModEditar] = useState(null);
 const [form,   setForm]   = useState(vacio);
 const [guardando, setGuardando] = useState(false);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const roleColors = {admin:P[600],operador:P[400],transportista:"#0891b2",conductor:"#059669",cliente:"#d97706"};

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
     <Field label="NIT proveedor" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1"/>
    </div>
    <Field label="Empresa" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ"/>
   </>
  );
  return null;
 };

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
    <h2 style={{margin:0,color:P[800],fontWeight:900}}> Usuarios del Sistema</h2>
    <Btn onClick={abrirNuevo}>+ Nuevo Usuario</Btn>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
    {usuarios.map(u=>(
     <Card key={u.id} style={{borderTop:`3px solid ${roleColors[u.rol]||P[400]}`}}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
       <div style={{width:40,height:40,borderRadius:20,background:`linear-gradient(135deg,${roleColors[u.rol]},${roleColors[u.rol]}99)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:16}}>
        {u.nombre[0].toUpperCase()}
       </div>
       <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:800,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.nombre}</div>
        <div style={{fontSize:12,color:"#64748b"}}>@{u.user}</div>
       </div>
      </div>
      <span style={{background:`${roleColors[u.rol]}18`,color:roleColors[u.rol],borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{ROLES[u.rol]||u.rol}</span>
      {u.cedula &&<p style={{margin:"6px 0 0",fontSize:12,color:"#64748b"}}>CC: {u.cedula}</p>}
      {u.nit  &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>NIT: {u.nit}</p>}
      {u.placa &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Placa: {u.placa}</p>}
      {u.celular&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}> {u.celular}</p>}
      {u.empresa&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>{u.empresa}</p>}
      <div style={{display:"flex",gap:8,marginTop:12}}>
       <Btn size="sm" variant="secondary" onClick={()=>abrirEditar(u)}> Editar</Btn>
       {u.user!=="admin"&&<Btn size="sm" variant="danger" onClick={()=>eliminar(u.id,u.user)}> Eliminar</Btn>}
      </div>
     </Card>
    ))}
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




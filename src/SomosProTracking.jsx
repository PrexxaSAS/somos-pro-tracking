import React, { useState, useEffect, useRef } from 'react';
import { P, CIUDADES as CIUDADES_BASE, ESTADOS_PEDIDO, ROLES } from './Constants';
import { PAQUETERIAS_INICIALES } from './DataStore';
import { Logo, Badge, Card, Btn, Field, Modal, Toast } from './Subcomponentes';
import { supabase } from './supabase';
import { generarGuia, generarGuiaDV, generarGuiaRC } from './utils/guides';
import { descargarCSV, fileToBase64, abrirArchivoGuardado } from './utils/files';
import { mensajeError } from './utils/errors';
import { generarPDFSoportes } from './utils/pdf';
import { Login } from './components/auth/Login';
import { CargadorFotos } from './components/delivery/CargadorFotos';
import { GuiaImprimible } from './components/delivery/GuiaImprimible';
import { SidebarApp } from './components/layout/SidebarApp';
import { LinkCompartir } from './components/share/LinkCompartir';
import { Dashboard } from './modules/dashboard/Dashboard';
import { FacturasProveedor } from './modules/facturas/FacturasProveedor';
import { Usuarios } from './modules/usuarios/Usuarios';

const iSt = {
 border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",
 fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",
 width:"100%",boxSizing:"border-box",
};


function ModalDetalle({ pedido, conductores, ciudades, transportistas, promesas = [], onClose, setPedidos, showToast, canEdit, canBasicEdit = false, canAssign = false, canDeliver = false }) {
 const [condId,   setCondId]   = useState(pedido.conductor_id||"") ;
 const [direccion, setDireccion] = useState(pedido.direccion||"");
 const [cajas,   setCajas]   = useState(String(pedido.cajas||""));
 const [estadoDesp, setEstadoDesp] = useState(pedido.estado_despacho||"despachado");
 const [novedad,  setNovedad]  = useState(pedido.novedad||false);
 const [tipoModal, setTipoModal] = useState(pedido.tipo||"propio");
 const [facturaEdit, setFacturaEdit] = useState(pedido.factura||"");
 const [fechaEdit,  setFechaEdit]  = useState(pedido.fecha_estimada||"");
 const [ciudadEdit, setCiudadEdit] = useState(pedido.ciudad_codigo||"");
 const [empTrans,  setEmpTrans]  = useState(pedido.empresa_transporte||"");
 const [paqModal,  setPaqModal]  = useState(pedido.paqueteria||"");
 const [guiaPaq,  setGuiaPaq]  = useState(pedido.guia_paqueteria||"");
 const [verMapa,  setVerMapa]  = useState(false);
 const [verGuia,  setVerGuia]  = useState(false);
 const [verCamara, setVerCamara] = useState(false);
 const [novedadEntrega, setNovedadEntrega] = useState(pedido.novedad||false);

 const cond  = conductores.find(c=>String(c.id)===String(condId||pedido.conductor_id||""));
 const ciudad = (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);
 const promesa = (promesas||[]).find(p=>p.ciudad_codigo===pedido.ciudad_codigo);
 const fechaLimitePromesa = promesa && pedido.fecha_creacion ? (() => {
  const d = new Date(pedido.fecha_creacion);
  d.setDate(d.getDate() + Number(promesa.dias_plazo || 0));
  return d.toISOString().split("T")[0];
 })() : null;
 const fuenteRiesgo = fechaLimitePromesa ? "Promesa de servicio" : "Fecha estimada";
 const tieneSoportes = ((pedido.soportes_data||[]).length > 0) || ((pedido.soportes||[]).length > 0);
 const pedidoCerrado = ["entregado","novedad"].includes(pedido.estado);
 const pedidoEnTransito = pedido.estado === "en_transito";
 const pedidoBloqueadoEdicion = pedidoCerrado || pedidoEnTransito;
 const puedeMarcarNovedadEntrega = !pedidoCerrado && (!pedidoEnTransito || canDeliver);
 const conductoresActivos = conductores.filter(c=>c.activo!==false);
 const conductorHistorico = cond && !conductoresActivos.some(c=>String(c.id)===String(cond.id)) ? cond : null;
 const conductoresOpciones = conductorHistorico ? [conductorHistorico, ...conductoresActivos] : conductoresActivos;

 const guardar = async () => {
  if (pedidoBloqueadoEdicion) {
   showToast(pedidoCerrado ? "No se puede modificar un pedido que ya fue entregado" : "No se puede editar un pedido en transito","error");
   return;
  }
  const c = conductores.find(c=>String(c.id)===String(condId));
  let nuevoEstado = pedido.estado;
  if(c && (pedido.estado==="sin_asignar"||pedido.estado==="pendiente")) nuevoEstado="en_transito";
  if(!c && pedido.estado==="en_transito" && tipoModal==="propio") nuevoEstado="sin_asignar";
  if(tipoModal==="empresa_transporte" && empTrans.trim()) nuevoEstado="en_transito";
  const fechaDespacho = new Date().toISOString().split("T")[0];
  const debeMarcarDespacho = nuevoEstado === "en_transito" && pedido.estado !== "en_transito" && !pedido.fecha_despacho;
  const ciudad = (ciudades||[]).find(c => c.code === ciudadEdit);
  const cambiosBase = {
   direccion: direccion.trim()||pedido.direccion,
   cajas: parseInt(cajas)||pedido.cajas,
   factura: facturaEdit.trim()||pedido.factura,
   ciudad_codigo: ciudadEdit||pedido.ciudad_codigo,
   ciudad_nombre: ciudad?.name||pedido.ciudad_nombre||"",
   fecha_estimada: fechaEdit||pedido.fecha_estimada||null,
  };
  if (canBasicEdit && pedidoCerrado && tieneSoportes) {
   cambiosBase.estado = novedad ? "novedad" : "entregado";
   cambiosBase.novedad = novedad;
  }
  const cambios = canBasicEdit && !canEdit && !canAssign ? cambiosBase : {
   ...cambiosBase,
   ...(canEdit || canAssign ? {
    conductor_id: c?.id||null,
    placa: c?.placa||null,
    nit_proveedor: c?.nit_proveedor||null,
    estado: nuevoEstado,
    ...(debeMarcarDespacho ? { fecha_despacho: fechaDespacho } : {}),
   } : {}),
   ...(canEdit ? {
    estado_despacho: estadoDesp,
    novedad,
    tipo: tipoModal,
    empresa_transporte: tipoModal==="empresa_transporte" ? (empTrans||c?.empresa||null) : null,
    paqueteria: tipoModal==="paqueteria" ? paqModal : null,
    guia_paqueteria: tipoModal==="paqueteria" ? guiaPaq : null,
   } : {}),
  };
  setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambios}:p));

  showToast("Guardando...","info");
  const { data: upd, error } = await supabase.from("pedidos").update(cambios).eq("id", pedido.id).select().single();
  if (error) { showToast(mensajeError(error, "los cambios del pedido"),"error"); return; }
  showToast(" Cambios guardados Estado: "+nuevoEstado,"success");
  onClose();
  setTimeout(()=>{ if(window._recargar) window._recargar(); }, 200);
 };


 const subirFotos = async (fotos) => {
  if (pedidoCerrado) {
   showToast("No se puede modificar un pedido que ya fue entregado","error");
   return;
  }
  if (pedidoEnTransito && !canDeliver) {
   showToast("Solo el conductor puede registrar la entrega de un pedido en transito","error");
   return;
  }
  const hoy = new Date().toISOString().split("T")[0];
  const nombres = fotos.map((_,i)=>`soporte_${pedido.id}_${i+1}.jpg`);
  const conNovedad = Boolean(novedadEntrega);
  const estadoFinal = conNovedad ? "novedad" : "entregado";
  const nuevosSoportes = [...(pedido.soportes||[]),...nombres];
  const nuevosSoportesData = [...(pedido.soportes_data||[]),...fotos];
  const cambios = {
   soportes: nuevosSoportes,
   soportes_data: nuevosSoportesData,
   estado: estadoFinal,
   fecha_real: hoy,
   novedad: conNovedad,
  };
  setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambios}:p));
  try {
   const { error: sErr } = await supabase.from('pedidos').update(cambios).eq('id', pedido.id);
   if (sErr) {
    await supabase.from('pedidos').update({
     estado: estadoFinal, fecha_real: hoy, novedad: conNovedad, soportes: cambios.soportes
    }).eq('id', pedido.id);
    showToast(" Estado guardado. Fotos muy pesadas usa imagenes mas pequenas", "warning");
   } else {
    showToast(`${fotos.length} soporte(s) guardados. Estado: ${estadoFinal==="entregado"?"Entregado":"Con Novedad"}. Fecha: ${hoy}`,"success");
   }
  } catch(e) {
   showToast("Error de conexion al guardar soportes. Revisa tu internet.", "error");
  }
  if(window._recargar) await window._recargar();
  setVerCamara(false);
  onClose();
 };

 const caPrev = condId!==(pedido.conductor_id?.toString()||"") && condId!=="";

 return (
  <Modal title={`Pedido ${pedido.id}${pedido.guia_interna?" - "+pedido.guia_interna:""}`} onClose={onClose} wide>
   <div style={{display:"flex",flexDirection:"column",gap:16}}>

    <div style={{background:P[50],borderRadius:12,padding:16}}>
     <div style={{fontWeight:800,fontSize:16,color:P[800],marginBottom:10}}>{pedido.cliente}</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
      {pedido.ciudad_origen_nombre&&<span> Origen: <strong>{pedido.ciudad_origen_nombre}</strong>{pedido.direccion_origen&&` ${pedido.direccion_origen}`}</span>}
      <span>Ciudad destino: {ciudad?.name} ({pedido.ciudad_codigo})</span>
      <span>Factura: {pedido.factura}</span>
      <span>Estimado: {pedido.fecha_estimada||""}</span>
      {fechaLimitePromesa&&<span>Limite promesa: {fechaLimitePromesa} ({promesa.dias_plazo} dia(s))</span>}
      <span>Fuente riesgo: {fuenteRiesgo}</span>
      <span>Real: {pedido.fecha_real||"Pendiente"}</span>
      {pedido.guia_interna&&<span style={{fontFamily:"monospace",color:P[600],fontWeight:700}}>{pedido.guia_interna}</span>}
     </div>
     {pedido.notas&&<p style={{margin:"8px 0 0",fontSize:12,color:"#94a3b8"}}>{pedido.notas}</p>}
    </div>

    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
     <span style={{fontSize:13,fontWeight:700,color:P[800]}}>Estado actual:</span>
     <Badge estado={pedido.estado}/>
     {pedido.novedad&&<span style={{fontSize:12,color:"#dc2626",fontWeight:700}}>Con Novedad</span>}
     <span style={{fontSize:11,color:"#94a3b8"}}>(automatico)</span>
    </div>
    {pedidoCerrado&&(
     <div style={{background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:10,padding:12,color:"#475569",fontSize:13,fontWeight:700}}>
      Pedido cerrado: no se permiten modificaciones despues de la entrega.
     </div>
    )}
    {!pedidoCerrado&&pedidoEnTransito&&!canDeliver&&(
     <div style={{background:"#fff7ed",border:"1px solid #fdba74",borderRadius:10,padding:12,color:"#9a3412",fontSize:13,fontWeight:700}}>
      Pedido en transito: solo el conductor asignado puede registrar soporte de entrega y novedad.
     </div>
    )}

    {pedido.tipo==="paqueteria"&&(
     <div style={{background:"#ecfeff",borderRadius:10,padding:14,border:"1px solid #67e8f9"}}>
      <span style={{fontWeight:700,color:"#0891b2"}}>{pedido.paqueteria}</span>
      <span style={{marginLeft:14,color:"#0e7490"}}>Guia: <strong style={{fontFamily:"monospace"}}>{pedido.guia_paqueteria}</strong></span>
     </div>
    )}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
     <Field label="Direccion de entrega" value={direccion} onChange={setDireccion} placeholder="Cra 15 #93-47" disabled={pedidoBloqueadoEdicion}/>
     <Field label="Ciudad destino" value={ciudadEdit} onChange={setCiudadEdit} as="select"
      options={[{value:"",label:" Seleccione "},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} ${c.code}`}))]}
      disabled={pedidoBloqueadoEdicion}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
     <Field label="Cajas" value={cajas} onChange={setCajas} type="number" placeholder="10" disabled={pedidoBloqueadoEdicion}/>
     <Field label="No. Factura (editable)" value={facturaEdit} onChange={setFacturaEdit} placeholder="FAC-3000" disabled={pedidoBloqueadoEdicion}/>
     <Field label="Fecha Estimada" value={fechaEdit} onChange={setFechaEdit} type="date" disabled={pedidoBloqueadoEdicion}/>
    </div>

    {canEdit&&(
     <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Field label="Tipo de Transporte" value={tipoModal} onChange={setTipoModal} as="select"
       options={[
        {value:"propio",label:" Transporte Propio"},
        {value:"empresa_transporte",label:" Empresa Transportista"},
        {value:"mensajeria",label:" Mensajeria"},
        {value:"paqueteria",label:" Paqueteria Tercero"},
       ]}
       disabled={pedidoBloqueadoEdicion}/>
      {tipoModal==="paqueteria"?(
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="Paqueteria" value={paqModal} onChange={setPaqModal} placeholder="Servientrega, TCC..." disabled={pedidoBloqueadoEdicion}/>
        <Field label="No. Guia" value={guiaPaq} onChange={setGuiaPaq} placeholder="SRV-2026-XXXX" disabled={pedidoBloqueadoEdicion}/>
       </div>
      ):(
       <div>
        <Field label="Asignar Conductor" value={condId} onChange={v=>{
         setCondId(v);
         // Auto-fill empresa from conductor
         const c = conductores.find(cx=>String(cx.id)===String(v));
         if(c && tipoModal==="empresa_transporte") setEmpTrans(c.empresa||c.nit_proveedor||"");
        }} as="select"
         options={[
          {value:"",label:"Sin asignar"},
          ...(tipoModal==="empresa_transporte"
           ? conductoresOpciones.filter(c=>String(c.id)===String(condId)||(c.nit_proveedor||(c.empresa&&c.empresa.trim())))
           : conductoresOpciones
          ).map(c=>({value:c.id,label:`${c.nombre} - ${c.placa}${c.empresa?" - "+c.empresa:""}`}))
         ]}
         disabled={pedidoBloqueadoEdicion}/>
        {caPrev&&<p style={{fontSize:11,color:P[600],margin:"6px 0 0",fontWeight:700}}>Al guardar el estado cambiar a En Transito.</p>}
       </div>
      )}
     </div>
    )}

    {canAssign&&tipoModal!=="paqueteria"&&(
     <div>
      <Field label="Asignar Conductor" value={condId} onChange={v=>{
       setCondId(v);
       const c = conductores.find(cx=>String(cx.id)===String(v));
       if(c && tipoModal==="empresa_transporte") setEmpTrans(c.empresa||c.nit_proveedor||"");
      }} as="select"
       options={[
        {value:"",label:"Sin asignar"},
        ...(tipoModal==="empresa_transporte"
         ? conductoresOpciones.filter(c=>String(c.id)===String(condId)||(c.nit_proveedor||(c.empresa&&c.empresa.trim())))
         : conductoresOpciones
        ).map(c=>({value:c.id,label:`${c.nombre} - ${c.placa}${c.empresa?" - "+c.empresa:""}`}))
       ]}
       disabled={pedidoBloqueadoEdicion}/>
      {caPrev&&<p style={{fontSize:11,color:P[600],margin:"6px 0 0",fontWeight:700}}>Al guardar el estado cambiara a En Transito.</p>}
     </div>
    )}

    {!canEdit&&!canAssign&&cond&&(
     <div style={{background:"#eff6ff",borderRadius:10,padding:12}}>
      <span style={{fontSize:13,color:"#1e40af"}}>
       {cond.nombre} - Placa: {pedido.placa}{cond.cedula&&` - CC: ${cond.cedula}`}{cond.celular&&` - Tel: ${cond.celular}`}
      </span>
     </div>
    )}

    {canEdit&&(
     <Field label="Estado de Despacho" value={estadoDesp} onChange={setEstadoDesp} as="select"
      options={[
       {value:"despachado",label:"Despachado"},
       {value:"bloqueado",label:"Bloqueado Cartera"},
       {value:"novedad_despacho",label:"Despachado con Novedad"},
      ]}
      disabled={pedidoBloqueadoEdicion}/>
    )}

    <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:puedeMarcarNovedadEntrega?"pointer":"not-allowed",opacity:puedeMarcarNovedadEntrega?1:0.65}}
     onClick={()=>{ if (puedeMarcarNovedadEntrega) setNovedad(!novedad); }}>
     <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>v</span>}
     </div>
     <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>
      {pedidoCerrado&&tieneSoportes ? "Entrega con Novedad" : "Entregar con Novedad al cargar soporte"}
     </span>
     {novedad&&<span style={{fontSize:11,color:"#dc2626",marginLeft:4}}>
      {pedidoCerrado&&tieneSoportes ? "Guardar Cambios actualizara la novedad." : "La novedad se aplicara al cargar fotos y marcar entregado."}
     </span>}
    </div>

    <div>
     <div style={{fontWeight:700,fontSize:13,color:P[800],marginBottom:10}}>Soportes Fotograficos de Entrega</div>
     {(pedido.soportes_data||[]).length>0?(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:12}}>
       {(pedido.soportes_data||[]).map((s,i)=>(
        <div key={i} style={{borderRadius:8,overflow:"hidden",border:`2px solid ${P[200]}`}}>
         <img src={s.data} alt={"s"+i} style={{width:"100%",height:90,objectFit:"cover",display:"block"}} />
         <div style={{fontSize:10,color:P[700],padding:"4px 8px",fontWeight:600,background:P[50]}}>Soporte {i+1}</div>
        </div>
       ))}
      </div>
     ):(pedido.soportes||[]).length>0?(
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
       {(pedido.soportes||[]).map((s,i)=>(
        <div key={i} style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"5px 12px",fontSize:12,color:"#15803d"}}>{s}</div>
       ))}
      </div>
     ):(
      <p style={{color:"#94a3b8",fontSize:13,margin:"0 0 10px"}}>Sin soportes fotograficos.</p>
     )}
     <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {!pedidoCerrado&&(!pedidoEnTransito||canDeliver)&&(pedido.soportes||[]).length<3&&(
     <Btn variant="success" onClick={()=>{ setNovedadEntrega(novedad); setVerCamara(true); }}>
        Cargar Fotos (max 3) y Marcar Entregado
       </Btn>
      )}
      {(pedido.soportes_data||[]).length>0&&(
       <Btn variant="secondary" onClick={()=>generarPDFSoportes(pedido,[])}>Ver PDF Soportes</Btn>
      )}
     </div>
    </div>

    <div>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontWeight:700,fontSize:13,color:P[800]}}>Mapa de destino</span>
      <Btn size="sm" variant={verMapa?"danger":"secondary"} onClick={()=>setVerMapa(!verMapa)}>{verMapa?"Ocultar":"Ver Mapa"}</Btn>
     </div>
     {verMapa&&(
      <div style={{borderRadius:12,overflow:"hidden",border:`2px solid ${P[200]}`}}>
       <iframe title="mapa" width="100%" height="240" style={{border:"none",display:"block"}}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(direccion+", "+(ciudad?.name||"")+", Colombia")}&output=embed&z=14`}
        allowFullScreen loading="lazy"/>
      </div>
     )}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
     <Btn variant="secondary" size="sm" onClick={()=>setVerGuia(true)}>Ver Guia / Planilla</Btn>
     <div style={{display:"flex",gap:10}}>
      <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
      {(canEdit||canBasicEdit)&&!pedidoBloqueadoEdicion&&<Btn onClick={guardar}>Guardar Cambios</Btn>}
     </div>
    </div>
   </div>
   {verGuia&&<GuiaImprimible pedido={pedido} conductores={conductores} ciudades={ciudades} onClose={()=>setVerGuia(false)}/>}
   {verCamara&&<CargadorFotos pedido={pedido} onGuardar={subirFotos} onClose={()=>setVerCamara(false)} showToast={showToast}/>}
  </Modal>
 );
}

// ModalCSVGuias 

function ModalCSVGuias({ onClose, pedidos, ciudades = [], showToast, recargar }) {
 const [archivo,  setArchivo]  = useState("");
 const [matches,  setMatches]  = useState([]);
 const [errores,  setErrores]  = useState([]); // duplicate pedidoId in CSV
 const [err,    setErr]    = useState("");
 const [cargando,  setCargando] = useState(false);
 const [aplicando, setAplicando] = useState(false);
 const [resultado, setResultado] = useState(null);
 const [sobrescribir, setSobrescribir] = useState(false);
 const fileRef = useRef(null);

 // Parsear CSV 
 const parsear = (texto) => {
  const lineas = texto.trim().split(/\r?\n/).filter(l => l.trim());
  if (lineas.length < 2) throw new Error("El archivo est vaco o solo tiene encabezado.");
  const sep = lineas[0].includes(";") ? ";" : ",";
  const hdrs = lineas[0].split(sep).map(h =>
   h.trim().replace(/"/g,"").toLowerCase().replace(/\.\d+$/,"")
  );

  const col = (...names) => {
   for (const n of names) {
    const i = hdrs.findIndex(h => h.includes(n));
    if (i !== -1) return i;
   }
   return -1;
  };

  const iGuia  = col("guia");
  const iEstado = col("estado_pro","estado");
  const iPedido = col("pedido_pro","pedido");
  const iFactura = col("factura_pro","factura");
  const iPaq   = col("paqueteria","paqueteria","carrier");
  const iDestino = col("dane_destino","destino");
  const iCajas  = col("total_cajas","cajas");

  if (iGuia === -1 || iEstado === -1 || iPedido === -1)
   throw new Error(`Columnas requeridias no encontradias. Necesitas: Guia, Estado_Pro, Pedido_Pro. Detectadias: ${hdrs.join(", ")}`);

  return lineas.slice(1).map(l => {
   const c = l.split(sep).map(x => x.trim().replace(/^"|"$/g,""));
   return {
    guia:    c[iGuia]  || "",
    estadoRaw: c[iEstado] || "",
    pedidoId:  (c[iPedido] || "").trim(),
    factura:  iFactura !== -1 ? c[iFactura] || "" : "",
    paqueteria: iPaq   !== -1 ? c[iPaq]   || "" : "",
    destino:  iDestino !== -1 ? c[iDestino] || "" : "",
    cajas:   iCajas  !== -1 ? parseInt(c[iCajas])||0 : 0,
   };
  }).filter(r => r.guia && r.pedidoId);
 };

 // Procesar filas 
 const procesar = (rows) => {
  const hoy = new Date().toISOString().split("T")[0];

  // Detect duplicates WITHIN the CSV (same Pedido_Pro more than once)
  const conteo = {};
  rows.forEach(r => { conteo[r.pedidoId] = (conteo[r.pedidoId] || 0) + 1; });
  const dupsCsv = Object.entries(conteo).filter(([,n]) => n > 1).map(([id]) => id);

  // Build match list only non-duplicate rows
  const vistos = new Set();
  const lista = [];
  for (const r of rows) {
   if (dupsCsv.includes(r.pedidoId)) continue; // skip duplicates, report separately
   if (vistos.has(r.pedidoId)) continue;
   vistos.add(r.pedidoId);

   const pedido  = pedidos.find(p => String(p.id).trim() === r.pedidoId);
   const estadoN  = r.estadoRaw.toLowerCase().includes("entregado") ? "entregado" : "en_transito";
   const mismaGuia = pedido?.guia_paqueteria === r.guia;
   const estadoCambio = mismaGuia && pedido?.estado !== estadoN;
   lista.push({
    pedidoId:   r.pedidoId,
    guia:     r.guia,
    pedido,
    encontrado:  !!pedido,
    estadoNuevo: estadoN,
    estadoActual: pedido?.estado || "",
    paqueteria:  r.paqueteria || pedido?.paqueteria || "",
    destino:   r.destino,
    factura:   r.factura,
    cajasCsv:   r.cajas,
    yaConGuia:  !!(pedido?.guia_paqueteria),
    guiaActual:  pedido?.guia_paqueteria || "",
    mismaGuia,
    estadoCambio,
    fechaReal:  estadoN === "entregado" ? hoy : null,
   });
  }

  return { lista, dupsCsv };
 };

 // Leer archivo 
 const leerArchivo = (file) => {
  if (!file) return;
  setArchivo(file.name); setErr(""); setMatches([]); setErrores([]); setResultado(null);
  setCargando(true);
  const reader = new FileReader();
  reader.onload = (e) => {
   try {
    const rows = parsear(e.target.result);
    const { lista, dupsCsv } = procesar(rows);
    setMatches(lista);
    setErrores(dupsCsv);
   } catch(ex) { setErr(ex.message); }
   setCargando(false);
  };
  reader.onerror = () => { setErr("Error leyendo el archivo."); setCargando(false); };
  reader.readAsText(file, "UTF-8");
 };

 // Aplicar 
 const aplicar = async () => {
  const paraActualizar = matches.filter(m =>
   m.encontrado && (
    !m.yaConGuia ||     // no tiene guia an siempre actualiza
    m.estadoCambio ||    // misma guia pero estado cambi actualiza automatico
    sobrescribir       // guia diferente y usuario marc sobreescribir
   )
  );
  if (!paraActualizar.length) { showToast("No hay pedidos para actualizar.","error"); return; }
  setAplicando(true);
  let ok = 0; let fallos = 0;

  // Fecha estimada = hoy + 2 dias
  const fechaEst = new Date();
  fechaEst.setDate(fechaEst.getDate() + 2);
  const fechaEstStr = fechaEst.toISOString().split("T")[0];

  for (const m of paraActualizar) {
   const cambios = {
    guia_paqueteria: m.guia,
    estado:     m.estadoNuevo,
    tipo:      "paqueteria",
    paqueteria:   m.paqueteria || null,
    fecha_estimada: m.pedido.fecha_estimada || fechaEstStr,
   };
   if (m.cajasCsv > 0) cambios.cajas = m.cajasCsv;
   if (m.destino) {
    cambios.ciudad_codigo = m.destino;
    // Intentar resolver nombre si existe en ciudades
    const ciudad = (ciudades||[]).find(c => c.code === m.destino);
    if (ciudad) cambios.ciudad_nombre = ciudad.name;
   }
   if (m.factura) cambios.factura = m.factura; // actualiza factura del CSV
   if (m.fechaReal) cambios.fecha_real = m.fechaReal;

   const { error } = await supabase.from("pedidos").update(cambios).eq("id", m.pedidoId);
   if (error) { fallos++; console.error(m.pedidoId, error.message); }
   else ok++;
  }

  setAplicando(false);
  setResultado({ ok, fallos, noMatch: matches.filter(m=>!m.encontrado).length,
   omitidos: matches.filter(m=>m.yaConGuia&&!m.estadoCambio&&!sobrescribir).length });
  showToast(` ${ok} actualizado(s)${fallos?" "+fallos+" error(es)":""}`, ok>0?"success":"error");
  if (ok > 0 && recargar) await recargar();
 };

 // Contadores 
 const encontrados = matches.filter(m => m.encontrado);
 const noEncontrados= matches.filter(m => !m.encontrado);
 const conGuiaYa  = encontrados.filter(m => m.yaConGuia);
 const autoUpdate = encontrados.filter(m => m.estadoCambio); // same guia, state changed
 const guiaDiferente = encontrados.filter(m => m.yaConGuia && !m.estadoCambio); // need confirm
 const sinGuia   = encontrados.filter(m => !m.yaConGuia);

 return (
  <Modal title=" Cargar Guias de Paqueteria" onClose={onClose} wide>
   <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

    {/* Info */}
    <div style={{ background:"#eff6ff", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#1e40af" }}>
     <strong>Regla:</strong> 1 pedido = 1 guia. Columnas requeridias: <code>Guia Estado_Pro Pedido_Pro</code>.
     <br/><span style={{fontSize:12,color:"#64748b"}}>El match se hace por <strong>Pedido_Pro = No. Pedido</strong> en el sistema. Acepta CSV con coma o punto y coma.</span>
    </div>

    {/* Drop zone */}
    {!matches.length && !resultado && (
     <div style={{ border:`2px dashed ${cargando?"#7c3aed":"#e2e8f0"}`, borderRadius:12,
      padding:"28px 20px", textAlign:"center", cursor:"pointer", background:archivo?"#f5f3ff":"#fafafa" }}
      onClick={()=>fileRef.current?.click()}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();leerArchivo(e.dataTransfer.files[0]);}}>
      <div style={{fontSize:36,marginBottom:8}}>{cargando?"":""}</div>
      {cargando ? <div style={{color:"#7c3aed",fontWeight:700}}>Procesando...</div>
       : archivo ? <div style={{color:"#059669",fontWeight:700}}> {archivo}</div>
       : <div style={{color:"#64748b",fontWeight:600}}>Clic o arrastra el archivo CSV aqu</div>}
     </div>
    )}
    <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}}
     onChange={e=>leerArchivo(e.target.files[0])}/>

    {/* Error de parseo */}
    {err && <div style={{background:"#fef2f2",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",fontWeight:600}}> {err}</div>}

    {/* Duplicados dentro del CSV bloquea esos registros */}
    {errores.length > 0 && (
     <div style={{background:"#fef2f2",border:"2px solid #fca5a5",borderRadius:10,padding:"12px 16px"}}>
      <div style={{fontWeight:800,color:"#dc2626",marginBottom:6}}>
        {errores.length} pedido(s) duplicados en el CSV no se cargarn
      </div>
      <div style={{fontSize:12,color:"#991b1b",fontFamily:"monospace"}}>
       {errores.join(" ")}
      </div>
      <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
       El CSV tiene mas de una fila con el mismo Pedido_Pro. Corrgelo en el archivo y vuelve a cargar.
      </div>
     </div>
    )}

    {/* Resultado final */}
    {resultado && (
     <div style={{background:resultado.ok>0?"#ecfdf5":"#fef2f2",borderRadius:12,padding:16,
      border:`2px solid ${resultado.ok>0?"#86efac":"#fca5a5"}`}}>
      <div style={{fontWeight:800,fontSize:15,color:resultado.ok>0?"#059669":"#dc2626",marginBottom:10}}>
       {resultado.ok>0?" Actualizacin completada":" Sin actualizaciones"}
      </div>
      <div style={{fontSize:13,color:"#334155",display:"flex",flexDirection:"column",gap:4}}>
       <span> <strong>{resultado.ok}</strong> pedido(s) actualizados con guia y estado</span>
       {resultado.omitidos>0&&<span> <strong>{resultado.omitidos}</strong> omitidos (ya tenan guia, no se marc sobreescribir)</span>}
       {resultado.noMatch>0&&<span> <strong>{resultado.noMatch}</strong> no encontrados en el sistema</span>}
       {resultado.fallos>0&&<span> <strong>{resultado.fallos}</strong> error(es) en Supabase</span>}
      </div>
      <Btn size="sm" variant="secondary" style={{marginTop:12}} onClick={onClose}>Cerrar</Btn>
     </div>
    )}

    {/* Preview */}
    {matches.length>0 && !resultado && (
     <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
       {[
        {l:"En CSV",     v:matches.length,    c:"#7c3aed",bg:"#f5f3ff"},
        {l:"Encontrados",  v:encontrados.length,  c:"#059669",bg:"#ecfdf5"},
        {l:"No encontrados", v:noEncontrados.length, c:"#dc2626",bg:"#fef2f2"},
        {l:"Ya con guia",  v:conGuiaYa.length,   c:"#d97706",bg:"#fffbeb"},
       ].map(s=>(
        <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"10px 14px",textAlign:"center",border:`1px solid ${s.c}30`}}>
         <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
         <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginTop:3}}>{s.l}</div>
        </div>
       ))}
      </div>

      {/* Opcin sobreescribir */}
      {autoUpdate.length>0&&(
       <div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:"#059669",fontSize:13}}>
          {autoUpdate.length} pedido(s) se actualizarn automaticamente
        </div>
        <div style={{fontSize:11,color:"#065f46",marginTop:3}}>
         Misma guia, estado cambia de {autoUpdate[0]?.estadoActual} {autoUpdate[0]?.estadoNuevo}. No requiere confirmacin.
        </div>
       </div>
      )}
      {guiaDiferente.length>0&&(
       <div style={{display:"flex",alignItems:"center",gap:10,background:"#fffbeb",
        border:"1px solid #fcd34d",borderRadius:10,padding:"12px 16px",cursor:"pointer"}}
        onClick={()=>setSobrescribir(!sobrescribir)}>
        <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${sobrescribir?"#d97706":"#94a3b8"}`,
         background:sobrescribir?"#d97706":"transparent",flexShrink:0,
         display:"flex",alignItems:"center",justifyContent:"center"}}>
         {sobrescribir&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}></span>}
        </div>
        <div>
         <div style={{fontWeight:700,color:"#92400e",fontSize:13}}>Sobreescribir guias diferentes ({guiaDiferente.length} pedido(s))</div>
         <div style={{fontSize:11,color:"#78716c"}}>Estos pedidos ya tienen otra guia asignada. Marca para reemplazarla.</div>
        </div>
       </div>
      )}

      {/* Tabla preview */}
      <div style={{maxHeight:300,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,fontSize:12}}>
       <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead style={{position:"sticky",top:0,background:"#f8fafc",zIndex:1}}>
         <tr>
          {["","No. Pedido","Cliente","Guia nueva","Guia actual","Estado nuevo","Paqueteria"].map(h=>(
           <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:"#475569",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
          ))}
         </tr>
        </thead>
        <tbody>
         {matches.map((m,i)=>{
          const omitir = m.yaConGuia && !sobrescribir;
          const bg = !m.encontrado?"#fef2f2":omitir?"#fffbeb":i%2?"#fafafa":"#fff";
          return (
           <tr key={m.pedidoId} style={{borderTop:"1px solid #f1f5f9",background:bg}}>
            <td style={{padding:"8px 12px",fontSize:15}}>
             {!m.encontrado?"":omitir?"":""}
            </td>
            <td style={{padding:"8px 12px",fontWeight:700,
             color:!m.encontrado?"#dc2626":omitir?"#d97706":"#7c3aed",fontFamily:"monospace"}}>
             {m.pedidoId}
            </td>
            <td style={{padding:"8px 12px",color:"#334155",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
             {m.pedido?.cliente||<span style={{color:"#dc2626",fontSize:11}}>No encontrado</span>}
            </td>
            <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#0891b2",fontSize:11}}>{m.guia}</td>
            <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#94a3b8",fontSize:11}}>
             {m.guiaActual||<span style={{color:"#cbd5e1"}}></span>}
            </td>
            <td style={{padding:"8px 12px"}}>
             <span style={{background:m.estadoNuevo==="entregado"?"#ecfdf5":"#eff6ff",
              color:m.estadoNuevo==="entregado"?"#059669":"#2563eb",
              borderRadius:12,padding:"2px 8px",fontWeight:700,fontSize:11}}>
              {m.estadoNuevo==="entregado"?" Entregado":" En Transito"}
             </span>
            </td>
            <td style={{padding:"8px 12px",color:"#64748b"}}>{m.paqueteria||""}</td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>

      {noEncontrados.length>0&&(
       <div style={{background:"#fffbeb",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e"}}>
        <strong> No encontrados en sistema:</strong> {noEncontrados.map(m=>m.pedidoId).join(", ")}
        <br/><span style={{color:"#78716c",fontSize:11}}>Verifica que el Pedido_Pro coincida exactamente con el N de pedido del sistema.</span>
       </div>
      )}

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>{setMatches([]);setArchivo("");setErrores([]);}}> Cambiar archivo</Btn>
       <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
       <Btn disabled={aplicando||encontrados.filter(m=>!m.yaConGuia||m.estadoCambio||sobrescribir).length===0} onClick={aplicar}>
        {aplicando?" Aplicando...":` Aplicar ${encontrados.filter(m=>!m.yaConGuia||m.estadoCambio||sobrescribir).length} actualizacin(es)`}
       </Btn>
      </div>
     </>
    )}
   </div>
  </Modal>
 );
}


function ModalCSVPedidos({ onClose, onImportar, ciudades }) {
 const [txt,    setTxt]    = useState("");
 const [prev,   setPrev]   = useState([]);
 const [err,    setErr]    = useState("");
 const [cargando, setCargando] = useState(false);
 const [nombreArchivo, setNombreArchivo] = useState("");
 const fileRef = useRef(null);

 const CABECERA = "id,cliente,ciudad_codigo,direccion,cajas,factura,fecha_estimada,tipo,empresa_transporte,paqueteria,guia_paqueteria,notas,ciudad_origen_codigo,ciudad_origen_nombre,direccion_origen";
 const EJEMPLO = "PT000001,Empresa Ejemplo S.A.S,11001,Cra 10 #20-30 Of 201,5,FAC-3000,2026-05-10,propio,,,,Fragil,05001,Medellin,Bodega Principal\nPT000002,Comercio del Norte,76001,Av 6N #23-10,12,FAC-3001,2026-05-12,paqueteria,,Servientrega,SRV-001,,,,";


 // Leer archivo CSV desde el disco
 const leerArchivo = (file) => {
  if (!file) return;
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
   setErr("Solo se aceptan archivos .CSV"); return;
  }
  setNombreArchivo(file.name);
  const reader = new FileReader();
  reader.onload = (e) => {
   const texto = e.target.result;
   setTxt(texto);
   setErr("");
   // Auto-previsualizar
   try { setPrev(parsear(texto)); }
   catch(ex) { setErr(ex.message); setPrev([]); }
  };
  reader.readAsText(file, 'UTF-8');
 };

 const parsear = (texto) => {
  // Handle both comma and semicolon separators
  const lineas = texto.trim().split("\n").filter(l => l.trim());
  if (lineas.length < 2) throw new Error("Se necesita encabezado y al menos una fila de datos.");
  // Detect separator
  const sep = lineas[0].includes(';') ? ';' : ',';
  const hdrs = lineas[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g,''));
  return lineas.slice(1).map((l, idx) => {
   // Handle quoted fields
   const cols = l.split(sep).map(c => c.trim().replace(/^"|"$/g,''));
   const obj = {};
   hdrs.forEach((h, i) => { obj[h] = cols[i] || ""; });
   const codigoCiudad = (obj.ciudad_codigo||'').trim();
   const ciudad = codigoCiudad ? (ciudades||[]).find(c => c.code === codigoCiudad) : null;
   const ciudadOrigen = (ciudades||[]).find(c => c.code === obj.ciudad_origen_codigo);
   const esPaq = obj.tipo === "paqueteria";
   return {
    id:      obj.id || `IMP-${Date.now()}-${idx}`,
    guia_interna: null,
    cliente:    obj.cliente || "Sin nombre",
    ciudad_codigo: ciudad?.code || codigoCiudad || "",
    ciudad_nombre: ciudad?.name || obj.ciudad_nombre || "",
    direccion:   obj.direccion || "",
    cajas:     parseInt((obj.cajas||'').trim()) || 0,
    factura:    obj.factura || "",
    fecha_estimada:obj.fecha_estimada || null,
    notas:     obj.notas || "",
    tipo:     esPaq?"paqueteria":obj.tipo==="empresa_transporte"?"empresa_transporte":obj.tipo==="mensajeria"?"mensajeria":"propio",
    empresa_transporte: obj.empresa_transporte || null,
    paqueteria:  esPaq ? obj.paqueteria : null,
    guia_paqueteria: esPaq ? obj.guia_paqueteria : null,
    ciudad_origen_codigo: obj.ciudad_origen_codigo || null,
    ciudad_origen_nombre: ciudadOrigen?.name || obj.ciudad_origen_nombre || null,
    direccion_origen: obj.direccion_origen || null,
    conductor_id: null, placa: null, nit_proveedor: null,
    estado:    esPaq ? "paqueteria" : "sin_asignar",
    estado_despacho: "despachado", novedad: false,
    fecha_creacion: new Date().toISOString().split("T")[0],
    fecha_real: null, soportes: [], soportes_data: [],
   };
  });
 };

 const importar = async () => {
  if (prev.length === 0) { setErr("Primero carga un archivo o previsualiza el contenido."); return; }
  setCargando(true);
  try {
   await onImportar(prev);
  } catch(e) {
   setErr("Error importando: " + e.message);
  }
  setCargando(false);
 };

 return (
  <Modal title="Importar Pedidos desde CSV" onClose={onClose} wide>
   <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

    {/* Info columnas */}
    <div style={{ background: "#fffbeb", borderRadius: 10, padding: 12, fontSize: 13, color: "#92400e" }}>
     <strong>Columnas requeridias:</strong> id, cliente, ciudad_codigo, direccion, cajas, factura, fecha_estimada, tipo<br/>
     <strong>Opcionales:</strong> empresa_transporte, paqueteria, guia_paqueteria, notas, ciudad_origen_codigo, ciudad_origen_nombre, direccion_origen
    </div>

    {/* Descargar plantilla */}
    <Btn size="sm" variant="success"
     onClick={()=>descargarCSV("plantilla_pedidos.csv", CABECERA, EJEMPLO)}>
      Descargar Plantilla CSV
    </Btn>

    {/* Upload de archivo */}
    <div
     style={{ border: `2px dashed ${P[300]}`, borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: nombreArchivo ? "#f0fdf4" : P[50] }}
     onClick={()=>fileRef.current&&fileRef.current.click()}
     onDragOver={e=>{e.preventDefault();}}
     onDrop={e=>{e.preventDefault();leerArchivo(e.dataTransfer.files[0]);}}
    >
     <div style={{ fontSize: 32, marginBottom: 8 }}></div>
     {nombreArchivo ? (
      <div style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}> {nombreArchivo}</div>
     ) : (
      <>
       <div style={{ fontWeight: 700, color: P[700], fontSize: 14 }}>Haz clic para seleccionar el archivo CSV</div>
       <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>o arrastralo aqu Solo archivos .CSV</div>
      </>
     )}
    </div>
    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
     onChange={e=>leerArchivo(e.target.files[0])}/>

    {/* Tambin permite pegar texto */}
    <details style={{ fontSize: 13 }}>
     <summary style={{ cursor:"pointer", color:P[600], fontWeight:600 }}>Tambin puedes pegar el texto directamente</summary>
     <textarea value={txt} onChange={e=>{setTxt(e.target.value);setNombreArchivo("");}} rows={5}
      style={{ ...iSt, fontFamily:"monospace", fontSize:11, resize:"vertical", marginTop:8 }}
      placeholder="Pega el contenido CSV aqu..."/>
     <Btn size="sm" variant="secondary" style={{ marginTop:6 }}
      onClick={()=>{setErr("");try{setPrev(parsear(txt));}catch(e){setErr(e.message);setPrev([]);}}}>
       Previsualizar texto
     </Btn>
    </details>

    {err && <p style={{ color:"#dc2626", background:"#fef2f2", padding:"8px 12px", borderRadius:8, fontSize:13, margin:0 }}> {err}</p>}

    {/* Preview */}
    {prev.length > 0 && (
     <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, border:"1px solid #86efac", maxHeight:200, overflowY:"auto" }}>
      <p style={{ margin:"0 0 8px", fontWeight:700, color:"#15803d", fontSize:13 }}> {prev.length} pedido(s) listos para importar:</p>
      {prev.map((p,i) => (
       <div key={i} style={{ fontSize:12, color:"#334155", padding:"2px 0", borderBottom:"1px solid #dcfce7" }}>
        <strong>{p.id}</strong> {p.cliente} {p.ciudad_nombre} {p.cajas} cajas {p.factura}
       </div>
      ))}
     </div>
    )}

    <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
     <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
     <Btn disabled={prev.length===0||cargando} onClick={importar}>
      {cargando ? " Importando..." : ` Importar (${prev.length})`}
     </Btn>
    </div>
   </div>
  </Modal>
 );
}

function Pedidos({ pedidos, setPedidos, conductores, ciudades, showToast, paqueterias, transportistas, promesas = [], recargar, user }) {
 const [filtro,  setFiltro]  = useState("todos");
 const [busq,   setBusq]   = useState("");
 const [modNuevo, setModNuevo] = useState(false);
 const [modDet,  setModDet]  = useState(null);
 const [modGuia,  setModGuia]  = useState(null);
 const [modCSV,  setModCSV]  = useState(false);
 const [modGuias, setModGuias] = useState(false);

 const vacio = { id: "", cliente: "", ciudad_codigo: "", direccion: "", cajas: "", factura: "", fecha_estimada: "", notas: "", conductor_id: "", tipo: "propio", paqueteria: "", guia_paqueteria: "" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p => ({ ...p, [k]: v }));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const filtrados = pedidos.filter(p => {
  const okF = filtro === "todos" || p.estado === filtro || (filtro === "paqueteria_tipo" && p.tipo === "paqueteria");
  const q  = busq.toLowerCase();
  const okB = !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.factura?.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
  return okF && okB;
 });

 const guardar = async () => {
  if (!form.id.trim() || !form.cliente.trim() || !form.ciudad_codigo || !form.factura.trim()) {
   showToast("No. Pedido, Factura, Cliente y Ciudad son obligatorios", "error"); return;
  }
  if (pedidos.find(p => p.id === form.id.trim())) {
   showToast("Ya existe un pedido con ese numero", "error"); return;
  }
  const ciudad = (ciudades||[]).find(c => c.code === form.ciudad_codigo);
  const ciudadOrigen = (ciudades||[]).find(c => c.code === form.ciudad_origen_codigo);
  const cond  = conductoresActivos.find(c => String(c.id) === String(form.conductor_id));
  const esPaq = form.tipo === "paqueteria";
  const guia_interna = !esPaq ? generarGuia(pedidos) : null;
  const nuevo = {
   id: form.id.trim(), guia_interna,
   cliente: form.cliente.trim(),
   ciudad_codigo: form.ciudad_codigo, ciudad_nombre: ciudad?.name || "",
   direccion: form.direccion.trim(), cajas: parseInt(form.cajas) || 0,
   factura: form.factura.trim(), fecha_estimada: form.fecha_estimada || null,
   notas: form.notas.trim(), tipo: form.tipo,
   empresa_transporte: form.tipo==="empresa_transporte"?form.empresa_transporte:null,
   paqueteria:   esPaq ? form.paqueteria : null,
   guia_paqueteria: esPaq ? form.guia_paqueteria.trim() : null,
   conductor_id:  cond ? cond.id : null,
   placa:      cond ? cond.placa : null,
   nit_proveedor:  cond ? cond.nit_proveedor : null,
   estado:     esPaq ? "paqueteria" : (cond ? "en_transito" : "sin_asignar"),
   fecha_despacho: cond ? new Date().toISOString().split("T")[0] : null,
   estado_despacho: form.estado_despacho || "despachado",
   ciudad_origen_codigo: form.ciudad_origen_codigo || null,
   ciudad_origen_nombre: ciudadOrigen?.name || null,
   direccion_origen: form.direccion_origen || null,
   novedad: false,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, soportes: [], soportes_data: [],
  };
  if (supabase) {
   const { error } = await supabase.from("pedidos").insert(nuevo);
   if (error) { showToast(mensajeError(error, "el pedido"),"error"); return; }
   if(recargar) await recargar(); else if(window._recargar) await window._recargar();
  } else {
   setPedidos(prev => [nuevo, ...prev]);
  }
  setModNuevo(false);
  setForm(vacio);
  showToast(` Pedido ${form.id} creado Guia: ${guia_interna||"N/A"}`, "success");
 };

 const imprimirPlanilla = () => {
  const win = window.open('', '_blank');
  if (!win) { showToast("Permite ventanas emergentes para imprimir", "error"); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Planilla Somos PRO Tracking</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#4c1d95;margin-bottom:4px}p{color:#64748b;margin:0 0 20px}
  table{width:100%;border-collapse:collapse}th{background:#f5f3ff;color:#4c1d95;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd6fe}
  td{padding:10px 12px;border-bottom:1px solid #ede9fe;font-size:13px}.badge{padding:3px 10px;border-radius:12px;font-weight:700;font-size:11px}
  .footer{margin-top:30px;font-size:10px;color:#94a3b8;text-align:center}</style></head>
  <body><h1>Planilla de Despachos Somos PRO Tracking</h1>
  <p>Fecha de impresion: ${new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})} Total pedidos: ${filtrados.length}</p>
  <table><thead><tr><th>#</th><th>No. Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad / DANE</th><th>Direccion</th><th>Cajas</th><th>Estado</th><th>Conductor / Paqueteria</th><th>Firma Recibido</th></tr></thead>
  <tbody>${filtrados.map((p, i) => {
   const cond = conductores.find(c => c.id === p.conductor_id);
   const trans = p.tipo === "paqueteria" ? ` ${p.paqueteria} ${p.guia_paqueteria}` : (cond ? `${cond.nombre} ${p.placa}` : "Sin asignar");
   return `<tr><td>${i+1}</td><td><strong>${p.id}</strong></td><td>${p.factura||""}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}<br/><small>${p.ciudad_codigo}</small></td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${trans}</td><td></td></tr>`;
  }).join("")}</tbody></table>
  <div class="footer">Somos PRO Tracking Documento generado automaticamente</div></body></html>`);
  win.print();
 };


 const handleImportarCSV = async (rows) => {
  const conGuias = rows.map((r,i) => ({
   ...r,
   guia_interna: r.tipo !== "paqueteria" ? generarGuia([...pedidos,...rows.slice(0,i)]) : null,
   estado_despacho: r.estado_despacho || "despachado",
   novedad: false,
   soportes_data: [],
  }));
  for (const p of conGuias) {
   const { error } = await supabase.from("pedidos").insert(p);
   if (error) { showToast("Error importando " + p.id + ": " + error.message, "error"); return; }
  }
  setModCSV(false);
  showToast(" " + rows.length + " pedido(s) importados", "success");
  if (recargar) await recargar();
 };

 return (
  <div>
   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
    <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}> Pedidos</h2>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
     <Btn variant="ghost" size="sm" onClick={imprimirPlanilla}> Planilla</Btn>
     <Btn variant="secondary" size="sm" onClick={() => setModCSV(true)}> CSV Pedidos</Btn>
     <Btn variant="secondary" size="sm" onClick={() => setModGuias(true)}> Cargar Guias Paqueteria</Btn>
     <Btn size="sm" onClick={() => setModNuevo(true)}>+ Nuevo Pedido</Btn>
    </div>
   </div>

   <Card style={{ padding: 14, marginBottom: 16 }}>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
     <input value={busq} onChange={e => setBusq(e.target.value)}
      placeholder=" Buscar por N pedido, factura, cliente o ciudad..."
      style={{ ...iSt, flex: 1, minWidth: 200 }} />
     <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...iSt, width: "auto" }}>
      <option value="todos">Todos los estados</option>
      {Object.entries(ESTADOS_PEDIDO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      <option value="paqueteria_tipo">Solo Paqueteria</option>
     </select>
    </div>
    <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
     {filtrados.length} de {pedidos.length} pedidos {filtrados.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0)} cajas
    </div>
   </Card>

   <Card style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ overflowX: "auto" }}>
     <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
       <tr style={{ background: P[50] }}>
        {["No. Pedido","Factura","Cliente","Ciudad / DANE","Cajas","Estado","Conductor / Paqueteria","Acciones"].map(h => (
         <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: P[700], fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
        ))}
       </tr>
      </thead>
      <tbody>
       {filtrados.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Sin pedidos</td></tr>}
       {filtrados.map((p, i) => {
        const cond = conductores.find(c => c.id === p.conductor_id);
        return (
         <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
          <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
          <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{p.factura}</td>
          <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
          <td style={{ padding: "11px 14px" }}>
           <div style={{ color: "#334155", fontSize: 13 }}>{p.ciudad_nombre}</div>
           <div style={{ fontFamily: "monospace", color: P[500], fontSize: 10 }}>{p.ciudad_codigo}</div>
          </td>
          <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700 }}>{p.cajas}</td>
          <td style={{ padding: "11px 14px" }}><Badge estado={p.estado} /></td>
          <td style={{ padding: "11px 14px", fontSize: 12 }}>
           {p.tipo === "paqueteria"
            ? <span style={{ color: "#0891b2" }}> {p.paqueteria}<br/><span style={{ fontFamily: "monospace", fontSize: 11 }}>{p.guia_paqueteria}</span></span>
            : cond ? <span>{cond.nombre}<br/><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{p.placa}</span></span>
                : <span style={{ color: "#ef4444" }}>Sin asignar</span>
           }
          </td>
          <td style={{ padding: "11px 14px" }}>
           <div style={{ display: "flex", gap: 6 }}>
            <Btn size="sm" variant="secondary" onClick={() => setModDet(p)}>Ver</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setModGuia(p)}>Guia</Btn>
           </div>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>
   </Card>

   {modNuevo && (
    <Modal title="Nuevo Pedido" onClose={() => setModNuevo(false)}>
     <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
       <Field label="N de Pedido" value={form.id} onChange={f("id")} required placeholder="PED-012" />
       <Field label="N de Factura" value={form.factura} onChange={f("factura")} required placeholder="FAC-3000" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
       <Field label="Cantidad de Cajas" value={form.cajas} onChange={f("cajas")} type="number" placeholder="10" />
       <Field label="Fecha Entrega Estimada" value={form.fecha_estimada} onChange={f("fecha_estimada")} type="date" />
      </div>
      <Field label="Nombre del Cliente / Destinatario" value={form.cliente} onChange={f("cliente")} required placeholder="Empresa Destino S.A.S" />
      <Field label="Ciudad de Entrega (Codigo DANE)" value={form.ciudad_codigo} onChange={f("ciudad_codigo")} required as="select"
       options={[{ value: "", label: " Seleccione ciudad " }, ...(ciudades||[]).map(c => ({ value: c.code, label: `${c.name} ${c.code}` }))]} />
      <Field label="Direccion de Entrega" value={form.direccion} onChange={f("direccion")} placeholder="Cra 15 #93-47 Of 302" />
      {/* ORIGEN CEDI de despacho */}
      <div style={{background:P[50],borderRadius:10,padding:"10px 14px",border:`1px solid ${P[200]}`}}>
       <div style={{fontSize:11,fontWeight:700,color:P[700],textTransform:"uppercase",marginBottom:10}}> Origen / CEDI de Despacho</div>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Ciudad Origen (DANE)" value={form.ciudad_origen_codigo} onChange={f("ciudad_origen_codigo")} as="select"
         options={[{value:"",label:" Sin especificar "},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} ${c.code}`}))]}/>
        <Field label="Direccion Origen / CEDI" value={form.direccion_origen} onChange={f("direccion_origen")} placeholder="Bodega principal, Cra 10 #5-20"/>
       </div>
      </div>
      <Field label="Tipo de Envio" value={form.tipo} onChange={f("tipo")} as="select"
       options={[{ value: "propio", label: " Transporte Propio" }, { value: "empresa_transporte", label: " Empresa Transportista" }, { value: "mensajeria", label: " Mensajeria" }, { value: "paqueteria", label: " Paqueteria Tercero" }]} />
      {form.tipo === "paqueteria" && (
       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Empresa Paqueteria" value={form.paqueteria} onChange={f("paqueteria")} as="select"
         options={[{ value: "", label: " Seleccione " }, ...(paqueterias||[]).filter(p=>typeof p==="string"&&p).map(p => ({ value: p, label: p }))]} />
        <Field label="No. Guia Paqueteria" value={form.guia_paqueteria} onChange={f("guia_paqueteria")} placeholder="SRV-2026-XXXXX" />
       </div>
      )}
      {form.tipo !== "paqueteria" && (
       <Field label="Asignar Conductor (opcional)" value={form.conductor_id}
        onChange={v => {
         f("conductor_id")(v);
         const c = conductoresActivos.find(cx=>String(cx.id)===String(v));
         if(c && form.tipo==="empresa_transporte") f("empresa_transporte")(c.empresa||"");
        }} as="select"
        options={[
         { value: "", label: " Sin asignar " },
         ...(form.tipo==="empresa_transporte"
          ? conductoresActivos.filter(c=>c.empresa||c.nit_proveedor)
          : conductoresActivos
         ).map(c => ({ value: c.id, label: `${c.nombre} - ${c.placa}${c.empresa?" - "+c.empresa:""}` }))
        ]}/>
      )}
      <Field label="Notas / Observaciones" value={form.notas} onChange={f("notas")} as="textarea" placeholder="Instrucciones especiales..." />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
       <Btn variant="secondary" onClick={() => setModNuevo(false)}>Cancelar</Btn>
       <Btn onClick={guardar}> Guardar Pedido</Btn>
      </div>
     </div>
    </Modal>
   )}

   {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={transportistas} promesas={promesas} onClose={()=>setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={user?.rol!=="operador"} canBasicEdit={user?.rol==="operador"} canAssign={user?.rol==="operador"}/>}
   {modGuia&&<GuiaImprimible pedido={modGuia} conductores={conductores} ciudades={ciudades} onClose={()=>setModGuia(null)}/>}
   {modCSV&&<ModalCSVPedidos onClose={()=>setModCSV(false)} ciudades={ciudades} onImportar={handleImportarCSV}/>}
   {modGuias&&<ModalCSVGuias onClose={()=>setModGuias(false)} pedidos={pedidos} ciudades={ciudades} showToast={showToast} recargar={recargar}/>}
  </div>
 );
}

function RastreoGPS({ pedidos, conductores, ciudades }) {
 const conCond = pedidos.filter(p => p.conductor_id);
 const [sel, setSel] = useState(conCond[0] || null);
 const cond = conductores.find(c => c.id === sel?.conductor_id);
 const ciudad = (ciudades||[]).find(c => c.code === sel?.ciudad_codigo);
 const mapUrl = sel ? `https://maps.google.com/maps?q=${encodeURIComponent((sel.direccion || "") + ", " + (ciudad?.name || "") + ", Colombia")}&output=embed&z=14` : null;

 return (
  <div>
   <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900 }}> Rastreo GPS</h2>
   <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,280px) 1fr", gap: 20, alignItems: "start" }}>
    <Card style={{ padding: 14 }}>
     <p style={{ fontWeight: 700, color: P[700], fontSize: 11, textTransform: "uppercase", margin: "0 0 12px" }}>Pedidos con conductor</p>
     <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 500, overflowY: "auto" }}>
      {conCond.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Sin pedidos asignados.</p>}
      {conCond.map(p => (
       <button key={p.id} onClick={() => setSel(p)} style={{ width: "100%", padding: "10px 12px", background: sel?.id === p.id ? P[50] : "#fafafa", border: `1.5px solid ${sel?.id === p.id ? P[400] : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <div style={{ fontWeight: 700, color: P[700] }}>{p.id}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{p.cliente}</div>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.ciudad_nombre}</div>
        <div style={{ marginTop: 4 }}><Badge estado={p.estado} /></div>
       </button>
      ))}
     </div>
    </Card>
    <Card>
     {sel && mapUrl ? (
      <>
       <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: P[800], fontSize: 16 }}>{sel.id} {sel.cliente}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}> {sel.direccion}, {ciudad?.name}</div>
        {cond && <div style={{ fontSize: 13, color: P[600], marginTop: 2 }}> {cond.nombre} Placa: {sel.placa}</div>}
       </div>
       <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${P[200]}` }}>
        <iframe title="mapa-rastreo" src={mapUrl} width="100%" height="340" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" />
       </div>
      </>
     ) : <p style={{ color: "#94a3b8", textAlign: "center", padding: 48 }}>Selecciona un pedido para ver el mapa de entrega.</p>}
    </Card>
   </div>
  </div>
 );
}

function Conductores({ conductores, pedidos, showToast, transportistas, recargar }) {
 const [modal, setModal] = useState(false);
 const [guardando, setGuardando] = useState(false);
 const vacio = { nombre:"", cedula:"", placa:"", celular:"", nit_proveedor:"", empresa:"", user_login:"", pass_login:"" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const guardar = async () => {
  if (!form.nombre.trim()||!form.cedula.trim()||!form.placa.trim()) {
   showToast("Nombre, cdula y placa son obligatorios","error"); return;
  }
  if (!form.user_login.trim()||!form.pass_login.trim()) {
   showToast("Usuario y contrasea son obligatorios","error"); return;
  }
  if (form.nit_proveedor.trim()) {
   const existe = (transportistas||[]).find(t=>t.nit===form.nit_proveedor.trim());
   if (!existe) { showToast("El NIT no corresponde a ninguna empresa registrada","error"); return; }
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
   if (error) { showToast(mensajeError(error, "el acceso del conductor"),"error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: "+data.error,"error"); setGuardando(false); return; }

   setModal(false); setForm(vacio);
   showToast(" Conductor y usuario creados","success");
   if(recargar) await recargar(); else if(window._recargar) await window._recargar();
  } catch(e) {
   showToast("Error inesperado: "+e.message,"error");
  }
  setGuardando(false);
 };

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
    <h2 style={{margin:0,color:P[800],fontWeight:900}}> Conductores</h2>
    <Btn onClick={()=>setModal(true)}>+ Registrar Conductor</Btn>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
    {conductoresActivos.map(c=>{
     const asig=pedidos.filter(p=>p.conductor_id===c.id).length;
     const tran=pedidos.filter(p=>p.conductor_id===c.id&&p.estado==="en_transito").length;
     return (
      <Card key={c.id} style={{borderTop:`3px solid ${P[500]}`}}>
       <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
        <div style={{width:44,height:44,borderRadius:22,background:`linear-gradient(135deg,${P[700]},${P[500]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18}}></div>
        <div>
         <div style={{fontWeight:800,color:P[800]}}>{c.nombre}</div>
         <div style={{fontSize:12,color:"#64748b"}}>Placa: <strong style={{fontFamily:"monospace"}}>{c.placa}</strong></div>
         {c.cedula&&<div style={{fontSize:11,color:"#94a3b8"}}>CC: {c.cedula}</div>}
         {c.celular&&<div style={{fontSize:12,color:"#64748b"}}> {c.celular}</div>}
        </div>
       </div>
       <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
        {c.empresa&&<span> {c.empresa}</span>}
        <span> Asignados: <strong>{asig}</strong> En transito: <strong style={{color:P[600]}}>{tran}</strong></span>
       </div>
      </Card>
     );
    })}
    {conductoresActivos.length===0&&<p style={{color:"#94a3b8"}}>Sin conductores registrados.</p>}
   </div>
   {modal&&(
    <Modal title="Registrar Conductor" onClose={()=>setModal(false)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:P[50],borderRadius:10,padding:10,fontSize:12,color:P[700]}}>
       Se crear automaticamente el usuario de acceso al sistema.
      </div>
      <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required placeholder="Juan Prez"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Cedula *" value={form.cedula} onChange={f("cedula")} required placeholder="1012345678"/>
       <Field label="Celular" value={form.celular} onChange={f("celular")} placeholder="3001234567"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Placa *" value={form.placa} onChange={f("placa")} required placeholder="ABC-123"/>
       <Field label="NIT proveedor" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1"/>
      </div>
      <Field label="Empresa de transporte" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ S.A.S"/>
      <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
       <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Usuario (login) *" value={form.user_login} onChange={f("user_login")} required placeholder="juan.perez" name="spt_driver_login" autoComplete="off" data-lpignore="true"/>
        <Field label="Contrasena *" value={form.pass_login} onChange={f("pass_login")} required type="password" placeholder="" name="spt_driver_password" autoComplete="new-password" data-lpignore="true"/>
       </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
       <Btn onClick={guardar} disabled={guardando}>{guardando?"Guardando...":" Guardar y Crear Usuario"}</Btn>
      </div>
     </div>
    </Modal>
   )}
  </div>
 );
}

function Transportistas({ transportistas, conductores, showToast, user, recargar }) {
 const [modEmpresa, setModEmpresa] = useState(false);
 const [modEditEmp, setModEditEmp] = useState(null);
 const [modCond,  setModCond]  = useState(null);
 const [modEdit,  setModEdit]  = useState(null);
 const [guardando, setGuardando] = useState(false);
 const [formE, setFormE] = useState({nombre:"",nit:"",contacto:"",tel:"",user_login:"",pass_login:""});
 const [formC, setFormC] = useState({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});
 const [formEdit, setFormEdit] = useState({nombre:"",cedula:"",placa:"",celular:"",nit_proveedor:"",empresa:""});
 const fe = k => v => setFormE(p=>({...p,[k]:v}));
 const fc = k => v => setFormC(p=>({...p,[k]:v}));

 const esMia = user.rol==="transportista";
 const miNit = user.nit||"";
 const conductoresActivos = conductores.filter(c=>c.activo!==false);
 const misEmp = esMia ? transportistas.filter(t=>t.nit===miNit) : transportistas;
 const misCon = esMia ? conductoresActivos.filter(c=>c.nit_proveedor===miNit) : conductoresActivos;

 const crearEmpresa = async () => {
  if (!formE.nombre.trim()||!formE.nit.trim()) { showToast("Nombre y NIT son obligatorios","error"); return; }
  if (!formE.user_login.trim()||!formE.pass_login.trim()) { showToast("Usuario y contrasea son obligatorios","error"); return; }
  setGuardando(true);
  try {
   const { data, error } = await supabase.functions.invoke('create-system-user', {
    body: {
     type: 'system_user',
     nombre: formE.nombre.trim(),
     rol: 'transportista',
     user_login: formE.user_login.trim(),
     pass_login: formE.pass_login.trim(),
     nit: formE.nit.trim(),
     empresa: formE.nombre.trim(),
    },
   });
   if (error) { showToast(mensajeError(error, "la empresa transportista"),"error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: "+data.error,"error"); setGuardando(false); return; }
   const { error: tErr } = await supabase.from('transportistas').update({
    contacto: formE.contacto.trim(),
    tel: formE.tel.trim(),
   }).eq('nit', formE.nit.trim());
   if (tErr) { showToast("Empresa creada, pero fallo contacto: "+tErr.message,"warning"); setGuardando(false); return; }
   setModEmpresa(false); setFormE({nombre:"",nit:"",contacto:"",tel:"",user_login:"",pass_login:""});
   showToast(" Empresa y usuario creados","success");
   if(recargar) await recargar(); else if(window._recargar) await window._recargar();
  } catch(e) { showToast(mensajeError(e, "la empresa transportista"),"error"); }
  setGuardando(false);
 };

 const guardarEdicionEmpresa = async () => {
  if (!formE.nombre.trim()) { showToast("Nombre es obligatorio","error"); return; }
  setGuardando(true);
  const { error: tErr } = await supabase.from('transportistas').update({nombre:formE.nombre.trim(),contacto:formE.contacto.trim(),tel:formE.tel.trim()}).eq('id',modEditEmp.id);
  if (tErr) { showToast(mensajeError(tErr, "la empresa transportista"),"error"); setGuardando(false); return; }
  if (modEditEmp.usuario_id) {
   const { data: usuarioEmp, error: uLoadErr } = await supabase.from('usuarios').select('*').eq('id',modEditEmp.usuario_id).single();
   if (uLoadErr) { showToast(mensajeError(uLoadErr, "el usuario transportista"),"error"); setGuardando(false); return; }
   if (usuarioEmp.auth_user_id || formE.pass_login.trim()) {
    const { data, error } = await supabase.functions.invoke('create-system-user', {
     body: {
      type: 'update_system_user',
      user_id: modEditEmp.usuario_id,
      nombre: formE.nombre.trim(),
      rol: 'transportista',
      user_login: usuarioEmp.user,
      pass_login: formE.pass_login.trim(),
      nit: modEditEmp.nit,
      empresa: formE.nombre.trim(),
     },
    });
    if (error) { showToast(mensajeError(error, "el acceso transportista"),"error"); setGuardando(false); return; }
    if (data?.error) { showToast("Error actualizando acceso: "+data.error,"error"); setGuardando(false); return; }
   }
  }
  setModEditEmp(null); showToast(" Empresa actualizada","success");
  if(recargar) await recargar(); else if(window._recargar) await window._recargar(); setGuardando(false);
 };

 const abrirEditarEmpresa = (t) => {
  setFormE({nombre:t.nombre,nit:t.nit,contacto:t.contacto||"",tel:t.tel||"",user_login:"",pass_login:""});
  setModEditEmp(t);
 };

 const inscribirConductor = async () => {
  if (!formC.nombre.trim()||!formC.placa.trim()||!formC.cedula.trim()) { showToast("Nombre, cedula y placa son obligatorios","error"); return; }
  if (!formC.user_login.trim()||!formC.pass_login.trim()) { showToast("Usuario y contrasena son obligatorios","error"); return; }
  const emp = modCond;
  setGuardando(true);
  try {
   const { data, error } = await supabase.functions.invoke('create-system-user', {
    body: {
     type: 'conductor',
     nombre: formC.nombre.trim(),
     cedula: formC.cedula.trim(),
     placa: formC.placa.trim(),
     celular: formC.celular.trim(),
     user_login: formC.user_login.trim(),
     pass_login: formC.pass_login.trim(),
     nit_proveedor: emp.nit,
     empresa: emp.nombre,
    },
   });
   if (error) { showToast(mensajeError(error, "el acceso del conductor"),"error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: "+data.error,"error"); setGuardando(false); return; }
   setModCond(null); setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});
   showToast(`Conductor inscrito en ${emp.nombre}`,"success");
   if(recargar) await recargar(); else if(window._recargar) await window._recargar();
  } catch(e) { showToast(mensajeError(e, "el conductor"),"error"); }
  setGuardando(false);
 };

 const guardarEdicionConductor = async () => {
  if (!formEdit.nombre.trim()||!formEdit.placa.trim()) { showToast("Nombre y placa son obligatorios","error"); return; }
  setGuardando(true);
  const nitProveedor = esMia ? (modEdit.nit_proveedor||miNit) : formEdit.nit_proveedor.trim();
  const empresaProveedor = esMia ? (modEdit.empresa||user.empresa||user.nombre) : formEdit.empresa.trim();
  const { error: cErr } = await supabase.from('conductores').update({
   nombre:formEdit.nombre.trim(), cedula:formEdit.cedula.trim(), placa:formEdit.placa.trim(),
   celular:formEdit.celular.trim(), nit_proveedor:nitProveedor, empresa:empresaProveedor,
  }).eq('id', modEdit.id);
  if (cErr) { showToast("Error actualizando conductor: "+cErr.message,"error"); setGuardando(false); return; }
  if (modEdit.usuario_id) {
   const { error: uErr } = await supabase.from('usuarios').update({nombre:formEdit.nombre.trim(),placa:formEdit.placa.trim(),celular:formEdit.celular.trim()}).eq('id',modEdit.usuario_id);
   if (uErr) { showToast("Conductor actualizado, pero fallo usuario: "+uErr.message,"warning"); setGuardando(false); return; }
  }
  setModEdit(null); showToast("Conductor actualizado","success");
  if(recargar) await recargar(); else if(window._recargar) await window._recargar(); setGuardando(false);
 };

 return (
  <div>
   {esMia&&(
    <Card style={{background:`linear-gradient(135deg,${P[950]},${P[700]})`,marginBottom:22}}>
     <div style={{display:"flex",alignItems:"center",gap:14}}>
      <Logo size={46}/>
      <div>
       <h2 style={{margin:0,color:"#fff",fontWeight:900}}>{user.empresa||user.nombre}</h2>
       <p style={{margin:"4px 0 0",color:P[300],fontSize:13}}>NIT: {miNit} {misCon.length} conductor(es)</p>
      </div>
     </div>
    </Card>
   )}
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
    <h3 style={{margin:0,color:P[800],fontWeight:800}}> {esMia?"Mi Empresa":"Empresas Transportistas"}</h3>
    {!esMia&&<Btn onClick={()=>setModEmpresa(true)}>+ Nueva Empresa</Btn>}
   </div>
   {!esMia&&(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:28}}>
     {misEmp.map(t=>(
      <Card key={t.id} style={{borderLeft:`4px solid ${P[500]}`}}>
       <div style={{fontWeight:800,color:P[800],fontSize:15,marginBottom:6}}> {t.nombre}</div>
       <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
        <span>NIT: <strong style={{fontFamily:"monospace"}}>{t.nit}</strong></span>
        {t.contacto&&<span> {t.contacto}</span>}
        {t.tel&&<span> {t.tel}</span>}
        <span> {conductoresActivos.filter(c=>c.nit_proveedor===t.nit).length} conductor(es)</span>
       </div>
       <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        <Btn size="sm" variant="secondary" onClick={()=>abrirEditarEmpresa(t)}> Editar</Btn>
        <Btn size="sm" variant="secondary" onClick={()=>{setModCond(t);setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});}}>+ Conductor</Btn>
       </div>
      </Card>
     ))}
     {misEmp.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>Sin empresas registradas.</p>}
    </div>
   )}
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
    <h3 style={{margin:0,color:P[800],fontWeight:800}}> {esMia?"Mis Conductores":"Todos los Conductores"}</h3>
    {esMia&&<Btn onClick={()=>{setModCond({nit:miNit,nombre:user.empresa||user.nombre});setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});}}>+ Inscribir Conductor</Btn>}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
    {misCon.map(c=>(
     <Card key={c.id} style={{borderLeft:`3px solid ${P[400]}`}}>
      <div style={{fontWeight:800,color:P[800],marginBottom:4}}> {c.nombre}</div>
      {c.cedula&&<div style={{fontSize:12,color:"#94a3b8"}}>CC: {c.cedula}</div>}
      <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Placa: <strong style={{fontFamily:"monospace"}}>{c.placa}</strong></div>
      {c.celular&&<div style={{fontSize:12,color:"#64748b"}}> {c.celular}</div>}
      {c.empresa&&<div style={{fontSize:12,color:P[600],fontWeight:600,marginTop:3}}> {c.empresa}</div>}
      <div style={{display:"flex",gap:8,marginTop:10}}>
       <span style={{background:"#ecfdf5",color:"#059669",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}> Activo</span>
       <Btn size="sm" variant="secondary" onClick={()=>{setFormEdit({nombre:c.nombre,cedula:c.cedula||"",placa:c.placa||"",celular:c.celular||"",nit_proveedor:c.nit_proveedor||"",empresa:c.empresa||""});setModEdit(c);}}> Editar</Btn>
      </div>
     </Card>
    ))}
    {misCon.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>Sin conductores inscritos.</p>}
   </div>

   {modEmpresa&&(
    <Modal title="Nueva Empresa Transportista" onClose={()=>setModEmpresa(false)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Razn Social *" value={formE.nombre} onChange={fe("nombre")} required placeholder="Transportes XYZ S.A.S"/>
      <Field label="NIT *" value={formE.nit} onChange={fe("nit")} required placeholder="900123456-1"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Persona de Contacto" value={formE.contacto} onChange={fe("contacto")} placeholder="Carlos Ruiz"/>
       <Field label="Telfono" value={formE.tel} onChange={fe("tel")} placeholder="3001234567"/>
      </div>
      <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
       <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Usuario *" value={formE.user_login} onChange={fe("user_login")} required placeholder="trans.xyz" name="spt_transportista_login" autoComplete="off" data-lpignore="true"/>
        <Field label="Contrasena *" value={formE.pass_login} onChange={fe("pass_login")} required type="password" placeholder="" name="spt_transportista_password" autoComplete="new-password" data-lpignore="true"/>
       </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModEmpresa(false)}>Cancelar</Btn>
       <Btn onClick={crearEmpresa} disabled={guardando}>{guardando?"Guardando...":" Crear Empresa y Usuario"}</Btn>
      </div>
     </div>
    </Modal>
   )}

   {modEditEmp&&(
    <Modal title={`Editar ${modEditEmp.nombre}`} onClose={()=>setModEditEmp(null)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Razn Social *" value={formE.nombre} onChange={fe("nombre")} required/>
      <p style={{fontSize:12,color:"#64748b",margin:0}}>NIT: <strong>{modEditEmp.nit}</strong> (no modificable)</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Contacto" value={formE.contacto} onChange={fe("contacto")}/>
       <Field label="Telfono" value={formE.tel} onChange={fe("tel")}/>
      </div>
      <Field label="Nueva Contrasena (vaco = sin cambio)" value={formE.pass_login} onChange={fe("pass_login")} type="password" placeholder="Nueva contrasea..." name="spt_transportista_new_password" autoComplete="new-password" data-lpignore="true"/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModEditEmp(null)}>Cancelar</Btn>
       <Btn onClick={guardarEdicionEmpresa} disabled={guardando}>{guardando?"Guardando...":" Guardar"}</Btn>
      </div>
     </div>
    </Modal>
   )}

   {modCond&&(
    <Modal title={`Inscribir Conductor ${modCond.nombre}`} onClose={()=>setModCond(null)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:P[50],borderRadius:10,padding:10,fontSize:12,color:P[700]}}>
       Empresa: <strong>{modCond.nombre}</strong> NIT: <strong>{modCond.nit}</strong>
      </div>
      <Field label="Nombre *" value={formC.nombre} onChange={fc("nombre")} required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Cedula *" value={formC.cedula} onChange={fc("cedula")} required placeholder="1012345678"/>
       <Field label="Celular" value={formC.celular} onChange={fc("celular")} placeholder="3001234567"/>
      </div>
      <Field label="Placa *" value={formC.placa} onChange={fc("placa")} required placeholder="XYZ-456"/>
      <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
       <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso del conductor</p>
       <p style={{fontSize:12,color:"#64748b",margin:"-4px 0 10px"}}>
        Este usuario permite ingresar al modulo de conductor para consultar pedidos, reportar ubicacion y registrar entregas.
       </p>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Usuario *" value={formC.user_login} onChange={fc("user_login")} required placeholder="juan.perez" name="spt_transportista_driver_login" autoComplete="off" data-lpignore="true"/>
        <Field label="Contrasena *" value={formC.pass_login} onChange={fc("pass_login")} required type="password" placeholder="" name="spt_transportista_driver_password" autoComplete="new-password" data-lpignore="true"/>
       </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModCond(null)}>Cancelar</Btn>
       <Btn onClick={inscribirConductor} disabled={guardando}>{guardando?"Guardando...":"Inscribir y Crear Usuario"}</Btn>
      </div>
     </div>
    </Modal>
   )}

   {modEdit&&(
    <Modal title={`Editar Conductor ${modEdit.nombre}`} onClose={()=>setModEdit(null)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Nombre *" value={formEdit.nombre} onChange={v=>setFormEdit(p=>({...p,nombre:v}))} required/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Cedula" value={formEdit.cedula} onChange={v=>setFormEdit(p=>({...p,cedula:v}))} placeholder="1012345678"/>
       <Field label="Celular" value={formEdit.celular} onChange={v=>setFormEdit(p=>({...p,celular:v}))} placeholder="3001234567"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Placa *" value={formEdit.placa} onChange={v=>setFormEdit(p=>({...p,placa:v}))} required placeholder="ABC-123"/>
       {!esMia&&<Field label="NIT proveedor" value={formEdit.nit_proveedor} onChange={v=>setFormEdit(p=>({...p,nit_proveedor:v}))} placeholder="900123456-1"/>}
      </div>
      {esMia?(
       <div style={{background:P[50],border:`1px solid ${P[200]}`,borderRadius:10,padding:12,fontSize:12,color:P[800]}}>
        <div style={{fontWeight:800,marginBottom:4}}>Pertenencia del conductor</div>
        <div>NIT proveedor: <strong>{formEdit.nit_proveedor||miNit}</strong></div>
        <div>Empresa: <strong>{formEdit.empresa||user.empresa||user.nombre}</strong></div>
        <div style={{color:"#64748b",marginTop:6}}>Estos datos solo pueden ser modificados por un administrador.</div>
       </div>
      ):(
       <Field label="Empresa" value={formEdit.empresa} onChange={v=>setFormEdit(p=>({...p,empresa:v}))} placeholder="Transportes XYZ"/>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModEdit(null)}>Cancelar</Btn>
       <Btn onClick={guardarEdicionConductor} disabled={guardando}>{guardando?"Guardando...":" Guardar"}</Btn>
      </div>
     </div>
    </Modal>
   )}
  </div>
 );
}

function ResumenTransportador({ pedidos, conductores, devoluciones = [], recogidas = [] }) {
 const [gpsTick, setGpsTick] = useState(0);
 useEffect(() => { const t = setInterval(()=>setGpsTick(n=>n+1), 10000); return ()=>clearInterval(t); }, []);
 const [selCond,setSelCond]=useState("");
 const condIds=[...new Set(pedidos.filter(p=>p.conductor_id).map(p=>p.conductor_id))];
 const condOpts=condIds.map(id=>conductores.find(c=>c.id===id)).filter(Boolean);
 const cond=conductores.find(c=>String(c.id)===String(selCond));
 const misPeds = selCond ? pedidos.filter(p=>String(p.conductor_id)===String(selCond)&&p.estado==="en_transito") : [];
 const misDV  = selCond ? devoluciones.filter(d=>String(d.conductor_id)===String(selCond)&&d.estado==="en_transito") : [];
 const misRC  = selCond ? recogidas.filter(r=>String(r.conductor_id)===String(selCond)&&r.estado==="en_transito") : [];
 const totalCajas=misPeds.reduce((a,p)=>a+(parseInt(p.cajas)||0),0);

 const imprimir=()=>{
  if(!cond){return;}
  const win=window.open("","_blank");
  if(!win)return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Resumen ${cond.nombre}</title>
  <style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#4c1d95}h2{color:#6d28d9}table{width:100%;border-collapse:collapse}
  th{background:#f5f3ff;color:#4c1d95;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd6fe}
  td{padding:10px 12px;border-bottom:1px solid #ede9fe;font-size:13px}.total{font-size:16px;font-weight:bold;color:#4c1d95}</style></head>
  <body>
  <h1>Somos PRO Tracking Resumen de Despachos</h1>
  <h2>Conductor: ${cond.nombre} Placa: ${cond.placa}${cond.celular?" Tel: "+cond.celular:""}</h2>
  <p>Empresa: ${cond.empresa||""} NIT: ${cond.nit_proveedor||""}</p>
  <p>Fecha: ${new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})}</p>
  <table><thead><tr><th>#</th><th>Guia Interna</th><th>No. Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad</th><th>Direccion</th><th>Cajas</th><th>Estado</th><th>Fecha Est.</th></tr></thead>
  <tbody>${misPeds.map((p,i)=>`<tr><td>${i+1}</td><td><strong>${p.guia_interna||""}</strong></td><td>${p.id}</td><td>${p.factura||""}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}</td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${p.fecha_estimada||""}</td></tr>`).join("")}
  </tbody></table>
  <p class="total" style="margin-top:20px">Total pedidos: ${misPeds.length} Total cajas: <strong>${totalCajas}</strong></p>
  </body></html>`);
  win.print();
 };

 return (
  <div>
   <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}> Resumen por Transportador Pedidos En Transito</h2>
   <Card style={{marginBottom:20}}>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
     <Field label="Seleccionar Conductor / Transportador" value={selCond} onChange={setSelCond} as="select"
      options={[{value:"",label:" Seleccione conductor "},...condOpts.map(c=>({value:c.id,label:`${c.nombre} ${c.placa} ${c.empresa||""}`}))]}
      style={{flex:1,minWidth:280}} />
     <Btn variant="ghost" onClick={imprimir} disabled={!cond} style={{marginTop:18}}> Imprimir Resumen</Btn>
    </div>
   </Card>
   {cond&&(
    <>
     <Card style={{background:`linear-gradient(135deg,${P[800]},${P[600]})`,marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
       <div style={{width:52,height:52,borderRadius:26,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}></div>
       <div>
        <div style={{color:"#fff",fontWeight:900,fontSize:18}}>{cond.nombre}</div>
        <div style={{color:P[300],fontSize:13}}>Placa: {cond.placa}{cond.celular&&`  ${cond.celular}`}</div>
        <div style={{color:P[300],fontSize:12}}>{cond.empresa||""} NIT: {cond.nit_proveedor||""}</div>
       </div>
       <div style={{marginLeft:"auto",textAlign:"right",display:"flex",gap:20}}>
        <div>
         <div style={{color:"#fff",fontSize:28,fontWeight:900,lineHeight:1}}>{misPeds.length}</div>
         <div style={{color:P[300],fontSize:11}}>pedidos</div>
        </div>
        <div>
         <div style={{color:"#fca5a5",fontSize:22,fontWeight:900,lineHeight:1}}>{misDV.length}</div>
         <div style={{color:P[300],fontSize:11}}>devoluc.</div>
        </div>
        <div>
         <div style={{color:"#86efac",fontSize:22,fontWeight:900,lineHeight:1}}>{misRC.length}</div>
         <div style={{color:P[300],fontSize:11}}>recogidas</div>
        </div>
       </div>
      </div>
     </Card>
     <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
       <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:P[50]}}>
         {["#","Guia Interna","No. Pedido","Factura","Cliente","Ciudad","Cajas","Estado","Fecha Est."].map(h=>(
          <th key={h} style={{padding:"11px 14px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
         ))}
        </tr></thead>
        <tbody>
         {misPeds.map((p,i)=>(
          <tr key={p.id} style={{borderTop:`1px solid ${P[100]}`,background:i%2?"#fafafa":"#fff"}}>
           <td style={{padding:"11px 14px",color:"#94a3b8",fontSize:11}}>{i+1}</td>
           <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:11,color:P[600],fontWeight:700}}>{p.guia_interna||""}</td>
           <td style={{padding:"11px 14px",fontWeight:800,color:P[700]}}>{p.id}</td>
           <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:12}}>{p.factura}</td>
           <td style={{padding:"11px 14px",color:"#334155",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.cliente}</td>
           <td style={{padding:"11px 14px",color:"#64748b",fontSize:12}}>{p.ciudad_nombre}</td>
           <td style={{padding:"11px 14px",textAlign:"center",fontWeight:700}}>{p.cajas}</td>
           <td style={{padding:"11px 14px"}}><Badge estado={p.estado}/></td>
           <td style={{padding:"11px 14px",color:"#64748b",fontSize:12}}>{p.fecha_estimada||""}</td>
          </tr>
         ))}
         <tr style={{background:P[50],borderTop:`2px solid ${P[200]}`}}>
          <td colSpan={6} style={{padding:"12px 14px",fontWeight:700,color:P[800],textAlign:"right"}}>TOTAL</td>
          <td style={{padding:"12px 14px",textAlign:"center",fontWeight:900,fontSize:16,color:P[700]}}>{totalCajas}</td>
          <td colSpan={2} style={{padding:"12px 14px",color:"#64748b",fontSize:12}}>{misPeds.length} pedido(s)</td>
         </tr>
        </tbody>
       </table>
      </div>
     </Card>
    </>
   )}
   {!cond&&condOpts.length===0&&<Card style={{textAlign:"center",padding:40,color:"#94a3b8"}}>No hay pedidos con conductor asignado.</Card>}
  </div>
 );
}

// Ciudades 

function Ciudades({ ciudades, showToast, recargar }) {
 const [modNueva,setModNueva]=useState(false);
 const [modCSV,setModCSV]=useState(false);
 const [busq,setBusq]=useState("");
 const [form,setForm]=useState({code:"",name:""});

 const guardar=async()=>{
  if(!form.code.trim()||!form.name.trim()){showToast("Codigo DANE y nombre son obligatorios","error");return;}
  if(ciudades.find(c=>c.code===form.code.trim())){showToast("Ya existe esa ciudad","error");return;}
  if(supabase){ await supabase.from('ciudades').upsert({code:form.code.trim(),name:form.name.trim()},{onConflict:'code'}); if(recargar) await recargar(); }
  setModNueva(false);setForm({code:"",name:""});
  showToast(" Ciudad registrada","success");
 };

 const filt=ciudades.filter(c=>!busq||c.name.toLowerCase().includes(busq.toLowerCase())||c.code.includes(busq));

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
    <h2 style={{margin:0,color:P[800],fontWeight:900}}> Ciudades / Codigos DANE</h2>
    <div style={{display:"flex",gap:8}}>
     <Btn variant="secondary" size="sm" onClick={()=>setModCSV(true)}> CSV Masivo</Btn>
     <Btn size="sm" onClick={()=>setModNueva(true)}>+ Nueva Ciudad</Btn>
    </div>
   </div>
   <Card style={{padding:14,marginBottom:16}}>
    <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder=" Buscar ciudad o cdigo DANE..." style={iSt}/>
    <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>{filt.length} de {ciudades.length} ciudades registradas</div>
   </Card>
   <Card style={{padding:0,overflow:"hidden"}}>
    <div style={{overflowX:"auto",maxHeight:480,overflowY:"auto"}}>
     <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead style={{position:"sticky",top:0}}>
       <tr style={{background:P[50]}}>
        <th style={{padding:"11px 14px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11}}>Codigo DANE</th>
        <th style={{padding:"11px 14px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11}}>Ciudad / Municipio</th>
       </tr>
      </thead>
      <tbody>
       {filt.map((c,i)=>(
        <tr key={c.code} style={{borderTop:`1px solid ${P[100]}`,background:i%2?"#fafafa":"#fff"}}>
         <td style={{padding:"10px 14px",fontFamily:"monospace",fontWeight:700,color:P[600]}}>{c.code}</td>
         <td style={{padding:"10px 14px",color:"#334155"}}>{c.name}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   </Card>

   {modNueva&&(
    <Modal title="Nueva Ciudad / Municipio" onClose={()=>setModNueva(false)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Field label="Codigo DANE" value={form.code} onChange={v=>setForm(p=>({...p,code:v}))} required placeholder="05045"/>
      <Field label="Nombre del municipio" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Apartad"/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModNueva(false)}>Cancelar</Btn>
       <Btn onClick={guardar}> Guardar</Btn>
      </div>
     </div>
    </Modal>
   )}
   {modCSV&&(
    <ModalCSVCiudades onClose={()=>setModCSV(false)} onImportar={async (nuevas)=>{
     for(const c of nuevas){
      await supabase.from('ciudades').upsert({code:c.code,name:c.name},{onConflict:'code'});
     }
     setModCSV(false);
     showToast(` ${nuevas.length} ciudad(es) importada(s)`,"success");
     if(recargar) await recargar();
    }} />
   )}
  </div>
 );
}

// Paqueterias (gestin) 

function ModalCSVCiudades({ onClose, onImportar }) {
 const [txt, setTxt]  = useState("");
 const [prev, setPrev] = useState([]);
 const [err, setErr]  = useState("");
 const fileRef = useRef(null);
 const [nombreArchivo, setNombreArchivo] = useState("");

 const CABECERA = "code,name";
 const EJEMPLO = "05001,Medelln\n76001,Cali\n11001,Bogot D.C.";

 const leerArchivo = (file) => {
  if (!file) return;
  setNombreArchivo(file.name);
  const reader = new FileReader();
  reader.onload = (e) => {
   const texto = e.target.result;
   setTxt(texto);
   try { setPrev(parsear(texto)); setErr(""); }
   catch(ex) { setErr(ex.message); setPrev([]); }
  };
  reader.readAsText(file, "UTF-8");
 };

 const parsear = (texto) => {
  const sep = texto.includes(";") ? ";" : ",";
  const lineas = texto.trim().split("\n").filter(l => l.trim());
  if (lineas.length < 2) throw new Error("Se necesitan encabezado y al menos una fila.");
  const hdrs = lineas[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g,""));
  const codeIdx = hdrs.indexOf("code");
  const nameIdx = hdrs.indexOf("name");
  if (codeIdx === -1 || nameIdx === -1) throw new Error("El CSV debe tener columnas 'code' y 'name'.");
  return lineas.slice(1).map(l => {
   const cols = l.split(sep).map(c => c.trim().replace(/^"|"$/g,""));
   return { code: cols[codeIdx]||"", name: cols[nameIdx]||"" };
  }).filter(c => c.code && c.name);
 };

 return (
  <Modal title="Importar Ciudades / Codigos DANE" onClose={onClose} wide>
   <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
    <div style={{ background:"#fffbeb", borderRadius:10, padding:12, fontSize:13, color:"#92400e" }}>
     <strong>Columnas requeridias:</strong> <code>code</code> (cdigo DANE) y <code>name</code> (nombre del municipio)
    </div>
    <Btn size="sm" variant="success" onClick={()=>descargarCSV("plantilla_ciudades.csv", CABECERA, EJEMPLO)}>
      Descargar Plantilla CSV
    </Btn>
    <div
     style={{ border:`2px dashed ${P[300]}`, borderRadius:12, padding:"20px 16px", textAlign:"center", cursor:"pointer", background: nombreArchivo ? "#f0fdf4" : P[50] }}
     onClick={() => fileRef.current && fileRef.current.click()}
     onDragOver={e => e.preventDefault()}
     onDrop={e => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); }}
    >
     <div style={{ fontSize:32, marginBottom:8 }}></div>
     {nombreArchivo
      ? <div style={{ color:"#059669", fontWeight:700, fontSize:14 }}> {nombreArchivo}</div>
      : <div style={{ fontWeight:700, color:P[700] }}>Haz clic para seleccionar el archivo CSV</div>
     }
    </div>
    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
     onChange={e => leerArchivo(e.target.files[0])} />

    <details style={{ fontSize:13 }}>
     <summary style={{ cursor:"pointer", color:P[600], fontWeight:600 }}>Tambin puedes pegar el texto</summary>
     <textarea value={txt} onChange={e=>{setTxt(e.target.value);setNombreArchivo("");}} rows={4}
      style={{ ...iSt, fontFamily:"monospace", fontSize:11, resize:"vertical", marginTop:8 }}
      placeholder="code,name&#10;05001,Medelln&#10;76001,Cali"/>
     <Btn size="sm" variant="secondary" style={{marginTop:6}}
      onClick={()=>{try{setPrev(parsear(txt));setErr("");}catch(e){setErr(e.message);setPrev([]);}}}>
       Previsualizar
     </Btn>
    </details>

    {err && <p style={{ color:"#dc2626", background:"#fef2f2", padding:"8px 12px", borderRadius:8, fontSize:13, margin:0 }}> {err}</p>}

    {prev.length > 0 && (
     <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, border:"1px solid #86efac", maxHeight:160, overflowY:"auto" }}>
      <p style={{ margin:"0 0 8px", fontWeight:700, color:"#15803d", fontSize:13 }}> {prev.length} ciudad(es) lista(s):</p>
      {prev.slice(0,10).map((c,i) => (
       <div key={i} style={{ fontSize:12, color:"#334155" }}> <strong>{c.code}</strong> {c.name}</div>
      ))}
      {prev.length > 10 && <div style={{fontSize:11,color:"#94a3b8"}}>...y {prev.length-10} ms</div>}
     </div>
    )}

    <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
     <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
     <Btn disabled={prev.length===0} onClick={()=>onImportar(prev)}> Importar ({prev.length})</Btn>
    </div>
   </div>
  </Modal>
 );
}

function MisPedidosConductor({ pedidos, devoluciones = [], recogidas = [], user, conductores, ciudades, showToast, recargar, transportistas }) {
 const [modDet,  setModDet]  = useState(null);
 const [modFotos, setModFotos] = useState(null); // pedido para cargar soportes
 const [novedad,  setNovedad]  = useState(false);
 const condId = user.conductor_db_id || user.id;
 const misPeds = pedidos.filter(p => String(p.conductor_id) === String(condId));
 const misDevoluciones = devoluciones.filter(d => String(d.conductor_id) === String(condId));
 const misRecogidas = recogidas.filter(r => String(r.conductor_id) === String(condId));
 const activos = misPeds.filter(p => ["pendiente","en_transito","sin_asignar"].includes(p.estado));
 const completados = misPeds.filter(p => ["entregado","novedad"].includes(p.estado));

 const marcarEntregado = async (pedido, fotos, conNovedad) => {
  if (["entregado","novedad"].includes(pedido.estado)) {
   showToast("No se puede modificar un pedido que ya fue entregado", "error");
   setModFotos(null);
   return;
  }
  const hoy = new Date().toISOString().split("T")[0];
  const nombres = fotos.map((_,i)=>`soporte_${pedido.id}_${i+1}.jpg`);
  const estadoFinal = conNovedad ? "novedad" : "entregado";
  const cambios = {
   soportes: [...(pedido.soportes||[]),...nombres],
   soportes_data: [...(Array.isArray(pedido.soportes_data)?pedido.soportes_data:[]),...fotos],
   estado: estadoFinal,
   fecha_real: hoy,
   novedad: conNovedad,
  };
  try {
   const { error: e1 } = await supabase.from("pedidos").update(cambios).eq("id", pedido.id);
   if (e1 && e1.message && e1.message.includes('too large')) {
    await supabase.from("pedidos").update({
     estado: estadoFinal, fecha_real: hoy, novedad: conNovedad, soportes: cambios.soportes,
    }).eq("id", pedido.id);
    showToast("Estado guardado pero fotos muy pesadas - usa imagenes mas pequenas", "warning");
   } else if (e1) {
    showToast("Error guardando: "+e1.message, "error"); return;
   } else {
    showToast(`Entrega registrada - ${fotos.length} soporte(s) - Estado: ${estadoFinal==="entregado"?"Entregado":"Con Novedad"}`, "success");
   }
  } catch(e) {
   showToast("Error de conexion. Revisa tu internet e intenta de nuevo.", "error"); return;
  }
  setModFotos(null);
  if (recargar) await recargar();
 };

 return (
  <div>
   {/* Banner conductor */}
   <Card style={{background:`linear-gradient(135deg,${P[800]},${P[600]})`,marginBottom:22}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
     <Logo size={44}/>
     <div>
      <h2 style={{margin:0,color:"#fff",fontWeight:900}}>{user.nombre}</h2>
      <p style={{margin:"3px 0 0",color:P[300],fontSize:13}}>
       Placa: {user.placa} - {activos.length} activo(s) - {completados.length} entregado(s)
      </p>
     </div>
    </div>
   </Card>

   {/* Pedidos activos */}
   {activos.length===0&&completados.length===0&&misDevoluciones.length===0&&misRecogidas.length===0&&(
    <Card style={{textAlign:"center",padding:48,color:"#94a3b8"}}>
     <div style={{fontSize:40,marginBottom:12}}>--</div>
     <p>Sin pedidos asignados por el momento.</p>
    </Card>
   )}

   {activos.length>0&&(
    <>
     <h3 style={{color:P[800],fontWeight:800,margin:"0 0 14px"}}>Pedidos Activos ({activos.length})</h3>
     <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
      {activos.map(p=>(
       <Card key={p.id} style={{borderLeft:`4px solid ${ESTADOS_PEDIDO[p.estado]?.color||P[400]}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
         <div>
          <div style={{fontWeight:900,color:P[600],fontSize:18,fontFamily:"monospace"}}>{p.guia_interna||p.id}</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>Factura: {p.factura} - {p.cajas} cajas</div>
         </div>
         <Badge estado={p.estado}/>
        </div>
        <div style={{fontWeight:700,color:"#1e293b",marginBottom:6,fontSize:15}}>{p.cliente}</div>
        <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
         <span>Ciudad: {p.ciudad_nombre}</span>
         <span>Direccion: {p.direccion}</span>
         {p.fecha_estimada&&<span>Entrega estimada: <strong>{p.fecha_estimada}</strong></span>}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
         <Btn size="sm" variant="secondary" onClick={()=>setModDet(p)}>Ver Detalle</Btn>
         <Btn size="sm" variant="success" onClick={()=>{setModFotos(p);setNovedad(false);}}>
          Registrar Entrega
         </Btn>
        </div>
       </Card>
      ))}
     </div>
    </>
   )}

   {/* Pedidos completados */}
   {completados.length>0&&(
    <>
     <h3 style={{color:"#059669",fontWeight:800,margin:"0 0 14px"}}>Entregados ({completados.length})</h3>
     <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {completados.map(p=>(
       <Card key={p.id} style={{borderLeft:"4px solid #059669",opacity:0.85}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
         <div>
          <div style={{fontWeight:700,color:"#059669",fontFamily:"monospace"}}>{p.guia_interna||p.id}</div>
          <div style={{fontSize:13,color:"#64748b"}}>{p.cliente} - {p.ciudad_nombre}</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>Entregado: {p.fecha_real} {p.novedad&&"- Con Novedad"}</div>
         </div>
         <div style={{display:"flex",gap:8}}>
          {(p.soportes_data||[]).length>0&&(
           <Btn size="sm" variant="success" onClick={()=>generarPDFSoportes(p,[])}>
            Soportes ({p.soportes_data.length})
           </Btn>
          )}
          <Badge estado={p.estado}/>
         </div>
        </div>
       </Card>
      ))}
     </div>
    </>
   )}

   {misDevoluciones.length>0&&(
    <>
     <h3 style={{color:"#dc2626",fontWeight:800,margin:"28px 0 14px"}}>Devoluciones Asignadias ({misDevoluciones.length})</h3>
     <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
      {misDevoluciones.map(d=>(
       <Card key={d.id} style={{borderLeft:"4px solid #dc2626"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
         <span style={{fontFamily:"monospace",fontWeight:900,color:"#dc2626",fontSize:15}}>{d.guia}</span>
         <Badge estado={d.estado}/>
         {d.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>Con Novedad</span>}
        </div>
        <div style={{fontSize:13,color:"#64748b"}}>Factura: <strong>{d.factura}</strong> - Pedido: <strong>{d.pedido_ref}</strong></div>
        <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Recogida: {d.dir_recogida} - {d.ciudad_nombre}</div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{d.unidades} uds - {d.volumen_m3} m3 - {d.peso_kg} kg</div>
        {d.motivo&&<div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>Motivo: {d.motivo}</div>}
        {d.soporte_data&&(
         <Btn size="sm" variant="success" style={{marginTop:8}}
          onClick={()=>abrirArchivoGuardado(d.soporte_data, d.soporte_nombre || `soporte-${d.guia}`)}>
          Ver Soporte
         </Btn>
        )}
       </Card>
      ))}
     </div>
    </>
   )}

   {misRecogidas.length>0&&(
    <>
     <h3 style={{color:"#0891b2",fontWeight:800,margin:"28px 0 14px"}}>Recogidas Asignadias ({misRecogidas.length})</h3>
     <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
      {misRecogidas.map(r=>(
       <Card key={r.id} style={{borderLeft:"4px solid #0891b2"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
         <span style={{fontFamily:"monospace",fontWeight:900,color:"#0891b2",fontSize:15}}>{r.guia}</span>
         <Badge estado={r.estado}/>
         {r.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>Con Novedad</span>}
        </div>
        <div style={{fontSize:13,color:"#64748b"}}>Recogida: {r.dir_recogida} - {r.ciudad_recogida_nombre}</div>
        <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Entrega: {r.dir_entrega} - {r.ciudad_entrega_nombre}</div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{r.unidades} uds - {r.volumen_m3} m3 - {r.peso_kg} kg</div>
        {r.observaciones&&<div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>Obs: {r.observaciones}</div>}
        {r.doc_data&&(
         <Btn size="sm" variant="success" style={{marginTop:8}}
          onClick={()=>abrirArchivoGuardado(r.doc_data, r.doc_nombre || `documento-${r.guia}`)}>
          Ver Documento
         </Btn>
        )}
       </Card>
      ))}
     </div>
    </>
   )}

   {/* Modal detalle (solo lectura) */}
   {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={[]}
    onClose={()=>setModDet(null)} setPedidos={()=>{}} showToast={showToast} canEdit={false} canDeliver/>}

   {/* Modal cargar soportes de entrega */}
   {modFotos&&(
    <Modal title={`Registrar Entrega - ${modFotos.guia_interna||modFotos.id}`} onClose={()=>setModFotos(null)} wide>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Info pedido */}
      <div style={{background:P[50],borderRadius:10,padding:14}}>
       <div style={{fontWeight:700,color:P[800],marginBottom:4}}>{modFotos.cliente}</div>
       <div style={{fontSize:13,color:"#64748b"}}>Direccion: {modFotos.direccion} - {modFotos.ciudad_nombre}</div>
       <div style={{fontSize:13,color:"#64748b"}}>Factura: {modFotos.factura} - {modFotos.cajas} cajas</div>
      </div>

      {/* Checkbox novedad */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"12px 16px",cursor:"pointer",border:`2px solid ${novedad?"#dc2626":P[200]}`}}
       onClick={()=>setNovedad(!novedad)}>
       <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {novedad&&<span style={{color:"#fff",fontSize:14,fontWeight:900}}></span>}
       </div>
       <div>
        <div style={{fontWeight:700,color:novedad?"#dc2626":P[800],fontSize:14}}>Entrega con Novedad</div>
        <div style={{fontSize:12,color:"#94a3b8"}}>Marca esto si hubo algun inconveniente en la entrega</div>
       </div>
      </div>

      {/* Cargador de fotos */}
      <CargadorFotos
       pedido={modFotos}
       onGuardar={(fotos)=>marcarEntregado(modFotos, fotos, novedad)}
       onClose={()=>setModFotos(null)}
       showToast={showToast}
      />
     </div>
    </Modal>
   )}
  </div>
 );
}


// GestionPaqueterias 

// GestionPromesas 

// FacturasProveedor 

function GestionPromesas({ promesas, ciudades, showToast, recargar }) {
 const [editando, setEditando] = useState(null); // ciudad_codigo being edited
 const [diasEdit, setDiasEdit] = useState("");
 const [nueva,  setNueva]  = useState({ ciudad_codigo: "", dias_plazo: "" });
 const [guard,  setGuard]  = useState(false);
 const [busq,   setBusq]   = useState("");

 // Map for quick lookup
 const promMap = Object.fromEntries((promesas||[]).map(p => [p.ciudad_codigo, p.dias_plazo]));

 // Cities without a promise
 const sinPromesa = (ciudades||[]).filter(c => !promMap[c.code]);
 const conPromesa = (ciudades||[]).filter(c => promMap[c.code]).filter(c =>
  !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
 );
 const sinFiltradias = sinPromesa.filter(c =>
  !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
 );

 const guardarNueva = async () => {
  if (!nueva.ciudad_codigo || !nueva.dias_plazo) {
   showToast("Selecciona ciudad y escribe los dias", "error"); return;
  }
  const dias = parseInt(nueva.dias_plazo);
  if (isNaN(dias) || dias < 1) { showToast("Los dias deben ser un numero mayor a 0", "error"); return; }
  setGuard(true);
  const { error } = await supabase.from('promesas_servicio')
   .upsert({ ciudad_codigo: nueva.ciudad_codigo, dias_plazo: dias }, { onConflict: 'ciudad_codigo' });
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); setGuard(false); return; }
  setNueva({ ciudad_codigo: "", dias_plazo: "" });
  showToast(" Promesa registrada", "success");
  if (recargar) await recargar();
  setGuard(false);
 };

 const guardarEdit = async (codigo) => {
  const dias = parseInt(diasEdit);
  if (isNaN(dias) || dias < 1) { showToast("Dias invlidos", "error"); return; }
  const { error } = await supabase.from('promesas_servicio')
   .update({ dias_plazo: dias }).eq('ciudad_codigo', codigo);
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); return; }
  setEditando(null);
  showToast(" Promesa actualizada", "success");
  if (recargar) await recargar();
 };

 const eliminar = async (codigo, nombre) => {
  if (!window.confirm(`Eliminar promesa de servicio para ${nombre}?`)) return;
  const { error } = await supabase.from('promesas_servicio').delete().eq('ciudad_codigo', codigo);
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); return; }
  showToast("Promesa eliminada", "info");
  if (recargar) await recargar();
 };

 return (
  <div>
   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
    <div>
     <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}> Promesas de Servicio</h2>
     <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
      Dias hbiles de entrega prometidos por destino. Se usan en el Dashboard para medir cumplimiento.
     </p>
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: P[700] }}>
     {conPromesa.length}/{ciudades.length} ciudades configuradias
    </div>
   </div>

   {/* Agregar nueva */}
   <Card style={{ marginBottom: 20, background: P[50], border: `1px solid ${P[200]}` }}>
    <div style={{ fontWeight: 700, color: P[800], marginBottom: 12, fontSize: 14 }}> Agregar Promesa</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end" }}>
     <Field label="Ciudad destino" value={nueva.ciudad_codigo} onChange={v => setNueva(p => ({...p, ciudad_codigo: v}))} as="select"
      options={[
       { value: "", label: " Selecciona ciudad " },
       ...(ciudades||[]).map(c => ({ value: c.code, label: `${c.name} (${c.code})${promMap[c.code] ? " " + promMap[c.code] + " dias" : ""}` }))
      ]}/>
     <Field label="Dias plazo" value={nueva.dias_plazo} onChange={v => setNueva(p => ({...p, dias_plazo: v}))}
      type="number" placeholder="2" style={{ width: 110 }}/>
     <Btn onClick={guardarNueva} disabled={guard} style={{ alignSelf: "end", marginBottom: 0 }}>
       Guardar
     </Btn>
    </div>
   </Card>

   {/* Buscador */}
   <Card style={{ padding: 12, marginBottom: 16 }}>
    <input value={busq} onChange={e => setBusq(e.target.value)}
     placeholder=" Buscar ciudad..." style={{ ...{ border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",width:"100%",boxSizing:"border-box" } }}/>
   </Card>

   {/* Con promesa */}
   {conPromesa.length > 0 && (
    <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
     <div style={{ padding: "12px 20px", background: "#ecfdf5", borderBottom: "1px solid #bbf7d0" }}>
      <span style={{ fontWeight: 700, color: "#059669", fontSize: 13 }}> Con Promesa Configurada ({conPromesa.length})</span>
     </div>
     <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
       <tr style={{ background: P[50] }}>
        {["Ciudad", "Codigo DANE", "Dias Plazo", "Acciones"].map(h => (
         <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: P[700] }}>{h}</th>
        ))}
       </tr>
      </thead>
      <tbody>
       {conPromesa.map((c, i) => (
        <tr key={c.code} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
         <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1e293b" }}>{c.name}</td>
         <td style={{ padding: "10px 16px", fontFamily: "monospace", color: P[600], fontSize: 12 }}>{c.code}</td>
         <td style={{ padding: "10px 16px" }}>
          {editando === c.code ? (
           <input type="number" value={diasEdit} onChange={e => setDiasEdit(e.target.value)}
            style={{ width: 70, padding: "6px 10px", borderRadius: 8, border: `2px solid ${P[400]}`, fontSize: 14, fontWeight: 700 }}
            autoFocus onKeyDown={e => e.key === "Enter" && guardarEdit(c.code)}/>
          ) : (
           <span style={{ background: P[50], border: `1px solid ${P[200]}`, borderRadius: 20,
            padding: "4px 14px", fontWeight: 800, color: P[700], fontSize: 15 }}>
            {promMap[c.code]} da{promMap[c.code] !== 1 ? "s" : ""}
           </span>
          )}
         </td>
         <td style={{ padding: "10px 16px" }}>
          <div style={{ display: "flex", gap: 8 }}>
           {editando === c.code ? (
            <>
             <Btn size="sm" variant="success" onClick={() => guardarEdit(c.code)}> Guardar</Btn>
             <Btn size="sm" variant="secondary" onClick={() => setEditando(null)}>Cancelar</Btn>
            </>
           ) : (
            <>
             <Btn size="sm" variant="secondary" onClick={() => { setEditando(c.code); setDiasEdit(String(promMap[c.code])); }}> Editar</Btn>
             <Btn size="sm" variant="danger" onClick={() => eliminar(c.code, c.name)}> Quitar</Btn>
            </>
           )}
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </Card>
   )}

   {/* Sin promesa */}
   {sinFiltradias.length > 0 && (
    <Card style={{ padding: 0, overflow: "hidden" }}>
     <div style={{ padding: "12px 20px", background: "#fef2f2", borderBottom: "1px solid #fca5a5" }}>
      <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 13 }}> Sin Promesa Configurada ({sinFiltradias.length})</span>
     </div>
     <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 16 }}>
      {sinFiltradias.map(c => (
       <span key={c.code} style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 20,
        padding: "5px 12px", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
        {c.name}
       </span>
      ))}
     </div>
    </Card>
   )}
  </div>
 );
}


function GestionPaqueterias({ paqueterias, showToast, recargar }) {
 const [nueva, setNueva] = useState("");
 const agregar = async () => {
  if (!nueva.trim()) { showToast("Escribe el nombre de la empresa","error"); return; }
  if ((paqueterias||[]).includes(nueva.trim())) { showToast("Ya existe esa empresa","error"); return; }
  const { error } = await supabase.from('paqueterias').insert({ nombre: nueva.trim() });
  if (error) { showToast(mensajeError(error, "la empresa de paqueteria"),"error"); return; }
  setNueva("");
  showToast(" Empresa de paqueteria agregada","success");
  if (recargar) await recargar();
 };
 return (
  <div>
   <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}> Empresas de Paqueteria</h2>
   <Card style={{marginBottom:20}}>
    <div style={{display:"flex",gap:10,alignItems:"center"}}>
     <input value={nueva} onChange={e=>setNueva(e.target.value)}
      onKeyDown={e=>e.key==="Enter"&&agregar()}
      placeholder="Nombre de la empresa (ej: Servientrega, TCC...)"
      style={{...iSt,flex:1}}/>
     <Btn onClick={agregar}>+ Agregar</Btn>
    </div>
   </Card>
   <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {(paqueterias||[]).length===0&&<Card style={{textAlign:"center",padding:32,color:"#94a3b8"}}>Sin empresas registradas.</Card>}
    {(paqueterias||[]).map((p,i)=>(
     <Card key={i} style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:600,color:"#334155"}}> {p}</span>
      <button onClick={async ()=>{const{error}=await supabase.from('paqueterias').delete().eq('nombre',p); if(!error){showToast('Eliminado','info'); if(recargar) await recargar();}}}
       style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:18,padding:0,lineHeight:1}}></button>
     </Card>
    ))}
   </div>
  </div>
 );
}

// ModuloDevoluciones 

function ModuloDevoluciones({ devoluciones, conductores, ciudades, transportistas, showToast, user, recargar }) {
 const [modNueva, setModNueva] = useState(false);
 const [modEditar,setModEditar]= useState(null);
 const [modDet,  setModDet]  = useState(null);
 const [busq,   setBusq]   = useState("");
 const fileRef = useRef(null);

 const vacio = {
  factura:"", pedido_ref:"", unidades:"", volumen_m3:"", peso_kg:"",
  dir_recogida:"", ciudad_codigo:"", motivo:"",
  tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
  soporte_data:null, soporte_nombre:"",
 };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const esCliente = user.rol==="cliente";
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const abrirEditarCliente = (dev) => {
  setModEditar(dev);
  setForm({
   ...vacio,
   factura: dev.factura||"",
   pedido_ref: dev.pedido_ref||"",
   unidades: dev.unidades||"",
   volumen_m3: dev.volumen_m3||"",
   peso_kg: dev.peso_kg||"",
   dir_recogida: dev.dir_recogida||"",
   ciudad_codigo: dev.ciudad_codigo||"",
   motivo: dev.motivo||"",
   soporte_data: dev.soporte_data||null,
   soporte_nombre: dev.soporte_nombre||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

 const cargarDoc = async (files) => {
  const file = files[0];
  if (!file) return;
  const data = await fileToBase64(file);
  setForm(p=>({...p, soporte_data:data, soporte_nombre:file.name}));
 };

 const crear = async () => {
  const req = ["factura","pedido_ref","unidades","volumen_m3","peso_kg","dir_recogida","ciudad_codigo","motivo"];
  for (const k of req) {
   if (!form[k].toString().trim()) { showToast("Todos los campos son obligatorios","error"); return; }
  }
  const guia = generarGuiaDV(devoluciones);
  const ciudad = (ciudades||[]).find(c=>c.code===form.ciudad_codigo);
  const cond = user.rol!=="cliente" && form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
  if (modEditar) {
   const cambios = {
    factura: form.factura.trim(), pedido_ref: form.pedido_ref.trim(),
    unidades: parseInt(form.unidades)||0,
    volumen_m3: parseFloat(form.volumen_m3)||0,
    peso_kg: parseFloat(form.peso_kg)||0,
    dir_recogida: form.dir_recogida.trim(),
    ciudad_codigo: form.ciudad_codigo,
    ciudad_nombre: ciudad?.name||"",
    motivo: form.motivo.trim(),
    soporte_data: form.soporte_data,
    soporte_nombre: form.soporte_nombre,
   };
   const { error } = await supabase.from('devoluciones').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la devolucion"),"error"); return; }
   cerrarFormulario();
   showToast(" Devolucion actualizada","success");
   if (recargar) await recargar();
   return;
  }
  const nueva = {
   id: guia, guia,
   factura: form.factura.trim(), pedido_ref: form.pedido_ref.trim(),
   unidades: parseInt(form.unidades)||0,
   volumen_m3: parseFloat(form.volumen_m3)||0,
   peso_kg: parseFloat(form.peso_kg)||0,
   dir_recogida: form.dir_recogida.trim(),
   ciudad_codigo: form.ciudad_codigo,
   ciudad_nombre: ciudad?.name||"",
   motivo: form.motivo.trim(),
   conductor_id: cond?cond.id:null,
   placa: cond?cond.placa:null,
   nit_proveedor: cond?cond.nit_proveedor:null,
   estado: cond?"en_transito":"sin_asignar",
   paqueteria: form.tipo_envio==="paqueteria" ? form.paqueteria : null,
   guia_paqueteria: form.tipo_envio==="paqueteria" ? form.guia_paqueteria : null,
   soporte_data: form.soporte_data,
   soporte_nombre: form.soporte_nombre,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, novedad: false,
   solicitado_por: user.nombre||user.user,
  };
  const { error: devErr } = await supabase.from('devoluciones').insert(nueva);
  if (devErr) { showToast(mensajeError(devErr, "la devolucion"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` Devolucion creada Guia: ${guia}`,"success");
  if (recargar) await recargar();
 };

 const asignar = async (id, condId, novedad) => {
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = { conductor_id:cond?cond.id:null, placa:cond?cond.placa:null,
   nit_proveedor:cond?cond.nit_proveedor:null,
   estado:cond?"en_transito":"sin_asignar",
   novedad:novedad!==undefined?novedad:false };
  await supabase.from('devoluciones').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const marcarEntregado = async (id, novedad, condId) => {
  const hoy = new Date().toISOString().split("T")[0];
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = {
   estado:novedad?"novedad":"entregado",
   fecha_real:hoy,
   novedad,
   ...(cond ? { conductor_id:cond.id, placa:cond.placa, nit_proveedor:cond.nit_proveedor } : {}),
  };
  await supabase.from('devoluciones').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const filtradas = devoluciones.filter(d=>{
  if (esCliente && ![user.nombre, user.user].includes(d.solicitado_por)) return false;
  const q=busq.toLowerCase();
  return !busq||d.guia.toLowerCase().includes(q)||d.factura.toLowerCase().includes(q)||d.pedido_ref.toLowerCase().includes(q);
 });

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
    <h2 style={{margin:0,color:"#dc2626",fontWeight:900}}> Devoluciones</h2>
    <Btn onClick={()=>setModNueva(true)}>+ Nueva Devolucion</Btn>
   </div>
   <Card style={{padding:14,marginBottom:16}}>
    <input value={busq} onChange={e=>setBusq(e.target.value)}
     placeholder=" Buscar por guia, factura o pedido..." style={iSt}/>
   </Card>
   <div style={{display:"flex",flexDirection:"column",gap:12}}>
    {filtradas.length===0&&<Card style={{textAlign:"center",padding:32,color:"#94a3b8"}}>Sin devoluciones registradas.</Card>}
    {filtradas.map(d=>(
     <Card key={d.id} style={{borderLeft:"4px solid #dc2626"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
       <div style={{flex:1}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
         <span style={{fontFamily:"monospace",fontWeight:900,color:"#dc2626",fontSize:15}}>{d.guia}</span>
         <Badge estado={d.estado}/>
         {d.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}> Con Novedad</span>}
        </div>
        <div style={{fontSize:13,color:"#64748b"}}>Factura: <strong>{d.factura}</strong> Pedido: <strong>{d.pedido_ref}</strong> {d.unidades} uds {d.ciudad_nombre}</div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>Motivo: {d.motivo}</div>
        {d.paqueteria&&<div style={{fontSize:12,color:"#0891b2"}}> {d.paqueteria} {d.guia_paqueteria}</div>}
        {d.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}> Completado: {d.fecha_real}</div>}
        {d.soporte_data&&(
         <Btn size="sm" variant="success" style={{marginTop:8}}
          onClick={()=>abrirArchivoGuardado(d.soporte_data, d.soporte_nombre || `soporte-${d.guia}`)}>
           Ver Soporte
         </Btn>
        )}
       </div>
       {esCliente && !d.conductor_id && d.estado==="sin_asignar" && (
        <Btn size="sm" variant="secondary" onClick={()=>abrirEditarCliente(d)}>Editar</Btn>
       )}
       {!esCliente&&<Btn size="sm" variant="secondary" onClick={()=>setModDet(d)}>Gestionar</Btn>}
      </div>
     </Card>
    ))}
   </div>
   {(modNueva||modEditar)&&(
    <Modal title={modEditar ? "Editar Solicitud de Devolucion" : "Nueva Solicitud de Devolucion"} onClose={cerrarFormulario} wide>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!modEditar&&<div style={{background:"#fef2f2",borderRadius:10,padding:10,fontSize:12,color:"#dc2626",fontWeight:600}}>
       Se generar automaticamente una Guia (DV-{new Date().getFullYear()}-XXXX).
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="No. Factura *" value={form.factura} onChange={f("factura")} placeholder="FAC-2200"/>
       <Field label="No. Pedido Ref. *" value={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
       <Field label="Unidades *" value={form.unidades} onChange={f("unidades")} type="number" placeholder="5"/>
       <Field label="Volumen m *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
       <Field label="Peso kg *" value={form.peso_kg} onChange={f("peso_kg")} type="number" placeholder="10"/>
      </div>
      <Field label="Direccion de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
      <Field label="Ciudad de Recogida *" value={form.ciudad_codigo} onChange={f("ciudad_codigo")} as="select"
       options={[{value:"",label:" Seleccione "},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} ${c.code}`}))]}/>
      <Field label="Motivo *" value={form.motivo} onChange={f("motivo")} as="textarea" placeholder="Describe el motivo de la devolucin..."/>
      {!esCliente && !modEditar && <Field label="Tipo de Envio" value={form.tipo_envio||"conductor"} onChange={f("tipo_envio")} as="select"
       options={[{value:"conductor",label:" Conductor Propio"},{value:"empresa_transporte",label:" Empresa Transportista"},{value:"mensajeria",label:" Mensajeria"},{value:"paqueteria",label:" Paqueteria Tercero"}]}/>
      }
      {!esCliente && !modEditar && (form.tipo_envio||"conductor")==="paqueteria"&&(
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Empresa Paqueteria" value={form.paqueteria||""} onChange={f("paqueteria")} placeholder="Servientrega, TCC..."/>
        <Field label="No. Guia" value={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-"/>
       </div>
      )}
      {!esCliente && !modEditar && ((form.tipo_envio||"conductor")!=="paqueteria")&&(
       <Field label="Conductor (opcional)" value={form.conductor_id}
        onChange={v=>{
         f("conductor_id")(v);
         const c=conductoresActivos.find(cx=>String(cx.id)===String(v));
         if(c&&form.tipo_envio==="empresa_transporte") f("paqueteria")(c.empresa||"");
        }} as="select"
        options={[
         {value:"",label:" Sin asignar "},
         ...((form.tipo_envio||"conductor")==="empresa_transporte"
          ? conductoresActivos.filter(c=>c.empresa||c.nit_proveedor)
          : conductoresActivos
         ).map(c=>({value:c.id,label:`${c.nombre} ${c.placa}${c.empresa?" "+c.empresa:""}`}))
        ]}/>
      )}
      <div style={{border:`1px dashed ${P[300]}`,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer"}}
       onClick={()=>fileRef.current&&fileRef.current.click()}>
       {form.soporte_nombre?<span style={{color:"#059669",fontWeight:700}}> {form.soporte_nombre}</span>:<span style={{color:P[600]}}> Adjuntar soporte (opcional)</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={cerrarFormulario}>Cancelar</Btn>
       <Btn onClick={crear}>{modEditar ? " Guardar Cambios" : " Registrar Devolucion"}</Btn>
      </div>
     </div>
    </Modal>
   )}
   {modDet&&(
    <ModalDetalleDV dev={modDet} conductores={conductores} ciudades={ciudades}
     onClose={()=>setModDet(null)} onAsignar={asignar} onEntregado={marcarEntregado}
     showToast={showToast} canEdit={user.rol!=="cliente"}/>
   )}
  </div>
 );
}

function ModalDetalleDV({ dev, conductores, ciudades, onClose, onAsignar, onEntregado, showToast, canEdit }) {
 const [condId, setCondId] = useState(dev.conductor_id||"");
 const [novedad, setNovedad] = useState(dev.novedad||false);
 const ciudad = ciudades.find(c=>c.code===dev.ciudad_codigo);
 const cond  = conductores.find(c=>String(c.id)===String(condId||dev.conductor_id||""));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const guardar = async () => {
  await onAsignar(dev.id, condId, novedad);
  showToast(" Devolucion actualizada","success");
  onClose();
 };
 const marcar = () => {
  onEntregado(dev.id, novedad, condId);
  showToast(novedad?" Marcada con novedad":" Recogida completada","success");
  onClose();
 };

 return (
  <Modal title={`Devolucion ${dev.guia}`} onClose={onClose} wide>
   <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:"#fef2f2",borderRadius:12,padding:16,border:"1px solid #fca5a5"}}>
     <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}> {dev.guia}</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
      <span> Factura: <strong>{dev.factura}</strong></span>
      <span> Pedido: <strong>{dev.pedido_ref}</strong></span>
      <span> Unidades: <strong>{dev.unidades}</strong></span>
      <span> Peso: <strong>{dev.peso_kg} kg</strong></span>
      <span> {dev.ciudad_nombre}</span>
      <span> {dev.dir_recogida}</span>
     </div>
     <div style={{marginTop:8,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:13,color:"#92400e"}}>
       Motivo: {dev.motivo}
     </div>
     {dev.soporte_data&&(
      <Btn size="sm" variant="success" style={{marginTop:10}}
       onClick={()=>abrirArchivoGuardado(dev.soporte_data, dev.soporte_nombre || `soporte-${dev.guia}`)}>
        Ver Soporte
      </Btn>
     )}
    </div>
    <Badge estado={dev.estado}/>
    {canEdit&&dev.estado!=="entregado"&&dev.estado!=="novedad"&&(
     <>
      {!dev.paqueteria&&(
       <Field label="Asignar Conductor" value={condId} onChange={setCondId} as="select"
        options={[{value:"",label:"Sin asignar"},...conductoresActivos.map(c=>({value:c.id,label:`${c.nombre} ${c.placa}`}))]}/>
      )}
      <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
       onClick={()=>setNovedad(!novedad)}>
       <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}></span>}
       </div>
       <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad</span>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
       {!dev.paqueteria&&<Btn onClick={guardar}> Guardar Conductor</Btn>}
       <Btn variant="success" onClick={marcar}> Marcar Recogida Completada</Btn>
      </div>
     </>
    )}
   </div>
  </Modal>
 );
}

// ModuloRecogidas 

function ModuloRecogidas({ recogidas, conductores, ciudades, transportistas, showToast, user, recargar }) {
 const [modNueva, setModNueva] = useState(false);
 const [modEditar,setModEditar]= useState(null);
 const [modDet,  setModDet]  = useState(null);
 const [busq,   setBusq]   = useState("");
 const fileRef = useRef(null);

 const vacio = {
  dir_recogida:"", ciudad_recogida_cod:"", dir_entrega:"", ciudad_entrega_cod:"",
  unidades:"", volumen_m3:"", peso_kg:"", observaciones:"",
  tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
  doc_data:null, doc_nombre:"",
 };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const esCliente = user.rol==="cliente";
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const abrirEditarCliente = (rec) => {
  setModEditar(rec);
  setForm({
   ...vacio,
   dir_recogida: rec.dir_recogida||"",
   ciudad_recogida_cod: rec.ciudad_recogida_cod||"",
   dir_entrega: rec.dir_entrega||"",
   ciudad_entrega_cod: rec.ciudad_entrega_cod||"",
   unidades: rec.unidades||"",
   volumen_m3: rec.volumen_m3||"",
   peso_kg: rec.peso_kg||"",
   observaciones: rec.observaciones||"",
   doc_data: rec.doc_data||null,
   doc_nombre: rec.doc_nombre||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

 const cargarDoc = async (files) => {
  const file = files[0]; if (!file) return;
  const data = await fileToBase64(file);
  setForm(p=>({...p, doc_data:data, doc_nombre:file.name}));
 };

 const crear = async () => {
  const req = ["dir_recogida","ciudad_recogida_cod","dir_entrega","ciudad_entrega_cod","unidades","volumen_m3","peso_kg"];
  for (const k of req) {
   if (!form[k].toString().trim()) { showToast("Todos los campos son obligatorios","error"); return; }
  }
  const guia = generarGuiaRC(recogidas);
  const crec = (ciudades||[]).find(c=>c.code===form.ciudad_recogida_cod);
  const cent = (ciudades||[]).find(c=>c.code===form.ciudad_entrega_cod);
  const cond = user.rol!=="cliente" && form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
  if (modEditar) {
   const cambios = {
    dir_recogida: form.dir_recogida.trim(),
    ciudad_recogida_cod: form.ciudad_recogida_cod,
    ciudad_recogida_nombre: crec?.name||"",
    dir_entrega: form.dir_entrega.trim(),
    ciudad_entrega_cod: form.ciudad_entrega_cod,
    ciudad_entrega_nombre: cent?.name||"",
    unidades: parseInt(form.unidades)||0,
    volumen_m3: parseFloat(form.volumen_m3)||0,
    peso_kg: parseFloat(form.peso_kg)||0,
    observaciones: form.observaciones.trim(),
    doc_data: form.doc_data,
    doc_nombre: form.doc_nombre,
   };
   const { error } = await supabase.from('recogidas').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la recogida"),"error"); return; }
   cerrarFormulario();
   showToast(" Recogida actualizada","success");
   if (recargar) await recargar();
   return;
  }
  const nueva = {
   id: guia, guia,
   dir_recogida: form.dir_recogida.trim(),
   ciudad_recogida_cod: form.ciudad_recogida_cod,
   ciudad_recogida_nombre: crec?.name||"",
   dir_entrega: form.dir_entrega.trim(),
   ciudad_entrega_cod: form.ciudad_entrega_cod,
   ciudad_entrega_nombre: cent?.name||"",
   unidades: parseInt(form.unidades)||0,
   volumen_m3: parseFloat(form.volumen_m3)||0,
   peso_kg: parseFloat(form.peso_kg)||0,
   observaciones: form.observaciones.trim(),
   conductor_id: cond?cond.id:null,
   placa: cond?cond.placa:null,
   nit_proveedor: cond?cond.nit_proveedor:null,
   estado: cond?"en_transito":"sin_asignar",
   paqueteria: form.tipo_envio==="paqueteria"?form.paqueteria:null,
   guia_paqueteria: form.tipo_envio==="paqueteria"?form.guia_paqueteria:null,
   doc_data: form.doc_data,
   doc_nombre: form.doc_nombre,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, novedad: false,
   solicitado_por: user.nombre||user.user,
  };
  const { error: recErr } = await supabase.from('recogidas').insert(nueva);
  if (recErr) { showToast(mensajeError(recErr, "la recogida"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` Recogida creada Guia: ${guia}`,"success");
  if (recargar) await recargar();
 };

 const asignar = async (id, condId, novedad) => {
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = { conductor_id:cond?cond.id:null, placa:cond?cond.placa:null,
   nit_proveedor:cond?cond.nit_proveedor:null,
   estado:cond?"en_transito":"sin_asignar",
   novedad:novedad!==undefined?novedad:false };
  await supabase.from('recogidas').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const marcarEntregado = async (id, novedad, condId) => {
  const hoy = new Date().toISOString().split("T")[0];
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = {
   estado:novedad?"novedad":"entregado",
   fecha_real:hoy,
   novedad,
   ...(cond ? { conductor_id:cond.id, placa:cond.placa, nit_proveedor:cond.nit_proveedor } : {}),
  };
  await supabase.from('recogidas').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const filtradas = recogidas.filter(r=>{
  if (esCliente && ![user.nombre, user.user].includes(r.solicitado_por)) return false;
  const q=busq.toLowerCase();
  return !busq||r.guia.toLowerCase().includes(q)||(r.ciudad_recogida_nombre||"").toLowerCase().includes(q);
 });

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
    <h2 style={{margin:0,color:"#0891b2",fontWeight:900}}> Recogidas</h2>
    <Btn onClick={()=>setModNueva(true)}>+ Nueva Recogida</Btn>
   </div>
   <Card style={{padding:14,marginBottom:16}}>
    <input value={busq} onChange={e=>setBusq(e.target.value)}
     placeholder=" Buscar por guia o ciudad..." style={iSt}/>
   </Card>
   <div style={{display:"flex",flexDirection:"column",gap:12}}>
    {filtradas.length===0&&<Card style={{textAlign:"center",padding:32,color:"#94a3b8"}}>Sin recogidas registradas.</Card>}
    {filtradas.map(r=>(
     <Card key={r.id} style={{borderLeft:"4px solid #0891b2"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
       <div style={{flex:1}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
         <span style={{fontFamily:"monospace",fontWeight:900,color:"#0891b2",fontSize:15}}>{r.guia}</span>
         <Badge estado={r.estado}/>
         {r.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}> Con Novedad</span>}
        </div>
        <div style={{fontSize:13,color:"#64748b"}}>
          Recogida: {r.ciudad_recogida_nombre} Entrega: {r.ciudad_entrega_nombre}
        </div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{r.unidades} uds {r.volumen_m3} m {r.peso_kg} kg</div>
        {r.paqueteria&&<div style={{fontSize:12,color:"#0891b2"}}> {r.paqueteria} {r.guia_paqueteria}</div>}
        {r.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}> Completado: {r.fecha_real}</div>}
        {r.doc_data&&(
         <Btn size="sm" variant="success" style={{marginTop:8}}
          onClick={()=>abrirArchivoGuardado(r.doc_data, r.doc_nombre || `documento-${r.guia}`)}>
           Ver Documento
         </Btn>
        )}
       </div>
       {esCliente && !r.conductor_id && r.estado==="sin_asignar" && (
        <Btn size="sm" variant="secondary" onClick={()=>abrirEditarCliente(r)}>Editar</Btn>
       )}
       {!esCliente&&<Btn size="sm" variant="secondary" onClick={()=>setModDet(r)}>Gestionar</Btn>}
      </div>
     </Card>
    ))}
   </div>
   {(modNueva||modEditar)&&(
    <Modal title={modEditar ? "Editar Solicitud de Recogida" : "Nueva Solicitud de Recogida"} onClose={cerrarFormulario} wide>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Direccion de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
       <Field label="Ciudad de Recogida *" value={form.ciudad_recogida_cod} onChange={f("ciudad_recogida_cod")} as="select"
        options={[{value:"",label:" Seleccione "},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} ${c.code}`}))]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="Direccion de Entrega *" value={form.dir_entrega} onChange={f("dir_entrega")} placeholder="Av El Poblado #43A-15"/>
       <Field label="Ciudad de Entrega *" value={form.ciudad_entrega_cod} onChange={f("ciudad_entrega_cod")} as="select"
        options={[{value:"",label:" Seleccione "},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} ${c.code}`}))]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
       <Field label="Unidades *" value={form.unidades} onChange={f("unidades")} type="number" placeholder="5"/>
       <Field label="Volumen m *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
       <Field label="Peso kg *" value={form.peso_kg} onChange={f("peso_kg")} type="number" placeholder="10"/>
      </div>
      <Field label="Observaciones" value={form.observaciones} onChange={f("observaciones")} as="textarea" placeholder="Instrucciones especiales..."/>
      {!esCliente && !modEditar && <Field label="Tipo de Envio" value={form.tipo_envio||"conductor"} onChange={f("tipo_envio")} as="select"
       options={[{value:"conductor",label:" Conductor Propio"},{value:"empresa_transporte",label:" Empresa Transportista"},{value:"mensajeria",label:" Mensajeria"},{value:"paqueteria",label:" Paqueteria Tercero"}]}/>
      }
      {!esCliente && !modEditar && (form.tipo_envio||"conductor")==="paqueteria"?(
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Empresa Paqueteria" value={form.paqueteria||""} onChange={f("paqueteria")} placeholder="Servientrega..."/>
        <Field label="No. Guia" value={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-"/>
       </div>
      ):(!esCliente && !modEditar &&
       <Field label="Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
        options={[{value:"",label:" Sin asignar "},...conductoresActivos.map(c=>({value:c.id,label:`${c.nombre} ${c.placa}`}))]}/>
      )}
      <div style={{border:`1px dashed ${P[300]}`,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer"}}
       onClick={()=>fileRef.current&&fileRef.current.click()}>
       {form.doc_nombre?<span style={{color:"#059669",fontWeight:700}}> {form.doc_nombre}</span>:<span style={{color:P[600]}}> Adjuntar documento (opcional)</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={cerrarFormulario}>Cancelar</Btn>
       <Btn onClick={crear}>{modEditar ? " Guardar Cambios" : " Registrar Recogida"}</Btn>
      </div>
     </div>
    </Modal>
   )}
   {modDet&&(
    <Modal title={`Recogida ${modDet.guia}`} onClose={()=>setModDet(null)} wide>
     <ModalDetalleRC rec={modDet} conductores={conductores} ciudades={ciudades}
      onClose={()=>setModDet(null)} onAsignar={asignar} onEntregado={marcarEntregado}
      showToast={showToast} canEdit={user.rol!=="cliente"}/>
    </Modal>
   )}
  </div>
 );
}

function ModalDetalleRC({ rec, conductores, ciudades, onClose, onAsignar, onEntregado, showToast, canEdit }) {
 const [condId, setCondId] = useState(rec.conductor_id||"");
 const [novedad, setNovedad] = useState(rec.novedad||false);
 const cond = conductores.find(c=>String(c.id)===String(condId||rec.conductor_id||""));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const guardar = async () => {
  await onAsignar(rec.id, condId, novedad);
  showToast(" Recogida actualizada","success");
  onClose();
 };
 const marcar = () => {
  onEntregado(rec.id, novedad, condId);
  showToast(novedad?" Marcada con novedad":" Recogida completada","success");
  onClose();
 };

 return (
  <div style={{display:"flex",flexDirection:"column",gap:16}}>
   <div style={{background:"#ecfeff",borderRadius:12,padding:16,border:"1px solid #67e8f9"}}>
    <div style={{fontWeight:800,fontSize:15,color:"#0891b2",marginBottom:8}}> {rec.guia}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
     <span> Recogida: {rec.ciudad_recogida_nombre}</span>
     <span> Entrega: {rec.ciudad_entrega_nombre}</span>
     <span> {rec.unidades} uds {rec.peso_kg} kg</span>
    </div>
    {rec.doc_data&&(
     <Btn size="sm" variant="success" style={{marginTop:10}}
      onClick={()=>abrirArchivoGuardado(rec.doc_data, rec.doc_nombre || `documento-${rec.guia}`)}>
       Ver Documento
     </Btn>
    )}
   </div>
   <Badge estado={rec.estado}/>
   {canEdit&&rec.estado!=="entregado"&&rec.estado!=="novedad"&&(
    <>
     {!rec.paqueteria&&(
      <Field label="Asignar Conductor" value={condId} onChange={setCondId} as="select"
       options={[{value:"",label:"Sin asignar"},...conductoresActivos.map(c=>({value:c.id,label:`${c.nombre} ${c.placa}`}))]}/>
     )}
     <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
      onClick={()=>setNovedad(!novedad)}>
      <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
       {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}></span>}
      </div>
      <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad</span>
     </div>
     <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
      {!rec.paqueteria&&<Btn onClick={guardar}> Guardar Conductor</Btn>}
      <Btn variant="success" onClick={marcar}> Marcar Recogida Completada</Btn>
     </div>
    </>
   )}
  </div>
 );
}

// ModuloPQRS 

function ModuloPQRS({ pqrs, pedidos, showToast, user, recargar }) {
 const MOTIVOS = [
  "Entrega tarda fuera de tiempo estimado",
  "Mercancia averiada o daada en transito",
  "Entrega incompleta faltan unidades",
  "Entrega en direccion incorrecta",
  "Mercancia no recibida sin soporte de entrega",
  "Conductor no se present al punto de entrega",
  "Mala manipulacin de la mercanca",
  "Embalaje inadecuado en origen",
  "Error en la factura asociada al pedido",
  "Retraso en la asignacin del conductor",
  "Cambio de conductor sin previo aviso",
  "Vehiculo en mal estado o inapropiado",
  "Pedido cancelado pero ya fue despachado",
  "Doble cobro o cobro incorrecto de flete",
  "Soporte de entrega ilegible o incompleto",
  "Sin comunicacin del conductor durante el transito",
  "Novedad no reportada oportunamente",
  "Devolucion no gestionada a tiempo",
  "Incumplimiento de condiciones de temperatura / cadena de fro",
  "Otro motivo logstico",
 ];
 const ESTADOS_PQRS = {
  abierta:  { label:"Abierta",  color:"#dc2626", bg:"#fef2f2" },
  en_gestion: { label:"En Gestion", color:"#d97706", bg:"#fffbeb" },
  cerrada:  { label:"Cerrada",  color:"#059669", bg:"#ecfdf5" },
  rechazada: { label:"Rechazada", color:"#64748b", bg:"#f1f5f9" },
 };
 const [modNueva,  setModNueva]  = useState(false);
 const [modEditar, setModEditar] = useState(null);
 const [modGestion, setModGestion] = useState(null);
 const [busq,    setBusq]    = useState("");
 const [filtroEst, setFiltroEst] = useState("todos");
 const [gestion,  setGestion]  = useState("");
 const vacio = { factura:"", pedido_ref:"", motivo:"", descripcion:"" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));

 const abrirEditarCliente = (p) => {
  setModEditar(p);
  setForm({
   factura: p.factura||"",
   pedido_ref: p.pedido_ref||"",
   motivo: p.motivo||"",
   descripcion: p.descripcion||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

 const crear = async () => {
  if (!form.factura.trim()||!form.pedido_ref.trim()||!form.motivo||!form.descripcion.trim()) {
   showToast("Todos los campos son obligatorios","error"); return;
  }
  if (modEditar) {
   const cambios = {
    factura: form.factura.trim(),
    pedido_ref: form.pedido_ref.trim(),
    motivo: form.motivo,
    descripcion: form.descripcion.trim(),
   };
   const { error } = await supabase.from('pqrs').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la PQRS"),"error"); return; }
   cerrarFormulario();
   showToast(" PQRS actualizada","success");
   if (recargar) await recargar();
   return;
  }
  const year = new Date().getFullYear();
  const usados = pqrs.map(p=>p.id).filter(id=>id.startsWith(`PQRS-${year}-`)).map(id=>parseInt(id.split("-")[2])||0);
  const num = String((usados.length?Math.max(...usados):0)+1).padStart(4,"0");
  const nueva = {
   id: `PQRS-${year}-${num}`,
   factura: form.factura.trim(), pedido_ref: form.pedido_ref.trim(),
   motivo: form.motivo, descripcion: form.descripcion.trim(),
   estado: "abierta", solicitado_por: user.nombre||user.user,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_gestion: null, respuesta: "", gestionado_por: "",
  };
  const { error } = await supabase.from('pqrs').insert(nueva);
  if (error) { showToast(mensajeError(error, "la PQRS"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` PQRS creada Caso: ${nueva.id}`,"success");
  if (recargar) await recargar();
 };

 const guardarGestion = async () => {
  if ((modGestion.respuesta||"").trim() || modGestion.fecha_gestion || modGestion.gestionado_por) {
   showToast("La respuesta de esta PQRS ya fue registrada y no se puede editar","error");
   return;
  }
  if (!gestion.trim()) { showToast("Escribe una respuesta de gestin","error"); return; }
  const cambios = { respuesta:gestion, gestionado_por:user.nombre||user.user,
   fecha_gestion:new Date().toISOString().split("T")[0], estado:"en_gestion" };
  const { error } = await supabase.from('pqrs').update(cambios).eq('id', modGestion.id);
  if (error) { showToast(mensajeError(error, "la gestion de PQRS"),"error"); return; }
  setModGestion(null); setGestion("");
  showToast(" Gestion registrada","success");
  if (recargar) await recargar();
 };

 const cerrar = async (id, estado) => {
  const { error } = await supabase.from('pqrs').update({estado}).eq('id', id);
  if (error) { showToast(mensajeError(error, "el cierre de PQRS"),"error"); return; }
  showToast(`Caso ${estado==="cerrada"?"cerrado":"rechazado"}`,"success");
  if (recargar) await recargar();
 };

 const esCliente = user.rol==="cliente";
 const esOperador = user.rol==="admin"||user.rol==="operador";
 const filt = pqrs.filter(p=>{
  if (esCliente && ![user.nombre, user.user].includes(p.solicitado_por)) return false;
  const q=busq.toLowerCase();
  const okB=!busq||p.id.toLowerCase().includes(q)||p.factura.toLowerCase().includes(q)||p.pedido_ref.toLowerCase().includes(q)||p.motivo.toLowerCase().includes(q);
  const okE=filtroEst==="todos"||p.estado===filtroEst;
  return okB&&okE;
 });

 return (
  <div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
    <h2 style={{margin:0,color:P[800],fontWeight:900}}> PQRS Peticiones, Quejas y Reclamos</h2>
    {esCliente&&<Btn size="sm" onClick={()=>setModNueva(true)}>+ Nueva PQRS</Btn>}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:20}}>
    {Object.entries(ESTADOS_PQRS).map(([k,v])=>(
     <Card key={k} style={{textAlign:"center",padding:14,borderTop:`3px solid ${v.color}`,cursor:"pointer",background:filtroEst===k?v.bg:"#fff"}}
      onClick={()=>setFiltroEst(filtroEst===k?"todos":k)}>
      <div style={{fontSize:24,fontWeight:900,color:v.color}}>{pqrs.filter(p=>p.estado===k).length}</div>
      <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginTop:4}}>{v.label}</div>
     </Card>
    ))}
   </div>
   <Card style={{padding:14,marginBottom:16}}>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
     <input value={busq} onChange={e=>setBusq(e.target.value)}
      placeholder=" Buscar por caso, factura, pedido o motivo..." style={{...iSt,flex:1,minWidth:200}}/>
     <select value={filtroEst} onChange={e=>setFiltroEst(e.target.value)} style={{...iSt,width:"auto"}}>
      <option value="todos">Todos los estados</option>
      {Object.entries(ESTADOS_PQRS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
     </select>
    </div>
   </Card>
   <div style={{display:"flex",flexDirection:"column",gap:12}}>
    {filt.length===0&&<Card style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Sin PQRS registradas.</Card>}
    {filt.map(p=>{
     const est = ESTADOS_PQRS[p.estado]||ESTADOS_PQRS.abierta;
     const tieneGestion = Boolean((p.respuesta||"").trim() || p.fecha_gestion || p.gestionado_por);
     return (
      <Card key={p.id} style={{borderLeft:`4px solid ${est.color}`}}>
       <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div style={{flex:1}}>
         <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontFamily:"monospace",fontWeight:900,color:P[700],fontSize:15}}>{p.id}</span>
          <span style={{background:est.bg,color:est.color,border:`1px solid ${est.color}40`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{est.label}</span>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6,fontSize:13,color:"#64748b",marginBottom:8}}>
          <span> Factura: <strong>{p.factura}</strong></span>
          <span> Pedido: <strong>{p.pedido_ref}</strong></span>
          <span> {p.fecha_creacion}</span>
          <span> {p.solicitado_por}</span>
         </div>
         <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:700,color:P[700],marginBottom:4}}>Motivo: {p.motivo}</div>
          <div style={{fontSize:13,color:"#334155"}}>{p.descripcion}</div>
         </div>
         {p.respuesta&&(
          <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 12px",border:"1px solid #86efac"}}>
           <div style={{fontSize:12,fontWeight:700,color:"#059669",marginBottom:4}}> Gestion {p.gestionado_por} {p.fecha_gestion}</div>
           <div style={{fontSize:13,color:"#334155"}}>{p.respuesta}</div>
          </div>
         )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:130}}>
         {esCliente&&p.estado==="abierta"&&(
          <Btn size="sm" variant="secondary" onClick={()=>abrirEditarCliente(p)}>Editar</Btn>
         )}
         {esOperador&&p.estado!=="cerrada"&&p.estado!=="rechazada"&&!tieneGestion&&(
          <Btn size="sm" onClick={()=>{setModGestion(p);setGestion(p.respuesta||"");}}> Gestionar</Btn>
         )}
         {esOperador&&p.estado==="en_gestion"&&(
          <>
           <Btn size="sm" variant="success" onClick={()=>cerrar(p.id,"cerrada")}> Cerrar</Btn>
           <Btn size="sm" variant="danger" onClick={()=>cerrar(p.id,"rechazada")}> Rechazar</Btn>
          </>
         )}
        </div>
       </div>
      </Card>
     );
    })}
   </div>
   {(modNueva||modEditar)&&(
    <Modal title={modEditar ? "Editar PQRS" : "Nueva PQRS"} onClose={cerrarFormulario}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!modEditar&&<div style={{background:"#fffbeb",borderRadius:10,padding:10,fontSize:12,color:"#92400e",fontWeight:600}}>
       Se generar automaticamente un numero de caso PQRS-{new Date().getFullYear()}-XXXX.
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
       <Field label="No. Factura *"   value={form.factura}  onChange={f("factura")}  placeholder="FAC-2200"/>
       <Field label="No. Pedido Ref. *" value={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001"/>
      </div>
      <Field label="Motivo *" value={form.motivo} onChange={f("motivo")} as="select"
       options={[{value:"",label:" Seleccione el motivo "},...MOTIVOS.map(m=>({value:m,label:m}))]}/>
      <Field label="Descripcion detallada *" value={form.descripcion} onChange={f("descripcion")} as="textarea"
       placeholder="Describe con detalle la situacin, fecha del evento, personas involucradias..."/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={cerrarFormulario}>Cancelar</Btn>
       <Btn onClick={crear}>{modEditar ? " Guardar Cambios" : " Radicar PQRS"}</Btn>
      </div>
     </div>
    </Modal>
   )}
   {modGestion&&(
    <Modal title={`Gestionar PQRS ${modGestion.id}`} onClose={()=>setModGestion(null)}>
     <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#f8fafc",borderRadius:10,padding:14}}>
       <div style={{fontWeight:700,color:P[800],marginBottom:6}}>Motivo: {modGestion.motivo}</div>
       <div style={{fontSize:13,color:"#334155"}}>{modGestion.descripcion}</div>
       <div style={{fontSize:12,color:"#94a3b8",marginTop:6}}>Factura: {modGestion.factura} Pedido: {modGestion.pedido_ref} Por: {modGestion.solicitado_por}</div>
      </div>
      <Field label="Respuesta / Gestion realizada *" value={gestion} onChange={setGestion} as="textarea"
       placeholder="Describe las acciones tomadias, compensaciones, compromisos..."/>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
       <Btn variant="secondary" onClick={()=>setModGestion(null)}>Cancelar</Btn>
       <Btn onClick={guardarGestion}> Registrar Gestion</Btn>
      </div>
     </div>
    </Modal>
   )}
  </div>
 );
}


// SidebarApp 

function MiUbicacion({ user }) {
 const [lat, setLat] = useState(window._gpsLat || null);
 const [lng, setLng] = useState(window._gpsLng || null);
 const [on, setOn] = useState(window._gpsOn || false);
 const [err, setErr] = useState("");
 const watchRef = useRef(window._gpsWatch || null);

 // Sync state to window globals so GPS persists when switching tabs
 const updateGps = (lat, lng) => {
  window._gpsLat = lat; window._gpsLng = lng;
  // Also store by conductor ID for multi-conductor tracking
  if (!window._gpsData) window._gpsData = {};
  const condId = user?.conductor_db_id || user?.id;
  if (condId) window._gpsData[String(condId)] = { lat, lng, ts: Date.now() };
  setLat(lat); setLng(lng);
 };

 const iniciar = () => {
  if (!navigator.geolocation) { setErr("GPS no disponible en este dispositivo."); return; }
  setErr("");
  watchRef.current = navigator.geolocation.watchPosition(
   pos => { updateGps(pos.coords.latitude, pos.coords.longitude); },
   e => setErr("Error GPS: "+e.message),
   { enableHighAccuracy:true, timeout:10000 }
  );
  window._gpsOn = true; window._gpsWatch = watchRef.current;
  setOn(true);
 };
 const detener = () => {
  if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
  watchRef.current = null;
  window._gpsOn = false; window._gpsWatch = null;
  setOn(false);
 };

 const mapUrl = lat&&lng ? `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=16` : `https://maps.google.com/maps?q=4.711,-74.072&output=embed&z=11`;
 return (
  <div>
   <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}> Mi Ubicacion GPS</h2>
   <Card style={{marginBottom:16}}>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
     <div style={{flex:1,fontSize:14}}>
      {lat&&lng?<><strong>Lat:</strong> {lat.toFixed(6)} <strong>Lng:</strong> {lng.toFixed(6)}</>:<span style={{color:"#94a3b8"}}>Presiona el botn para activar tu GPS</span>}
      {on&&<span style={{marginLeft:12,color:"#059669",fontWeight:700,fontSize:12}}> Compartiendo</span>}
     </div>
     <Btn variant={on?"danger":"success"} onClick={on?detener:iniciar}>{on?" Detener GPS":" Activar GPS"}</Btn>
    </div>
    {err&&<p style={{color:"#dc2626",fontSize:13,margin:"10px 0 0"}}> {err}</p>}
   </Card>
   <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${P[200]}`}}>
    <iframe title="mi-ubicacion" src={mapUrl} width="100%" height="360" style={{border:"none",display:"block"}} allowFullScreen loading="lazy"/>
   </div>
  </div>
 );
}

// Consultas (cliente interno) 

function Consultas({ pedidos, conductores, ciudades, devoluciones=[], recogidas=[], showToast }) {
 // Poll GPS data every 10s
 const [gpsTick, setGpsTick] = useState(0);
 useEffect(() => { const t = setInterval(()=>setGpsTick(n=>n+1), 10000); return ()=>clearInterval(t); }, []);
 const [busq,  setBusq]  = useState("");
 const [modMapa, setModMapa] = useState(null);

 const filtP = pedidos.filter(p => {
  const q = busq.toLowerCase();
  return !busq || p.id.toLowerCase().includes(q) || (p.cliente||"").toLowerCase().includes(q) || (p.factura||"").toLowerCase().includes(q) || (p.ciudad_nombre||"").toLowerCase().includes(q) || (p.guia_interna||"").toLowerCase().includes(q);
 });

 return (
  <div>
   <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}> Estado de Pedidos</h2>
   <Card style={{padding:14,marginBottom:16}}>
    <input value={busq} onChange={e=>setBusq(e.target.value)}
     placeholder=" Buscar por N pedido, guia, factura, cliente o ciudad..." style={iSt}/>
   </Card>
   <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {filtP.length===0&&<p style={{color:"#94a3b8",textAlign:"center",padding:32}}>Sin resultados.</p>}
    {filtP.map(p=>{
     const cond  = conductores.find(c=>String(c.id)===String(p.conductor_id));
     const ciudad = (ciudades||[]).find(c=>c.code===p.ciudad_codigo);
     return (
      <Card key={p.id} style={{padding:18,borderLeft:`4px solid ${ESTADOS_PEDIDO[p.estado]?.color||P[300]}`}}>
       <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div>
         {p.guia_interna&&<div style={{fontFamily:"monospace",fontWeight:900,color:P[600],fontSize:15}}>{p.guia_interna}</div>}
         <div style={{fontWeight:800,color:P[800],fontSize:14}}>{p.id} <span style={{fontWeight:400,color:"#64748b",fontSize:12}}> Factura: {p.factura}</span></div>
        </div>
        <Badge estado={p.estado}/>
       </div>
       <div style={{fontWeight:600,color:"#1e293b",marginBottom:6}}>{p.cliente}</div>
       <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
        <span> {p.cajas} cajas  {p.ciudad_nombre}  {p.direccion}</span>
        <span>
         {p.tipo==="paqueteria"?` ${p.paqueteria} ${p.guia_paqueteria}`:cond?` ${cond.nombre} ${p.placa}`:"Sin conductor asignado"}
         {" "} Est: {p.fecha_estimada||""}
         {p.fecha_real&&<span style={{color:"#059669"}}>  Entregado: {p.fecha_real}</span>}
        </span>
        {p.novedad&&<span style={{color:"#dc2626",fontWeight:700}}> Entregado con Novedad</span>}
       </div>
       <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        {(p.soportes_data||[]).length>0&&(
         <Btn size="sm" variant="success" onClick={()=>generarPDFSoportes(p,[])}> Ver Soportes ({p.soportes_data.length})</Btn>
        )}
        <Btn size="sm" variant="secondary" onClick={()=>setModMapa(modMapa?.id===p.id?null:p)}>
         {modMapa?.id===p.id?" Ocultar Mapa":" Rastreo"}
        </Btn>
       </div>
       {modMapa?.id===p.id&&(()=>{
        const gps = p.conductor_id && window._gpsData && window._gpsData[String(p.conductor_id)];
        const gpsReciente = gps && (Date.now()-gps.ts) < 300000; // 5 min
        const entregado = ["entregado","novedad"].includes(p.estado);
        if (entregado) return (
         <div style={{marginTop:12,background:"#ecfdf5",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#059669",fontWeight:700}}>
           Pedido entregado rastreo GPS no disponible
         </div>
        );
        const mapSrc = gpsReciente
         ? `https://maps.google.com/maps?q=${gps.lat},${gps.lng}&output=embed&z=15`
         : `https://maps.google.com/maps?q=${encodeURIComponent((p.direccion||"")+", "+(ciudad?.name||p.ciudad_nombre||"")+", Colombia")}&output=embed&z=15`;
        return (
         <div style={{marginTop:14,borderRadius:12,overflow:"hidden",border:`2px solid ${gpsReciente?P[400]:P[200]}`}}>
          {gpsReciente&&<div style={{background:P[600],color:"#fff",padding:"6px 14px",fontSize:12,fontWeight:700}}> GPS en Vivo ltima actualizacin hace {Math.round((Date.now()-gps.ts)/60000)} min</div>}
          <iframe title={"mapa-"+p.id} width="100%" height="280" style={{border:"none",display:"block"}}
           src={mapSrc} allowFullScreen loading="lazy"/>
          <div style={{background:P[50],padding:"8px 14px",fontSize:12,color:P[700]}}>
           {gpsReciente ? ` ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : ` ${p.direccion}, ${ciudad?.name}`}
           {cond&&<span style={{marginLeft:12}}> {cond.nombre} {p.placa}</span>}
           {!gpsReciente&&<span style={{marginLeft:8,color:"#94a3b8"}}>(GPS no activo mostrando destino)</span>}
          </div>
         </div>
        );
       })()}
      </Card>
     );
    })}
   </div>
  </div>
 );
}


export default function SomosProTracking() {
 const [user,      setUser]      = useState(null);
 const [tab,      setTab]      = useState("");
 const [cargando,    setCargando]    = useState(true);
 const [pedidos,    setPedidos]    = useState([]);
 const [conductores,  setConductores]  = useState([]);
 const [transportistas, setTransportistas] = useState([]);
 const [usuarios,    setUsuarios]    = useState([]);
 const [ciudades,    setCiudades]    = useState(CIUDADES_BASE);
 const [paqueterias,  setPaqueterias]  = useState(PAQUETERIAS_INICIALES);
 const [devoluciones,  setDevoluciones]  = useState([]);
 const [recogidas,   setRecogidas]   = useState([]);
 const [pqrs,      setPqrs]      = useState([]);
 const [promesas,    setPromesas]    = useState([]);
 const [facturas,    setFacturas]    = useState([]);
 const [collapsed,   setCollapsed]   = useState(false);
 const [modCompartir,  setModCompartir]  = useState(false);
 const [toast,     setToast]     = useState(null);

 const showToast = (msg, type = "info") => setToast({ msg, type });

 const cargarTodo = async (perfil = user) => {
  setCargando(true);
  try {
   const rolActual = perfil?.rol;
   const puedeVerFacturas = ["admin", "operador"].includes(rolActual);
   const pedidosSelectCliente = [
    "id",
    "guia_interna",
    "cliente",
    "ciudad_codigo",
    "ciudad_nombre",
    "direccion",
    "cajas",
    "factura",
    "conductor_id",
    "placa",
    "estado",
    "estado_despacho",
    "novedad",
    "fecha_creacion",
    "fecha_estimada",
    "fecha_real",
    "tipo",
    "paqueteria",
    "guia_paqueteria",
    "ciudad_origen_codigo",
    "ciudad_origen_nombre",
    "direccion_origen",
    "created_at",
   ].join(",");
   const pedidosSelect = rolActual === "cliente" ? pedidosSelectCliente : "*";

   const [
    usuRes, traRes, conRes,
    pedRes, ciuRes, paqRes,
    devRes, recRes, pqrsRes,
    promRes,
   ] = await Promise.all([
    supabase.from('usuarios').select('*').order('created_at'),
    supabase.from('transportistas').select('*').order('created_at'),
    supabase.from('conductores').select('*').order('created_at'),
    supabase.from('pedidos').select(pedidosSelect).order('created_at', { ascending: false }),
    supabase.from('ciudades').select('*').order('name'),
    supabase.from('paqueterias').select('*').order('nombre'),
    supabase.from('devoluciones').select('*').order('created_at', { ascending: false }),
    supabase.from('recogidas').select('*').order('created_at', { ascending: false }),
    supabase.from('pqrs').select('*').order('created_at', { ascending: false }),
    supabase.from('promesas_servicio').select('*'),
   ]);
   const results = [usuRes, traRes, conRes, pedRes, ciuRes, paqRes, devRes, recRes, pqrsRes, promRes];
   const failed = results.find(r => r.error);
   if (failed) throw failed.error;

   const { data: usu } = usuRes;
   const { data: tra } = traRes;
   const { data: con } = conRes;
   const { data: ped } = pedRes;
   const { data: ciu } = ciuRes;
   const { data: paq } = paqRes;
   const { data: dev } = devRes;
   const { data: rec } = recRes;
   const { data: pqrsd } = pqrsRes;
   const { data: prom } = promRes;

   // Si no hay usuarios en Supabase, detener carga. No sembrar datos desde el cliente.
   if (usu.length === 0) {
    showToast('No hay usuarios visibles en Supabase. Verifica datos, Auth o politicas RLS.', 'error');
    setCargando(false);
    return;
   }

   setUsuarios(usu || []);
   setTransportistas(tra || []);
   setConductores(con || []);
   setPedidos(ped || []);
   if (ciu && ciu.length > 0) setCiudades(ciu);
   if (paq && paq.length > 0) setPaqueterias(paq.map(p => p.nombre));
   setDevoluciones(dev || []);
   setRecogidas(rec || []);
   setPqrs(pqrsd || []);
   setPromesas(prom || []);
   // Cargar facturas por separado - sin join anidado
   if (puedeVerFacturas) {
    try {
     const { data: factData, error: factErr } = await supabase
      .from('facturas_proveedor')
      .select('*')
      .order('created_at', { ascending: false });
     if (factErr) { setFacturas([]); }
     else {
      // Load factura_guias separately and merge
      const { data: guiasData } = await supabase
       .from('factura_guias')
       .select('*, pedidos(id,guia_interna,cliente,cajas,factura,ciudad_codigo,ciudad_nombre,fecha_creacion,fecha_despacho)');
      const guiasByFact = {};
      (guiasData||[]).forEach(g => {
       if (!guiasByFact[g.factura_id]) guiasByFact[g.factura_id] = [];
       guiasByFact[g.factura_id].push(g);
      });
      const merged = (factData||[]).map(f => ({
       ...f,
       factura_guias: guiasByFact[f.id] || [],
      }));
      setFacturas(merged);
     }
    } catch(e) { console.error('facturas load error:', e); setFacturas([]); }
   } else {
    setFacturas([]);
   }
  } catch (e) {
   console.error('Error cargando datos:', e);
   showToast('No se pudo cargar Supabase: '+(e.message || 'verifica variables y permisos.'), 'error');
  }
  setCargando(false);
 };

 // Sembrar datos iniciales si la BD est vaca 
 const sembrarDatosIniciales = async () => {
  try {
   // Ciudades base
   for (const c of CIUDADES_BASE) {
    await supabase.from('ciudades').upsert({ code: c.code, name: c.name }, { onConflict: 'code', ignoreDuplicates: true });
   }
   // Paqueterias
   for (const p of PAQUETERIAS_INICIALES) {
    await supabase.from('paqueterias').upsert({ nombre: p }, { onConflict: 'nombre', ignoreDuplicates: true });
   }
  } catch(e) {
   console.log('Sembrado inicial:', e.message);
  }
 };

 const showToastYRecargar = async (msg, type = "success") => {
  showToast(msg, type);
  await cargarTodo();
 };

 const handleLogin = async (u) => {
  // For conductors, find their conductor record to get the correct ID
  let userWithConductorId = u;
  if (u.rol === 'conductor') {
   const { data: condData } = await supabase
    .from('conductores')
    .select('id')
    .eq('usuario_id', u.id)
    .single();
   if (condData) {
    userWithConductorId = { ...u, conductor_db_id: condData.id };
   }
  }
  setUser(userWithConductorId);
  const def = { admin: "dashboard", operador: "dashboard", transportista: "mi_empresa", conductor: "mis_pedidos", cliente: "consultas" };
  setTab(def[u.rol] || "dashboard");
  await cargarTodo(userWithConductorId);
 };

 const handleLogout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setTab("");
 };

 useEffect(() => {
  let mounted = true;

  const restaurarSesion = async () => {
   setCargando(true);
   try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const authUser = sessionData?.session?.user;
    if (!authUser) {
     if (mounted) setCargando(false);
     return;
    }

    const { data: perfil, error: perfilError } = await supabase
     .from('usuarios')
     .select('*')
     .eq('auth_user_id', authUser.id)
     .maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil) {
     await supabase.auth.signOut();
     if (mounted) {
      showToast("Sesion sin perfil asignado. Inicia sesion nuevamente.","error");
      setCargando(false);
     }
     return;
    }

    if (mounted) await handleLogin(perfil);
   } catch (error) {
    console.error("No se pudo restaurar sesion:", error);
    await supabase.auth.signOut();
    if (mounted) {
     setUser(null);
     setTab("");
     setCargando(false);
    }
   }
  };

  restaurarSesion();
  const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
   if (event === "SIGNED_OUT") {
    setUser(null);
    setTab("");
   }
  });

  return () => {
   mounted = false;
   authListener?.subscription?.unsubscribe();
  };
 }, []);

 useEffect(() => {
  const check = () => setCollapsed(window.innerWidth < 820);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
 }, []);

 if (cargando) return (
  <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${P[950]},${P[700]})`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20 }}>
   <Logo size={80}/>
   <div style={{ color:"#fff", fontSize:18, fontWeight:700 }}>Cargando Somos PRO Tracking...</div>
   <div style={{ color:P[300], fontSize:13 }}>Conectando con la base de datos</div>
  </div>
 );

 if (!user) return <Login onLogin={handleLogin} />;

 const props = { pedidos, setPedidos, conductores, setConductores, usuarios, setUsuarios, showToast, user };

 // Wrappers que escriben en Supabase y recargan 
 const sbSetPedidos = async (fn) => {
  // fn can be a new array or an updater function
  const nuevosPedidos = typeof fn === 'function' ? fn(pedidos) : fn;
  // Find what changed and upsert
  for (const p of nuevosPedidos) {
   const { error } = await supabase.from('pedidos').upsert(p, { onConflict: 'id' });
   if (error) console.error('Error pedido:', error);
  }
  await cargarTodo();
 };

 const sbSetUsuarios = async (fn) => {
  const nuevos = typeof fn === 'function' ? fn(usuarios) : fn;
  for (const u of nuevos) {
   if (!u.id || typeof u.id === 'number') {
    const { id, ...rest } = u;
    throw new Error('Actualizacion directa de usuarios deshabilitada. Usar create-system-user.');
   } else {
    throw new Error('Actualizacion directa de usuarios deshabilitada. Usar create-system-user.');
   }
  }
  await cargarTodo();
 };

 const sbSetConductores = async (fn) => {
  const nuevos = typeof fn === 'function' ? fn(conductores) : fn;
  for (const c of nuevos) {
   const { id, usuario_id, ...rest } = c;
   await supabase.from('conductores').upsert({ ...rest, ...(id && typeof id !== 'number' ? {id} : {}) }, { onConflict: 'cedula' });
  }
  await cargarTodo();
 };

 const sbSetTransportistas = async (fn) => {
  const nuevos = typeof fn === 'function' ? fn(transportistas) : fn;
  for (const t of nuevos) {
   const { id, ...rest } = t;
   await supabase.from('transportistas').upsert(rest, { onConflict: 'nit' });
  }
  await cargarTodo();
 };

 const sbSetCiudades = async (fn) => {
  const nuevas = typeof fn === 'function' ? fn(ciudades) : fn;
  for (const c of nuevas) {
   await supabase.from('ciudades').upsert({ code: c.code, name: c.name }, { onConflict: 'code' });
  }
  await cargarTodo();
 };

 const sbSetPaqueterias = async (fn) => {
  const nuevas = typeof fn === 'function' ? fn(paqueterias) : fn;
  // Delete all and re-insert (simple approach for small table)
  await supabase.from('paqueterias').delete().neq('nombre', '___never___');
  for (const p of nuevas) {
   await supabase.from('paqueterias').upsert({ nombre: p }, { onConflict: 'nombre' });
  }
  await cargarTodo();
 };

 const sbSetDevoluciones = async (fn) => {
  const nuevas = typeof fn === 'function' ? fn(devoluciones) : fn;
  for (const d of nuevas) {
   await supabase.from('devoluciones').upsert(d, { onConflict: 'id' });
  }
  await cargarTodo();
 };

 const sbSetRecogidas = async (fn) => {
  const nuevas = typeof fn === 'function' ? fn(recogidas) : fn;
  for (const r of nuevas) {
   await supabase.from('recogidas').upsert(r, { onConflict: 'id' });
  }
  await cargarTodo();
 };

 const sbSetPqrs = async (fn) => {
  const nuevas = typeof fn === 'function' ? fn(pqrs) : fn;
  for (const p of nuevas) {
   await supabase.from('pqrs').upsert(p, { onConflict: 'id' });
  }
  await cargarTodo();
 };

 window._recargar = cargarTodo;

 const renderContent = () => {
  const sb = supabase;
  const re = cargarTodo;
  switch (tab) {
   case "dashboard":   return <Dashboard pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas} pqrs={pqrs} promesas={promesas} ciudades={ciudades}/>;
   case "pedidos":    return <Pedidos pedidos={pedidos} setPedidos={sbSetPedidos} conductores={conductores} ciudades={ciudades} showToast={showToast} paqueterias={paqueterias} transportistas={transportistas} promesas={promesas} recargar={cargarTodo} user={user}/>;
   case "rastreo":    return <RastreoGPS pedidos={pedidos} conductores={conductores} ciudades={ciudades}/>;
   case "conductores":  return <Conductores conductores={conductores} pedidos={pedidos} showToast={showToast} transportistas={transportistas} recargar={cargarTodo}/>;
   case "transportistas": return <Transportistas transportistas={transportistas} conductores={conductores} showToast={showToast} user={{rol:"admin",nombre:"Admin"}} recargar={cargarTodo}/>;
   case "resumen":    return <ResumenTransportador pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas}/>;
   case "facturas":    return user.rol==="admin"||user.rol==="operador"
    ? <FacturasProveedor facturas={facturas} transportistas={transportistas} pedidos={pedidos} showToast={showToast} recargar={cargarTodo}/>
    : <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
   case "promesas":    return <GestionPromesas promesas={promesas} ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
   case "ciudades":    return <Ciudades ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
   case "paqueterias":  return <GestionPaqueterias paqueterias={paqueterias} showToast={showToast} recargar={cargarTodo}/>;
   case "usuarios":    return <Usuarios usuarios={usuarios} showToast={showToast} recargar={cargarTodo}/>;
   case "mi_empresa":   return <Transportistas transportistas={transportistas} conductores={conductores} showToast={showToast} user={user} recargar={cargarTodo}/>;
   case "mis_pedidos":  return <MisPedidosConductor pedidos={pedidos} devoluciones={devoluciones} recogidas={recogidas} user={user} conductores={conductores} ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
   case "mi_ubicacion":  return <MiUbicacion user={user}/>;
   case "consultas":   return <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
   case "pqrs":      return <ModuloPQRS pqrs={pqrs} pedidos={pedidos} showToast={showToast} user={user} recargar={cargarTodo}/>;
   case "devoluciones":  return <ModuloDevoluciones devoluciones={devoluciones} conductores={conductores} ciudades={ciudades} transportistas={transportistas} showToast={showToast} user={user} recargar={cargarTodo}/>;
   case "recogidas":   return <ModuloRecogidas recogidas={recogidas} conductores={conductores} ciudades={ciudades} transportistas={transportistas} showToast={showToast} user={user} recargar={cargarTodo}/>;
   default:        return <Dashboard pedidos={pedidos} conductores={conductores}/>;
  }
 };

 return (
  <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f5ff" }}>
   <SidebarApp user={user} activeTab={tab} setActiveTab={setTab} onLogout={handleLogout} onShareApp={()=>setModCompartir(true)} collapsed={collapsed} setCollapsed={setCollapsed} pqrs={pqrs} />
   <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: "100%", boxSizing: "border-box" }}>
    {renderContent()}
   </main>
   {modCompartir && <LinkCompartir onClose={()=>setModCompartir(false)} />}
   {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
  </div>
 );
}

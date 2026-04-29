import React, { useState, useEffect, useRef } from 'react';
import { P, CIUDADES as CIUDADES_BASE, ESTADOS_PEDIDO, ROLES } from './Constants';
import { USUARIOS_INICIALES, CONDUCTORES_INICIALES, TRANSPORTISTAS_INICIALES, PEDIDOS_INICIALES, PAQUETERIAS_INICIALES } from './DataStore';
import { Logo, Badge, Card, Btn, Field, Modal, Toast } from './Subcomponentes';
import { supabase } from './supabase';

const iSt = {
  border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",
  fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",
  width:"100%",boxSizing:"border-box",
};

function generarGuia(pedidos) {
  const year = new Date().getFullYear();
  const usados = pedidos.map(p=>p.guia_interna).filter(g=>g&&g.startsWith(`SPT-${year}-`)).map(g=>parseInt(g.split("-")[2])||0);
  return `SPT-${year}-${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}
function generarGuiaDV(lista) {
  const year = new Date().getFullYear();
  const pfx = `DV-${year}-`;
  const usados = lista.map(d=>d.guia).filter(g=>g&&g.startsWith(pfx)).map(g=>parseInt(g.split("-")[2])||0);
  return `${pfx}${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}
function generarGuiaRC(lista) {
  const year = new Date().getFullYear();
  const pfx = `RC-${year}-`;
  const usados = lista.map(r=>r.guia).filter(g=>g&&g.startsWith(pfx)).map(g=>parseInt(g.split("-")[2])||0);
  return `${pfx}${String((usados.length?Math.max(...usados):0)+1).padStart(4,"0")}`;
}

function descargarCSV(nombre,cabecera,ejemplo){
  const blob=new Blob([cabecera+"\n"+ejemplo],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=nombre;a.click();URL.revokeObjectURL(url);
}

function fileToBase64(file){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
}

// Compress image to max 800px wide, quality 0.75 — keeps size under ~200KB
function comprimirImagen(file, maxW=800, quality=0.75) {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        res(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function generarPDFSoportes(pedido, extras) {
  const fecha = new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"});
  const todos = [...(pedido.soportes_data||[]), ...(extras||[])];
  const win = window.open("","_blank");
  if(!win) return;
  const imgs = todos.map((s,i)=>`<div style="page-break-inside:avoid;margin-bottom:32px"><p style="color:#4c1d95;font-weight:bold;margin:0 0 8px">Soporte ${i+1}${s.nombre?" - "+s.nombre:""}</p><img src="${s.data}" style="max-width:100%;border:2px solid #ddd6fe;border-radius:8px"/></div>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Soportes ${pedido.id}</title><style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#4c1d95}hr{border:none;border-top:2px solid #ddd6fe;margin:16px 0}</style></head><body><h1>Soportes - ${pedido.guia_interna||pedido.id}</h1><p>Pedido: ${pedido.id} | Cliente: ${pedido.cliente} | ${fecha}</p><hr/>${imgs||"<p>Sin soportes.</p>"}</body></html>`);
  win.print();
}

function CargadorFotos({ pedido, onGuardar, onClose, showToast }) {
  const [fotos, setFotos] = useState([]);
  const camRef  = useRef(null);  // para cámara (celular)
  const fileRef = useRef(null);  // para archivo (PC/galería)
  const MAX = 3;

  const procesar = async (files) => {
    const arr = Array.from(files).slice(0, MAX - fotos.length);
    const nuevas = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) { showToast("Solo se permiten imágenes","error"); continue; }
      showToast("Comprimiendo imagen...","info");
      const data = await comprimirImagen(f);  // compress to ~200KB max
      nuevas.push({ data, nombre: f.name });
    }
    setFotos(prev => [...prev, ...nuevas].slice(0, MAX));
  };

  return (
    <Modal title="📸 Cargar Soportes de Entrega" onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:P[50],borderRadius:10,padding:12,fontSize:13,color:P[800]}}>
          Carga hasta <strong>3 fotos</strong>. Se genera un PDF único con todas las imágenes para el cliente interno.
        </div>

        {/* Dos botones: uno abre cámara (celular), otro abre explorador de archivos (PC) */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <Btn variant="primary" onClick={()=>camRef.current&&camRef.current.click()} disabled={fotos.length>=MAX}>
            📷 Tomar Foto (Cámara)
          </Btn>
          <Btn variant="secondary" onClick={()=>fileRef.current&&fileRef.current.click()} disabled={fotos.length>=MAX}>
            🖼️ Subir desde PC / Galería
          </Btn>
          <span style={{fontSize:12,color:"#94a3b8"}}>{fotos.length}/{MAX} foto(s) cargada(s)</span>
        </div>

        {/* Input cámara — capture fuerza apertura de cámara en móvil */}
        <input ref={camRef}  type="file" accept="image/*" capture="environment" style={{display:"none"}}
          onChange={e=>procesar(e.target.files)}/>
        {/* Input archivo — sin capture para que abra el explorador de archivos */}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}}
          onChange={e=>procesar(e.target.files)}/>

        {/* Vista previa de las fotos cargadas */}
        {fotos.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
            {fotos.map((f,i)=>(
              <div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`2px solid ${P[200]}`}}>
                <img src={f.data} alt={"soporte"+i} style={{width:"100%",height:110,objectFit:"cover",display:"block"}} />
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:11,padding:"3px 8px",fontWeight:600}}>
                  Soporte {i+1} — {f.nombre}
                </div>
                <button onClick={()=>setFotos(prev=>prev.filter((_,j)=>j!==i))}
                  style={{position:"absolute",top:4,right:4,background:"#ef4444",border:"none",color:"#fff",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:14,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
          {fotos.length>0 && (
            <Btn variant="secondary" onClick={()=>generarPDFSoportes(pedido,fotos)}>👁 Preview PDF</Btn>
          )}
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="success" disabled={fotos.length===0}
            onClick={()=>{ if(fotos.length===0){showToast("Carga al menos una foto","error");return;} onGuardar(fotos); }}>
            💾 Guardar {fotos.length} soporte(s) → Marcar Entregado
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function GuiaImprimible({ pedido, conductores, ciudades, onClose }) {
  const cond  = conductores.find(c=>c.id===pedido.conductor_id);
  const ciudad= (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);
  const fecha = new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"});
  return (
    <Modal title={"Guia - "+(pedido.guia_interna||pedido.id)} onClose={onClose} wide>
      <div style={{marginBottom:14,display:"flex",justifyContent:"flex-end",gap:8}}>
        <Btn onClick={()=>window.print()}>Imprimir / PDF</Btn>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
      </div>
      <div id="guia-print" style={{border:`2px solid ${P[200]}`,borderRadius:12,padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:16,marginBottom:20,borderBottom:`3px solid ${P[600]}`}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Logo size={60}/>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:P[800]}}>SOMOS PRO TRACKING</div>
              <div style={{fontSize:12,color:"#64748b"}}>Sistema de Gestion de Transporte</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            {pedido.guia_interna&&<div style={{background:P[600],color:"#fff",borderRadius:10,padding:"6px 16px",fontSize:18,fontWeight:900,marginBottom:4}}>{pedido.guia_interna}</div>}
            <div style={{background:"#f1f5f9",borderRadius:8,padding:"4px 12px",fontSize:13,fontWeight:700,color:P[800]}}>{pedido.id}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Fecha: {fecha}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <Badge estado={pedido.estado}/>
          {pedido.novedad&&<span style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,padding:"4px 12px",fontWeight:700,fontSize:12}}>Entregado con Novedad</span>}
          {pedido.estado_despacho==="bloqueado"&&<span style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,padding:"4px 12px",fontWeight:700,fontSize:12}}>Bloqueado Cartera</span>}
          {pedido.estado_despacho==="novedad_despacho"&&<span style={{background:"#fffbeb",color:"#d97706",border:"1px solid #fcd34d",borderRadius:8,padding:"4px 12px",fontWeight:700,fontSize:12}}>Despachado con Novedad</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div style={{background:P[50],borderRadius:12,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P[700],textTransform:"uppercase",marginBottom:10}}>Destinatario</div>
            <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
              <tbody>
                {[
                  ...(pedido.ciudad_origen_nombre?[["Origen CEDI:",`${pedido.ciudad_origen_nombre}${pedido.direccion_origen?" — "+pedido.direccion_origen:""}`]]:[]),
                  ["Cliente:",pedido.cliente],["Direccion:",pedido.direccion],["Ciudad:",ciudad?.name||""],["Cod. DANE:",pedido.ciudad_codigo],["Factura:",pedido.factura],["Cajas:",pedido.cajas]
                ].map(([k,v])=>(
                  <tr key={k}><td style={{fontWeight:700,color:"#475569",paddingBottom:5,paddingRight:8,whiteSpace:"nowrap"}}>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{background:"#f8fafc",borderRadius:12,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P[700],textTransform:"uppercase",marginBottom:10}}>Transportista</div>
            {pedido.tipo==="paqueteria"?(
              <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                <tbody>
                  {[["Empresa:",pedido.paqueteria],["Guia:",pedido.guia_paqueteria]].map(([k,v])=>(
                    <tr key={k}><td style={{fontWeight:700,paddingBottom:5,paddingRight:8}}>{k}</td><td style={{fontFamily:"monospace",fontWeight:700,color:P[700]}}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            ):(
              <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                <tbody>
                  {[["Conductor:",cond?.nombre||"Por asignar"],["Cedula:",cond?.cedula||""],["Placa:",pedido.placa||""],["Empresa:",cond?.empresa||pedido.empresa_transporte||""],["NIT:",pedido.nit_proveedor||""],["Cel:",cond?.celular||""]].map(([k,v])=>(
                    <tr key={k}><td style={{fontWeight:700,paddingBottom:5,paddingRight:8,whiteSpace:"nowrap"}}>{k}</td><td style={{fontFamily:"monospace"}}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:20,fontSize:13,display:"flex",gap:24,flexWrap:"wrap"}}>
          <span><strong>Fecha estimada:</strong> {pedido.fecha_estimada||""}</span>
          <span><strong>Fecha real:</strong> {pedido.fecha_real||"Pendiente"}</span>
          {pedido.guia_interna&&<span><strong>Guia interna:</strong> {pedido.guia_interna}</span>}
        </div>
        {pedido.notas&&<div style={{background:"#fffbeb",borderRadius:10,padding:12,marginBottom:20,fontSize:13,color:"#92400e"}}>Notas: {pedido.notas}</div>}
        {(pedido.soportes||[]).length>0&&<div style={{marginBottom:20}}><div style={{fontWeight:700,color:P[700],marginBottom:6,fontSize:13}}>Soportes ({pedido.soportes.length}):</div>{pedido.soportes.map((s,i)=><div key={i} style={{fontSize:12,color:"#64748b"}}>- {s}</div>)}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginTop:28}}>
          {["Despachado por","Recibido por","Conductor"].map(fn=>(
            <div key={fn} style={{textAlign:"center"}}>
              <div style={{height:52,borderBottom:"2px solid #cbd5e1",marginBottom:6}} />
              <div style={{fontSize:11,color:"#64748b",fontWeight:600}}>{fn}</div>
              <div style={{fontSize:10,color:"#94a3b8"}}>Firma / Cedula / Fecha</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:20,paddingTop:14,borderTop:"1px dashed #cbd5e1",fontSize:10,color:"#94a3b8"}}>Somos PRO Tracking - {fecha}</div>
      </div>
      <style>{`@media print{body>*{visibility:hidden!important}#guia-print,#guia-print *{visibility:visible!important}#guia-print{position:fixed;top:0;left:0;width:100%;padding:20px}}`}</style>
    </Modal>
  );
}

function ModalDetalle({ pedido, conductores, ciudades, transportistas, onClose, setPedidos, showToast, canEdit }) {
  const [condId,     setCondId]     = useState(pedido.conductor_id||"") ;
  const [direccion,  setDireccion]  = useState(pedido.direccion||"");
  const [cajas,      setCajas]      = useState(String(pedido.cajas||""));
  const [estadoDesp, setEstadoDesp] = useState(pedido.estado_despacho||"despachado");
  const [novedad,    setNovedad]    = useState(pedido.novedad||false);
  const [tipoModal,  setTipoModal]  = useState(pedido.tipo||"propio");
  const [facturaEdit, setFacturaEdit] = useState(pedido.factura||"");
  const [fechaEdit,   setFechaEdit]   = useState(pedido.fecha_estimada||"");
  const [ciudadEdit,  setCiudadEdit]  = useState(pedido.ciudad_codigo||"");
  const [empTrans,   setEmpTrans]   = useState(pedido.empresa_transporte||"");
  const [paqModal,   setPaqModal]   = useState(pedido.paqueteria||"");
  const [guiaPaq,    setGuiaPaq]    = useState(pedido.guia_paqueteria||"");
  const [verMapa,    setVerMapa]    = useState(false);
  const [verGuia,    setVerGuia]    = useState(false);
  const [verCamara,  setVerCamara]  = useState(false);

  const cond   = conductores.find(c=>String(c.id)===String(condId||pedido.conductor_id||""));
  const ciudad = (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);

  const guardar = async () => {
    const c = conductores.find(c=>String(c.id)===String(condId));
    let nuevoEstado = pedido.estado;
    if(c && (pedido.estado==="sin_asignar"||pedido.estado==="pendiente")) nuevoEstado="en_transito";
    if(!c && pedido.estado==="en_transito" && tipoModal==="propio") nuevoEstado="sin_asignar";
    if(tipoModal==="empresa_transporte" && empTrans.trim()) nuevoEstado="en_transito";
    const ciudad = (ciudades||[]).find(c => c.code === ciudadEdit);
    const cambios = {
      direccion: direccion.trim()||pedido.direccion,
      cajas: parseInt(cajas)||pedido.cajas,
      factura: facturaEdit.trim()||pedido.factura,
      ciudad_codigo: ciudadEdit||pedido.ciudad_codigo,
      ciudad_nombre: ciudad?.name||pedido.ciudad_nombre||"",
      conductor_id: c?.id||null,
      placa: c?.placa||null,
      nit_proveedor: c?.nit_proveedor||null,
      estado: nuevoEstado,
      estado_despacho: estadoDesp,
      novedad,
      tipo: tipoModal,
      empresa_transporte: tipoModal==="empresa_transporte" ? (empTrans||c?.empresa||null) : null,
      paqueteria: tipoModal==="paqueteria" ? paqModal : null,
      guia_paqueteria: tipoModal==="paqueteria" ? guiaPaq : null,
    };
    setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambios}:p));

    showToast("Guardando...","info");
    const { data: upd, error } = await supabase.from("pedidos").update(cambios).eq("id", pedido.id).select().single();
    if (error) { showToast("Error: "+error.message+" ("+error.code+")","error"); return; }
    showToast("✓ Cambios guardados · Estado: "+nuevoEstado,"success");
    onClose();
    setTimeout(()=>{ if(window._recargar) window._recargar(); }, 200);
  };


  const subirFotos = async (fotos) => {
    const hoy = new Date().toISOString().split("T")[0];
    const nombres = fotos.map((_,i)=>`soporte_${pedido.id}_${i+1}.jpg`);
    const estadoFinal = novedad ? "novedad" : "entregado";
    const nuevosSoportes = [...(pedido.soportes||[]),...nombres];
    const nuevosSoportesData = [...(pedido.soportes_data||[]),...fotos];
    const cambios = {
      soportes: nuevosSoportes,
      soportes_data: nuevosSoportesData,
      estado: estadoFinal,
      fecha_real: hoy,
      novedad,
    };
    setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambios}:p));
    try {
      const { error: sErr } = await supabase.from('pedidos').update(cambios).eq('id', pedido.id);
      if (sErr) {
        await supabase.from('pedidos').update({
          estado: estadoFinal, fecha_real: hoy, novedad, soportes: cambios.soportes
        }).eq('id', pedido.id);
        showToast("⚠️ Estado guardado. Fotos muy pesadas — usa imágenes más pequeñas", "warning");
      } else {
        showToast(`${fotos.length} soporte(s) guardados. Estado: ${estadoFinal==="entregado"?"Entregado":"Con Novedad"}. Fecha: ${hoy}`,"success");
      }
    } catch(e) {
      showToast("Error de conexión al guardar soportes. Revisa tu internet.", "error");
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
            {pedido.ciudad_origen_nombre&&<span>🏭 Origen: <strong>{pedido.ciudad_origen_nombre}</strong>{pedido.direccion_origen&&` — ${pedido.direccion_origen}`}</span>}
            <span>Ciudad destino: {ciudad?.name} ({pedido.ciudad_codigo})</span>
            <span>Factura: {pedido.factura}</span>
            <span>Estimado: {pedido.fecha_estimada||""}</span>
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

        {pedido.tipo==="paqueteria"&&(
          <div style={{background:"#ecfeff",borderRadius:10,padding:14,border:"1px solid #67e8f9"}}>
            <span style={{fontWeight:700,color:"#0891b2"}}>{pedido.paqueteria}</span>
            <span style={{marginLeft:14,color:"#0e7490"}}>Guia: <strong style={{fontFamily:"monospace"}}>{pedido.guia_paqueteria}</strong></span>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Field label="Dirección de entrega" value={direccion} onChange={setDireccion} placeholder="Cra 15 #93-47"/>
          <Field label="Ciudad destino" value={ciudadEdit} onChange={setCiudadEdit} as="select"
            options={[{value:"",label:"— Seleccione —"},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Field label="Cajas" value={cajas} onChange={setCajas} type="number" placeholder="10"/>
          <Field label="N° Factura (editable)" value={facturaEdit} onChange={setFacturaEdit} placeholder="FAC-3000"/>
          <Field label="Fecha Estimada" value={fechaEdit} onChange={setFechaEdit} type="date"/>
        </div>

        {canEdit&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Tipo de Transporte" value={tipoModal} onChange={setTipoModal} as="select"
              options={[
                {value:"propio",label:"🚚 Transporte Propio"},
                {value:"empresa_transporte",label:"🏢 Empresa Transportista"},
                {value:"mensajeria",label:"📨 Mensajería"},
                {value:"paqueteria",label:"📦 Paquetería Tercero"},
              ]}/>
            {tipoModal==="paqueteria"?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Paquetería" value={paqModal} onChange={setPaqModal} placeholder="Servientrega, TCC..."/>
                <Field label="N° Guía" value={guiaPaq} onChange={setGuiaPaq} placeholder="SRV-2026-XXXX"/>
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
                      ? conductores.filter(c=>c.nit_proveedor||(c.empresa&&c.empresa.trim()))
                      : conductores
                    ).map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}${c.empresa?" — "+c.empresa:""}`}))
                  ]}/>
                {caPrev&&<p style={{fontSize:11,color:P[600],margin:"6px 0 0",fontWeight:700}}>Al guardar el estado cambiará a En Tránsito.</p>}
              </div>
            )}
          </div>
        )}

        {!canEdit&&cond&&(
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
            ]}/>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
          onClick={()=>setNovedad(!novedad)}>
          <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>v</span>}
          </div>
          <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>
            Marcar como Entregado con Novedad
          </span>
          {novedad&&<span style={{fontSize:11,color:"#dc2626",marginLeft:4}}>Al subir soporte el estado sera Con Novedad</span>}
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
            {(pedido.soportes||[]).length<3&&(
              <Btn variant="success" onClick={()=>setVerCamara(true)}>
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
            {canEdit&&<Btn onClick={guardar}>Guardar Cambios</Btn>}
          </div>
        </div>
      </div>
      {verGuia&&<GuiaImprimible pedido={pedido} conductores={conductores} ciudades={ciudades} onClose={()=>setVerGuia(false)}/>}
      {verCamara&&<CargadorFotos pedido={pedido} onGuardar={subirFotos} onClose={()=>setVerCamara(false)} showToast={showToast}/>}
    </Modal>
  );
}

// ─── ModalCSVGuias ────────────────────────────────────────────────────────────

function ModalCSVGuias({ onClose, pedidos, ciudades = [], showToast, recargar }) {
  const [archivo,    setArchivo]   = useState("");
  const [matches,    setMatches]   = useState([]);
  const [errores,    setErrores]   = useState([]);  // duplicate pedidoId in CSV
  const [err,        setErr]       = useState("");
  const [cargando,   setCargando]  = useState(false);
  const [aplicando,  setAplicando] = useState(false);
  const [resultado,  setResultado] = useState(null);
  const [sobrescribir, setSobrescribir] = useState(false);
  const fileRef = useRef(null);

  // ── Parsear CSV ──────────────────────────────────────────────────────────────
  const parsear = (texto) => {
    const lineas = texto.trim().split(/\r?\n/).filter(l => l.trim());
    if (lineas.length < 2) throw new Error("El archivo está vacío o solo tiene encabezado.");
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

    const iGuia    = col("guia");
    const iEstado  = col("estado_pro","estado");
    const iPedido  = col("pedido_pro","pedido");
    const iFactura = col("factura_pro","factura");
    const iPaq     = col("paqueteria","paquetería","carrier");
    const iDestino = col("dane_destino","destino");
    const iCajas   = col("total_cajas","cajas");

    if (iGuia === -1 || iEstado === -1 || iPedido === -1)
      throw new Error(`Columnas requeridas no encontradas. Necesitas: Guia, Estado_Pro, Pedido_Pro. Detectadas: ${hdrs.join(", ")}`);

    return lineas.slice(1).map(l => {
      const c = l.split(sep).map(x => x.trim().replace(/^"|"$/g,""));
      return {
        guia:       c[iGuia]    || "",
        estadoRaw:  c[iEstado]  || "",
        pedidoId:   (c[iPedido] || "").trim(),
        factura:    iFactura !== -1 ? c[iFactura] || "" : "",
        paqueteria: iPaq     !== -1 ? c[iPaq]     || "" : "",
        destino:    iDestino !== -1 ? c[iDestino]  || "" : "",
        cajas:      iCajas   !== -1 ? parseInt(c[iCajas])||0 : 0,
      };
    }).filter(r => r.guia && r.pedidoId);
  };

  // ── Procesar filas ───────────────────────────────────────────────────────────
  const procesar = (rows) => {
    const hoy = new Date().toISOString().split("T")[0];

    // Detect duplicates WITHIN the CSV (same Pedido_Pro more than once)
    const conteo = {};
    rows.forEach(r => { conteo[r.pedidoId] = (conteo[r.pedidoId] || 0) + 1; });
    const dupsCsv = Object.entries(conteo).filter(([,n]) => n > 1).map(([id]) => id);

    // Build match list — only non-duplicate rows
    const vistos = new Set();
    const lista = [];
    for (const r of rows) {
      if (dupsCsv.includes(r.pedidoId)) continue; // skip duplicates, report separately
      if (vistos.has(r.pedidoId)) continue;
      vistos.add(r.pedidoId);

      const pedido    = pedidos.find(p => String(p.id).trim() === r.pedidoId);
      const estadoN   = r.estadoRaw.toLowerCase().includes("entregado") ? "entregado" : "en_transito";
      const mismaGuia = pedido?.guia_paqueteria === r.guia;
      const estadoCambio = mismaGuia && pedido?.estado !== estadoN;
      lista.push({
        pedidoId:     r.pedidoId,
        guia:         r.guia,
        pedido,
        encontrado:   !!pedido,
        estadoNuevo:  estadoN,
        estadoActual: pedido?.estado || "—",
        paqueteria:   r.paqueteria || pedido?.paqueteria || "",
        destino:      r.destino,
        factura:      r.factura,
        cajasCsv:     r.cajas,
        yaConGuia:    !!(pedido?.guia_paqueteria),
        guiaActual:   pedido?.guia_paqueteria || "",
        mismaGuia,
        estadoCambio,
        fechaReal:    estadoN === "entregado" ? hoy : null,
      });
    }

    return { lista, dupsCsv };
  };

  // ── Leer archivo ─────────────────────────────────────────────────────────────
  const leerArchivo = (file) => {
    if (!file) return;
    setArchivo(file.name); setErr(""); setMatches([]); setErrores([]); setResultado(null);
    setCargando(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows  = parsear(e.target.result);
        const { lista, dupsCsv } = procesar(rows);
        setMatches(lista);
        setErrores(dupsCsv);
      } catch(ex) { setErr(ex.message); }
      setCargando(false);
    };
    reader.onerror = () => { setErr("Error leyendo el archivo."); setCargando(false); };
    reader.readAsText(file, "UTF-8");
  };

  // ── Aplicar ──────────────────────────────────────────────────────────────────
  const aplicar = async () => {
    const paraActualizar = matches.filter(m =>
      m.encontrado && (
        !m.yaConGuia ||          // no tiene guía aún → siempre actualiza
        m.estadoCambio ||        // misma guía pero estado cambió → actualiza automático
        sobrescribir             // guía diferente y usuario marcó sobreescribir
      )
    );
    if (!paraActualizar.length) { showToast("No hay pedidos para actualizar.","error"); return; }
    setAplicando(true);
    let ok = 0; let fallos = 0;

    // Fecha estimada = hoy + 2 días
    const fechaEst = new Date();
    fechaEst.setDate(fechaEst.getDate() + 2);
    const fechaEstStr = fechaEst.toISOString().split("T")[0];

    for (const m of paraActualizar) {
      const cambios = {
        guia_paqueteria: m.guia,
        estado:          m.estadoNuevo,
        tipo:            "paqueteria",
        paqueteria:      m.paqueteria || null,
        fecha_estimada:  m.pedido.fecha_estimada || fechaEstStr,
      };
      if (m.cajasCsv > 0) cambios.cajas = m.cajasCsv;
      if (m.destino) {
        cambios.ciudad_codigo = m.destino;
        // Intentar resolver nombre si existe en ciudades
        const ciudad = (ciudades||[]).find(c => c.code === m.destino);
        if (ciudad) cambios.ciudad_nombre = ciudad.name;
      }
      if (m.factura) cambios.factura = m.factura;  // actualiza factura del CSV
      if (m.fechaReal) cambios.fecha_real = m.fechaReal;

      const { error } = await supabase.from("pedidos").update(cambios).eq("id", m.pedidoId);
      if (error) { fallos++; console.error(m.pedidoId, error.message); }
      else ok++;
    }

    setAplicando(false);
    setResultado({ ok, fallos, noMatch: matches.filter(m=>!m.encontrado).length,
      omitidos: matches.filter(m=>m.yaConGuia&&!m.estadoCambio&&!sobrescribir).length });
    showToast(`✓ ${ok} actualizado(s)${fallos?" · "+fallos+" error(es)":""}`, ok>0?"success":"error");
    if (ok > 0 && recargar) await recargar();
  };

  // ── Contadores ───────────────────────────────────────────────────────────────
  const encontrados  = matches.filter(m => m.encontrado);
  const noEncontrados= matches.filter(m => !m.encontrado);
  const conGuiaYa   = encontrados.filter(m => m.yaConGuia);
  const autoUpdate  = encontrados.filter(m => m.estadoCambio);  // same guía, state changed
  const guiaDiferente = encontrados.filter(m => m.yaConGuia && !m.estadoCambio); // need confirm
  const sinGuia     = encontrados.filter(m => !m.yaConGuia);

  return (
    <Modal title="📦 Cargar Guías de Paquetería" onClose={onClose} wide>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Info */}
        <div style={{ background:"#eff6ff", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#1e40af" }}>
          <strong>Regla:</strong> 1 pedido = 1 guía. Columnas requeridas: <code>Guia · Estado_Pro · Pedido_Pro</code>.
          <br/><span style={{fontSize:12,color:"#64748b"}}>El match se hace por <strong>Pedido_Pro = N° Pedido</strong> en el sistema. Acepta CSV con coma o punto y coma.</span>
        </div>

        {/* Drop zone */}
        {!matches.length && !resultado && (
          <div style={{ border:`2px dashed ${cargando?"#7c3aed":"#e2e8f0"}`, borderRadius:12,
            padding:"28px 20px", textAlign:"center", cursor:"pointer", background:archivo?"#f5f3ff":"#fafafa" }}
            onClick={()=>fileRef.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();leerArchivo(e.dataTransfer.files[0]);}}>
            <div style={{fontSize:36,marginBottom:8}}>{cargando?"⏳":"📂"}</div>
            {cargando ? <div style={{color:"#7c3aed",fontWeight:700}}>Procesando...</div>
              : archivo ? <div style={{color:"#059669",fontWeight:700}}>✓ {archivo}</div>
              : <div style={{color:"#64748b",fontWeight:600}}>Clic o arrastra el archivo CSV aquí</div>}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}}
          onChange={e=>leerArchivo(e.target.files[0])}/>

        {/* Error de parseo */}
        {err && <div style={{background:"#fef2f2",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",fontWeight:600}}>⚠️ {err}</div>}

        {/* Duplicados dentro del CSV — bloquea esos registros */}
        {errores.length > 0 && (
          <div style={{background:"#fef2f2",border:"2px solid #fca5a5",borderRadius:10,padding:"12px 16px"}}>
            <div style={{fontWeight:800,color:"#dc2626",marginBottom:6}}>
              🚫 {errores.length} pedido(s) duplicados en el CSV — no se cargarán
            </div>
            <div style={{fontSize:12,color:"#991b1b",fontFamily:"monospace"}}>
              {errores.join(" · ")}
            </div>
            <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
              El CSV tiene más de una fila con el mismo Pedido_Pro. Corrígelo en el archivo y vuelve a cargar.
            </div>
          </div>
        )}

        {/* Resultado final */}
        {resultado && (
          <div style={{background:resultado.ok>0?"#ecfdf5":"#fef2f2",borderRadius:12,padding:16,
            border:`2px solid ${resultado.ok>0?"#86efac":"#fca5a5"}`}}>
            <div style={{fontWeight:800,fontSize:15,color:resultado.ok>0?"#059669":"#dc2626",marginBottom:10}}>
              {resultado.ok>0?"✅ Actualización completada":"⚠️ Sin actualizaciones"}
            </div>
            <div style={{fontSize:13,color:"#334155",display:"flex",flexDirection:"column",gap:4}}>
              <span>✓ <strong>{resultado.ok}</strong> pedido(s) actualizados con guía y estado</span>
              {resultado.omitidos>0&&<span>⏭ <strong>{resultado.omitidos}</strong> omitidos (ya tenían guía, no se marcó sobreescribir)</span>}
              {resultado.noMatch>0&&<span>❓ <strong>{resultado.noMatch}</strong> no encontrados en el sistema</span>}
              {resultado.fallos>0&&<span>✗ <strong>{resultado.fallos}</strong> error(es) en Supabase</span>}
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
                {l:"En CSV",         v:matches.length,        c:"#7c3aed",bg:"#f5f3ff"},
                {l:"Encontrados",    v:encontrados.length,    c:"#059669",bg:"#ecfdf5"},
                {l:"No encontrados", v:noEncontrados.length,  c:"#dc2626",bg:"#fef2f2"},
                {l:"Ya con guía",    v:conGuiaYa.length,      c:"#d97706",bg:"#fffbeb"},
              ].map(s=>(
                <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"10px 14px",textAlign:"center",border:`1px solid ${s.c}30`}}>
                  <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginTop:3}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Opción sobreescribir */}
            {autoUpdate.length>0&&(
              <div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:10,padding:"12px 16px"}}>
                <div style={{fontWeight:700,color:"#059669",fontSize:13}}>
                  🔄 {autoUpdate.length} pedido(s) se actualizarán automáticamente
                </div>
                <div style={{fontSize:11,color:"#065f46",marginTop:3}}>
                  Misma guía, estado cambia de {autoUpdate[0]?.estadoActual} → {autoUpdate[0]?.estadoNuevo}. No requiere confirmación.
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
                  {sobrescribir&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
                </div>
                <div>
                  <div style={{fontWeight:700,color:"#92400e",fontSize:13}}>Sobreescribir guías diferentes ({guiaDiferente.length} pedido(s))</div>
                  <div style={{fontSize:11,color:"#78716c"}}>Estos pedidos ya tienen otra guía asignada. Marca para reemplazarla.</div>
                </div>
              </div>
            )}

            {/* Tabla preview */}
            <div style={{maxHeight:300,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,fontSize:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{position:"sticky",top:0,background:"#f8fafc",zIndex:1}}>
                  <tr>
                    {["","N° Pedido","Cliente","Guía nueva","Guía actual","Estado nuevo","Paquetería"].map(h=>(
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
                          {!m.encontrado?"❌":omitir?"⏭":"✅"}
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
                          {m.guiaActual||<span style={{color:"#cbd5e1"}}>—</span>}
                        </td>
                        <td style={{padding:"8px 12px"}}>
                          <span style={{background:m.estadoNuevo==="entregado"?"#ecfdf5":"#eff6ff",
                            color:m.estadoNuevo==="entregado"?"#059669":"#2563eb",
                            borderRadius:12,padding:"2px 8px",fontWeight:700,fontSize:11}}>
                            {m.estadoNuevo==="entregado"?"✅ Entregado":"🚛 En Tránsito"}
                          </span>
                        </td>
                        <td style={{padding:"8px 12px",color:"#64748b"}}>{m.paqueteria||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {noEncontrados.length>0&&(
              <div style={{background:"#fffbeb",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e"}}>
                <strong>❓ No encontrados en sistema:</strong> {noEncontrados.map(m=>m.pedidoId).join(", ")}
                <br/><span style={{color:"#78716c",fontSize:11}}>Verifica que el Pedido_Pro coincida exactamente con el N° de pedido del sistema.</span>
              </div>
            )}

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setMatches([]);setArchivo("");setErrores([]);}}>⬅ Cambiar archivo</Btn>
              <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
              <Btn disabled={aplicando||encontrados.filter(m=>!m.yaConGuia||m.estadoCambio||sobrescribir).length===0} onClick={aplicar}>
                {aplicando?"⏳ Aplicando...":`✅ Aplicar ${encontrados.filter(m=>!m.yaConGuia||m.estadoCambio||sobrescribir).length} actualización(es)`}
              </Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}


function ModalCSVPedidos({ onClose, onImportar, ciudades }) {
  const [txt,       setTxt]       = useState("");
  const [prev,      setPrev]      = useState([]);
  const [err,       setErr]       = useState("");
  const [cargando,  setCargando]  = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const fileRef = useRef(null);

  const CABECERA = "id,cliente,ciudad_codigo,direccion,cajas,factura,fecha_estimada,tipo,empresa_transporte,paqueteria,guia_paqueteria,notas,ciudad_origen_codigo,ciudad_origen_nombre,direccion_origen";
  const EJEMPLO  = "PT000001,Empresa Ejemplo S.A.S,11001,Cra 10 #20-30 Of 201,5,FAC-3000,2026-05-10,propio,,,,Fragil,05001,Medellin,Bodega Principal\nPT000002,Comercio del Norte,76001,Av 6N #23-10,12,FAC-3001,2026-05-12,paqueteria,,Servientrega,SRV-001,,,,";


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
      const obj  = {};
      hdrs.forEach((h, i) => { obj[h] = cols[i] || ""; });
      const codigoCiudad = (obj.ciudad_codigo||'').trim();
      const ciudad = codigoCiudad ? (ciudades||[]).find(c => c.code === codigoCiudad) : null;
      const ciudadOrigen = (ciudades||[]).find(c => c.code === obj.ciudad_origen_codigo);
      const esPaq = obj.tipo === "paqueteria";
      return {
        id:            obj.id || `IMP-${Date.now()}-${idx}`,
        guia_interna:  null,
        cliente:       obj.cliente || "Sin nombre",
        ciudad_codigo: ciudad?.code || codigoCiudad || "",
        ciudad_nombre: ciudad?.name || obj.ciudad_nombre || "",
        direccion:     obj.direccion || "",
        cajas:         parseInt((obj.cajas||'').trim()) || 0,
        factura:       obj.factura || "",
        fecha_estimada:obj.fecha_estimada || null,
        notas:         obj.notas || "",
        tipo:          esPaq?"paqueteria":obj.tipo==="empresa_transporte"?"empresa_transporte":obj.tipo==="mensajeria"?"mensajeria":"propio",
        empresa_transporte: obj.empresa_transporte || null,
        paqueteria:    esPaq ? obj.paqueteria : null,
        guia_paqueteria: esPaq ? obj.guia_paqueteria : null,
        ciudad_origen_codigo: obj.ciudad_origen_codigo || null,
        ciudad_origen_nombre: ciudadOrigen?.name || obj.ciudad_origen_nombre || null,
        direccion_origen: obj.direccion_origen || null,
        conductor_id:  null, placa: null, nit_proveedor: null,
        estado:        esPaq ? "paqueteria" : "sin_asignar",
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
          <strong>Columnas requeridas:</strong> id, cliente, ciudad_codigo, direccion, cajas, factura, fecha_estimada, tipo<br/>
          <strong>Opcionales:</strong> empresa_transporte, paqueteria, guia_paqueteria, notas, ciudad_origen_codigo, ciudad_origen_nombre, direccion_origen
        </div>

        {/* Descargar plantilla */}
        <Btn size="sm" variant="success"
          onClick={()=>descargarCSV("plantilla_pedidos.csv", CABECERA, EJEMPLO)}>
          ⬇ Descargar Plantilla CSV
        </Btn>

        {/* Upload de archivo */}
        <div
          style={{ border: `2px dashed ${P[300]}`, borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: nombreArchivo ? "#f0fdf4" : P[50] }}
          onClick={()=>fileRef.current&&fileRef.current.click()}
          onDragOver={e=>{e.preventDefault();}}
          onDrop={e=>{e.preventDefault();leerArchivo(e.dataTransfer.files[0]);}}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          {nombreArchivo ? (
            <div style={{ color: "#059669", fontWeight: 700, fontSize: 14 }}>✓ {nombreArchivo}</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: P[700], fontSize: 14 }}>Haz clic para seleccionar el archivo CSV</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>o arrástralo aquí · Solo archivos .CSV</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
          onChange={e=>leerArchivo(e.target.files[0])}/>

        {/* También permite pegar texto */}
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor:"pointer", color:P[600], fontWeight:600 }}>También puedes pegar el texto directamente</summary>
          <textarea value={txt} onChange={e=>{setTxt(e.target.value);setNombreArchivo("");}} rows={5}
            style={{ ...iSt, fontFamily:"monospace", fontSize:11, resize:"vertical", marginTop:8 }}
            placeholder="Pega el contenido CSV aquí..."/>
          <Btn size="sm" variant="secondary" style={{ marginTop:6 }}
            onClick={()=>{setErr("");try{setPrev(parsear(txt));}catch(e){setErr(e.message);setPrev([]);}}}>
            👁 Previsualizar texto
          </Btn>
        </details>

        {err && <p style={{ color:"#dc2626", background:"#fef2f2", padding:"8px 12px", borderRadius:8, fontSize:13, margin:0 }}>⚠️ {err}</p>}

        {/* Preview */}
        {prev.length > 0 && (
          <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, border:"1px solid #86efac", maxHeight:200, overflowY:"auto" }}>
            <p style={{ margin:"0 0 8px", fontWeight:700, color:"#15803d", fontSize:13 }}>✓ {prev.length} pedido(s) listos para importar:</p>
            {prev.map((p,i) => (
              <div key={i} style={{ fontSize:12, color:"#334155", padding:"2px 0", borderBottom:"1px solid #dcfce7" }}>
                <strong>{p.id}</strong> — {p.cliente} → {p.ciudad_nombre} · {p.cajas} cajas · {p.factura}
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={prev.length===0||cargando} onClick={importar}>
            {cargando ? "⏳ Importando..." : `📥 Importar (${prev.length})`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function LinkCompartir({ onClose }) {
  const url = window.location.href.split("?")[0].replace(/#.*$/, "");
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(url).then(()=>{
      setCopiado(true);
      setTimeout(()=>setCopiado(false), 2500);
    }).catch(()=>{
      // fallback para navegadores sin clipboard API
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(()=>setCopiado(false), 2500);
    });
  };

  // QR usando API pública de Google Charts
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <Modal title="📱 Compartir App con Conductores" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:20,alignItems:"center"}}>
        <div style={{background:P[50],borderRadius:12,padding:14,fontSize:13,color:P[800],textAlign:"center",width:"100%"}}>
          Comparte este enlace o código QR con tus conductores para que accedan a la app desde su celular.
        </div>

        {/* QR Code */}
        <div style={{textAlign:"center"}}>
          <img src={qrUrl} alt="QR App" style={{width:200,height:200,borderRadius:12,border:`2px solid ${P[200]}`}}
            onError={(e)=>{ e.target.style.display="none"; }} />
          <p style={{fontSize:12,color:"#94a3b8",margin:"8px 0 0"}}>Escanear con la cámara del celular</p>
        </div>

        {/* Link */}
        <div style={{width:"100%"}}>
          <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 8px",textTransform:"uppercase"}}>Enlace directo</p>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,background:"#f1f5f9",borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"monospace",color:"#334155",wordBreak:"break-all"}}>
              {url}
            </div>
            <Btn variant={copiado?"success":"secondary"} onClick={copiar} style={{flexShrink:0}}>
              {copiado ? "✓ Copiado" : "📋 Copiar"}
            </Btn>
          </div>
        </div>

        {/* Instrucciones */}
        <div style={{background:"#fffbeb",borderRadius:10,padding:14,fontSize:13,color:"#92400e",width:"100%"}}>
          <strong>📋 Instrucciones para el conductor:</strong>
          <ol style={{margin:"8px 0 0",paddingLeft:18,lineHeight:1.8}}>
            <li>Abre el enlace desde el navegador del celular (Chrome o Safari)</li>
            <li>Ingresa con usuario y contraseña asignados</li>
            <li>En Chrome Android: toca "Añadir a pantalla de inicio" para instalar como app</li>
            <li>En Safari iOS: toca el botón compartir → "Añadir a pantalla de inicio"</li>
          </ol>
        </div>

        <Btn variant="secondary" onClick={onClose} style={{width:"100%",justifyContent:"center"}}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

function Dashboard({ pedidos, conductores, devoluciones = [], recogidas = [], pqrs = [], promesas = [], ciudades = [] }) {
  const [modLink, setModLink] = useState(false);
  const [gpsTick, setGpsTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setGpsTick(n => n+1), 15000); return () => clearInterval(t); }, []);

  // ── Métricas base ──
  const hoy = new Date().toISOString().split("T")[0];
  const entregados   = pedidos.filter(p => p.estado === "entregado" || p.estado === "novedad");
  const activos      = pedidos.filter(p => ["en_transito","pendiente","sin_asignar"].includes(p.estado));
  const pqrsAbiertas = pqrs.filter(p => p.estado === "abierta");

  // ── Promesas de servicio ──
  const promMap = Object.fromEntries((promesas||[]).map(p => [p.ciudad_codigo, p.dias_plazo]));
  const tienePromesa = (p) => promMap[p.ciudad_codigo] !== undefined;

  // Fecha límite según promesa: fecha_creacion + dias_plazo
  const fechaLimite = (p) => {
    if (!p.fecha_creacion || !promMap[p.ciudad_codigo]) return null;
    const d = new Date(p.fecha_creacion);
    d.setDate(d.getDate() + promMap[p.ciudad_codigo]);
    return d.toISOString().split("T")[0];
  };

  // Pedidos vencidos: activos cuya fecha límite ya pasó
  const vencidos = activos.filter(p => {
    const lim = fechaLimite(p);
    // Si no tiene promesa, usar fecha_estimada como fallback
    if (!lim) return p.fecha_estimada && p.fecha_estimada < hoy;
    return lim < hoy;
  });

  // Pedidos en riesgo: activos que vencen mañana o hoy
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toISOString().split("T")[0];
  const enRiesgo = activos.filter(p => {
    const lim = fechaLimite(p) || p.fecha_estimada;
    return lim && lim >= hoy && lim <= mananaStr;
  }).filter(p => !vencidos.includes(p));

  // ── Tiempo medio de entrega (días reales) ──
  const tiemposEntrega = entregados
    .filter(p => p.fecha_creacion && p.fecha_real)
    .map(p => {
      const d1 = new Date(p.fecha_creacion); const d2 = new Date(p.fecha_real);
      return Math.round((d2 - d1) / 86400000);
    }).filter(d => d >= 0);
  const promedioEntrega = tiemposEntrega.length
    ? (tiemposEntrega.reduce((a,b) => a+b, 0) / tiemposEntrega.length).toFixed(1)
    : null;

  // Promedio de días prometidos (de los destinos con promesa)
  const diasPromPromedio = promesas.length
    ? (promesas.reduce((a,p) => a + p.dias_plazo, 0) / promesas.length).toFixed(1)
    : null;

  // ── Cumplimiento con promesa de servicio ──
  const entregadosConPromesa = entregados.filter(p => tienePromesa(p) && p.fecha_real && p.fecha_creacion);
  const cumplidos = entregadosConPromesa.filter(p => p.fecha_real <= fechaLimite(p));
  const nocumplidos = entregadosConPromesa.length - cumplidos.length;
  // Fallback sin promesa: usar fecha_estimada
  const sinPromesaEntregados = entregados.filter(p => !tienePromesa(p) && p.fecha_real && p.fecha_estimada);
  const aTiempoFallback = sinPromesaEntregados.filter(p => p.fecha_real <= p.fecha_estimada).length;
  const tardeFallback   = sinPromesaEntregados.length - aTiempoFallback;

  const totalParaCumpl = entregadosConPromesa.length + sinPromesaEntregados.length;
  const totalCumplidos = cumplidos.length + aTiempoFallback;
  const asTiempo = totalCumplidos;
  const tarde    = nocumplidos + tardeFallback;
  const pctCumpl = totalParaCumpl > 0 ? Math.round((asTiempo / totalParaCumpl) * 100) : null;
  const usandoPromesa = entregadosConPromesa.length > 0;

  // ── Conductores con pedidos activos sin GPS ──
  const condActivos = [...new Set(activos.filter(p => p.conductor_id).map(p => String(p.conductor_id)))]
    .map(id => {
      const cond = conductores.find(c => String(c.id) === id);
      const gps  = window._gpsData && window._gpsData[id];
      const gpsOk = gps && (Date.now() - gps.ts) < 300000;
      const nPeds = activos.filter(p => String(p.conductor_id) === id).length;
      return { cond, gpsOk, nPeds, id };
    }).filter(x => x.cond);

  const sinGPS = condActivos.filter(x => !x.gpsOk);

  // ── Distribución de estados ──
  const ESTADOS_ORDEN = [
    { key: "sin_asignar", label: "Sin Asignar", color: "#94a3b8" },
    { key: "pendiente",   label: "Pendiente",   color: "#d97706" },
    { key: "en_transito", label: "En Tránsito", color: "#7c3aed" },
    { key: "paqueteria",  label: "Paquetería",  color: "#0891b2" },
    { key: "entregado",   label: "Entregado",   color: "#059669" },
    { key: "novedad",     label: "Con Novedad", color: "#dc2626" },
  ];
  const maxEstado = Math.max(...ESTADOS_ORDEN.map(e => pedidos.filter(p => p.estado === e.key).length), 1);

  const stats = [
    { l: "Total Pedidos",  v: pedidos.length,      c: P[600],    i: "📦" },
    { l: "Activos",        v: activos.length,      c: P[700],    i: "▶" },
    { l: "Entregados",     v: entregados.length,   c: "#059669", i: "✅" },
    { l: "En Riesgo",      v: enRiesgo.length,     c: enRiesgo.length > 0 ? "#d97706" : "#94a3b8", i: "⏰" },
    { l: "Vencidos",       v: vencidos.length,     c: vencidos.length > 0 ? "#dc2626" : "#94a3b8", i: "🚫" },
    { l: "Devoluciones",   v: devoluciones.length, c: "#dc2626", i: "↩️" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>📊 Dashboard</h2>

      {/* ── Alerta PQRS nuevas ── */}
      {pqrsAbiertas.length > 0 && (
        <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 15 }}>
              {pqrsAbiertas.length} PQRS sin gestionar
            </div>
            <div style={{ fontSize: 13, color: "#991b1b", marginTop: 2 }}>
              {pqrsAbiertas.slice(0,3).map(p => `Caso ${p.id}`).join(" · ")}
              {pqrsAbiertas.length > 3 && ` · y ${pqrsAbiertas.length - 3} más`}
            </div>
          </div>
          <span style={{ background: "#dc2626", color: "#fff", borderRadius: 20,
            padding: "4px 14px", fontWeight: 900, fontSize: 18 }}>{pqrsAbiertas.length}</span>
        </div>
      )}

      {/* ── Alerta pedidos vencidos ── */}
      {vencidos.length > 0 && (
        <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>🚫</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 15 }}>
              {vencidos.length} pedido(s) fuera de promesa
            </div>
            <div style={{ fontSize: 13, color: "#991b1b", marginTop: 2 }}>
              {vencidos.slice(0,4).map(p => p.id).join(" · ")}{vencidos.length > 4 ? ` · +${vencidos.length-4}` : ""}
            </div>
          </div>
          <span style={{ background: "#dc2626", color: "#fff", borderRadius: 20,
            padding: "4px 14px", fontWeight: 900, fontSize: 18 }}>{vencidos.length}</span>
        </div>
      )}

      {/* ── Alerta pedidos en riesgo ── */}
      {enRiesgo.length > 0 && (
        <div style={{ background: "#fffbeb", border: "2px solid #fcd34d", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 28 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#d97706", fontSize: 15 }}>
              {enRiesgo.length} pedido(s) en riesgo de vencer hoy o mañana
            </div>
            <div style={{ fontSize: 13, color: "#92400e", marginTop: 2 }}>
              {enRiesgo.slice(0,4).map(p => `${p.id} → ${fechaLimite(p)||p.fecha_estimada}`).join(" · ")}
            </div>
          </div>
          <span style={{ background: "#d97706", color: "#fff", borderRadius: 20,
            padding: "4px 14px", fontWeight: 900, fontSize: 18 }}>{enRiesgo.length}</span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14 }}>
        {stats.map(s => (
          <Card key={s.l} style={{ textAlign: "center", padding: 18, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.i}</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 5 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* ── Fila: Métricas de tiempo + Cumplimiento ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* Tiempo medio de entrega */}
        <Card style={{ textAlign: "center", padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ⏱ Tiempo Medio Entrega
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: P[700], lineHeight: 1 }}>
            {promedioEntrega !== null ? promedioEntrega : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>días promedio</div>
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
            {tiemposEntrega.length} pedido(s) calculado(s)
          </div>
          {diasPromPromedio && (
            <div style={{ fontSize: 11, color: P[400], marginTop: 6, fontWeight: 600 }}>
              Promesa promedio: {diasPromPromedio} días
            </div>
          )}
        </Card>

        {/* Cumplimiento */}
        <Card style={{ textAlign: "center", padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            🎯 Cumplimiento
          </div>
          <div style={{ fontSize: 10, color: usandoPromesa ? "#059669" : "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
            {usandoPromesa ? "📅 Basado en promesa de servicio" : "📆 Basado en fecha estimada"}
          </div>
          {pctCumpl !== null ? (
            <>
              {/* Semicírculo SVG */}
              <svg viewBox="0 0 120 70" style={{ width: 120, height: 70, margin: "0 auto", display: "block" }}>
                <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"/>
                <path d="M10,60 A50,50 0 0,1 110,60" fill="none"
                  stroke={pctCumpl >= 80 ? "#059669" : pctCumpl >= 60 ? "#d97706" : "#dc2626"}
                  strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${pctCumpl * 1.57} 157`}/>
                <text x="60" y="62" textAnchor="middle" fontSize="18" fontWeight="900"
                  fill={pctCumpl >= 80 ? "#059669" : pctCumpl >= 60 ? "#d97706" : "#dc2626"}>{pctCumpl}%</text>
              </svg>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {asTiempo} a tiempo · {tarde} tarde
              </div>
            </>
          ) : (
            <div style={{ fontSize: 32, fontWeight: 900, color: "#cbd5e1", paddingTop: 10 }}>—</div>
          )}
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>de {entregados.length} entregado(s)</div>
        </Card>

        {/* PQRS resumen */}
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            📋 PQRS
          </div>
          {[
            { label: "Abiertas",    color: "#dc2626", bg: "#fef2f2", val: pqrs.filter(p=>p.estado==="abierta").length },
            { label: "En Gestión",  color: "#d97706", bg: "#fffbeb", val: pqrs.filter(p=>p.estado==="en_gestion").length },
            { label: "Cerradas",    color: "#059669", bg: "#ecfdf5", val: pqrs.filter(p=>p.estado==="cerrada").length },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              background: row.bg, borderRadius: 8, padding: "7px 12px", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.label}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: row.color }}>{row.val}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Distribución de estados (barras horizontales) ── */}
      <Card>
        <div style={{ fontWeight: 800, color: P[800], marginBottom: 16, fontSize: 14 }}>📊 Pedidos por Estado</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ESTADOS_ORDEN.map(e => {
            const cnt = pedidos.filter(p => p.estado === e.key).length;
            const pct = pedidos.length ? (cnt / pedidos.length) * 100 : 0;
            return (
              <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 110, fontSize: 12, fontWeight: 700, color: "#475569", textAlign: "right", flexShrink: 0 }}>{e.label}</div>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 6, height: 22, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: e.color,
                    borderRadius: 6, transition: "width .5s ease",
                    minWidth: cnt > 0 ? 28 : 0, display: "flex", alignItems: "center",
                    paddingLeft: 8, boxSizing: "border-box" }}>
                    {cnt > 0 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{cnt}</span>}
                  </div>
                </div>
                <div style={{ width: 32, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{Math.round(pct)}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── GPS Conductores activos ── */}
      {condActivos.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, color: P[800], marginBottom: 16, fontSize: 14 }}>
            📡 GPS Conductores Activos
            {sinGPS.length > 0 && (
              <span style={{ marginLeft: 12, background: "#fef2f2", color: "#dc2626",
                borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                ⚠️ {sinGPS.length} sin GPS
              </span>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
            {condActivos.map(({ cond, gpsOk, nPeds }) => (
              <div key={cond.id} style={{
                background: gpsOk ? "#f0fdf4" : "#fef2f2",
                border: `2px solid ${gpsOk ? "#86efac" : "#fca5a5"}`,
                borderRadius: 10, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>{cond.nombre}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: gpsOk ? "#059669" : "#dc2626",
                    background: gpsOk ? "#dcfce7" : "#fee2e2", borderRadius: 12, padding: "2px 8px" }}>
                    {gpsOk ? "● GPS ON" : "○ GPS OFF"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Placa: {cond.placa} · {nPeds} pedido(s) activo(s)
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Pedidos Recientes ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${P[100]}` }}>
          <span style={{ fontWeight: 800, color: P[800], fontSize: 14 }}>🕐 Pedidos Recientes</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: P[50] }}>
                {["N° Pedido","Factura","Cliente","Ciudad","Cajas","Estado","Conductor"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: P[700], fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 8).map((p, i) => {
                const cond = conductores.find(c => String(c.id) === String(p.conductor_id));
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{p.factura}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12 }}>
                      {p.ciudad_origen_nombre&&<div style={{color:P[600],fontSize:10,fontWeight:700}}>🏭 {p.ciudad_origen_nombre}</div>}
                      <div style={{color:"#334155"}}>{p.ciudad_nombre}</div>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700 }}>{p.cajas}</td>
                    <td style={{ padding: "11px 14px" }}><Badge estado={p.estado} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748b" }}>
                      {p.tipo === "paqueteria" ? `📦 ${p.paqueteria}` : cond ? cond.nombre : <span style={{ color: "#ef4444" }}>Sin asignar</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Pedidos({ pedidos, setPedidos, conductores, ciudades, showToast, paqueterias, transportistas, recargar }) {
  const [filtro,    setFiltro]    = useState("todos");
  const [busq,      setBusq]      = useState("");
  const [modNuevo,  setModNuevo]  = useState(false);
  const [modDet,    setModDet]    = useState(null);
  const [modGuia,   setModGuia]   = useState(null);
  const [modCSV,    setModCSV]    = useState(false);
  const [modGuias,  setModGuias]  = useState(false);

  const vacio = { id: "", cliente: "", ciudad_codigo: "", direccion: "", cajas: "", factura: "", fecha_estimada: "", notas: "", conductor_id: "", tipo: "propio", paqueteria: "", guia_paqueteria: "" };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const filtrados = pedidos.filter(p => {
    const okF = filtro === "todos" || p.estado === filtro || (filtro === "paqueteria_tipo" && p.tipo === "paqueteria");
    const q   = busq.toLowerCase();
    const okB = !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.factura?.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
    return okF && okB;
  });

  const guardar = async () => {
    if (!form.id.trim() || !form.cliente.trim() || !form.ciudad_codigo || !form.factura.trim()) {
      showToast("N° Pedido, Factura, Cliente y Ciudad son obligatorios", "error"); return;
    }
    if (pedidos.find(p => p.id === form.id.trim())) {
      showToast("Ya existe un pedido con ese número", "error"); return;
    }
    const ciudad = (ciudades||[]).find(c => c.code === form.ciudad_codigo);
    const ciudadOrigen = (ciudades||[]).find(c => c.code === form.ciudad_origen_codigo);
    const cond   = conductores.find(c => c.id === parseInt(form.conductor_id));
    const esPaq  = form.tipo === "paqueteria";
    const guia_interna = !esPaq ? generarGuia(pedidos) : null;
    const nuevo = {
      id: form.id.trim(), guia_interna,
      cliente: form.cliente.trim(),
      ciudad_codigo: form.ciudad_codigo, ciudad_nombre: ciudad?.name || "",
      direccion: form.direccion.trim(), cajas: parseInt(form.cajas) || 0,
      factura: form.factura.trim(), fecha_estimada: form.fecha_estimada || null,
      notas: form.notas.trim(), tipo: form.tipo,
      empresa_transporte: form.tipo==="empresa_transporte"?form.empresa_transporte:null,
      paqueteria:      esPaq ? form.paqueteria : null,
      guia_paqueteria: esPaq ? form.guia_paqueteria.trim() : null,
      conductor_id:    cond ? cond.id : null,
      placa:           cond ? cond.placa : null,
      nit_proveedor:   cond ? cond.nit_proveedor : null,
      estado:          esPaq ? "paqueteria" : (cond ? "en_transito" : "sin_asignar"),
      estado_despacho: form.estado_despacho || "despachado",
      ciudad_origen_codigo: form.ciudad_origen_codigo || null,
      ciudad_origen_nombre: ciudadOrigen?.name || null,
      direccion_origen: form.direccion_origen || null,
      novedad: false,
      fecha_creacion:  new Date().toISOString().split("T")[0],
      fecha_real: null, soportes: [], soportes_data: [],
    };
    if (supabase) {
      const { error } = await supabase.from("pedidos").insert(nuevo);
      if (error) { showToast("Error guardando pedido: "+error.message,"error"); return; }
      if(recargar) await recargar(); else if(window._recargar) await window._recargar();
    } else {
      setPedidos(prev => [nuevo, ...prev]);
    }
    setModNuevo(false);
    setForm(vacio);
    showToast(`✓ Pedido ${form.id} creado · Guía: ${guia_interna||"N/A"}`, "success");
  };

  const imprimirPlanilla = () => {
    const win = window.open('', '_blank');
    if (!win) { showToast("Permite ventanas emergentes para imprimir", "error"); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Planilla Somos PRO Tracking</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#4c1d95;margin-bottom:4px}p{color:#64748b;margin:0 0 20px}
    table{width:100%;border-collapse:collapse}th{background:#f5f3ff;color:#4c1d95;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd6fe}
    td{padding:10px 12px;border-bottom:1px solid #ede9fe;font-size:13px}.badge{padding:3px 10px;border-radius:12px;font-weight:700;font-size:11px}
    .footer{margin-top:30px;font-size:10px;color:#94a3b8;text-align:center}</style></head>
    <body><h1>Planilla de Despachos — Somos PRO Tracking</h1>
    <p>Fecha de impresión: ${new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})} · Total pedidos: ${filtrados.length}</p>
    <table><thead><tr><th>#</th><th>N° Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad / DANE</th><th>Dirección</th><th>Cajas</th><th>Estado</th><th>Conductor / Paquetería</th><th>Firma Recibido</th></tr></thead>
    <tbody>${filtrados.map((p, i) => {
      const cond = conductores.find(c => c.id === p.conductor_id);
      const trans = p.tipo === "paqueteria" ? `📦 ${p.paqueteria} — ${p.guia_paqueteria}` : (cond ? `${cond.nombre} · ${p.placa}` : "Sin asignar");
      return `<tr><td>${i+1}</td><td><strong>${p.id}</strong></td><td>${p.factura||"—"}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}<br/><small>${p.ciudad_codigo}</small></td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${trans}</td><td></td></tr>`;
    }).join("")}</tbody></table>
    <div class="footer">Somos PRO Tracking · Documento generado automáticamente</div></body></html>`);
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
    showToast("✓ " + rows.length + " pedido(s) importados", "success");
    if (recargar) await recargar();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>📦 Pedidos</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" size="sm" onClick={imprimirPlanilla}>🖨️ Planilla</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setModCSV(true)}>📤 CSV Pedidos</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setModGuias(true)}>📦 Cargar Guías Paquetería</Btn>
          <Btn size="sm" onClick={() => setModNuevo(true)}>+ Nuevo Pedido</Btn>
        </div>
      </div>

      <Card style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={busq} onChange={e => setBusq(e.target.value)}
            placeholder="🔍 Buscar por N° pedido, factura, cliente o ciudad..."
            style={{ ...iSt, flex: 1, minWidth: 200 }} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...iSt, width: "auto" }}>
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADOS_PEDIDO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="paqueteria_tipo">Solo Paquetería</option>
          </select>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          {filtrados.length} de {pedidos.length} pedidos · {filtrados.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0)} cajas
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: P[50] }}>
                {["N° Pedido","Factura","Cliente","Ciudad / DANE","Cajas","Estado","Conductor / Paquetería","Acciones"].map(h => (
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
                        ? <span style={{ color: "#0891b2" }}>📦 {p.paqueteria}<br/><span style={{ fontFamily: "monospace", fontSize: 11 }}>{p.guia_paqueteria}</span></span>
                        : cond ? <span>{cond.nombre}<br/><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{p.placa}</span></span>
                               : <span style={{ color: "#ef4444" }}>Sin asignar</span>
                      }
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn size="sm" variant="secondary" onClick={() => setModDet(p)}>Ver</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => setModGuia(p)}>🖨️</Btn>
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
              <Field label="N° de Pedido" value={form.id} onChange={f("id")} required placeholder="PED-012" />
              <Field label="N° de Factura" value={form.factura} onChange={f("factura")} required placeholder="FAC-3000" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Cantidad de Cajas" value={form.cajas} onChange={f("cajas")} type="number" placeholder="10" />
              <Field label="Fecha Entrega Estimada" value={form.fecha_estimada} onChange={f("fecha_estimada")} type="date" />
            </div>
            <Field label="Nombre del Cliente / Destinatario" value={form.cliente} onChange={f("cliente")} required placeholder="Empresa Destino S.A.S" />
            <Field label="Ciudad de Entrega (Código DANE)" value={form.ciudad_codigo} onChange={f("ciudad_codigo")} required as="select"
              options={[{ value: "", label: "— Seleccione ciudad —" }, ...(ciudades||[]).map(c => ({ value: c.code, label: `${c.name} — ${c.code}` }))]} />
            <Field label="Dirección de Entrega" value={form.direccion} onChange={f("direccion")} placeholder="Cra 15 #93-47 Of 302" />
            {/* ORIGEN — CEDI de despacho */}
            <div style={{background:P[50],borderRadius:10,padding:"10px 14px",border:`1px solid ${P[200]}`}}>
              <div style={{fontSize:11,fontWeight:700,color:P[700],textTransform:"uppercase",marginBottom:10}}>📦 Origen / CEDI de Despacho</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Ciudad Origen (DANE)" value={form.ciudad_origen_codigo} onChange={f("ciudad_origen_codigo")} as="select"
                  options={[{value:"",label:"— Sin especificar —"},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
                <Field label="Dirección Origen / CEDI" value={form.direccion_origen} onChange={f("direccion_origen")} placeholder="Bodega principal, Cra 10 #5-20"/>
              </div>
            </div>
            <Field label="Tipo de Envío" value={form.tipo} onChange={f("tipo")} as="select"
              options={[{ value: "propio", label: "🚚 Transporte Propio" }, { value: "empresa_transporte", label: "🏢 Empresa Transportista" }, { value: "mensajeria", label: "📨 Mensajería" }, { value: "paqueteria", label: "📦 Paquetería Tercero" }]} />
            {form.tipo === "paqueteria" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Empresa Paquetería" value={form.paqueteria} onChange={f("paqueteria")} as="select"
                  options={[{ value: "", label: "— Seleccione —" }, ...(paqueterias||[]).filter(p=>typeof p==="string"&&p).map(p => ({ value: p, label: p }))]} />
                <Field label="N° Guía Paquetería" value={form.guia_paqueteria} onChange={f("guia_paqueteria")} placeholder="SRV-2026-XXXXX" />
              </div>
            )}
            {form.tipo !== "paqueteria" && (
              <Field label="Asignar Conductor (opcional)" value={form.conductor_id}
                onChange={v => {
                  f("conductor_id")(v);
                  const c = conductores.find(cx=>String(cx.id)===String(v));
                  if(c && form.tipo==="empresa_transporte") f("empresa_transporte")(c.empresa||"");
                }} as="select"
                options={[
                  { value: "", label: "— Sin asignar —" },
                  ...(form.tipo==="empresa_transporte"
                    ? conductores.filter(c=>c.empresa||c.nit_proveedor)
                    : conductores
                  ).map(c => ({ value: c.id, label: `${c.nombre} · ${c.placa}${c.empresa?" — "+c.empresa:""}` }))
                ]}/>
            )}
            <Field label="Notas / Observaciones" value={form.notas} onChange={f("notas")} as="textarea" placeholder="Instrucciones especiales..." />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModNuevo(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar Pedido</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={transportistas} onClose={()=>setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={true}/>}
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
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900 }}>🗺️ Rastreo GPS</h2>
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
                <div style={{ fontWeight: 800, color: P[800], fontSize: 16 }}>{sel.id} — {sel.cliente}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>📍 {sel.direccion}, {ciudad?.name}</div>
                {cond && <div style={{ fontSize: 13, color: P[600], marginTop: 2 }}>🚗 {cond.nombre} · Placa: {sel.placa}</div>}
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

  const guardar = async () => {
    if (!form.nombre.trim()||!form.cedula.trim()||!form.placa.trim()) {
      showToast("Nombre, cédula y placa son obligatorios","error"); return;
    }
    if (!form.user_login.trim()||!form.pass_login.trim()) {
      showToast("Usuario y contraseña son obligatorios","error"); return;
    }
    if (form.nit_proveedor.trim()) {
      const existe = (transportistas||[]).find(t=>t.nit===form.nit_proveedor.trim());
      if (!existe) { showToast("El NIT no corresponde a ninguna empresa registrada","error"); return; }
    }
    setGuardando(true);
    try {
      // 1. Crear usuario
      const { data: uData, error: uErr } = await supabase.from('usuarios').insert({
        nombre: form.nombre.trim(),
        user: form.user_login.trim(),
        pass: form.pass_login.trim(),
        rol: 'conductor',
        cedula: form.cedula.trim(),
        placa: form.placa.trim(),
        celular: form.celular.trim(),
        nit_proveedor: form.nit_proveedor.trim(),
        empresa: form.empresa.trim(),
      }).select().single();
      if (uErr) { showToast("Error creando usuario: "+uErr.message,"error"); setGuardando(false); return; }

      // 2. Crear conductor vinculado al usuario
      const { data: cData, error: cErr } = await supabase.from('conductores').insert({
        nombre: form.nombre.trim(),
        cedula: form.cedula.trim(),
        placa: form.placa.trim(),
        celular: form.celular.trim(),
        nit_proveedor: form.nit_proveedor.trim(),
        empresa: form.empresa.trim(),
        usuario_id: uData.id,
      }).select().single();
      if (cErr) { showToast("Error creando conductor: "+cErr.message,"error"); setGuardando(false); return; }

      // 3. Actualizar el usuario con el conductor_id para vincularlos
      await supabase.from('usuarios').update({ conductor_id: cData.id }).eq('id', uData.id);

      setModal(false); setForm(vacio);
      showToast("✓ Conductor y usuario creados","success");
      if(recargar) await recargar(); else if(window._recargar) await window._recargar();
    } catch(e) {
      showToast("Error inesperado: "+e.message,"error");
    }
    setGuardando(false);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>🚗 Conductores</h2>
        <Btn onClick={()=>setModal(true)}>+ Registrar Conductor</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {conductores.map(c=>{
          const asig=pedidos.filter(p=>p.conductor_id===c.id).length;
          const tran=pedidos.filter(p=>p.conductor_id===c.id&&p.estado==="en_transito").length;
          return (
            <Card key={c.id} style={{borderTop:`3px solid ${P[500]}`}}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:22,background:`linear-gradient(135deg,${P[700]},${P[500]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18}}>🚗</div>
                <div>
                  <div style={{fontWeight:800,color:P[800]}}>{c.nombre}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>Placa: <strong style={{fontFamily:"monospace"}}>{c.placa}</strong></div>
                  {c.cedula&&<div style={{fontSize:11,color:"#94a3b8"}}>CC: {c.cedula}</div>}
                  {c.celular&&<div style={{fontSize:12,color:"#64748b"}}>📱 {c.celular}</div>}
                </div>
              </div>
              <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
                {c.empresa&&<span>🏢 {c.empresa}</span>}
                <span>📦 Asignados: <strong>{asig}</strong> · En tránsito: <strong style={{color:P[600]}}>{tran}</strong></span>
              </div>
            </Card>
          );
        })}
        {conductores.length===0&&<p style={{color:"#94a3b8"}}>Sin conductores registrados.</p>}
      </div>
      {modal&&(
        <Modal title="Registrar Conductor" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:P[50],borderRadius:10,padding:10,fontSize:12,color:P[700]}}>
              Se creará automáticamente el usuario de acceso al sistema.
            </div>
            <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required placeholder="Juan Pérez"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Cédula *" value={form.cedula} onChange={f("cedula")} required placeholder="1012345678"/>
              <Field label="Celular"  value={form.celular} onChange={f("celular")} placeholder="3001234567"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Placa *" value={form.placa} onChange={f("placa")} required placeholder="ABC-123"/>
              <Field label="NIT proveedor" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1"/>
            </div>
            <Field label="Empresa de transporte" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ S.A.S"/>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario (login) *" value={form.user_login} onChange={f("user_login")} required placeholder="juan.perez"/>
                <Field label="Contraseña *" value={form.pass_login} onChange={f("pass_login")} required type="password" placeholder="••••••••"/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
              <Btn onClick={guardar} disabled={guardando}>{guardando?"Guardando...":"💾 Guardar y Crear Usuario"}</Btn>
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
  const [modCond,    setModCond]    = useState(null);
  const [modEdit,    setModEdit]    = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [formE, setFormE] = useState({nombre:"",nit:"",contacto:"",tel:"",user_login:"",pass_login:""});
  const [formC, setFormC] = useState({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});
  const [formEdit, setFormEdit] = useState({nombre:"",cedula:"",placa:"",celular:"",nit_proveedor:"",empresa:""});
  const fe = k => v => setFormE(p=>({...p,[k]:v}));
  const fc = k => v => setFormC(p=>({...p,[k]:v}));

  const esMia = user.rol==="transportista";
  const miNit = user.nit||"";
  const misEmp = esMia ? transportistas.filter(t=>t.nit===miNit) : transportistas;
  const misCon = esMia ? conductores.filter(c=>c.nit_proveedor===miNit) : conductores;

  const crearEmpresa = async () => {
    if (!formE.nombre.trim()||!formE.nit.trim()) { showToast("Nombre y NIT son obligatorios","error"); return; }
    if (!formE.user_login.trim()||!formE.pass_login.trim()) { showToast("Usuario y contraseña son obligatorios","error"); return; }
    setGuardando(true);
    try {
      // Crear usuario transportista
      const { data: uData, error: uErr } = await supabase.from('usuarios').insert({
        nombre: formE.nombre.trim(), user: formE.user_login.trim(), pass: formE.pass_login.trim(),
        rol:'transportista', nit:formE.nit.trim(), empresa:formE.nombre.trim(),
      }).select().single();
      if (uErr) { showToast("Error usuario: "+uErr.message,"error"); setGuardando(false); return; }
      // Crear transportista vinculado
      const { error: tErr } = await supabase.from('transportistas').insert({
        nombre:formE.nombre.trim(), nit:formE.nit.trim(),
        contacto:formE.contacto.trim(), tel:formE.tel.trim(), usuario_id:uData.id,
      });
      if (tErr) { showToast("Error empresa: "+tErr.message,"error"); setGuardando(false); return; }
      setModEmpresa(false); setFormE({nombre:"",nit:"",contacto:"",tel:"",user_login:"",pass_login:""});
      showToast("✓ Empresa y usuario creados","success");
      if(recargar) await recargar(); else if(window._recargar) await window._recargar();
    } catch(e) { showToast("Error: "+e.message,"error"); }
    setGuardando(false);
  };

  const guardarEdicionEmpresa = async () => {
    if (!formE.nombre.trim()) { showToast("Nombre es obligatorio","error"); return; }
    setGuardando(true);
    await supabase.from('transportistas').update({nombre:formE.nombre.trim(),contacto:formE.contacto.trim(),tel:formE.tel.trim()}).eq('id',modEditEmp.id);
    if (formE.pass_login.trim() && modEditEmp.usuario_id) {
      await supabase.from('usuarios').update({nombre:formE.nombre.trim(),pass:formE.pass_login.trim()}).eq('id',modEditEmp.usuario_id);
    }
    setModEditEmp(null); showToast("✓ Empresa actualizada","success");
    if(recargar) await recargar(); else if(window._recargar) await window._recargar(); setGuardando(false);
  };

  const abrirEditarEmpresa = (t) => {
    setFormE({nombre:t.nombre,nit:t.nit,contacto:t.contacto||"",tel:t.tel||"",user_login:"",pass_login:""});
    setModEditEmp(t);
  };

  const inscribirConductor = async () => {
    if (!formC.nombre.trim()||!formC.placa.trim()||!formC.cedula.trim()) { showToast("Nombre, cédula y placa son obligatorios","error"); return; }
    if (!formC.user_login.trim()||!formC.pass_login.trim()) { showToast("Usuario y contraseña son obligatorios","error"); return; }
    const emp = modCond;
    setGuardando(true);
    try {
      const { data: uData, error: uErr } = await supabase.from('usuarios').insert({
        nombre:formC.nombre.trim(), user:formC.user_login.trim(), pass:formC.pass_login.trim(),
        rol:'conductor', cedula:formC.cedula.trim(), placa:formC.placa.trim(),
        celular:formC.celular.trim(), nit_proveedor:emp.nit, empresa:emp.nombre,
      }).select().single();
      if (uErr) { showToast("Error usuario: "+uErr.message,"error"); setGuardando(false); return; }
      const { error: cErr } = await supabase.from('conductores').insert({
        nombre:formC.nombre.trim(), cedula:formC.cedula.trim(), placa:formC.placa.trim(),
        celular:formC.celular.trim(), nit_proveedor:emp.nit, empresa:emp.nombre,
        usuario_id:uData.id,
      });
      if (cErr) { showToast("Error conductor: "+cErr.message,"error"); setGuardando(false); return; }
      setModCond(null); setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});
      showToast(`✓ Conductor inscrito en ${emp.nombre}`,"success");
      if(recargar) await recargar(); else if(window._recargar) await window._recargar();
    } catch(e) { showToast("Error: "+e.message,"error"); }
    setGuardando(false);
  };

  const guardarEdicionConductor = async () => {
    if (!formEdit.nombre.trim()||!formEdit.placa.trim()) { showToast("Nombre y placa son obligatorios","error"); return; }
    setGuardando(true);
    await supabase.from('conductores').update({
      nombre:formEdit.nombre.trim(), cedula:formEdit.cedula.trim(), placa:formEdit.placa.trim(),
      celular:formEdit.celular.trim(), nit_proveedor:formEdit.nit_proveedor.trim(), empresa:formEdit.empresa.trim(),
    }).eq('id', modEdit.id);
    if (modEdit.usuario_id) {
      await supabase.from('usuarios').update({nombre:formEdit.nombre.trim(),placa:formEdit.placa.trim(),celular:formEdit.celular.trim()}).eq('id',modEdit.usuario_id);
    }
    setModEdit(null); showToast("✓ Conductor actualizado","success");
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
              <p style={{margin:"4px 0 0",color:P[300],fontSize:13}}>NIT: {miNit} · {misCon.filter(c=>c.activo).length} conductor(es)</p>
            </div>
          </div>
        </Card>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h3 style={{margin:0,color:P[800],fontWeight:800}}>🏢 {esMia?"Mi Empresa":"Empresas Transportistas"}</h3>
        {!esMia&&<Btn onClick={()=>setModEmpresa(true)}>+ Nueva Empresa</Btn>}
      </div>
      {!esMia&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:28}}>
          {misEmp.map(t=>(
            <Card key={t.id} style={{borderLeft:`4px solid ${P[500]}`}}>
              <div style={{fontWeight:800,color:P[800],fontSize:15,marginBottom:6}}>🏢 {t.nombre}</div>
              <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
                <span>NIT: <strong style={{fontFamily:"monospace"}}>{t.nit}</strong></span>
                {t.contacto&&<span>👤 {t.contacto}</span>}
                {t.tel&&<span>📱 {t.tel}</span>}
                <span>🚗 {conductores.filter(c=>c.nit_proveedor===t.nit).length} conductor(es)</span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                <Btn size="sm" variant="secondary" onClick={()=>abrirEditarEmpresa(t)}>✏️ Editar</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>{setModCond(t);setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});}}>+ Conductor</Btn>
              </div>
            </Card>
          ))}
          {misEmp.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>Sin empresas registradas.</p>}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{margin:0,color:P[800],fontWeight:800}}>🚗 {esMia?"Mis Conductores":"Todos los Conductores"}</h3>
        {esMia&&<Btn onClick={()=>{setModCond({nit:miNit,nombre:user.empresa||user.nombre});setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""});}}>+ Inscribir Conductor</Btn>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
        {misCon.map(c=>(
          <Card key={c.id} style={{borderLeft:`3px solid ${P[400]}`}}>
            <div style={{fontWeight:800,color:P[800],marginBottom:4}}>🚗 {c.nombre}</div>
            {c.cedula&&<div style={{fontSize:12,color:"#94a3b8"}}>CC: {c.cedula}</div>}
            <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Placa: <strong style={{fontFamily:"monospace"}}>{c.placa}</strong></div>
            {c.celular&&<div style={{fontSize:12,color:"#64748b"}}>📱 {c.celular}</div>}
            {c.empresa&&<div style={{fontSize:12,color:P[600],fontWeight:600,marginTop:3}}>🏢 {c.empresa}</div>}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <span style={{background:"#ecfdf5",color:"#059669",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>✓ Activo</span>
              <Btn size="sm" variant="secondary" onClick={()=>{setFormEdit({nombre:c.nombre,cedula:c.cedula||"",placa:c.placa||"",celular:c.celular||"",nit_proveedor:c.nit_proveedor||"",empresa:c.empresa||""});setModEdit(c);}}>✏️ Editar</Btn>
            </div>
          </Card>
        ))}
        {misCon.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>Sin conductores inscritos.</p>}
      </div>

      {modEmpresa&&(
        <Modal title="Nueva Empresa Transportista" onClose={()=>setModEmpresa(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Razón Social *" value={formE.nombre} onChange={fe("nombre")} required placeholder="Transportes XYZ S.A.S"/>
            <Field label="NIT *" value={formE.nit} onChange={fe("nit")} required placeholder="900123456-1"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Persona de Contacto" value={formE.contacto} onChange={fe("contacto")} placeholder="Carlos Ruiz"/>
              <Field label="Teléfono" value={formE.tel} onChange={fe("tel")} placeholder="3001234567"/>
            </div>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario *" value={formE.user_login} onChange={fe("user_login")} required placeholder="trans.xyz"/>
                <Field label="Contraseña *" value={formE.pass_login} onChange={fe("pass_login")} required type="password" placeholder="••••••••"/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEmpresa(false)}>Cancelar</Btn>
              <Btn onClick={crearEmpresa} disabled={guardando}>{guardando?"Guardando...":"💾 Crear Empresa y Usuario"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modEditEmp&&(
        <Modal title={`Editar — ${modEditEmp.nombre}`} onClose={()=>setModEditEmp(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Razón Social *" value={formE.nombre} onChange={fe("nombre")} required/>
            <p style={{fontSize:12,color:"#64748b",margin:0}}>NIT: <strong>{modEditEmp.nit}</strong> (no modificable)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Contacto" value={formE.contacto} onChange={fe("contacto")}/>
              <Field label="Teléfono" value={formE.tel} onChange={fe("tel")}/>
            </div>
            <Field label="Nueva Contraseña (vacío = sin cambio)" value={formE.pass_login} onChange={fe("pass_login")} type="password" placeholder="Nueva contraseña..."/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEditEmp(null)}>Cancelar</Btn>
              <Btn onClick={guardarEdicionEmpresa} disabled={guardando}>{guardando?"Guardando...":"💾 Guardar"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modCond&&(
        <Modal title={`Inscribir Conductor — ${modCond.nombre}`} onClose={()=>setModCond(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:P[50],borderRadius:10,padding:10,fontSize:12,color:P[700]}}>
              Empresa: <strong>{modCond.nombre}</strong> · NIT: <strong>{modCond.nit}</strong>
            </div>
            <Field label="Nombre *" value={formC.nombre} onChange={fc("nombre")} required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Cédula *" value={formC.cedula} onChange={fc("cedula")} required placeholder="1012345678"/>
              <Field label="Celular" value={formC.celular} onChange={fc("celular")} placeholder="3001234567"/>
            </div>
            <Field label="Placa *" value={formC.placa} onChange={fc("placa")} required placeholder="XYZ-456"/>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario *" value={formC.user_login} onChange={fc("user_login")} required placeholder="juan.perez"/>
                <Field label="Contraseña *" value={formC.pass_login} onChange={fc("pass_login")} required type="password" placeholder="••••••••"/>
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
        <Modal title={`Editar Conductor — ${modEdit.nombre}`} onClose={()=>setModEdit(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Nombre *" value={formEdit.nombre} onChange={v=>setFormEdit(p=>({...p,nombre:v}))} required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Cédula" value={formEdit.cedula} onChange={v=>setFormEdit(p=>({...p,cedula:v}))} placeholder="1012345678"/>
              <Field label="Celular" value={formEdit.celular} onChange={v=>setFormEdit(p=>({...p,celular:v}))} placeholder="3001234567"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Placa *" value={formEdit.placa} onChange={v=>setFormEdit(p=>({...p,placa:v}))} required placeholder="ABC-123"/>
              <Field label="NIT proveedor" value={formEdit.nit_proveedor} onChange={v=>setFormEdit(p=>({...p,nit_proveedor:v}))} placeholder="900123456-1"/>
            </div>
            <Field label="Empresa" value={formEdit.empresa} onChange={v=>setFormEdit(p=>({...p,empresa:v}))} placeholder="Transportes XYZ"/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEdit(null)}>Cancelar</Btn>
              <Btn onClick={guardarEdicionConductor} disabled={guardando}>{guardando?"Guardando...":"💾 Guardar"}</Btn>
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
  const misDV   = selCond ? devoluciones.filter(d=>String(d.conductor_id)===String(selCond)&&d.estado==="en_transito") : [];
  const misRC   = selCond ? recogidas.filter(r=>String(r.conductor_id)===String(selCond)&&r.estado==="en_transito") : [];
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
    <h1>Somos PRO Tracking — Resumen de Despachos</h1>
    <h2>Conductor: ${cond.nombre} · Placa: ${cond.placa}${cond.celular?" · Tel: "+cond.celular:""}</h2>
    <p>Empresa: ${cond.empresa||"—"} · NIT: ${cond.nit_proveedor||"—"}</p>
    <p>Fecha: ${new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})}</p>
    <table><thead><tr><th>#</th><th>Guía Interna</th><th>N° Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad</th><th>Dirección</th><th>Cajas</th><th>Estado</th><th>Fecha Est.</th></tr></thead>
    <tbody>${misPeds.map((p,i)=>`<tr><td>${i+1}</td><td><strong>${p.guia_interna||"—"}</strong></td><td>${p.id}</td><td>${p.factura||"—"}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}</td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${p.fecha_estimada||"—"}</td></tr>`).join("")}
    </tbody></table>
    <p class="total" style="margin-top:20px">Total pedidos: ${misPeds.length} · Total cajas: <strong>${totalCajas}</strong></p>
    </body></html>`);
    win.print();
  };

  return (
    <div>
      <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}>📋 Resumen por Transportador — Pedidos En Tránsito</h2>
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <Field label="Seleccionar Conductor / Transportador" value={selCond} onChange={setSelCond} as="select"
            options={[{value:"",label:"— Seleccione conductor —"},...condOpts.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa} · ${c.empresa||""}`}))]}
            style={{flex:1,minWidth:280}} />
          <Btn variant="ghost" onClick={imprimir} disabled={!cond} style={{marginTop:18}}>🖨️ Imprimir Resumen</Btn>
        </div>
      </Card>
      {cond&&(
        <>
          <Card style={{background:`linear-gradient(135deg,${P[800]},${P[600]})`,marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:52,height:52,borderRadius:26,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🚗</div>
              <div>
                <div style={{color:"#fff",fontWeight:900,fontSize:18}}>{cond.nombre}</div>
                <div style={{color:P[300],fontSize:13}}>Placa: {cond.placa}{cond.celular&&` · 📱 ${cond.celular}`}</div>
                <div style={{color:P[300],fontSize:12}}>{cond.empresa||"—"} · NIT: {cond.nit_proveedor||"—"}</div>
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
                  {["#","Guía Interna","N° Pedido","Factura","Cliente","Ciudad","Cajas","Estado","Fecha Est."].map(h=>(
                    <th key={h} style={{padding:"11px 14px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {misPeds.map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${P[100]}`,background:i%2?"#fafafa":"#fff"}}>
                      <td style={{padding:"11px 14px",color:"#94a3b8",fontSize:11}}>{i+1}</td>
                      <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:11,color:P[600],fontWeight:700}}>{p.guia_interna||"—"}</td>
                      <td style={{padding:"11px 14px",fontWeight:800,color:P[700]}}>{p.id}</td>
                      <td style={{padding:"11px 14px",fontFamily:"monospace",fontSize:12}}>{p.factura}</td>
                      <td style={{padding:"11px 14px",color:"#334155",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.cliente}</td>
                      <td style={{padding:"11px 14px",color:"#64748b",fontSize:12}}>{p.ciudad_nombre}</td>
                      <td style={{padding:"11px 14px",textAlign:"center",fontWeight:700}}>{p.cajas}</td>
                      <td style={{padding:"11px 14px"}}><Badge estado={p.estado}/></td>
                      <td style={{padding:"11px 14px",color:"#64748b",fontSize:12}}>{p.fecha_estimada||"—"}</td>
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

// ─── Ciudades ─────────────────────────────────────────────────────────────────

function Ciudades({ ciudades, showToast, recargar }) {
  const [modNueva,setModNueva]=useState(false);
  const [modCSV,setModCSV]=useState(false);
  const [busq,setBusq]=useState("");
  const [form,setForm]=useState({code:"",name:""});

  const guardar=async()=>{
    if(!form.code.trim()||!form.name.trim()){showToast("Código DANE y nombre son obligatorios","error");return;}
    if(ciudades.find(c=>c.code===form.code.trim())){showToast("Ya existe esa ciudad","error");return;}
    if(supabase){ await supabase.from('ciudades').upsert({code:form.code.trim(),name:form.name.trim()},{onConflict:'code'}); if(recargar) await recargar(); }
    setModNueva(false);setForm({code:"",name:""});
    showToast("✓ Ciudad registrada","success");
  };

  const filt=ciudades.filter(c=>!busq||c.name.toLowerCase().includes(busq.toLowerCase())||c.code.includes(busq));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>🏙️ Ciudades / Códigos DANE</h2>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" size="sm" onClick={()=>setModCSV(true)}>📤 CSV Masivo</Btn>
          <Btn size="sm" onClick={()=>setModNueva(true)}>+ Nueva Ciudad</Btn>
        </div>
      </div>
      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="🔍 Buscar ciudad o código DANE..." style={iSt}/>
        <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>{filt.length} de {ciudades.length} ciudades registradas</div>
      </Card>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto",maxHeight:480,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead style={{position:"sticky",top:0}}>
              <tr style={{background:P[50]}}>
                <th style={{padding:"11px 14px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11}}>Código DANE</th>
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
            <Field label="Código DANE" value={form.code} onChange={v=>setForm(p=>({...p,code:v}))} required placeholder="05045"/>
            <Field label="Nombre del municipio" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Apartadó"/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModNueva(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar</Btn>
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
          showToast(`✓ ${nuevas.length} ciudad(es) importada(s)`,"success");
          if(recargar) await recargar();
        }} />
      )}
    </div>
  );
}

// ─── Paqueterías (gestión) ────────────────────────────────────────────────────

function ModalCSVCiudades({ onClose, onImportar }) {
  const [txt, setTxt]   = useState("");
  const [prev, setPrev] = useState([]);
  const [err, setErr]   = useState("");
  const fileRef = useRef(null);
  const [nombreArchivo, setNombreArchivo] = useState("");

  const CABECERA = "code,name";
  const EJEMPLO  = "05001,Medellín\n76001,Cali\n11001,Bogotá D.C.";

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
    <Modal title="Importar Ciudades / Códigos DANE" onClose={onClose} wide>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:"#fffbeb", borderRadius:10, padding:12, fontSize:13, color:"#92400e" }}>
          <strong>Columnas requeridas:</strong> <code>code</code> (código DANE) y <code>name</code> (nombre del municipio)
        </div>
        <Btn size="sm" variant="success" onClick={()=>descargarCSV("plantilla_ciudades.csv", CABECERA, EJEMPLO)}>
          ⬇ Descargar Plantilla CSV
        </Btn>
        <div
          style={{ border:`2px dashed ${P[300]}`, borderRadius:12, padding:"20px 16px", textAlign:"center", cursor:"pointer", background: nombreArchivo ? "#f0fdf4" : P[50] }}
          onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); }}
        >
          <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
          {nombreArchivo
            ? <div style={{ color:"#059669", fontWeight:700, fontSize:14 }}>✓ {nombreArchivo}</div>
            : <div style={{ fontWeight:700, color:P[700] }}>Haz clic para seleccionar el archivo CSV</div>
          }
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
          onChange={e => leerArchivo(e.target.files[0])} />

        <details style={{ fontSize:13 }}>
          <summary style={{ cursor:"pointer", color:P[600], fontWeight:600 }}>También puedes pegar el texto</summary>
          <textarea value={txt} onChange={e=>{setTxt(e.target.value);setNombreArchivo("");}} rows={4}
            style={{ ...iSt, fontFamily:"monospace", fontSize:11, resize:"vertical", marginTop:8 }}
            placeholder="code,name&#10;05001,Medellín&#10;76001,Cali"/>
          <Btn size="sm" variant="secondary" style={{marginTop:6}}
            onClick={()=>{try{setPrev(parsear(txt));setErr("");}catch(e){setErr(e.message);setPrev([]);}}}>
            👁 Previsualizar
          </Btn>
        </details>

        {err && <p style={{ color:"#dc2626", background:"#fef2f2", padding:"8px 12px", borderRadius:8, fontSize:13, margin:0 }}>⚠️ {err}</p>}

        {prev.length > 0 && (
          <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, border:"1px solid #86efac", maxHeight:160, overflowY:"auto" }}>
            <p style={{ margin:"0 0 8px", fontWeight:700, color:"#15803d", fontSize:13 }}>✓ {prev.length} ciudad(es) lista(s):</p>
            {prev.slice(0,10).map((c,i) => (
              <div key={i} style={{ fontSize:12, color:"#334155" }}>• <strong>{c.code}</strong> — {c.name}</div>
            ))}
            {prev.length > 10 && <div style={{fontSize:11,color:"#94a3b8"}}>...y {prev.length-10} más</div>}
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={prev.length===0} onClick={()=>onImportar(prev)}>📥 Importar ({prev.length})</Btn>
        </div>
      </div>
    </Modal>
  );
}

function MisPedidosConductor({ pedidos, user, conductores, ciudades, showToast, recargar, transportistas }) {
  const [modDet,    setModDet]    = useState(null);
  const [modFotos,  setModFotos]  = useState(null);  // pedido para cargar soportes
  const [novedad,   setNovedad]   = useState(false);
  const condId = user.conductor_db_id || user.id;
  const misPeds = pedidos.filter(p => String(p.conductor_id) === String(condId));
  const activos = misPeds.filter(p => ["pendiente","en_transito","sin_asignar"].includes(p.estado));
  const completados = misPeds.filter(p => ["entregado","novedad"].includes(p.estado));

  const marcarEntregado = async (pedido, fotos, conNovedad) => {
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
        showToast("⚠️ Estado guardado pero fotos muy pesadas — usa imágenes más pequeñas", "warning");
      } else if (e1) {
        showToast("Error guardando: "+e1.message, "error"); return;
      } else {
        showToast(`✓ Entrega registrada · ${fotos.length} soporte(s) · Estado: ${estadoFinal==="entregado"?"Entregado ✅":"Con Novedad ⚠️"}`, "success");
      }
    } catch(e) {
      showToast("Error de conexión. Revisa tu internet e intenta de nuevo.", "error"); return;
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
            <h2 style={{margin:0,color:"#fff",fontWeight:900}}>👋 {user.nombre}</h2>
            <p style={{margin:"3px 0 0",color:P[300],fontSize:13}}>
              Placa: {user.placa} · {activos.length} activo(s) · {completados.length} entregado(s)
            </p>
          </div>
        </div>
      </Card>

      {/* Pedidos activos */}
      {activos.length===0&&completados.length===0&&(
        <Card style={{textAlign:"center",padding:48,color:"#94a3b8"}}>
          <div style={{fontSize:40,marginBottom:12}}>📭</div>
          <p>Sin pedidos asignados por el momento.</p>
        </Card>
      )}

      {activos.length>0&&(
        <>
          <h3 style={{color:P[800],fontWeight:800,margin:"0 0 14px"}}>📦 Pedidos Activos ({activos.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
            {activos.map(p=>(
              <Card key={p.id} style={{borderLeft:`4px solid ${ESTADOS_PEDIDO[p.estado]?.color||P[400]}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontWeight:900,color:P[600],fontSize:18,fontFamily:"monospace"}}>{p.guia_interna||p.id}</div>
                    <div style={{fontSize:12,color:"#94a3b8"}}>Factura: {p.factura} · {p.cajas} cajas</div>
                  </div>
                  <Badge estado={p.estado}/>
                </div>
                <div style={{fontWeight:700,color:"#1e293b",marginBottom:6,fontSize:15}}>{p.cliente}</div>
                <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
                  <span>🏙️ {p.ciudad_nombre}</span>
                  <span>📍 {p.direccion}</span>
                  {p.fecha_estimada&&<span>📅 Entrega estimada: <strong>{p.fecha_estimada}</strong></span>}
                </div>
                <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                  <Btn size="sm" variant="secondary" onClick={()=>setModDet(p)}>👁 Ver Detalle</Btn>
                  <Btn size="sm" variant="success" onClick={()=>{setModFotos(p);setNovedad(false);}}>
                    📸 Registrar Entrega
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
          <h3 style={{color:"#059669",fontWeight:800,margin:"0 0 14px"}}>✅ Entregados ({completados.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {completados.map(p=>(
              <Card key={p.id} style={{borderLeft:"4px solid #059669",opacity:0.85}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontWeight:700,color:"#059669",fontFamily:"monospace"}}>{p.guia_interna||p.id}</div>
                    <div style={{fontSize:13,color:"#64748b"}}>{p.cliente} · {p.ciudad_nombre}</div>
                    <div style={{fontSize:12,color:"#94a3b8"}}>Entregado: {p.fecha_real} {p.novedad&&"· ⚠️ Con Novedad"}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {(p.soportes_data||[]).length>0&&(
                      <Btn size="sm" variant="success" onClick={()=>generarPDFSoportes(p,[])}>
                        📄 Soportes ({p.soportes_data.length})
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

      {/* Modal detalle (solo lectura) */}
      {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={[]}
        onClose={()=>setModDet(null)} setPedidos={()=>{}} showToast={showToast} canEdit={false}/>}

      {/* Modal cargar soportes de entrega */}
      {modFotos&&(
        <Modal title={`📸 Registrar Entrega — ${modFotos.guia_interna||modFotos.id}`} onClose={()=>setModFotos(null)} wide>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Info pedido */}
            <div style={{background:P[50],borderRadius:10,padding:14}}>
              <div style={{fontWeight:700,color:P[800],marginBottom:4}}>{modFotos.cliente}</div>
              <div style={{fontSize:13,color:"#64748b"}}>📍 {modFotos.direccion} · {modFotos.ciudad_nombre}</div>
              <div style={{fontSize:13,color:"#64748b"}}>📋 Factura: {modFotos.factura} · {modFotos.cajas} cajas</div>
            </div>

            {/* Checkbox novedad */}
            <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"12px 16px",cursor:"pointer",border:`2px solid ${novedad?"#dc2626":P[200]}`}}
              onClick={()=>setNovedad(!novedad)}>
              <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {novedad&&<span style={{color:"#fff",fontSize:14,fontWeight:900}}>✓</span>}
              </div>
              <div>
                <div style={{fontWeight:700,color:novedad?"#dc2626":P[800],fontSize:14}}>Entrega con Novedad</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>Marca esto si hubo algún inconveniente en la entrega</div>
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


// ─── GestionPaqueterias ──────────────────────────────────────────────────────

// ─── GestionPromesas ──────────────────────────────────────────────────────────

// ─── FacturasProveedor ────────────────────────────────────────────────────────

function FacturasProveedor({ facturas, transportistas, pedidos, showToast, recargar }) {
  const [modNueva,  setModNueva]  = useState(false);
  const [modDet,    setModDet]    = useState(null);
  const [busq,      setBusq]      = useState("");
  const [guard,     setGuard]     = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const vacio = { numero_factura:"", transportista_id:"", fecha_factura:"", valor_total:"", observaciones:"" };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p => ({...p, [k]: v}));

  // ── Crear factura ──────────────────────────────────────────────────────────
  const crear = async () => {
    if (!form.numero_factura.trim() || !form.transportista_id || !form.fecha_factura || !form.valor_total) {
      showToast("Todos los campos son obligatorios", "error"); return;
    }
    const valor = parseFloat(form.valor_total);
    if (isNaN(valor) || valor <= 0) { showToast("El valor total debe ser un número mayor a 0", "error"); return; }
    setGuard(true);
    try {
      const { data, error } = await supabase.from('facturas_proveedor').insert({
        numero_factura: form.numero_factura.trim(),
        transportista_id: form.transportista_id,
        fecha_factura: form.fecha_factura,
        valor_total: valor,
        observaciones: form.observaciones.trim(),
      }).select().single();
      if (error) { showToast("Error: " + error.message, "error"); setGuard(false); return; }
      showToast("✓ Factura creada · Ahora agrega las guías relacionadas", "success");
      setModNueva(false); setForm(vacio);
      if (recargar) await recargar();
    } catch(e) { showToast("Error de conexión", "error"); }
    setGuard(false);
  };

  // ── Eliminar factura ───────────────────────────────────────────────────────
  const eliminar = async (id, num) => {
    if (!window.confirm(`¿Eliminar factura ${num}? Se eliminarán también las guías relacionadas.`)) return;
    const { error } = await supabase.from('facturas_proveedor').delete().eq('id', id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Factura eliminada", "info");
    if (recargar) await recargar();
  };

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const filtradas = (facturas||[]).filter(fac => {
    const q = busq.toLowerCase();
    if (q) {
      const trans = transportistas.find(t => t.id === fac.transportista_id);
      const matchQ = fac.numero_factura.toLowerCase().includes(q) ||
                     (trans?.nombre||"").toLowerCase().includes(q);
      if (!matchQ) return false;
    }
    if (fechaDesde && fac.fecha_factura < fechaDesde) return false;
    if (fechaHasta && fac.fecha_factura > fechaHasta) return false;
    return true;
  });

  // ── Calcular valor por caja ────────────────────────────────────────────────
  const calcularLineas = (fac) => {
    const guias = fac.factura_guias || [];
    const totalCajas = guias.reduce((a, g) => a + (g.pedidos?.cajas || 0), 0);
    const valorCaja  = totalCajas > 0 ? fac.valor_total / totalCajas : 0;
    return guias.map(g => ({
      ...g,
      cajas:      g.pedidos?.cajas      || 0,
      valorGuia:  totalCajas > 0 ? Math.round(valorCaja * (g.pedidos?.cajas || 0)) : 0,
    }));
  };

  const formatCOP = n => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,fontWeight:900}}>🧾 Facturas de Proveedor</h2>
        <Btn onClick={()=>setModNueva(true)}>+ Nueva Factura</Btn>
      </div>

      <Card style={{padding:14,marginBottom:16}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"flex-end"}}>
          <input value={busq} onChange={e=>setBusq(e.target.value)}
            placeholder="🔍 Buscar por número de factura o transportista..."
            style={{...iSt,flex:1,minWidth:200}}/>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>Desde</label>
              <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)}
                style={{...iSt,width:150}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>Hasta</label>
              <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)}
                style={{...iSt,width:150}}/>
            </div>
            {(fechaDesde||fechaHasta)&&(
              <Btn variant="ghost" size="sm" onClick={()=>{setFechaDesde("");setFechaHasta("");}}>✕ Limpiar</Btn>
            )}
          </div>
        </div>
        {filtradas.length>0&&(
          <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:"#64748b"}}>
              {filtradas.length} factura(s)
              {fechaDesde||fechaHasta
                ? fechaDesde&&fechaHasta?` · ${fechaDesde} al ${fechaHasta}`
                  :fechaDesde?` · desde ${fechaDesde}`
                  :` · hasta ${fechaHasta}`
                : " · todas las fechas"}
            </span>
            <Btn size="sm" variant="success" onClick={()=>{
              // Export all filtered facturas as one CSV
              const lineasTodas = [];
              filtradas.forEach(fac=>{
                const t = transportistas.find(tr=>tr.id===fac.transportista_id);
                const guias = fac.factura_guias||[];
                const totalCaj = guias.reduce((a,g)=>a+(g.pedidos?.cajas||0),0);
                const vCaja = totalCaj>0?fac.valor_total/totalCaj:0;
                guias.forEach(g=>{
                  lineasTodas.push({
                    fac, trans:t,
                    cajas:g.pedidos?.cajas||0,
                    valorGuia:totalCaj>0?Math.round(vCaja*(g.pedidos?.cajas||0)):0,
                    pedidos:g.pedidos,
                    id:g.id,
                  });
                });
              });
              if(lineasTodas.length===0){showToast("Sin guías en el período seleccionado","error");return;}
              const headers=["Fecha Factura","Guia Interna","Transportista","Fecha Despacho","Codigo DANE","Ciudad Destino","N° Factura Proveedor","Cajas","Valor Guia COP","Factura Interna","Pedido Interno"];
              const rows=lineasTodas.map(l=>[
                l.fac.fecha_factura,
                l.pedidos?.guia_interna||"",
                l.trans?.nombre||"",
                l.pedidos?.fecha_creacion||"",
                l.pedidos?.ciudad_codigo||"",
                l.pedidos?.ciudad_nombre||"",
                l.fac.numero_factura,
                l.cajas,
                l.valorGuia,
                l.pedidos?.factura||"",
                l.pedidos?.id||"",
              ]);
              const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");
              a.href=url;
              const rango=fechaDesde&&fechaHasta?`${fechaDesde}_${fechaHasta}`:fechaDesde||fechaHasta||"todos";
              a.download=`Informe_Fletes_${rango}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              showToast(`✓ CSV descargado · ${lineasTodas.length} líneas · ${filtradas.length} factura(s)`,"success");
            }}>
              ⬇ Descargar Informe Consolidado ({filtradas.length} factura(s))
            </Btn>
          </div>
        )}
      </Card>

      {filtradas.length===0&&<Card style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Sin facturas registradas.</Card>}

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtradas.map(fac => {
          const trans = transportistas.find(t => t.id === fac.transportista_id);
          const guias = fac.factura_guias || [];
          const totalCajas = guias.reduce((a,g) => a+(g.pedidos?.cajas||0), 0);
          return (
            <Card key={fac.id} style={{borderLeft:"4px solid #7c3aed"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontFamily:"monospace",fontWeight:900,fontSize:16}}>{fac.numero_factura}</span>
                    <span style={{background:"#f5f3ff",color:"#7c3aed",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
                      {guias.length} guía(s)
                    </span>
                    <span style={{background:"#ecfdf5",color:"#059669",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>
                      {totalCajas} cajas
                    </span>
                  </div>
                  <div style={{fontSize:13,color:"#334155",display:"flex",flexDirection:"column",gap:3}}>
                    <span>🏢 {trans?.nombre||"—"}</span>
                    <span>📅 Fecha: {fac.fecha_factura}</span>
                    <span style={{fontWeight:700,fontSize:15}}>💰 Total: {formatCOP(fac.valor_total)}</span>
                    {totalCajas>0&&<span style={{color:"#64748b",fontSize:12}}>
                      Valor/caja promedio: {formatCOP(Math.round(fac.valor_total/totalCajas))}
                    </span>}
                    {fac.observaciones&&<span style={{color:"#94a3b8",fontSize:12}}>📝 {fac.observaciones}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexDirection:"column"}}>
                  <Btn size="sm" onClick={()=>setModDet(fac)}>✏️ Gestionar Guías</Btn>
                  <Btn size="sm" variant="success" onClick={()=>exportarCSV(fac, calcularLineas(fac), trans, formatCOP)}>⬇ Exportar CSV</Btn>
                  <Btn size="sm" variant="danger" onClick={()=>eliminar(fac.id, fac.numero_factura)}>× Eliminar</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal nueva factura */}
      {modNueva&&(
        <Modal title="Nueva Factura de Proveedor" onClose={()=>{setModNueva(false);setForm(vacio);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="N° Factura del Proveedor *" value={form.numero_factura} onChange={f("numero_factura")} placeholder="FAC-PRO-001"/>
            <Field label="Transportista *" value={form.transportista_id} onChange={f("transportista_id")} as="select"
              options={[{value:"",label:"— Seleccione transportista —"},...(transportistas||[]).map(t=>({value:t.id,label:`${t.nombre} — NIT: ${t.nit}`}))]}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Fecha Factura *" value={form.fecha_factura} onChange={f("fecha_factura")} type="date"/>
              <Field label="Valor Total (COP) *" value={form.valor_total} onChange={f("valor_total")} type="number" placeholder="1500000"/>
            </div>
            <Field label="Observaciones" value={form.observaciones} onChange={f("observaciones")} as="textarea" placeholder="Notas adicionales..."/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn disabled={guard} onClick={crear}>{guard?"Guardando...":"💾 Crear Factura"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal gestionar guías */}
      {modDet&&(
        <ModalFacturaGuias
          factura={modDet}
          pedidos={pedidos}
          transportistas={transportistas}
          showToast={showToast}
          recargar={async()=>{ if(recargar) await recargar(); setModDet(null); }}
          onClose={()=>setModDet(null)}
          formatCOP={formatCOP}
        />
      )}
    </div>
  );
}

// ── Función exportar CSV ──────────────────────────────────────────────────────
function exportarCSV(fac, lineas, trans, formatCOP) {
  const headers = [
    "Fecha Factura","Guia Interna","Transportista","Fecha Despacho",
    "Codigo DANE","Ciudad Destino","N° Factura Proveedor",
    "Cajas","Valor Guia COP","Factura Interna","Pedido Interno"
  ];
  const rows = lineas.map(l => [
    fac.fecha_factura,
    l.pedidos?.guia_interna || "",
    trans?.nombre || "",
    l.pedidos?.fecha_creacion || "",
    l.pedidos?.ciudad_codigo || "",
    l.pedidos?.ciudad_nombre || "",
    fac.numero_factura,
    l.cajas,
    l.valorGuia,
    l.pedidos?.factura || "",
    l.pedidos?.id || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `Factura_${fac.numero_factura}_${fac.fecha_factura}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── ModalFacturaGuias ─────────────────────────────────────────────────────────
function ModalFacturaGuias({ factura, pedidos, transportistas, showToast, recargar, onClose, formatCOP }) {
  const [guiasRel,   setGuiasRel]   = useState(factura.factura_guias || []);
  const [pedidoSel,  setPedidoSel]  = useState("");
  const [guard,      setGuard]      = useState(false);
  const [busqPed,    setBusqPed]    = useState("");

  const trans = transportistas.find(t => t.id === factura.transportista_id);

  // Pedidos disponibles (no ya relacionados, filtrados por transportista via nit_proveedor)
  const pedidosRel   = guiasRel.map(g => g.pedido_id);
  // Solo pedidos del transportista de la factura, ya entregados, no relacionados aún
  const transNit = trans?.nit || "";
  const pedidosFiltrados = pedidos.filter(p => {
    if (pedidosRel.includes(p.id)) return false;
    // Debe ser entregado o con novedad
    if (!["entregado","novedad"].includes(p.estado)) return false;
    // Debe pertenecer al transportista de la factura
    if (transNit && p.nit_proveedor !== transNit) return false;
    if (busqPed) {
      const q = busqPed.toLowerCase();
      return p.id.toLowerCase().includes(q) ||
             (p.guia_interna||"").toLowerCase().includes(q) ||
             (p.factura||"").toLowerCase().includes(q) ||
             (p.cliente||"").toLowerCase().includes(q);
    }
    return true;
  });

  // Calcular valor por guía
  const totalCajas = guiasRel.reduce((a,g) => a+(g.pedidos?.cajas||0), 0);
  const valorCaja  = totalCajas > 0 ? factura.valor_total / totalCajas : 0;

  const agregarGuia = async () => {
    if (!pedidoSel) { showToast("Selecciona un pedido", "error"); return; }
    setGuard(true);
    try {
      const { error } = await supabase.from('factura_guias').insert({
        factura_id: factura.id,
        pedido_id:  pedidoSel,
      });
      if (error) { showToast("Error: " + error.message, "error"); setGuard(false); return; }
      showToast("✓ Guía relacionada", "success");
      setPedidoSel("");
      if (recargar) await recargar();
    } catch(e) { showToast("Error de conexión", "error"); }
    setGuard(false);
  };

  const quitarGuia = async (guiaId) => {
    const { error } = await supabase.from('factura_guias').delete().eq('id', guiaId);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Guía desvinculada", "info");
    if (recargar) await recargar();
  };

  return (
    <Modal title={`Gestionar Guías — ${factura.numero_factura}`} onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* Resumen factura */}
        <div style={{background:"#f5f3ff",borderRadius:12,padding:14,border:"1px solid #ddd6fe"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,fontSize:13}}>
            <span>🏢 <strong>{trans?.nombre||"—"}</strong></span>
            <span>📅 {factura.fecha_factura}</span>
            <span>💰 <strong>{formatCOP(factura.valor_total)}</strong></span>
            <span>📦 {totalCajas} cajas · {guiasRel.length} guía(s)</span>
            {totalCajas>0&&<span>📐 {formatCOP(Math.round(valorCaja))}/caja</span>}
          </div>
        </div>

        {/* Agregar guía */}
        <div style={{background:"#f8fafc",borderRadius:12,padding:14,border:"1px solid #e2e8f0"}}>
          <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>➕ Relacionar Pedido/Guía</div>
          <input value={busqPed} onChange={e=>setBusqPed(e.target.value)}
            placeholder="🔍 Buscar por pedido, guía interna, factura o cliente..."
            style={{...iSt,marginBottom:10}}/>
          <div style={{fontSize:11,color:"#64748b",marginBottom:6,padding:"6px 10px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
            ℹ️ Solo muestra pedidos <strong>entregados</strong> del transportista <strong>{trans?.nombre||"—"}</strong>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <Field label="" value={pedidoSel} onChange={setPedidoSel} as="select"
              style={{flex:1}}
              options={[
                {value:"",label:pedidosFiltrados.length===0?"— Sin pedidos entregados disponibles —":"— Seleccione pedido —"},
                ...pedidosFiltrados.slice(0,50).map(p=>({
                  value:p.id,
                  label:`${p.id} · ${p.guia_interna||"sin guía"} · ${p.cliente} · ${p.cajas} cajas · ${p.fecha_real||""}`
                }))
              ]}/>
            <Btn disabled={guard||!pedidoSel} onClick={agregarGuia}>
              {guard?"...":"+ Agregar"}
            </Btn>
          </div>
        </div>

        {/* Lista guías relacionadas */}
        {guiasRel.length===0&&(
          <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>
            Sin guías relacionadas aún. Agrega pedidos arriba.
          </div>
        )}
        {guiasRel.length>0&&(
          <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead style={{background:"#f8fafc"}}>
                <tr>
                  {["Pedido","Guía Interna","Cliente","Cajas","Valor Guía","Factura Int.","Quitar"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:"#475569",fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guiasRel.map((g,i)=>{
                  const p = g.pedidos;
                  const cajasGuia = p?.cajas||0;
                  const valorGuia = totalCajas>0 ? Math.round(valorCaja*cajasGuia) : 0;
                  return (
                    <tr key={g.id} style={{borderTop:"1px solid #f1f5f9",background:i%2?"#fafafa":"#fff"}}>
                      <td style={{padding:"9px 12px",fontWeight:700,fontFamily:"monospace",fontSize:11}}>{p?.id||"—"}</td>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:"#7c3aed"}}>{p?.guia_interna||"—"}</td>
                      <td style={{padding:"9px 12px",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?.cliente||"—"}</td>
                      <td style={{padding:"9px 12px",textAlign:"center",fontWeight:700}}>{cajasGuia}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:"#059669"}}>{formatCOP(valorGuia)}</td>
                      <td style={{padding:"9px 12px",fontSize:11,color:"#64748b"}}>{p?.factura||"—"}</td>
                      <td style={{padding:"9px 12px"}}>
                        <button onClick={()=>quitarGuia(g.id)}
                          style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:16,padding:0,lineHeight:1}}>×</button>
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{background:"#f5f3ff",fontWeight:700,borderTop:"2px solid #ddd6fe"}}>
                  <td colSpan={3} style={{padding:"9px 12px",textAlign:"right",fontSize:12}}>TOTALES</td>
                  <td style={{padding:"9px 12px",textAlign:"center"}}>{totalCajas}</td>
                  <td style={{padding:"9px 12px",color:"#7c3aed"}}>{formatCOP(factura.valor_total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          {guiasRel.length>0&&(
            <Btn variant="success"
              onClick={()=>exportarCSV(factura, guiasRel.map(g=>({
                ...g,
                cajas:g.pedidos?.cajas||0,
                valorGuia: totalCajas>0?Math.round(valorCaja*(g.pedidos?.cajas||0)):0
              })), trans, formatCOP)}>
              ⬇ Exportar CSV
            </Btn>
          )}
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        </div>
      </div>
    </Modal>
  );
}


function GestionPromesas({ promesas, ciudades, showToast, recargar }) {
  const [editando, setEditando] = useState(null); // ciudad_codigo being edited
  const [diasEdit, setDiasEdit] = useState("");
  const [nueva,    setNueva]    = useState({ ciudad_codigo: "", dias_plazo: "" });
  const [guard,    setGuard]    = useState(false);
  const [busq,     setBusq]     = useState("");

  // Map for quick lookup
  const promMap = Object.fromEntries((promesas||[]).map(p => [p.ciudad_codigo, p.dias_plazo]));

  // Cities without a promise
  const sinPromesa = (ciudades||[]).filter(c => !promMap[c.code]);
  const conPromesa = (ciudades||[]).filter(c => promMap[c.code]).filter(c =>
    !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
  );
  const sinFiltradas = sinPromesa.filter(c =>
    !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
  );

  const guardarNueva = async () => {
    if (!nueva.ciudad_codigo || !nueva.dias_plazo) {
      showToast("Selecciona ciudad y escribe los días", "error"); return;
    }
    const dias = parseInt(nueva.dias_plazo);
    if (isNaN(dias) || dias < 1) { showToast("Los días deben ser un número mayor a 0", "error"); return; }
    setGuard(true);
    const { error } = await supabase.from('promesas_servicio')
      .upsert({ ciudad_codigo: nueva.ciudad_codigo, dias_plazo: dias }, { onConflict: 'ciudad_codigo' });
    if (error) { showToast("Error: " + error.message, "error"); setGuard(false); return; }
    setNueva({ ciudad_codigo: "", dias_plazo: "" });
    showToast("✓ Promesa registrada", "success");
    if (recargar) await recargar();
    setGuard(false);
  };

  const guardarEdit = async (codigo) => {
    const dias = parseInt(diasEdit);
    if (isNaN(dias) || dias < 1) { showToast("Días inválidos", "error"); return; }
    const { error } = await supabase.from('promesas_servicio')
      .update({ dias_plazo: dias }).eq('ciudad_codigo', codigo);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setEditando(null);
    showToast("✓ Promesa actualizada", "success");
    if (recargar) await recargar();
  };

  const eliminar = async (codigo, nombre) => {
    if (!window.confirm(`¿Eliminar promesa de servicio para ${nombre}?`)) return;
    const { error } = await supabase.from('promesas_servicio').delete().eq('ciudad_codigo', codigo);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Promesa eliminada", "info");
    if (recargar) await recargar();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>📅 Promesas de Servicio</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Días hábiles de entrega prometidos por destino. Se usan en el Dashboard para medir cumplimiento.
          </p>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: P[700] }}>
          {conPromesa.length}/{ciudades.length} ciudades configuradas
        </div>
      </div>

      {/* ── Agregar nueva ── */}
      <Card style={{ marginBottom: 20, background: P[50], border: `1px solid ${P[200]}` }}>
        <div style={{ fontWeight: 700, color: P[800], marginBottom: 12, fontSize: 14 }}>➕ Agregar Promesa</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "end" }}>
          <Field label="Ciudad destino" value={nueva.ciudad_codigo} onChange={v => setNueva(p => ({...p, ciudad_codigo: v}))} as="select"
            options={[
              { value: "", label: "— Selecciona ciudad —" },
              ...(ciudades||[]).map(c => ({ value: c.code, label: `${c.name} (${c.code})${promMap[c.code] ? " ✓ " + promMap[c.code] + " días" : ""}` }))
            ]}/>
          <Field label="Días plazo" value={nueva.dias_plazo} onChange={v => setNueva(p => ({...p, dias_plazo: v}))}
            type="number" placeholder="2" style={{ width: 110 }}/>
          <Btn onClick={guardarNueva} disabled={guard} style={{ alignSelf: "end", marginBottom: 0 }}>
            💾 Guardar
          </Btn>
        </div>
      </Card>

      {/* ── Buscador ── */}
      <Card style={{ padding: 12, marginBottom: 16 }}>
        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar ciudad..." style={{ ...{ border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",width:"100%",boxSizing:"border-box" } }}/>
      </Card>

      {/* ── Con promesa ── */}
      {conPromesa.length > 0 && (
        <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#ecfdf5", borderBottom: "1px solid #bbf7d0" }}>
            <span style={{ fontWeight: 700, color: "#059669", fontSize: 13 }}>✅ Con Promesa Configurada ({conPromesa.length})</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: P[50] }}>
                {["Ciudad", "Código DANE", "Días Plazo", "Acciones"].map(h => (
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
                        {promMap[c.code]} día{promMap[c.code] !== 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editando === c.code ? (
                        <>
                          <Btn size="sm" variant="success" onClick={() => guardarEdit(c.code)}>✓ Guardar</Btn>
                          <Btn size="sm" variant="secondary" onClick={() => setEditando(null)}>Cancelar</Btn>
                        </>
                      ) : (
                        <>
                          <Btn size="sm" variant="secondary" onClick={() => { setEditando(c.code); setDiasEdit(String(promMap[c.code])); }}>✏️ Editar</Btn>
                          <Btn size="sm" variant="danger" onClick={() => eliminar(c.code, c.name)}>× Quitar</Btn>
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

      {/* ── Sin promesa ── */}
      {sinFiltradas.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#fef2f2", borderBottom: "1px solid #fca5a5" }}>
            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: 13 }}>⚠️ Sin Promesa Configurada ({sinFiltradas.length})</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 16 }}>
            {sinFiltradas.map(c => (
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
    if (error) { showToast("Error: "+error.message,"error"); return; }
    setNueva("");
    showToast("✓ Empresa de paquetería agregada","success");
    if (recargar) await recargar();
  };
  return (
    <div>
      <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}>📦 Empresas de Paquetería</h2>
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
            <span style={{fontWeight:600,color:"#334155"}}>📦 {p}</span>
            <button onClick={async ()=>{const{error}=await supabase.from('paqueterias').delete().eq('nombre',p); if(!error){showToast('Eliminado','info'); if(recargar) await recargar();}}}
              style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:18,padding:0,lineHeight:1}}>×</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ModuloDevoluciones ───────────────────────────────────────────────────────

function ModuloDevoluciones({ devoluciones, conductores, ciudades, transportistas, showToast, user, recargar }) {
  const [modNueva, setModNueva] = useState(false);
  const [modDet,   setModDet]   = useState(null);
  const [busq,     setBusq]     = useState("");
  const fileRef = useRef(null);

  const vacio = {
    factura:"", pedido_ref:"", unidades:"", volumen_m3:"", peso_kg:"",
    dir_recogida:"", ciudad_codigo:"", motivo:"",
    tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
    soporte_data:null, soporte_nombre:"",
  };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

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
    const cond = form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
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
    if (devErr) { showToast("Error: "+devErr.message,"error"); return; }
    setModNueva(false); setForm(vacio);
    showToast(`✓ Devolución creada · Guía: ${guia}`,"success");
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

  const marcarEntregado = async (id, novedad) => {
    const hoy = new Date().toISOString().split("T")[0];
    const cambios = { estado:novedad?"novedad":"entregado", fecha_real:hoy, novedad };
    await supabase.from('devoluciones').update(cambios).eq('id',id);
    if (recargar) await recargar();
  };

  const esCliente = user.rol==="cliente";
  const filtradas = devoluciones.filter(d=>{
    if (esCliente && d.solicitado_por !== (user.nombre||user.user)) return false;
    const q=busq.toLowerCase();
    return !busq||d.guia.toLowerCase().includes(q)||d.factura.toLowerCase().includes(q)||d.pedido_ref.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:"#dc2626",fontWeight:900}}>↩️ Devoluciones</h2>
        <Btn onClick={()=>setModNueva(true)}>+ Nueva Devolución</Btn>
      </div>
      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)}
          placeholder="🔍 Buscar por guía, factura o pedido..." style={iSt}/>
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
                  {d.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
                </div>
                <div style={{fontSize:13,color:"#64748b"}}>Factura: <strong>{d.factura}</strong> · Pedido: <strong>{d.pedido_ref}</strong> · {d.unidades} uds · {d.ciudad_nombre}</div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>Motivo: {d.motivo}</div>
                {d.paqueteria&&<div style={{fontSize:12,color:"#0891b2"}}>📦 {d.paqueteria} — {d.guia_paqueteria}</div>}
                {d.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>✅ Completado: {d.fecha_real}</div>}
                {d.soporte_data&&(
                  <Btn size="sm" variant="success" style={{marginTop:8}}
                    onClick={()=>window.open(d.soporte_data?.startsWith("data:")?d.soporte_data:"data:application/octet-stream;base64,"+d.soporte_data,"_blank")}>
                    📎 Ver Soporte
                  </Btn>
                )}
              </div>
              {!esCliente&&<Btn size="sm" variant="secondary" onClick={()=>setModDet(d)}>Gestionar</Btn>}
            </div>
          </Card>
        ))}
      </div>
      {modNueva&&(
        <Modal title="Nueva Solicitud de Devolución" onClose={()=>{setModNueva(false);setForm(vacio);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fef2f2",borderRadius:10,padding:10,fontSize:12,color:"#dc2626",fontWeight:600}}>
              Se generará automáticamente una Guía (DV-{new Date().getFullYear()}-XXXX).
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="N° Factura *" value={form.factura} onChange={f("factura")} placeholder="FAC-2200"/>
              <Field label="N° Pedido Ref. *" value={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Field label="Unidades *" value={form.unidades} onChange={f("unidades")} type="number" placeholder="5"/>
              <Field label="Volumen m³ *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
              <Field label="Peso kg *" value={form.peso_kg} onChange={f("peso_kg")} type="number" placeholder="10"/>
            </div>
            <Field label="Dirección de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
            <Field label="Ciudad de Recogida *" value={form.ciudad_codigo} onChange={f("ciudad_codigo")} as="select"
              options={[{value:"",label:"— Seleccione —"},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
            <Field label="Motivo *" value={form.motivo} onChange={f("motivo")} as="textarea" placeholder="Describe el motivo de la devolución..."/>
            <Field label="Tipo de Envío" value={form.tipo_envio||"conductor"} onChange={f("tipo_envio")} as="select"
              options={[{value:"conductor",label:"🚗 Conductor Propio"},{value:"empresa_transporte",label:"🏢 Empresa Transportista"},{value:"mensajeria",label:"📨 Mensajería"},{value:"paqueteria",label:"📦 Paquetería Tercero"}]}/>
            {(form.tipo_envio||"conductor")==="paqueteria"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Empresa Paquetería" value={form.paqueteria||""} onChange={f("paqueteria")} placeholder="Servientrega, TCC..."/>
                <Field label="N° Guía" value={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-"/>
              </div>
            )}
            {((form.tipo_envio||"conductor")!=="paqueteria")&&(
              <Field label="Conductor (opcional)" value={form.conductor_id}
                onChange={v=>{
                  f("conductor_id")(v);
                  const c=conductores.find(cx=>String(cx.id)===String(v));
                  if(c&&form.tipo_envio==="empresa_transporte") f("paqueteria")(c.empresa||"");
                }} as="select"
                options={[
                  {value:"",label:"— Sin asignar —"},
                  ...((form.tipo_envio||"conductor")==="empresa_transporte"
                    ? conductores.filter(c=>c.empresa||c.nit_proveedor)
                    : conductores
                  ).map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}${c.empresa?" — "+c.empresa:""}`}))
                ]}/>
            )}
            <div style={{border:`1px dashed ${P[300]}`,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer"}}
              onClick={()=>fileRef.current&&fileRef.current.click()}>
              {form.soporte_nombre?<span style={{color:"#059669",fontWeight:700}}>✓ {form.soporte_nombre}</span>:<span style={{color:P[600]}}>📎 Adjuntar soporte (opcional)</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn onClick={crear}>💾 Registrar Devolución</Btn>
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
  const [condId,  setCondId]  = useState(dev.conductor_id||"");
  const [novedad, setNovedad] = useState(dev.novedad||false);
  const ciudad = ciudades.find(c=>c.code===dev.ciudad_codigo);
  const cond   = conductores.find(c=>String(c.id)===String(condId||dev.conductor_id||""));

  const guardar = async () => {
    await onAsignar(dev.id, condId, novedad);
    showToast("✓ Devolución actualizada","success");
    onClose();
  };
  const marcar = () => {
    onEntregado(dev.id, novedad);
    showToast(novedad?"✓ Marcada con novedad":"✓ Recogida completada","success");
    onClose();
  };

  return (
    <Modal title={`Devolución ${dev.guia}`} onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:"#fef2f2",borderRadius:12,padding:16,border:"1px solid #fca5a5"}}>
          <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>↩️ {dev.guia}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
            <span>📋 Factura: <strong>{dev.factura}</strong></span>
            <span>📦 Pedido: <strong>{dev.pedido_ref}</strong></span>
            <span>🔢 Unidades: <strong>{dev.unidades}</strong></span>
            <span>⚖️ Peso: <strong>{dev.peso_kg} kg</strong></span>
            <span>🏙️ {dev.ciudad_nombre}</span>
            <span>📍 {dev.dir_recogida}</span>
          </div>
          <div style={{marginTop:8,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:13,color:"#92400e"}}>
            📝 Motivo: {dev.motivo}
          </div>
          {dev.soporte_data&&(
            <Btn size="sm" variant="success" style={{marginTop:10}}
              onClick={()=>window.open(dev.soporte_data?.startsWith("data:")?dev.soporte_data:"data:application/octet-stream;base64,"+dev.soporte_data,"_blank")}>
              📎 Ver Soporte
            </Btn>
          )}
        </div>
        <Badge estado={dev.estado}/>
        {canEdit&&dev.estado!=="entregado"&&dev.estado!=="novedad"&&(
          <>
            {!dev.paqueteria&&(
              <Field label="Asignar Conductor" value={condId} onChange={setCondId} as="select"
                options={[{value:"",label:"Sin asignar"},...conductores.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}`}))]}/>
            )}
            <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
              onClick={()=>setNovedad(!novedad)}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad</span>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
              {!dev.paqueteria&&<Btn onClick={guardar}>💾 Guardar Conductor</Btn>}
              <Btn variant="success" onClick={marcar}>✅ Marcar Recogida Completada</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── ModuloRecogidas ──────────────────────────────────────────────────────────

function ModuloRecogidas({ recogidas, conductores, ciudades, transportistas, showToast, user, recargar }) {
  const [modNueva, setModNueva] = useState(false);
  const [modDet,   setModDet]   = useState(null);
  const [busq,     setBusq]     = useState("");
  const fileRef = useRef(null);

  const vacio = {
    dir_recogida:"", ciudad_recogida_cod:"", dir_entrega:"", ciudad_entrega_cod:"",
    unidades:"", volumen_m3:"", peso_kg:"", observaciones:"",
    tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
    doc_data:null, doc_nombre:"",
  };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

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
    const cond = form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
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
    if (recErr) { showToast("Error: "+recErr.message,"error"); return; }
    setModNueva(false); setForm(vacio);
    showToast(`✓ Recogida creada · Guía: ${guia}`,"success");
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

  const marcarEntregado = async (id, novedad) => {
    const hoy = new Date().toISOString().split("T")[0];
    const cambios = { estado:novedad?"novedad":"entregado", fecha_real:hoy, novedad };
    await supabase.from('recogidas').update(cambios).eq('id',id);
    if (recargar) await recargar();
  };

  const esCliente = user.rol==="cliente";
  const filtradas = recogidas.filter(r=>{
    if (esCliente && r.solicitado_por !== (user.nombre||user.user)) return false;
    const q=busq.toLowerCase();
    return !busq||r.guia.toLowerCase().includes(q)||(r.ciudad_recogida_nombre||"").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:"#0891b2",fontWeight:900}}>🔄 Recogidas</h2>
        <Btn onClick={()=>setModNueva(true)}>+ Nueva Recogida</Btn>
      </div>
      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)}
          placeholder="🔍 Buscar por guía o ciudad..." style={iSt}/>
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
                  {r.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
                </div>
                <div style={{fontSize:13,color:"#64748b"}}>
                  📍 Recogida: {r.ciudad_recogida_nombre} · Entrega: {r.ciudad_entrega_nombre}
                </div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{r.unidades} uds · {r.volumen_m3} m³ · {r.peso_kg} kg</div>
                {r.paqueteria&&<div style={{fontSize:12,color:"#0891b2"}}>📦 {r.paqueteria} — {r.guia_paqueteria}</div>}
                {r.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>✅ Completado: {r.fecha_real}</div>}
                {r.doc_data&&(
                  <Btn size="sm" variant="success" style={{marginTop:8}}
                    onClick={()=>window.open(r.doc_data?.startsWith("data:")?r.doc_data:"data:application/octet-stream;base64,"+r.doc_data,"_blank")}>
                    📎 Ver Documento
                  </Btn>
                )}
              </div>
              {!esCliente&&<Btn size="sm" variant="secondary" onClick={()=>setModDet(r)}>Gestionar</Btn>}
            </div>
          </Card>
        ))}
      </div>
      {modNueva&&(
        <Modal title="Nueva Solicitud de Recogida" onClose={()=>{setModNueva(false);setForm(vacio);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Dirección de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
              <Field label="Ciudad de Recogida *" value={form.ciudad_recogida_cod} onChange={f("ciudad_recogida_cod")} as="select"
                options={[{value:"",label:"— Seleccione —"},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Dirección de Entrega *" value={form.dir_entrega} onChange={f("dir_entrega")} placeholder="Av El Poblado #43A-15"/>
              <Field label="Ciudad de Entrega *" value={form.ciudad_entrega_cod} onChange={f("ciudad_entrega_cod")} as="select"
                options={[{value:"",label:"— Seleccione —"},...(ciudades||[]).map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Field label="Unidades *" value={form.unidades} onChange={f("unidades")} type="number" placeholder="5"/>
              <Field label="Volumen m³ *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
              <Field label="Peso kg *" value={form.peso_kg} onChange={f("peso_kg")} type="number" placeholder="10"/>
            </div>
            <Field label="Observaciones" value={form.observaciones} onChange={f("observaciones")} as="textarea" placeholder="Instrucciones especiales..."/>
            <Field label="Tipo de Envío" value={form.tipo_envio||"conductor"} onChange={f("tipo_envio")} as="select"
              options={[{value:"conductor",label:"🚗 Conductor Propio"},{value:"empresa_transporte",label:"🏢 Empresa Transportista"},{value:"mensajeria",label:"📨 Mensajería"},{value:"paqueteria",label:"📦 Paquetería Tercero"}]}/>
            {(form.tipo_envio||"conductor")==="paqueteria"?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Empresa Paquetería" value={form.paqueteria||""} onChange={f("paqueteria")} placeholder="Servientrega..."/>
                <Field label="N° Guía" value={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-"/>
              </div>
            ):(
              <Field label="Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
                options={[{value:"",label:"— Sin asignar —"},...conductores.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}`}))]}/>
            )}
            <div style={{border:`1px dashed ${P[300]}`,borderRadius:10,padding:14,textAlign:"center",cursor:"pointer"}}
              onClick={()=>fileRef.current&&fileRef.current.click()}>
              {form.doc_nombre?<span style={{color:"#059669",fontWeight:700}}>✓ {form.doc_nombre}</span>:<span style={{color:P[600]}}>📎 Adjuntar documento (opcional)</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn onClick={crear}>💾 Registrar Recogida</Btn>
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
  const [condId,  setCondId]  = useState(rec.conductor_id||"");
  const [novedad, setNovedad] = useState(rec.novedad||false);
  const cond = conductores.find(c=>String(c.id)===String(condId||rec.conductor_id||""));

  const guardar = async () => {
    await onAsignar(rec.id, condId, novedad);
    showToast("✓ Recogida actualizada","success");
    onClose();
  };
  const marcar = () => {
    onEntregado(rec.id, novedad);
    showToast(novedad?"✓ Marcada con novedad":"✓ Recogida completada","success");
    onClose();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"#ecfeff",borderRadius:12,padding:16,border:"1px solid #67e8f9"}}>
        <div style={{fontWeight:800,fontSize:15,color:"#0891b2",marginBottom:8}}>🔄 {rec.guia}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
          <span>📍 Recogida: {rec.ciudad_recogida_nombre}</span>
          <span>🏁 Entrega: {rec.ciudad_entrega_nombre}</span>
          <span>🔢 {rec.unidades} uds · {rec.peso_kg} kg</span>
        </div>
        {rec.doc_data&&(
          <Btn size="sm" variant="success" style={{marginTop:10}}
            onClick={()=>window.open(rec.doc_data?.startsWith("data:")?rec.doc_data:"data:application/octet-stream;base64,"+rec.doc_data,"_blank")}>
            📎 Ver Documento
          </Btn>
        )}
      </div>
      <Badge estado={rec.estado}/>
      {canEdit&&rec.estado!=="entregado"&&rec.estado!=="novedad"&&(
        <>
          {!rec.paqueteria&&(
            <Field label="Asignar Conductor" value={condId} onChange={setCondId} as="select"
              options={[{value:"",label:"Sin asignar"},...conductores.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}`}))]}/>
          )}
          <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
            onClick={()=>setNovedad(!novedad)}>
            <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {novedad&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad</span>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
            {!rec.paqueteria&&<Btn onClick={guardar}>💾 Guardar Conductor</Btn>}
            <Btn variant="success" onClick={marcar}>✅ Marcar Recogida Completada</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ModuloPQRS ───────────────────────────────────────────────────────────────

function ModuloPQRS({ pqrs, pedidos, showToast, user, recargar }) {
  const MOTIVOS = [
    "Entrega tardía — fuera de tiempo estimado",
    "Mercancía averiada o dañada en tránsito",
    "Entrega incompleta — faltan unidades",
    "Entrega en dirección incorrecta",
    "Mercancía no recibida — sin soporte de entrega",
    "Conductor no se presentó al punto de entrega",
    "Mala manipulación de la mercancía",
    "Embalaje inadecuado en origen",
    "Error en la factura asociada al pedido",
    "Retraso en la asignación del conductor",
    "Cambio de conductor sin previo aviso",
    "Vehículo en mal estado o inapropiado",
    "Pedido cancelado pero ya fue despachado",
    "Doble cobro o cobro incorrecto de flete",
    "Soporte de entrega ilegible o incompleto",
    "Sin comunicación del conductor durante el tránsito",
    "Novedad no reportada oportunamente",
    "Devolución no gestionada a tiempo",
    "Incumplimiento de condiciones de temperatura / cadena de frío",
    "Otro motivo logístico",
  ];
  const ESTADOS_PQRS = {
    abierta:    { label:"Abierta",    color:"#dc2626", bg:"#fef2f2" },
    en_gestion: { label:"En Gestión", color:"#d97706", bg:"#fffbeb" },
    cerrada:    { label:"Cerrada",    color:"#059669", bg:"#ecfdf5" },
    rechazada:  { label:"Rechazada",  color:"#64748b", bg:"#f1f5f9" },
  };
  const [modNueva,   setModNueva]   = useState(false);
  const [modGestion, setModGestion] = useState(null);
  const [busq,       setBusq]       = useState("");
  const [filtroEst,  setFiltroEst]  = useState("todos");
  const [gestion,    setGestion]    = useState("");
  const vacio = { factura:"", pedido_ref:"", motivo:"", descripcion:"" };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const crear = async () => {
    if (!form.factura.trim()||!form.pedido_ref.trim()||!form.motivo||!form.descripcion.trim()) {
      showToast("Todos los campos son obligatorios","error"); return;
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
    if (error) { showToast("Error: "+error.message,"error"); return; }
    setModNueva(false); setForm(vacio);
    showToast(`✓ PQRS creada · Caso: ${nueva.id}`,"success");
    if (recargar) await recargar();
  };

  const guardarGestion = async () => {
    if (!gestion.trim()) { showToast("Escribe una respuesta de gestión","error"); return; }
    const cambios = { respuesta:gestion, gestionado_por:user.nombre||user.user,
      fecha_gestion:new Date().toISOString().split("T")[0], estado:"en_gestion" };
    const { error } = await supabase.from('pqrs').update(cambios).eq('id', modGestion.id);
    if (error) { showToast("Error: "+error.message,"error"); return; }
    setModGestion(null); setGestion("");
    showToast("✓ Gestión registrada","success");
    if (recargar) await recargar();
  };

  const cerrar = async (id, estado) => {
    const { error } = await supabase.from('pqrs').update({estado}).eq('id', id);
    if (error) { showToast("Error: "+error.message,"error"); return; }
    showToast(`Caso ${estado==="cerrada"?"cerrado":"rechazado"}`,"success");
    if (recargar) await recargar();
  };

  const filt = pqrs.filter(p=>{
    const q=busq.toLowerCase();
    const okB=!busq||p.id.toLowerCase().includes(q)||p.factura.toLowerCase().includes(q)||p.pedido_ref.toLowerCase().includes(q)||p.motivo.toLowerCase().includes(q);
    const okE=filtroEst==="todos"||p.estado===filtroEst;
    return okB&&okE;
  });
  const esCliente = user.rol==="cliente";
  const esOperador = user.rol==="admin"||user.rol==="operador";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>📋 PQRS — Peticiones, Quejas y Reclamos</h2>
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
            placeholder="🔍 Buscar por caso, factura, pedido o motivo..." style={{...iSt,flex:1,minWidth:200}}/>
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
          return (
            <Card key={p.id} style={{borderLeft:`4px solid ${est.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"monospace",fontWeight:900,color:P[700],fontSize:15}}>{p.id}</span>
                    <span style={{background:est.bg,color:est.color,border:`1px solid ${est.color}40`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{est.label}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6,fontSize:13,color:"#64748b",marginBottom:8}}>
                    <span>📋 Factura: <strong>{p.factura}</strong></span>
                    <span>📦 Pedido: <strong>{p.pedido_ref}</strong></span>
                    <span>📅 {p.fecha_creacion}</span>
                    <span>👤 {p.solicitado_por}</span>
                  </div>
                  <div style={{background:"#f8fafc",borderRadius:8,padding:"8px 12px",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:P[700],marginBottom:4}}>Motivo: {p.motivo}</div>
                    <div style={{fontSize:13,color:"#334155"}}>{p.descripcion}</div>
                  </div>
                  {p.respuesta&&(
                    <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 12px",border:"1px solid #86efac"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#059669",marginBottom:4}}>✅ Gestión — {p.gestionado_por} · {p.fecha_gestion}</div>
                      <div style={{fontSize:13,color:"#334155"}}>{p.respuesta}</div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:130}}>
                  {esOperador&&p.estado!=="cerrada"&&p.estado!=="rechazada"&&(
                    <Btn size="sm" onClick={()=>{setModGestion(p);setGestion(p.respuesta||"");}}>✏️ Gestionar</Btn>
                  )}
                  {esOperador&&p.estado==="en_gestion"&&(
                    <>
                      <Btn size="sm" variant="success" onClick={()=>cerrar(p.id,"cerrada")}>✓ Cerrar</Btn>
                      <Btn size="sm" variant="danger"  onClick={()=>cerrar(p.id,"rechazada")}>× Rechazar</Btn>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modNueva&&(
        <Modal title="Nueva PQRS" onClose={()=>{setModNueva(false);setForm(vacio);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fffbeb",borderRadius:10,padding:10,fontSize:12,color:"#92400e",fontWeight:600}}>
              Se generará automáticamente un número de caso PQRS-{new Date().getFullYear()}-XXXX.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="N° Factura *"     value={form.factura}    onChange={f("factura")}    placeholder="FAC-2200"/>
              <Field label="N° Pedido Ref. *" value={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001"/>
            </div>
            <Field label="Motivo *" value={form.motivo} onChange={f("motivo")} as="select"
              options={[{value:"",label:"— Seleccione el motivo —"},...MOTIVOS.map(m=>({value:m,label:m}))]}/>
            <Field label="Descripción detallada *" value={form.descripcion} onChange={f("descripcion")} as="textarea"
              placeholder="Describe con detalle la situación, fecha del evento, personas involucradas..."/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn onClick={crear}>💾 Radicar PQRS</Btn>
            </div>
          </div>
        </Modal>
      )}
      {modGestion&&(
        <Modal title={`Gestionar PQRS — ${modGestion.id}`} onClose={()=>setModGestion(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#f8fafc",borderRadius:10,padding:14}}>
              <div style={{fontWeight:700,color:P[800],marginBottom:6}}>Motivo: {modGestion.motivo}</div>
              <div style={{fontSize:13,color:"#334155"}}>{modGestion.descripcion}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:6}}>Factura: {modGestion.factura} · Pedido: {modGestion.pedido_ref} · Por: {modGestion.solicitado_por}</div>
            </div>
            <Field label="Respuesta / Gestión realizada *" value={gestion} onChange={setGestion} as="textarea"
              placeholder="Describe las acciones tomadas, compensaciones, compromisos..."/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModGestion(null)}>Cancelar</Btn>
              <Btn onClick={guardarGestion}>💾 Registrar Gestión</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─── SidebarApp ──────────────────────────────────────────────────────────────

function SidebarApp({ user, activeTab, setActiveTab, onLogout, collapsed, setCollapsed, pqrs = [] }) {
  const MENUS = {
    admin:        [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["transportistas","🏢","Transportistas"],["resumen","📋","Resumen Transportador"],["devoluciones","↩️","Devoluciones"],["recogidas","🔄","Recogidas"],["pqrs","📋","PQRS"],["ciudades","🏙️","Ciudades / DANE"],["paqueterias","📦","Paqueterías"],["promesas","📅","Promesas de Servicio"],["facturas","🧾","Facturas Proveedor"],["usuarios","👥","Usuarios"]],
    operador:     [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["resumen","📋","Resumen Transportador"],["devoluciones","↩️","Devoluciones"],["recogidas","🔄","Recogidas"],["pqrs","📋","PQRS"],["promesas","📅","Promesas de Servicio"]],
    transportista:[["mi_empresa","🏢","Mi Empresa"]],
    conductor:    [["mis_pedidos","📦","Mis Pedidos"],["mi_ubicacion","📍","Mi Ubicación GPS"]],
    cliente:      [["consultas","🔍","Estado Pedidos"],["devoluciones","↩️","Mis Devoluciones"],["recogidas","🔄","Mis Recogidas"],["pqrs","📋","PQRS"],["facturas","🧾","Facturas Proveedor"]],
  };
  const items = MENUS[user.rol] || [];
  const w = collapsed ? 64 : 210;
  return (
    <div style={{ width:w, minHeight:"100vh", background:`linear-gradient(180deg,${P[950]},${P[800]})`, display:"flex", flexDirection:"column", transition:"width .2s", flexShrink:0, position:"relative", zIndex:10 }}>
      <div style={{ padding: collapsed?"14px 10px":"18px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${P[700]}40` }}>
        <Logo size={collapsed?36:42}/>
        {!collapsed&&<div><div style={{color:"#fff",fontWeight:900,fontSize:14,lineHeight:1}}>Somos PRO</div><div style={{color:P[300],fontSize:10}}>Tracking</div></div>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{marginLeft:"auto",background:"none",border:"none",color:P[300],cursor:"pointer",fontSize:16,padding:2,lineHeight:1}}>
          {collapsed?"›":"‹"}
        </button>
      </div>
      {!collapsed&&(
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${P[700]}40`}}>
          <div style={{width:36,height:36,borderRadius:18,background:`linear-gradient(135deg,${P[500]},${P[400]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:16,marginBottom:6}}>
            {user.nombre?.[0]?.toUpperCase()||"U"}
          </div>
          <div style={{color:"#fff",fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nombre}</div>
          <div style={{color:P[300],fontSize:11}}>{ROLES[user.rol]||user.rol}</div>
        </div>
      )}
      <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
        {items.map(([id,icon,label])=>{
          const active = activeTab===id;
          const badgeCount = id==="pqrs" ? (pqrs||[]).filter(p=>p.estado==="abierta").length : 0;
          return (
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"12px":"10px 16px",background:active?`${P[600]}40`:"transparent",border:"none",cursor:"pointer",color:active?"#fff":P[300],fontWeight:active?700:400,fontSize:13,transition:"all .15s",textAlign:"left",borderLeft:active?`3px solid ${P[400]}`:"3px solid transparent"}}>
              <span style={{fontSize:18,flexShrink:0,position:"relative"}}>
                {icon}
                {badgeCount>0&&<span style={{position:"absolute",top:-5,right:-7,background:"#dc2626",color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{badgeCount>9?"9+":badgeCount}</span>}
              </span>
              {!collapsed&&<span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{label}</span>}
              {!collapsed&&badgeCount>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:12,padding:"1px 7px",fontSize:10,fontWeight:900,flexShrink:0}}>{badgeCount}</span>}
            </button>
          );
        })}
      </nav>
      <button onClick={onLogout}
        style={{margin:"8px",padding:"10px",background:`${P[700]}50`,border:`1px solid ${P[600]}`,borderRadius:8,color:P[200],cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
        <span>🚪</span>{!collapsed&&"Cerrar Sesión"}
      </button>
    </div>
  );
}

// ─── MiUbicacion ─────────────────────────────────────────────────────────────

function MiUbicacion({ user }) {
  const [lat, setLat] = useState(window._gpsLat || null);
  const [lng, setLng] = useState(window._gpsLng || null);
  const [on,  setOn]  = useState(window._gpsOn  || false);
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
      <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}>📍 Mi Ubicación GPS</h2>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{flex:1,fontSize:14}}>
            {lat&&lng?<><strong>Lat:</strong> {lat.toFixed(6)} · <strong>Lng:</strong> {lng.toFixed(6)}</>:<span style={{color:"#94a3b8"}}>Presiona el botón para activar tu GPS</span>}
            {on&&<span style={{marginLeft:12,color:"#059669",fontWeight:700,fontSize:12}}>● Compartiendo</span>}
          </div>
          <Btn variant={on?"danger":"success"} onClick={on?detener:iniciar}>{on?"⏸ Detener GPS":"▶ Activar GPS"}</Btn>
        </div>
        {err&&<p style={{color:"#dc2626",fontSize:13,margin:"10px 0 0"}}>⚠️ {err}</p>}
      </Card>
      <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${P[200]}`}}>
        <iframe title="mi-ubicacion" src={mapUrl} width="100%" height="360" style={{border:"none",display:"block"}} allowFullScreen loading="lazy"/>
      </div>
    </div>
  );
}

// ─── Consultas (cliente interno) ─────────────────────────────────────────────

function Consultas({ pedidos, conductores, ciudades, devoluciones=[], recogidas=[], showToast }) {
  // Poll GPS data every 10s
  const [gpsTick, setGpsTick] = useState(0);
  useEffect(() => { const t = setInterval(()=>setGpsTick(n=>n+1), 10000); return ()=>clearInterval(t); }, []);
  const [busq,    setBusq]    = useState("");
  const [modMapa, setModMapa] = useState(null);

  const filtP = pedidos.filter(p => {
    const q = busq.toLowerCase();
    return !busq || p.id.toLowerCase().includes(q) || (p.cliente||"").toLowerCase().includes(q) || (p.factura||"").toLowerCase().includes(q) || (p.ciudad_nombre||"").toLowerCase().includes(q) || (p.guia_interna||"").toLowerCase().includes(q);
  });

  return (
    <div>
      <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}>🔍 Estado de Pedidos</h2>
      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)}
          placeholder="🔍 Buscar por N° pedido, guía, factura, cliente o ciudad..." style={iSt}/>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtP.length===0&&<p style={{color:"#94a3b8",textAlign:"center",padding:32}}>Sin resultados.</p>}
        {filtP.map(p=>{
          const cond   = conductores.find(c=>String(c.id)===String(p.conductor_id));
          const ciudad = (ciudades||[]).find(c=>c.code===p.ciudad_codigo);
          return (
            <Card key={p.id} style={{padding:18,borderLeft:`4px solid ${ESTADOS_PEDIDO[p.estado]?.color||P[300]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div>
                  {p.guia_interna&&<div style={{fontFamily:"monospace",fontWeight:900,color:P[600],fontSize:15}}>{p.guia_interna}</div>}
                  <div style={{fontWeight:800,color:P[800],fontSize:14}}>{p.id} <span style={{fontWeight:400,color:"#64748b",fontSize:12}}>· Factura: {p.factura}</span></div>
                </div>
                <Badge estado={p.estado}/>
              </div>
              <div style={{fontWeight:600,color:"#1e293b",marginBottom:6}}>{p.cliente}</div>
              <div style={{fontSize:13,color:"#64748b",display:"flex",flexDirection:"column",gap:3}}>
                <span>🗃️ {p.cajas} cajas · 🏙️ {p.ciudad_nombre} · 📍 {p.direccion}</span>
                <span>
                  {p.tipo==="paqueteria"?`📦 ${p.paqueteria} — ${p.guia_paqueteria}`:cond?`🚗 ${cond.nombre} · ${p.placa}`:"Sin conductor asignado"}
                  {" · "}📅 Est: {p.fecha_estimada||"—"}
                  {p.fecha_real&&<span style={{color:"#059669"}}> · ✅ Entregado: {p.fecha_real}</span>}
                </span>
                {p.novedad&&<span style={{color:"#dc2626",fontWeight:700}}>⚠️ Entregado con Novedad</span>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                {(p.soportes_data||[]).length>0&&(
                  <Btn size="sm" variant="success" onClick={()=>generarPDFSoportes(p,[])}>📄 Ver Soportes ({p.soportes_data.length})</Btn>
                )}
                <Btn size="sm" variant="secondary" onClick={()=>setModMapa(modMapa?.id===p.id?null:p)}>
                  {modMapa?.id===p.id?"🗺️ Ocultar Mapa":"🗺️ Rastreo"}
                </Btn>
              </div>
              {modMapa?.id===p.id&&(()=>{
                const gps = p.conductor_id && window._gpsData && window._gpsData[String(p.conductor_id)];
                const gpsReciente = gps && (Date.now()-gps.ts) < 300000; // 5 min
                const entregado = ["entregado","novedad"].includes(p.estado);
                if (entregado) return (
                  <div style={{marginTop:12,background:"#ecfdf5",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#059669",fontWeight:700}}>
                    ✅ Pedido entregado — rastreo GPS no disponible
                  </div>
                );
                const mapSrc = gpsReciente
                  ? `https://maps.google.com/maps?q=${gps.lat},${gps.lng}&output=embed&z=15`
                  : `https://maps.google.com/maps?q=${encodeURIComponent((p.direccion||"")+", "+(ciudad?.name||p.ciudad_nombre||"")+", Colombia")}&output=embed&z=15`;
                return (
                  <div style={{marginTop:14,borderRadius:12,overflow:"hidden",border:`2px solid ${gpsReciente?P[400]:P[200]}`}}>
                    {gpsReciente&&<div style={{background:P[600],color:"#fff",padding:"6px 14px",fontSize:12,fontWeight:700}}>📡 GPS en Vivo — Última actualización hace {Math.round((Date.now()-gps.ts)/60000)} min</div>}
                    <iframe title={"mapa-"+p.id} width="100%" height="280" style={{border:"none",display:"block"}}
                      src={mapSrc} allowFullScreen loading="lazy"/>
                    <div style={{background:P[50],padding:"8px 14px",fontSize:12,color:P[700]}}>
                      {gpsReciente ? `📡 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : `📍 ${p.direccion}, ${ciudad?.name}`}
                      {cond&&<span style={{marginLeft:12}}>🚗 {cond.nombre} · {p.placa}</span>}
                      {!gpsReciente&&<span style={{marginLeft:8,color:"#94a3b8"}}>(GPS no activo — mostrando destino)</span>}
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


function Login({ onLogin, usuarios }) {
  const [u,   setU]   = useState("");
  const [p,   setP]   = useState("");
  const [err, setErr] = useState("");

  const login = async (e) => {
    e.preventDefault();
    setErr("");
    setCargando(true);
    // Buscar en la lista de usuarios ya cargada desde Supabase
    const found = usuarios.find(x => x.user === u.trim() && x.pass === p);
    if (found) { setCargando(false); onLogin(found); }
    else { setCargando(false); setErr("Usuario o contraseña incorrectos."); }
  };
  const [cargando, setCargando] = useState(false);

  const demos = [
    { l: "👑 Admin",        u: "admin",   p: "1039456779" },
    { l: "⚙️ Operador",     u: "operador",p: "op123" },
    { l: "🏢 Transportista",u: "veloz",   p: "trans123" },
    { l: "🚗 Conductor",    u: "driver1", p: "cond123" },
    { l: "📦 Cliente",      u: "cliente", p: "cli123" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,${P[950]} 0%,${P[700]} 55%,${P[500]} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: `radial-gradient(circle at 15% 85%,${P[800]}60 0%,transparent 50%),radial-gradient(circle at 85% 15%,${P[400]}30 0%,transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", marginBottom: 16, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.3))" }}><Logo size={90} /></div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>Somos PRO Tracking</h1>
          <p style={{ color: P[300], fontSize: 14, margin: 0 }}>Sistema de Gestión de Transporte</p>
        </div>
        <Card style={{ boxShadow: `0 28px 64px ${P[950]}80` }}>
          <h2 style={{ margin: "0 0 22px", fontSize: 18, color: P[800], fontWeight: 800 }}>Iniciar Sesión</h2>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Usuario" value={u} onChange={setU} placeholder="admin" />
            <Field label="Contraseña" value={p} onChange={setP} type="password" placeholder="••••••••" />
            {err && <p style={{ color: "#dc2626", fontSize: 13, background: "#fef2f2", padding: "9px 12px", borderRadius: 8, margin: 0 }}>⚠️ {err}</p>}
            <Btn type="submit" size="lg" style={{ justifyContent: "center", marginTop: 4 }}>Entrar al Sistema →</Btn>
          </form>
          <div style={{ marginTop: 22, borderTop: `1px solid ${P[100]}`, paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 700 }}>ACCESOS DE DEMO:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {demos.map(d => (
                <button key={d.l} type="button" onClick={() => { setU(d.u); setP(d.p); }}
                  style={{ border: `1px solid ${P[200]}`, background: P[50], borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: P[700], fontWeight: 700 }}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SomosProTracking() {
  const [user,           setUser]           = useState(null);
  const [tab,            setTab]            = useState("");
  const [cargando,       setCargando]       = useState(true);
  const [pedidos,        setPedidos]        = useState([]);
  const [conductores,    setConductores]    = useState([]);
  const [transportistas, setTransportistas] = useState([]);
  const [usuarios,       setUsuarios]       = useState([]);
  const [ciudades,       setCiudades]       = useState(CIUDADES_BASE);
  const [paqueterias,    setPaqueterias]    = useState(PAQUETERIAS_INICIALES);
  const [devoluciones,   setDevoluciones]   = useState([]);
  const [recogidas,      setRecogidas]      = useState([]);
  const [pqrs,           setPqrs]           = useState([]);
  const [promesas,       setPromesas]       = useState([]);
  const [facturas,       setFacturas]       = useState([]);
  const [collapsed,      setCollapsed]      = useState(false);
  const [toast,          setToast]          = useState(null);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  // ── Cargar datos desde Supabase al iniciar ──
  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const [
        { data: usu },  { data: tra },  { data: con },
        { data: ped },  { data: ciu },  { data: paq },
        { data: dev },  { data: rec },  { data: pqrsd },
        { data: prom },
      ] = await Promise.all([
        supabase.from('usuarios').select('*').order('created_at'),
        supabase.from('transportistas').select('*').order('created_at'),
        supabase.from('conductores').select('*').order('created_at'),
        supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
        supabase.from('ciudades').select('*').order('name'),
        supabase.from('paqueterias').select('*').order('nombre'),
        supabase.from('devoluciones').select('*').order('created_at', { ascending: false }),
        supabase.from('recogidas').select('*').order('created_at', { ascending: false }),
        supabase.from('pqrs').select('*').order('created_at', { ascending: false }),
        supabase.from('promesas_servicio').select('*'),
      ]);

      // Si no hay usuarios en Supabase, cargar los iniciales de demo
      if (!usu || usu.length === 0) {
        await sembrarDatosIniciales();
        await cargarTodo();
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
            .select('*, pedidos(id,guia_interna,cliente,cajas,factura,ciudad_codigo,ciudad_nombre,fecha_creacion)');
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
    } catch (e) {
      console.error('Error cargando datos:', e);
      showToast('Sin conexión a la base de datos. Verifica tu internet y recarga.', 'error');
    }
    setCargando(false);
  };

  // ── Sembrar datos iniciales si la BD está vacía ──
  const sembrarDatosIniciales = async () => {
    try {
      // Usuarios iniciales — ignorar si ya existen
      for (const u of USUARIOS_INICIALES) {
        const { id, ...rest } = u;
        await supabase.from('usuarios').upsert({ ...rest }, { onConflict: 'user', ignoreDuplicates: true });
      }
      // Transportistas iniciales
      for (const t of TRANSPORTISTAS_INICIALES) {
        const { id, ...rest } = t;
        await supabase.from('transportistas').upsert({ ...rest }, { onConflict: 'nit', ignoreDuplicates: true });
      }
      // Ciudades base
      for (const c of CIUDADES_BASE) {
        await supabase.from('ciudades').upsert({ code: c.code, name: c.name }, { onConflict: 'code', ignoreDuplicates: true });
      }
      // Paqueterías
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
  };

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

  if (!user) return <Login onLogin={handleLogin} usuarios={usuarios} />;

  const props = { pedidos, setPedidos, conductores, setConductores, usuarios, setUsuarios, showToast, user };

  // ── Wrappers que escriben en Supabase y recargan ──
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
        await supabase.from('usuarios').upsert(rest, { onConflict: 'user' });
      } else {
        await supabase.from('usuarios').upsert(u, { onConflict: 'user' });
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

  // Expose globally for ModalDetalle which doesn't receive sb as prop
  window._sb = supabase;
  window._recargar = cargarTodo;

  const renderContent = () => {
    const sb = supabase;
    const re = cargarTodo;
    switch (tab) {
      case "dashboard":      return <Dashboard pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas} pqrs={pqrs} promesas={promesas} ciudades={ciudades}/>;
      case "pedidos":        return <Pedidos pedidos={pedidos} setPedidos={sbSetPedidos} conductores={conductores} ciudades={ciudades} showToast={showToast} paqueterias={paqueterias} transportistas={transportistas} recargar={cargarTodo}/>;
      case "rastreo":        return <RastreoGPS pedidos={pedidos} conductores={conductores} ciudades={ciudades}/>;
      case "conductores":    return <Conductores conductores={conductores} pedidos={pedidos} showToast={showToast} transportistas={transportistas} recargar={cargarTodo}/>;
      case "transportistas": return <Transportistas transportistas={transportistas} conductores={conductores} showToast={showToast} user={{rol:"admin",nombre:"Admin"}} recargar={cargarTodo}/>;
      case "resumen":        return <ResumenTransportador pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas}/>;
      case "facturas":       return <FacturasProveedor facturas={facturas} transportistas={transportistas} pedidos={pedidos} showToast={showToast} recargar={cargarTodo}/>;
      case "promesas":       return <GestionPromesas promesas={promesas} ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
      case "ciudades":       return <Ciudades ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
      case "paqueterias":    return <GestionPaqueterias paqueterias={paqueterias} showToast={showToast} recargar={cargarTodo}/>;
      case "usuarios":       return <Usuarios usuarios={usuarios} showToast={showToast} recargar={cargarTodo}/>;
      case "mi_empresa":     return <Transportistas transportistas={transportistas} conductores={conductores} showToast={showToast} user={user} recargar={cargarTodo}/>;
      case "mis_pedidos":    return <MisPedidosConductor pedidos={pedidos} user={user} conductores={conductores} ciudades={ciudades} showToast={showToast} recargar={cargarTodo}/>;
      case "mi_ubicacion":   return <MiUbicacion user={user}/>;
      case "consultas":      return <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
      case "pqrs":           return <ModuloPQRS pqrs={pqrs} pedidos={pedidos} showToast={showToast} user={user} recargar={cargarTodo}/>;
      case "devoluciones":   return <ModuloDevoluciones devoluciones={devoluciones} conductores={conductores} ciudades={ciudades} transportistas={transportistas} showToast={showToast} user={user} recargar={cargarTodo}/>;
      case "recogidas":      return <ModuloRecogidas recogidas={recogidas} conductores={conductores} ciudades={ciudades} transportistas={transportistas} showToast={showToast} user={user} recargar={cargarTodo}/>;
      default:               return <Dashboard pedidos={pedidos} conductores={conductores}/>;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f5ff" }}>
      <SidebarApp user={user} activeTab={tab} setActiveTab={setTab} onLogout={() => setUser(null)} collapsed={collapsed} setCollapsed={setCollapsed} pqrs={pqrs} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: "100%", boxSizing: "border-box" }}>
        {renderContent()}
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
function Usuarios({ usuarios, showToast, recargar }) {
  const vacio = {nombre:"",user:"",pass:"",rol:"operador",nit:"",empresa:"",placa:"",nit_proveedor:"",celular:""};
  const [modal,     setModal]     = useState(false);
  const [modEditar, setModEditar] = useState(null);
  const [form,      setForm]      = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const roleColors = {admin:P[600],operador:P[400],transportista:"#0891b2",conductor:"#059669",cliente:"#d97706"};

  const abrirNuevo  = () => { setForm(vacio); setModal(true); };
  const abrirEditar = (u) => {
    setForm({nombre:u.nombre,user:u.user,pass:"",rol:u.rol,nit:u.nit||"",empresa:u.empresa||"",placa:u.placa||"",nit_proveedor:u.nit_proveedor||"",celular:u.celular||""});
    setModEditar(u);
  };

  const crearUsuario = async () => {
    if (!form.nombre.trim()||!form.user.trim()||!form.pass.trim()) { showToast("Nombre, usuario y contraseña son obligatorios","error"); return; }
    if (usuarios.find(u=>u.user===form.user.trim())) { showToast("Ese usuario ya existe","error"); return; }
    setGuardando(true);
    const { error } = await supabase.from('usuarios').insert({...form});
    if (error) { showToast("Error: "+error.message,"error"); setGuardando(false); return; }
    setModal(false); setForm(vacio);
    showToast("✓ Usuario creado","success");
    if(recargar) await recargar(); setGuardando(false);
  };

  const guardarEdicion = async () => {
    if (!form.nombre.trim()||!form.user.trim()) { showToast("Nombre y usuario son obligatorios","error"); return; }
    if (usuarios.find(u=>u.user===form.user.trim()&&u.id!==modEditar.id)) { showToast("Ese usuario ya existe","error"); return; }
    setGuardando(true);
    const passNueva = form.pass.trim()||modEditar.pass;
    const { error } = await supabase.from('usuarios').update({...form,pass:passNueva}).eq('id',modEditar.id);
    if (error) { showToast("Error: "+error.message,"error"); setGuardando(false); return; }
    setModEditar(null);
    showToast(form.pass.trim()?"✓ Usuario y contraseña actualizados":"✓ Usuario actualizado","success");
    if(recargar) await recargar(); setGuardando(false);
  };

  const eliminar = async (uid, uname) => {
    if (uname==="admin") { showToast("No se puede eliminar el admin principal","error"); return; }
    if (!window.confirm("¿Eliminar este usuario?")) return;
    await supabase.from('usuarios').delete().eq('id', uid);
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
          <Field label="Placa" value={form.placa} onChange={f("placa")} placeholder="ABC-123"/>
          <Field label="Celular" value={form.celular} onChange={f("celular")} placeholder="3001234567"/>
        </div>
        <Field label="NIT proveedor" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1"/>
      </>
    );
    return null;
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>👥 Usuarios del Sistema</h2>
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
            {u.nit    &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>NIT: {u.nit}</p>}
            {u.placa  &&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>Placa: {u.placa}</p>}
            {u.celular&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>📱 {u.celular}</p>}
            {u.empresa&&<p style={{margin:"4px 0 0",fontSize:12,color:"#64748b"}}>{u.empresa}</p>}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn size="sm" variant="secondary" onClick={()=>abrirEditar(u)}>✏️ Editar</Btn>
              {u.user!=="admin"&&<Btn size="sm" variant="danger" onClick={()=>eliminar(u.id,u.user)}>× Eliminar</Btn>}
            </div>
          </Card>
        ))}
      </div>

      {modal&&(
        <Modal title="Nuevo Usuario" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Usuario (login) *" value={form.user} onChange={f("user")} required placeholder="usuario123"/>
              <Field label="Contraseña *" value={form.pass} onChange={f("pass")} required type="password" placeholder="••••••••"/>
            </div>
            <Field label="Rol" value={form.rol} onChange={f("rol")} as="select" options={Object.entries(ROLES).map(([k,v])=>({value:k,label:v}))}/>
            {camposRol()}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
              <Btn onClick={crearUsuario} disabled={guardando}>{guardando?"Guardando...":"💾 Crear Usuario"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modEditar&&(
        <Modal title={`Editar — ${modEditar.nombre}`} onClose={()=>setModEditar(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Nombre completo *" value={form.nombre} onChange={f("nombre")} required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Usuario *" value={form.user} onChange={f("user")} required/>
              <Field label="Nueva contraseña (vacío = sin cambio)" value={form.pass} onChange={f("pass")} type="password" placeholder="Nueva contraseña..."/>
            </div>
            <Field label="Rol" value={form.rol} onChange={f("rol")} as="select" options={Object.entries(ROLES).map(([k,v])=>({value:k,label:v}))}/>
            {camposRol()}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEditar(null)}>Cancelar</Btn>
              <Btn onClick={guardarEdicion} disabled={guardando}>{guardando?"Guardando...":"💾 Guardar Cambios"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { P, CIUDADES as CIUDADES_BASE, ESTADOS_PEDIDO, ROLES } from './Constants';
import { USUARIOS_INICIALES, CONDUCTORES_INICIALES, TRANSPORTISTAS_INICIALES, PEDIDOS_INICIALES, PAQUETERIAS_INICIALES } from './DataStore';
import { Logo, Badge, Card, Btn, Field, Modal, Toast } from './Subcomponentes';

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
      const data = await fileToBase64(f);
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
                <img src={f.data} alt={"soporte"+i} style={{width:"100%",height:110,objectFit:"cover",display:"block"}}/>
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
                {[["Cliente:",pedido.cliente],["Direccion:",pedido.direccion],["Ciudad:",ciudad?.name||""],["Cod. DANE:",pedido.ciudad_codigo],["Factura:",pedido.factura],["Cajas:",pedido.cajas]].map(([k,v])=>(
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
              <div style={{height:52,borderBottom:"2px solid #cbd5e1",marginBottom:6}}/>
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

function ModalDetalle({ pedido, conductores, ciudades, onClose, setPedidos, showToast, canEdit }) {
  const [condId,     setCondId]     = useState(pedido.conductor_id?.toString()||"");
  const [direccion,  setDireccion]  = useState(pedido.direccion||"");
  const [cajas,      setCajas]      = useState(String(pedido.cajas||""));
  const [estadoDesp, setEstadoDesp] = useState(pedido.estado_despacho||"despachado");
  const [novedad,    setNovedad]    = useState(pedido.novedad||false);
  const [verMapa,    setVerMapa]    = useState(false);
  const [verGuia,    setVerGuia]    = useState(false);
  const [verCamara,  setVerCamara]  = useState(false);

  const cond   = conductores.find(c=>c.id===parseInt(condId||pedido.conductor_id));
  const ciudad = (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);

  const guardar = () => {
    const c = conductores.find(c=>c.id===parseInt(condId));
    let nuevoEstado = pedido.estado;
    if(c && (pedido.estado==="sin_asignar"||pedido.estado==="pendiente")) nuevoEstado="en_transito";
    if(!c && pedido.estado==="en_transito") nuevoEstado="sin_asignar";
    setPedidos(prev=>prev.map(p=>p.id===pedido.id?{
      ...p,
      direccion: direccion.trim()||p.direccion,
      cajas: parseInt(cajas)||p.cajas,
      conductor_id: c?.id||null,
      placa: c?.placa||null,
      nit_proveedor: c?.nit_proveedor||null,
      estado: nuevoEstado,
      estado_despacho: estadoDesp,
      novedad,
    }:p));
    showToast("Cambios guardados","success");
    onClose();
  };

  const subirFotos = (fotos) => {
    const hoy = new Date().toISOString().split("T")[0];
    const nombres = fotos.map((_,i)=>`soporte_${pedido.id}_${i+1}.jpg`);
    const estadoFinal = novedad ? "novedad" : "entregado";
    setPedidos(prev=>prev.map(p=>p.id===pedido.id?{
      ...p,
      soportes: [...(p.soportes||[]),...nombres],
      soportes_data: [...(p.soportes_data||[]),...fotos],
      estado: estadoFinal,
      fecha_real: hoy,
      novedad,
    }:p));
    setVerCamara(false);
    showToast(`${fotos.length} soporte(s) guardados. Estado: ${estadoFinal==="entregado"?"Entregado":"Con Novedad"}. Fecha: ${hoy}`,"success");
    onClose();
  };

  const caPrev = condId!==(pedido.conductor_id?.toString()||"") && condId!=="";

  return (
    <Modal title={`Pedido ${pedido.id}${pedido.guia_interna?" - "+pedido.guia_interna:""}`} onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        <div style={{background:P[50],borderRadius:12,padding:16}}>
          <div style={{fontWeight:800,fontSize:16,color:P[800],marginBottom:10}}>{pedido.cliente}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
            <span>Ciudad: {ciudad?.name} ({pedido.ciudad_codigo})</span>
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
          <Field label="Direccion de entrega (editable)" value={direccion} onChange={setDireccion} placeholder="Cra 15 #93-47"/>
          <Field label="Cantidad de cajas (editable)" value={cajas} onChange={setCajas} type="number" placeholder="10"/>
        </div>

        {canEdit&&pedido.tipo!=="paqueteria"&&(
          <div>
            <Field label="Conductor (al asignar estado cambia a En Transito automaticamente)" value={condId} onChange={setCondId} as="select"
              options={[{value:"",label:"Sin asignar"},...conductores.map(c=>({value:c.id.toString(),label:`${c.nombre} - ${c.placa}`}))]}/>
            {caPrev&&<p style={{fontSize:11,color:P[600],margin:"6px 0 0",fontWeight:700}}>Al guardar el estado cambiara a En Transito automaticamente.</p>}
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
                  <img src={s.data} alt={"s"+i} style={{width:"100%",height:90,objectFit:"cover",display:"block"}}/>
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

function ModalCSVPedidos({ onClose, onImportar, ciudades }) {
  const [txt,  setTxt]  = useState("");
  const [prev, setPrev] = useState([]);
  const [err,  setErr]  = useState("");

  const plantilla = `id,cliente,ciudad_codigo,direccion,cajas,factura,fecha_estimada,tipo,paqueteria,guia_paqueteria,notas
PED-010,Empresa Ejemplo S.A.S,11001,Cra 10 #20-30 Of 201,5,FAC-3000,2026-05-10,propio,,,Fragil
PED-011,Comercio del Norte Ltda,05001,Av El Poblado 43A-15,12,FAC-3001,2026-05-12,paqueteria,Servientrega,SRV-2026-12345,`;

  const parsear = (texto) => {
    const lineas = texto.trim().split("\n").filter(l => l.trim());
    if (lineas.length < 2) throw new Error("Se necesita encabezado y al menos una fila.");
    const hdrs = lineas[0].split(",").map(h => h.trim().toLowerCase());
    return lineas.slice(1).map((l, idx) => {
      const cols = l.split(",").map(c => c.trim());
      const obj  = {};
      hdrs.forEach((h, i) => { obj[h] = cols[i] || ""; });
      const ciudad = (ciudades||[]).find(c => c.code === obj.ciudad_codigo);
      const esPaq  = obj.tipo === "paqueteria";
      return {
        id: obj.id || `IMP-${Date.now()}-${idx}`,
        cliente:       obj.cliente || "Sin nombre",
        ciudad_codigo: ciudad?.code || obj.ciudad_codigo || "",
        ciudad_nombre: ciudad?.name || "",
        direccion:     obj.direccion || "",
        cajas:         parseInt(obj.cajas) || 0,
        factura:       obj.factura || "",
        fecha_estimada:obj.fecha_estimada || "",
        notas:         obj.notas || "",
        tipo:          esPaq ? "paqueteria" : "propio",
        paqueteria:    esPaq ? obj.paqueteria : null,
        guia_paqueteria: esPaq ? obj.guia_paqueteria : null,
        conductor_id: null, placa: null, nit_proveedor: null,
        estado:        esPaq ? "paqueteria" : "sin_asignar",
        fecha_creacion: new Date().toISOString().split("T")[0],
        fecha_real: null, soportes: [],
      };
    });
  };

  return (
    <Modal title="Importar Pedidos desde CSV" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fffbeb", borderRadius: 10, padding: 12, fontSize: 13, color: "#92400e" }}>
          <strong>Columnas:</strong> id, cliente, ciudad_codigo, direccion, cajas, factura, fecha_estimada, tipo, paqueteria, guia_paqueteria, notas
        </div>
        <pre style={{ background: P[50], borderRadius: 8, padding: 12, fontSize: 11, color: "#334155", overflow: "auto", margin: 0, border: `1px solid ${P[200]}` }}>{plantilla}</pre>
        <Btn size="sm" variant="secondary" onClick={() => setTxt(plantilla)}>📋 Usar plantilla</Btn>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={6}
          style={{ ...iSt, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          placeholder="Pega el contenido CSV aquí..." />
        {err && <p style={{ color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, fontSize: 13, margin: 0 }}>⚠️ {err}</p>}
        <Btn variant="secondary" onClick={() => { setErr(""); try { setPrev(parsear(txt)); } catch(e) { setErr(e.message); setPrev([]); } }}>
          👁 Previsualizar
        </Btn>
        {prev.length > 0 && (
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, border: "1px solid #86efac" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#15803d", fontSize: 13 }}>✓ {prev.length} pedido(s) listos:</p>
            {prev.map(p => <div key={p.id} style={{ fontSize: 12, color: "#334155" }}>• <strong>{p.id}</strong> — {p.cliente} → {p.ciudad_nombre}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={prev.length === 0} onClick={() => onImportar(prev)}>📥 Importar ({prev.length})</Btn>
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
            onError={e=>{e.target.style.display="none";}}/>
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

function Dashboard({ pedidos, conductores, devoluciones = [], recogidas = [] }) {
  const [modLink, setModLink] = useState(false);
  const stats = [
    { l: "Total Pedidos",  v: pedidos.length,                                            c: P[600], i: "📦" },
    { l: "Sin Asignar",   v: pedidos.filter(p => p.estado === "sin_asignar").length,     c: "#64748b", i: "○" },
    { l: "En Tránsito",   v: pedidos.filter(p => p.estado === "en_transito").length,     c: P[600], i: "▶" },
    { l: "Paquetería",    v: pedidos.filter(p => p.tipo === "paqueteria").length,         c: "#0891b2", i: "📦" },
    { l: "Entregados",    v: pedidos.filter(p => p.estado === "entregado").length,        c: "#059669", i: "✓" },
    { l: "Cajas Totales", v: pedidos.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0),  c: P[700], i: "🗃️" },
  ];
  return (
    <div>
      <h2 style={{ margin: "0 0 24px", color: P[800], fontWeight: 900 }}>📊 Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.l} style={{ textAlign: "center", padding: 18, borderTop: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.i}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 5 }}>{s.l}</div>
          </Card>
        ))}
      </div>
      <h3 style={{ color: P[800], marginBottom: 14, fontWeight: 800 }}>Pedidos Recientes</h3>
      <Card style={{ padding: 0, overflow: "hidden" }}>
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
                const cond = conductores.find(c => c.id === p.conductor_id);
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{p.factura}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{p.ciudad_nombre}</td>
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

function Pedidos({ pedidos, setPedidos, conductores, ciudades, showToast }) {
  const [filtro,    setFiltro]    = useState("todos");
  const [busq,      setBusq]      = useState("");
  const [modNuevo,  setModNuevo]  = useState(false);
  const [modDet,    setModDet]    = useState(null);
  const [modGuia,   setModGuia]   = useState(null);
  const [modCSV,    setModCSV]    = useState(false);

  const vacio = { id: "", cliente: "", ciudad_codigo: "", direccion: "", cajas: "", factura: "", fecha_estimada: "", notas: "", conductor_id: "", tipo: "propio", paqueteria: "", guia_paqueteria: "" };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const filtrados = pedidos.filter(p => {
    const okF = filtro === "todos" || p.estado === filtro || (filtro === "paqueteria_tipo" && p.tipo === "paqueteria");
    const q   = busq.toLowerCase();
    const okB = !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.factura?.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
    return okF && okB;
  });

  const guardar = () => {
    if (!form.id.trim() || !form.cliente.trim() || !form.ciudad_codigo || !form.factura.trim()) {
      showToast("N° Pedido, Factura, Cliente y Ciudad son obligatorios", "error"); return;
    }
    if (pedidos.find(p => p.id === form.id.trim())) {
      showToast("Ya existe un pedido con ese número", "error"); return;
    }
    const ciudad = (ciudades||[]).find(c => c.code === form.ciudad_codigo);
    const cond   = conductores.find(c => c.id === parseInt(form.conductor_id));
    const esPaq  = form.tipo === "paqueteria";
    setPedidos(prev => [{
      id: form.id.trim(), cliente: form.cliente.trim(),
      ciudad_codigo: form.ciudad_codigo, ciudad_nombre: ciudad?.name || "",
      direccion: form.direccion.trim(), cajas: parseInt(form.cajas) || 0,
      factura: form.factura.trim(), fecha_estimada: form.fecha_estimada,
      notas: form.notas.trim(), tipo: form.tipo,
      paqueteria:      esPaq ? form.paqueteria : null,
      guia_paqueteria: esPaq ? form.guia_paqueteria.trim() : null,
      conductor_id:    cond ? cond.id : null,
      placa:           cond ? cond.placa : null,
      nit_proveedor:   cond ? cond.nit_proveedor : null,
      estado:          esPaq ? "paqueteria" : (cond ? "pendiente" : "sin_asignar"),
      fecha_creacion:  new Date().toISOString().split("T")[0],
      fecha_real: null, soportes: [],
    }, ...prev]);
    setModNuevo(false);
    setForm(vacio);
    showToast(`✓ Pedido ${form.id} creado`, "success");
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>📦 Pedidos</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" size="sm" onClick={imprimirPlanilla}>🖨️ Planilla</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setModCSV(true)}>📤 CSV</Btn>
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
            <Field label="Tipo de Envío" value={form.tipo} onChange={f("tipo")} as="select"
              options={[{ value: "propio", label: "🚚 Transporte Propio" }, { value: "paqueteria", label: "📦 Paquetería Tercero" }]} />
            {form.tipo === "paqueteria" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Empresa Paquetería" value={form.paqueteria} onChange={f("paqueteria")} as="select"
                  options={[{ value: "", label: "— Seleccione —" }, ...PAQUETERIAS.map(p => ({ value: p, label: p }))]} />
                <Field label="N° Guía Paquetería" value={form.guia_paqueteria} onChange={f("guia_paqueteria")} placeholder="SRV-2026-XXXXX" />
              </div>
            ) : (
              <Field label="Asignar Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
                options={[{ value: "", label: "— Sin asignar —" }, ...conductores.map(c => ({ value: c.id, label: `${c.nombre} · ${c.placa}` }))]} />
            )}
            <Field label="Notas / Observaciones" value={form.notas} onChange={f("notas")} as="textarea" placeholder="Instrucciones especiales..." />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModNuevo(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar Pedido</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} onClose={()=>setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={true}/>}
      {modGuia&&<GuiaImprimible pedido={modGuia} conductores={conductores} ciudades={ciudades} onClose={()=>setModGuia(null)}/>}
      {modCSV&&<ModalCSVPedidos onClose={()=>setModCSV(false)} ciudades={ciudades} onImportar={rows=>{const conGuias=rows.map((r,i)=>({...r,guia_interna:r.tipo!=="paqueteria"?generarGuia([...pedidos,...rows.slice(0,i)]):null,estado_despacho:r.estado_despacho||"despachado",novedad:false,soportes_data:[]}));setPedidos(p=>[...conGuias,...p]);setModCSV(false);showToast(`${rows.length} pedido(s) importados`,"success");}}/>}
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

function Conductores({ conductores, setConductores, pedidos, showToast }) {
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ nombre: "", placa: "", nit_proveedor: "", empresa: "" });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const guardar = () => {
    if (!form.nombre.trim() || !form.placa.trim()) { showToast("Nombre y placa son obligatorios","error"); return; }
    if (form.nit_proveedor.trim()) {
      const existe = (transportistas||[]).find(t=>t.nit===form.nit_proveedor.trim());
      if (!existe) { showToast("El NIT proveedor ingresado no existe en la lista de Transportistas. Regístralo primero en el módulo Transportistas.","error"); return; }
    }
    setConductores(prev=>[...prev,{...form,id:Date.now(),activo:true}]);
    setModal(false);
    setForm({nombre:"",placa:"",nit_proveedor:"",empresa:""});
    showToast("✓ Conductor registrado","success");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>🚗 Conductores</h2>
        <Btn onClick={() => setModal(true)}>+ Registrar Conductor</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {conductores.map(c => {
          const asig = pedidos.filter(p => p.conductor_id === c.id).length;
          const tran = pedidos.filter(p => p.conductor_id === c.id && p.estado === "en_transito").length;
          return (
            <Card key={c.id} style={{ borderTop: `3px solid ${P[500]}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg,${P[700]},${P[500]})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>🚗</div>
                <div>
                  <div style={{ fontWeight: 800, color: P[800] }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Placa: <strong style={{ fontFamily: "monospace" }}>{c.placa}</strong></div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>🏢 {c.empresa || "—"}</span>
                <span>📋 NIT: {c.nit_proveedor || "—"}</span>
                <span>📦 Asignados: <strong>{asig}</strong> · En tránsito: <strong style={{ color: P[600] }}>{tran}</strong></span>
              </div>
            </Card>
          );
        })}
        {conductores.length === 0 && <p style={{ color: "#94a3b8" }}>Sin conductores registrados.</p>}
      </div>
      {modal && (
        <Modal title="Registrar Conductor" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre completo" value={form.nombre} onChange={f("nombre")} required placeholder="Juan Pérez" />
            <Field label="Placa del vehículo" value={form.placa}  onChange={f("placa")}  required placeholder="ABC-123" />
            <Field label="NIT proveedor de transporte" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1" />
            <Field label="Empresa de transporte" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ S.A.S" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Guardar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Transportistas({ transportistas, setTransportistas, conductores, setConductores, showToast, user, usuarios, setUsuarios }) {
  const [modEmpresa,  setModEmpresa]  = useState(false);
  const [modEditEmp,  setModEditEmp]  = useState(null);   // empresa a editar
  const [modCond,     setModCond]     = useState(null);
  const [formE, setFormE] = useState({ nombre:"", nit:"", contacto:"", tel:"", user_login:"", pass_login:"" });
  const [formC, setFormC] = useState({ nombre:"", cedula:"", placa:"", celular:"", user_login:"", pass_login:"" });
  const fe = k => v => setFormE(p=>({...p,[k]:v}));
  const fc = k => v => setFormC(p=>({...p,[k]:v}));

  const esMia  = user.rol === "transportista";
  const miNit  = user.nit || "";
  const misEmp = esMia ? transportistas.filter(t=>t.nit===miNit) : transportistas;
  const misCon = esMia ? conductores.filter(c=>c.nit_proveedor===miNit) : conductores;

  // Crear empresa + su usuario de acceso
  const crearEmpresa = () => {
    if (!formE.nombre.trim() || !formE.nit.trim()) { showToast("Nombre y NIT son obligatorios","error"); return; }
    if (!formE.user_login.trim() || !formE.pass_login.trim()) { showToast("Usuario y contraseña son obligatorios","error"); return; }
    if (transportistas.find(t=>t.nit===formE.nit.trim())) { showToast("Ya existe una empresa con ese NIT","error"); return; }
    if (usuarios.find(u=>u.user===formE.user_login.trim())) { showToast("Ese nombre de usuario ya existe","error"); return; }
    const newId = Date.now();
    setTransportistas(prev=>[...prev,{ id:newId, nombre:formE.nombre.trim(), nit:formE.nit.trim(), contacto:formE.contacto.trim(), tel:formE.tel.trim() }]);
    setUsuarios(prev=>[...prev,{ id:newId, nombre:formE.nombre.trim(), user:formE.user_login.trim(), pass:formE.pass_login.trim(), rol:"transportista", nit:formE.nit.trim(), empresa:formE.nombre.trim() }]);
    setModEmpresa(false);
    setFormE({ nombre:"", nit:"", contacto:"", tel:"", user_login:"", pass_login:"" });
    showToast("✓ Empresa registrada con acceso al sistema","success");
  };

  // Editar empresa (solo admin)
  const guardarEdicion = () => {
    if (!formE.nombre.trim()) { showToast("Nombre es obligatorio","error"); return; }
    setTransportistas(prev=>prev.map(t=>t.id===modEditEmp.id?{...t,nombre:formE.nombre.trim(),contacto:formE.contacto.trim(),tel:formE.tel.trim()}:t));
    // Actualizar usuario vinculado si existe
    setUsuarios(prev=>prev.map(u=>u.id===modEditEmp.id?{...u,nombre:formE.nombre.trim(),pass:formE.pass_login.trim()||u.pass}:u));
    setModEditEmp(null);
    showToast("✓ Empresa actualizada","success");
  };

  const abrirEditar = (t) => {
    const uVinc = usuarios.find(u=>u.id===t.id) || {};
    setFormE({ nombre:t.nombre, nit:t.nit, contacto:t.contacto||"", tel:t.tel||"", user_login:uVinc.user||"", pass_login:"" });
    setModEditEmp(t);
  };

  // Inscribir conductor bajo una empresa existente
  const inscribirConductor = () => {
    if (!formC.nombre.trim()||!formC.placa.trim()||!formC.cedula.trim()) { showToast("Nombre, cédula y placa son obligatorios","error"); return; }
    if (!formC.user_login.trim()||!formC.pass_login.trim()) { showToast("Usuario y contraseña son obligatorios","error"); return; }
    if (usuarios.find(u=>u.user===formC.user_login.trim())) { showToast("Ese usuario ya existe","error"); return; }
    const emp = modCond;
    const newId = Date.now();
    setConductores(prev=>[...prev,{ id:newId, nombre:formC.nombre.trim(), cedula:formC.cedula.trim(), placa:formC.placa.trim(), celular:formC.celular.trim(), nit_proveedor:emp.nit, empresa:emp.nombre, activo:true }]);
    setUsuarios(prev=>[...prev,{ id:newId, nombre:formC.nombre.trim(), user:formC.user_login.trim(), pass:formC.pass_login.trim(), rol:"conductor", cedula:formC.cedula.trim(), placa:formC.placa.trim(), celular:formC.celular.trim(), nit_proveedor:emp.nit, empresa:emp.nombre }]);
    setModCond(null);
    setFormC({ nombre:"", cedula:"", placa:"", celular:"", user_login:"", pass_login:"" });
    showToast(`✓ Conductor inscrito en ${emp.nombre}`,"success");
  };

  return (
    <div>
      {/* Banner empresa propia (vista transportista) */}
      {esMia && (
        <Card style={{ background:`linear-gradient(135deg,${P[950]},${P[700]})`, marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Logo size={46}/>
            <div>
              <h2 style={{ margin:0, color:"#fff", fontWeight:900 }}>{user.empresa||user.nombre}</h2>
              <p style={{ margin:"4px 0 0", color:P[300], fontSize:13 }}>NIT: {miNit} · {misCon.filter(c=>c.activo).length} conductor(es)</p>
            </div>
          </div>
        </Card>
      )}

      {/* Empresas */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h3 style={{ margin:0, color:P[800], fontWeight:800 }}>🏢 {esMia ? "Mi Empresa" : "Empresas Transportistas"}</h3>
        {!esMia && <Btn onClick={()=>setModEmpresa(true)}>+ Nueva Empresa</Btn>}
      </div>
      {!esMia && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14, marginBottom:28 }}>
          {misEmp.map(t=>{
            const nConds = conductores.filter(c=>c.nit_proveedor===t.nit).length;
            const uVinc  = usuarios.find(u=>u.id===t.id);
            return (
              <Card key={t.id} style={{ borderLeft:`4px solid ${P[500]}` }}>
                <div style={{ fontWeight:800, color:P[800], fontSize:15, marginBottom:6 }}>🏢 {t.nombre}</div>
                <div style={{ fontSize:13, color:"#64748b", display:"flex", flexDirection:"column", gap:3 }}>
                  <span>NIT: <strong style={{fontFamily:"monospace"}}>{t.nit}</strong></span>
                  {t.contacto && <span>👤 {t.contacto}</span>}
                  {t.tel       && <span>📱 {t.tel}</span>}
                  <span>🚗 {nConds} conductor(es)</span>
                  {uVinc && <span style={{color:P[600]}}>👤 Usuario: <strong>@{uVinc.user}</strong></span>}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                  <Btn size="sm" variant="secondary" onClick={()=>abrirEditar(t)}>✏️ Editar</Btn>
                  <Btn size="sm" variant="secondary" onClick={()=>{ setModCond(t); setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""}); }}>+ Conductor</Btn>
                </div>
              </Card>
            );
          })}
          {misEmp.length===0 && <p style={{color:"#94a3b8",fontSize:13}}>Sin empresas registradas.</p>}
        </div>
      )}

      {/* Conductores */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <h3 style={{ margin:0, color:P[800], fontWeight:800 }}>🚗 {esMia ? "Mis Conductores" : "Todos los Conductores"}</h3>
        {esMia && <Btn onClick={()=>{ setModCond({nit:miNit,nombre:user.empresa||user.nombre}); setFormC({nombre:"",cedula:"",placa:"",celular:"",user_login:"",pass_login:""}); }}>+ Inscribir Conductor</Btn>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
        {misCon.map(c=>(
          <Card key={c.id} style={{ borderLeft:`3px solid ${P[400]}` }}>
            <div style={{ fontWeight:800, color:P[800] }}>🚗 {c.nombre}</div>
            {c.cedula  && <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>CC: {c.cedula}</div>}
            <div style={{fontSize:13,color:"#64748b",marginTop:3}}>Placa: <strong style={{fontFamily:"monospace"}}>{c.placa}</strong></div>
            {c.celular && <div style={{fontSize:12,color:"#64748b"}}>📱 {c.celular}</div>}
            {!esMia   && <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{c.empresa}</div>}
            <span style={{display:"inline-block",marginTop:10,background:"#ecfdf5",color:"#059669",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>✓ Activo</span>
          </Card>
        ))}
        {misCon.length===0 && <p style={{color:"#94a3b8",fontSize:13}}>Sin conductores inscritos.</p>}
      </div>

      {/* Modal nueva empresa */}
      {modEmpresa && (
        <Modal title="Nueva Empresa Transportista" onClose={()=>setModEmpresa(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Razón Social / Nombre" value={formE.nombre}   onChange={fe("nombre")}   required placeholder="Transportes XYZ S.A.S"/>
            <Field label="NIT"                   value={formE.nit}      onChange={fe("nit")}      required placeholder="900123456-1"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Persona de Contacto" value={formE.contacto} onChange={fe("contacto")} placeholder="Carlos Ruiz"/>
              <Field label="Teléfono"            value={formE.tel}      onChange={fe("tel")}      placeholder="3001234567"/>
            </div>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12,marginTop:4}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
              <div style={{background:"#fffbeb",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e",marginBottom:10}}>
                Este usuario podrá ingresar a la app con el rol de Transportista y gestionar sus conductores.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario (login)"  value={formE.user_login}  onChange={fe("user_login")}  required placeholder="veloz.trans"/>
                <Field label="Contraseña"       value={formE.pass_login}  onChange={fe("pass_login")}  required type="password" placeholder="••••••••"/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEmpresa(false)}>Cancelar</Btn>
              <Btn onClick={crearEmpresa}>💾 Crear Empresa y Usuario</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar empresa (solo admin) */}
      {modEditEmp && (
        <Modal title={`Editar — ${modEditEmp.nombre}`} onClose={()=>setModEditEmp(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Razón Social" value={formE.nombre}   onChange={fe("nombre")}   required/>
            <p style={{fontSize:12,color:"#64748b",margin:0}}>NIT: <strong>{modEditEmp.nit}</strong> (no modificable)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Persona de Contacto" value={formE.contacto} onChange={fe("contacto")}/>
              <Field label="Teléfono"            value={formE.tel}      onChange={fe("tel")}/>
            </div>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 6px",textTransform:"uppercase"}}>Usuario de Acceso</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario" value={formE.user_login} onChange={fe("user_login")} readOnly/>
                <Field label="Nueva Contraseña (dejar en blanco para no cambiar)" value={formE.pass_login} onChange={fe("pass_login")} type="password" placeholder="Nueva contraseña..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModEditEmp(null)}>Cancelar</Btn>
              <Btn onClick={guardarEdicion}>💾 Guardar Cambios</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal inscribir conductor */}
      {modCond && (
        <Modal title={`Inscribir Conductor — ${modCond.nombre}`} onClose={()=>setModCond(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:P[50],borderRadius:10,padding:10,fontSize:12,color:P[700]}}>
              Empresa: <strong>{modCond.nombre}</strong> · NIT: <strong>{modCond.nit}</strong>
            </div>
            <Field label="Nombre completo" value={formC.nombre}  onChange={fc("nombre")}  required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Cédula"  value={formC.cedula}  onChange={fc("cedula")}  required placeholder="1012345678"/>
              <Field label="Celular" value={formC.celular} onChange={fc("celular")} placeholder="3001234567"/>
            </div>
            <Field label="Placa del vehículo" value={formC.placa} onChange={fc("placa")} required placeholder="XYZ-456"/>
            <div style={{borderTop:`1px solid ${P[100]}`,paddingTop:12}}>
              <p style={{fontSize:12,fontWeight:700,color:P[700],margin:"0 0 10px",textTransform:"uppercase"}}>Acceso al Sistema</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Usuario (login)" value={formC.user_login} onChange={fc("user_login")} required placeholder="juan.perez"/>
                <Field label="Contraseña"      value={formC.pass_login} onChange={fc("pass_login")} required type="password" placeholder="••••••••"/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setModCond(null)}>Cancelar</Btn>
              <Btn onClick={inscribirConductor}>Inscribir y Crear Usuario</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Usuarios({ usuarios, setUsuarios, showToast }) {
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ nombre: "", user: "", pass: "", rol: "operador", nit: "", empresa: "", placa: "", nit_proveedor: "" });
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const roleColors = { admin: P[600], operador: P[400], transportista: "#0891b2", conductor: "#059669", cliente: "#d97706" };

  const guardar = () => {
    if (!form.nombre.trim() || !form.user.trim() || !form.pass.trim()) { showToast("Nombre, usuario y contraseña son obligatorios", "error"); return; }
    if (usuarios.find(u => u.user === form.user.trim())) { showToast("Ese nombre de usuario ya existe", "error"); return; }
    setUsuarios(prev => [...prev, { ...form, id: Date.now() }]);
    setModal(false);
    setForm({ nombre: "", user: "", pass: "", rol: "operador", nit: "", empresa: "", placa: "", nit_proveedor: "" });
    showToast("✓ Usuario creado", "success");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h2 style={{ margin: 0, color: P[800], fontWeight: 900 }}>👥 Usuarios del Sistema</h2>
        <Btn onClick={() => setModal(true)}>+ Nuevo Usuario</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {usuarios.map(u => (
          <Card key={u.id} style={{ borderTop: `3px solid ${roleColors[u.rol] || P[400]}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg,${roleColors[u.rol]},${roleColors[u.rol]}99)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>
                {u.nombre[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "#1e293b" }}>{u.nombre}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>@{u.user}</div>
              </div>
            </div>
            <span style={{ background: `${roleColors[u.rol]}18`, color: roleColors[u.rol], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              {ROLES[u.rol] || u.rol}
            </span>
            {u.nit       && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>NIT: {u.nit}</p>}
            {u.placa     && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Placa: {u.placa}</p>}
            {u.empresa   && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{u.empresa}</p>}
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title="Nuevo Usuario" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre completo" value={form.nombre} onChange={f("nombre")} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Usuario (login)" value={form.user} onChange={f("user")} required placeholder="usuario123" />
              <Field label="Contraseña" value={form.pass} onChange={f("pass")} required type="password" placeholder="••••••••" />
            </div>
            <Field label="Rol" value={form.rol} onChange={f("rol")} as="select"
              options={Object.entries(ROLES).map(([k, v]) => ({ value: k, label: v }))} />
            {form.rol === "transportista" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="NIT" value={form.nit} onChange={f("nit")} placeholder="900123456-1" />
                <Field label="Empresa" value={form.empresa} onChange={f("empresa")} placeholder="Transportes XYZ" />
              </div>
            )}
            {form.rol === "conductor" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Placa" value={form.placa} onChange={f("placa")} placeholder="ABC-123" />
                <Field label="NIT proveedor" value={form.nit_proveedor} onChange={f("nit_proveedor")} placeholder="900123456-1" />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={guardar}>💾 Crear Usuario</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MisPedidosConductor({ pedidos, setPedidos, user, conductores, ciudades, showToast }) {
  const [modDet, setModDet] = useState(null);
  const misPeds = pedidos.filter(p => p.conductor_id === user.id);
  return (
    <div>
      <Card style={{ background: `linear-gradient(135deg,${P[800]},${P[600]})`, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={44} />
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontWeight: 900 }}>👋 {user.nombre}</h2>
            <p style={{ margin: "3px 0 0", color: P[300], fontSize: 13 }}>
              Placa: {user.placa} · {misPeds.filter(p => ["pendiente","en_transito"].includes(p.estado)).length} activo(s) de {misPeds.length} total
            </p>
          </div>
        </div>
      </Card>
      {misPeds.length === 0 && <Card style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p>Sin pedidos asignados por el momento.</p></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {misPeds.map(p => (
          <Card key={p.id} style={{ cursor: "pointer", borderLeft: `4px solid ${ESTADOS_PEDIDO[p.estado]?.color || "#ccc"}` }} onClick={() => setModDet(p)}>
            {/* Encabezado: Guía interna grande + Badge estado */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 900, color: P[600], fontSize: 20, fontFamily: "monospace", letterSpacing: 1 }}>
                  {p.guia_interna || p.id}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Pedido: <strong style={{ color: P[700] }}>{p.id}</strong>
                  {" · "}Factura: <strong style={{ color: "#334155" }}>{p.factura}</strong>
                </div>
              </div>
              <Badge estado={p.estado} />
            </div>
            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 6, fontSize: 15 }}>{p.cliente}</div>
            <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 3 }}>
              <span>🗃️ {p.cajas} cajas</span>
              <span>📍 {p.direccion}</span>
              <span>🏙️ {p.ciudad_nombre}</span>
              <span>📅 Entrega estimada: {p.fecha_estimada || "—"}</span>
              {(p.soportes||[]).length > 0 && <span style={{color:"#059669"}}>📷 {p.soportes.length} soporte(s) cargado(s)</span>}
            </div>
            <Btn size="sm" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} variant="secondary">
              Ver detalle / Cargar soporte fotográfico →
            </Btn>
          </Card>
        ))}
      </div>
      {modDet && <ModalDetalle pedido={modDet} conductores={conductores} onClose={() => setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={false} />}
    </div>
  );
}

function ResumenTransportador({ pedidos, conductores, devoluciones = [], recogidas = [] }) {
  const [selCond,setSelCond]=useState("");
  const condIds=[...new Set(pedidos.filter(p=>p.conductor_id).map(p=>p.conductor_id))];
  const condOpts=condIds.map(id=>conductores.find(c=>c.id===id)).filter(Boolean);
  const cond=conductores.find(c=>c.id===parseInt(selCond));
  const misPeds = selCond ? pedidos.filter(p=>p.conductor_id===parseInt(selCond)&&p.estado==="en_transito") : [];
  const misDV   = selCond ? devoluciones.filter(d=>d.conductor_id===parseInt(selCond)&&d.estado==="en_transito") : [];
  const misRC   = selCond ? recogidas.filter(r=>r.conductor_id===parseInt(selCond)&&r.estado==="en_transito") : [];
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
            style={{flex:1,minWidth:280}}/>
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

function Ciudades({ ciudades, setCiudades, showToast }) {
  const [modNueva,setModNueva]=useState(false);
  const [modCSV,setModCSV]=useState(false);
  const [busq,setBusq]=useState("");
  const [form,setForm]=useState({code:"",name:""});

  const guardar=()=>{
    if(!form.code.trim()||!form.name.trim()){showToast("Código DANE y nombre son obligatorios","error");return;}
    if(ciudades.find(c=>c.code===form.code.trim())){showToast("Ya existe esa ciudad","error");return;}
    setCiudades(prev=>[...prev,{code:form.code.trim(),name:form.name.trim()}].sort((a,b)=>a.name.localeCompare(b.name)));
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
        <ModalCSVCiudades onClose={()=>setModCSV(false)} onImportar={nuevas=>{
          setCiudades(prev=>{
            const existentes=new Set(prev.map(c=>c.code));
            const filtradas=nuevas.filter(c=>!existentes.has(c.code));
            return [...prev,...filtradas].sort((a,b)=>a.name.localeCompare(b.name));
          });
          setModCSV(false);
          showToast(`✓ ${nuevas.length} ciudad(es) importada(s)`,"success");
        }}/>
      )}
    </div>
  );
}

// ─── Paqueterías (gestión) ────────────────────────────────────────────────────

function GestionPaqueterias({ paqueterias, setPaqueterias, showToast }) {
  const [nueva,setNueva]=useState("");
  const agregar=()=>{
    if(!nueva.trim()){showToast("Escribe el nombre de la empresa","error");return;}
    if(paqueterias.includes(nueva.trim())){showToast("Ya existe esa empresa","error");return;}
    setPaqueterias(prev=>[...prev,nueva.trim()].sort());
    setNueva("");
    showToast("✓ Empresa de paquetería agregada","success");
  };
  return (
    <div>
      <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}>📦 Empresas de Paquetería</h2>
      <Card style={{marginBottom:20}}>
        <p style={{fontSize:13,color:"#64748b",margin:"0 0 14px"}}>Agrega aquí las empresas de paquetería que aparecen en el selector al crear pedidos.</p>
        <div style={{display:"flex",gap:10}}>
          <input value={nueva} onChange={e=>setNueva(e.target.value)} placeholder="Nombre empresa (ej: Mensajeros Urbanos)"
            style={{...iSt,flex:1}} onKeyDown={e=>e.key==="Enter"&&agregar()}/>
          <Btn onClick={agregar}>+ Agregar</Btn>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {paqueterias.map((p,i)=>(
          <Card key={i} style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:600,color:"#334155"}}>📦 {p}</span>
            <button onClick={()=>{setPaqueterias(prev=>prev.filter(x=>x!==p));showToast("Eliminado","info");}}
              style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:18,padding:0,lineHeight:1}}>×</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

function SidebarApp({ user, activeTab, setActiveTab, onLogout, collapsed, setCollapsed }) {
  const menus = {
    admin:        [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["transportistas","🏢","Transportistas"],["resumen","📋","Resumen Transportador"],["devoluciones","↩️","Devoluciones"],["recogidas","🔄","Recogidas"],["ciudades","🏙️","Ciudades / DANE"],["paqueterias","📦","Paqueterías"],["usuarios","👥","Usuarios"]],
    operador:     [["dashboard","📊","Dashboard"],["pedidos","📦","Pedidos"],["rastreo","🗺️","Rastreo GPS"],["conductores","🚗","Conductores"],["resumen","📋","Resumen Transportador"],["devoluciones","↩️","Devoluciones"],["recogidas","🔄","Recogidas"]],
    transportista:[["mi_empresa","🏢","Mi Empresa"]],
    conductor:    [["mis_pedidos","📦","Mis Pedidos"],["mi_ubicacion","📍","Mi Ubicación GPS"]],
    cliente:      [["consultas","🔍","Estado Pedidos"],["devoluciones","↩️","Mis Devoluciones"],["recogidas","🔄","Mis Recogidas"]],
  };
  const items=menus[user.rol]||[];
  return (
    <div style={{width:collapsed?60:230,minHeight:"100vh",background:`linear-gradient(180deg,${P[950]} 0%,${P[800]} 100%)`,display:"flex",flexDirection:"column",transition:"width .25s",flexShrink:0}}>
      <div style={{padding:collapsed?"16px 10px":"18px 16px",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",borderBottom:`1px solid ${P[700]}50`}}>
        {!collapsed&&<div style={{display:"flex",alignItems:"center",gap:10}}><Logo size={32}/><div><div style={{color:"#fff",fontWeight:900,fontSize:13,lineHeight:1.1}}>Somos PRO</div><div style={{color:P[400],fontSize:10}}>Tracking</div></div></div>}
        {collapsed&&<Logo size={34}/>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{background:`${P[700]}60`,border:"none",color:P[300],cursor:"pointer",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>{collapsed?"›":"‹"}</button>
      </div>
      {!collapsed&&(
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${P[700]}40`}}>
          <div style={{width:36,height:36,borderRadius:18,background:`linear-gradient(135deg,${P[500]},${P[400]})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:15,marginBottom:8}}>{user.nombre[0].toUpperCase()}</div>
          <div style={{color:"#fff",fontSize:13,fontWeight:700}}>{user.nombre}</div>
          <div style={{color:P[400],fontSize:11,marginTop:2}}>{ROLES[user.rol]||user.rol}</div>
        </div>
      )}
      <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
        {items.map(([t,icon,label])=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{width:"100%",padding:collapsed?"11px":"11px 16px",background:activeTab===t?`${P[600]}60`:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,color:activeTab===t?"#fff":P[400],fontWeight:activeTab===t?700:500,fontSize:13,fontFamily:"inherit",borderLeft:activeTab===t?`3px solid ${P[300]}`:"3px solid transparent",justifyContent:collapsed?"center":"flex-start",transition:"all .15s"}}>
            <span style={{fontSize:16}}>{icon}</span>
            {!collapsed&&label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout} style={{padding:collapsed?"12px":"12px 16px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,color:"#f87171",fontSize:13,fontFamily:"inherit",fontWeight:600,borderTop:`1px solid ${P[700]}40`,justifyContent:collapsed?"center":"flex-start"}}>
        <span>🚪</span>{!collapsed&&"Cerrar Sesión"}
      </button>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function MiUbicacion() {
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [on,  setOn]  = useState(false);
  const [err, setErr] = useState("");
  const wRef = useRef(null);

  const iniciar = () => {
    setErr("");
    if (!navigator.geolocation) { setErr("Tu dispositivo no soporta GPS."); return; }
    wRef.current = navigator.geolocation.watchPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setOn(true); },
      e   => { setErr(`Error GPS: ${e.message}`); setOn(false); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  };
  const detener = () => { if (wRef.current !== null) navigator.geolocation.clearWatch(wRef.current); setOn(false); };
  useEffect(() => () => { if (wRef.current !== null) navigator.geolocation.clearWatch(wRef.current); }, []);

  const mapUrl = lat && lng ? `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=16` : `https://maps.google.com/maps?q=4.711,-74.072&output=embed&z=11`;
  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900 }}>📍 Mi Ubicación GPS</h2>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, fontSize: 14 }}>
            {lat && lng ? <><strong>Lat:</strong> {lat.toFixed(6)} · <strong>Lng:</strong> {lng.toFixed(6)}</> : <span style={{ color: "#94a3b8" }}>Presiona el botón para activar tu GPS</span>}
            {on && <span style={{ marginLeft: 12, color: "#059669", fontWeight: 700, fontSize: 12 }}>● Compartiendo</span>}
          </div>
          <Btn variant={on ? "danger" : "success"} onClick={on ? detener : iniciar}>{on ? "⏸ Detener GPS" : "▶ Activar GPS"}</Btn>
        </div>
        {err && <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0 0" }}>⚠️ {err}</p>}
      </Card>
      <div style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${P[200]}` }}>
        <iframe title="mi-ubicacion" src={mapUrl} width="100%" height="360" style={{ border: "none", display: "block" }} allowFullScreen loading="lazy" />
      </div>
    </div>
  );
}

function Consultas({ pedidos, conductores, ciudades, devoluciones = [], recogidas = [], showToast }) {
  const [busq, setBusq] = useState("");
  const [modDet, setModDet] = useState(null);
  const filtP = pedidos.filter(p => {
    const q = busq.toLowerCase();
    return !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.factura?.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
  });
  const filtDV = devoluciones.filter(d=>{
    const q=busq.toLowerCase();
    return !busq||d.guia.toLowerCase().includes(q)||d.factura?.toLowerCase().includes(q)||d.pedido_ref?.toLowerCase().includes(q);
  });
  const filtRC = recogidas.filter(r=>{
    const q=busq.toLowerCase();
    return !busq||r.guia.toLowerCase().includes(q)||(r.ciudad_recogida_nombre||"").toLowerCase().includes(q)||(r.ciudad_entrega_nombre||"").toLowerCase().includes(q);
  });
  const filt = filtP;
  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900 }}>🔍 Estado de Pedidos</h2>
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar por N° pedido, factura, cliente o ciudad..."
          style={iSt} />
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filt.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", padding: 32 }}>Sin resultados.</p>}
        {filt.map(p => {
          const cond = conductores.find(c => c.id === p.conductor_id);
          return (
            <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: 18 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, color: P[700], fontSize: 16 }}>{p.id}</span>
                  <Badge estado={p.estado} />
                  {p.tipo === "paqueteria" && <span style={{ fontSize: 11, color: "#0891b2", fontWeight: 700 }}>📦 {p.paqueteria}</span>}
                </div>
                <div style={{ fontWeight: 600, color: "#1e293b" }}>{p.cliente}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  📦 Factura: {p.factura} · {p.cajas} cajas · 🏙️ {p.ciudad_nombre} · 📍 {p.direccion}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {p.tipo === "paqueteria" ? `Guía: ${p.guia_paqueteria}` : cond ? `🚗 ${cond.nombre} · ${p.placa}` : "Sin conductor asignado"}
                  {" · "}📅 {p.fecha_estimada || "—"}
                  {p.fecha_real && <span style={{ color: "#059669" }}> · ✅ {p.fecha_real}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {p.soportes?.length > 0 && <Btn size="sm" variant="success" onClick={() => showToast(`📎 ${p.soportes.length} soporte(s) disponible(s)`, "info")}>⬇ Soportes</Btn>}
                <Btn size="sm" variant="secondary" onClick={() => setModDet(p)}>Ver</Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {modDet && <ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} onClose={() => setModDet(null)} setPedidos={() => {}} showToast={showToast} canEdit={false} />}

      {/* Devoluciones */}
      {filtDV.length > 0 && (
        <div style={{marginTop:28}}>
          <h3 style={{color:"#dc2626",fontWeight:800,margin:"0 0 14px"}}>↩️ Devoluciones ({filtDV.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtDV.map(d=>(
              <Card key={d.id} style={{padding:16,borderLeft:"4px solid #dc2626"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontWeight:900,color:"#dc2626",fontSize:15,fontFamily:"monospace"}}>{d.guia}</span>
                      <Badge estado={d.estado}/>
                      {d.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
                    </div>
                    <div style={{fontSize:13,color:"#64748b"}}>Factura: <strong>{d.factura}</strong> · Pedido: <strong>{d.pedido_ref}</strong> · {d.unidades} uds · {d.ciudad_nombre}</div>
                    <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>Motivo: {d.motivo}</div>
                    {d.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>✅ Completado: {d.fecha_real}</div>}
                  </div>
                  <Btn size="sm" variant="secondary" onClick={()=>showToast("Abre el módulo Devoluciones para ver el detalle","info")}>Ver detalle</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recogidas */}
      {filtRC.length > 0 && (
        <div style={{marginTop:28}}>
          <h3 style={{color:"#059669",fontWeight:800,margin:"0 0 14px"}}>🔄 Recogidas ({filtRC.length})</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtRC.map(r=>(
              <Card key={r.id} style={{padding:16,borderLeft:"4px solid #059669"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontWeight:900,color:"#059669",fontSize:15,fontFamily:"monospace"}}>{r.guia}</span>
                      <Badge estado={r.estado}/>
                      {r.novedad&&<span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
                    </div>
                    <div style={{fontSize:13,color:"#64748b"}}>{r.ciudad_recogida_nombre} → {r.ciudad_entrega_nombre} · {r.unidades} uds · {r.volumen_m3} m³</div>
                    {r.observaciones&&<div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{r.observaciones}</div>}
                    {r.fecha_real&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>✅ Entregado: {r.fecha_real}</div>}
                  </div>
                  <Btn size="sm" variant="secondary" onClick={()=>showToast("Abre el módulo Recogidas para ver el detalle","info")}>Ver detalle</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MÓDULO DEVOLUCIONES
// ══════════════════════════════════════════════════════════
function ModuloDevoluciones({ devoluciones, setDevoluciones, conductores, ciudades, showToast, user }) {
  const [modNueva, setModNueva] = useState(false);
  const [modDet,   setModDet]   = useState(null);
  const [busq,     setBusq]     = useState("");
  const fileRef = useRef(null);

  const vacio = {
    factura:"", pedido_ref:"", unidades:"", volumen_m3:"", peso_kg:"",
    dir_recogida:"", ciudad_codigo:"", motivo:"",
    conductor_id:"", soporte_data:null, soporte_nombre:"",
  };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const cargarDoc = async (files) => {
    const file = files[0];
    if (!file) return;
    const data = await fileToBase64(file);
    setForm(p=>({...p, soporte_data:data, soporte_nombre:file.name}));
  };

  const crear = () => {
    const req = ["factura","pedido_ref","unidades","volumen_m3","peso_kg","dir_recogida","ciudad_codigo","motivo"];
    for (const k of req) {
      if (!form[k].toString().trim()) { showToast("Todos los campos son obligatorios","error"); return; }
    }
    const ciudad = ciudades.find(c=>c.code===form.ciudad_codigo);
    const cond   = conductores.find(c=>c.id===parseInt(form.conductor_id));
    const guia   = generarGuiaDV(devoluciones);
    const nueva  = {
      id: guia, guia, tipo_modulo:"devolucion",
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
      soporte_data: form.soporte_data,
      soporte_nombre: form.soporte_nombre,
      fecha_creacion: new Date().toISOString().split("T")[0],
      fecha_real: null, novedad: false,
      solicitado_por: user.nombre||user.user,
    };
    setDevoluciones(prev=>[nueva,...prev]);
    setModNueva(false); setForm(vacio);
    showToast(`✓ Devolución creada · Guía: ${guia}`,"success");
  };

  const asignar = (id, condId, novedad) => {
    const cond = conductores.find(c=>c.id===parseInt(condId));
    setDevoluciones(prev=>prev.map(d=>d.id===id?{
      ...d,
      conductor_id: cond?cond.id:null,
      placa: cond?cond.placa:null,
      nit_proveedor: cond?cond.nit_proveedor:null,
      estado: cond?"en_transito":"sin_asignar",
      novedad: novedad!==undefined?novedad:d.novedad,
    }:d));
  };

  const marcarEntregado = (id, novedad) => {
    const hoy = new Date().toISOString().split("T")[0];
    setDevoluciones(prev=>prev.map(d=>d.id===id?{
      ...d, estado: novedad?"novedad":"entregado", fecha_real:hoy, novedad
    }:d));
  };

  const filt = devoluciones.filter(d=>{
    const q=busq.toLowerCase();
    return !busq||d.guia.toLowerCase().includes(q)||d.factura.toLowerCase().includes(q)||d.pedido_ref.toLowerCase().includes(q)||(d.ciudad_nombre||"").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>↩️ Devoluciones</h2>
        <Btn size="sm" onClick={()=>setModNueva(true)}>+ Nueva Devolución</Btn>
      </div>

      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)}
          placeholder="🔍 Buscar por guía DV, factura, pedido o ciudad..." style={iSt}/>
        <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>{filt.length} devolución(es) registrada(s)</div>
      </Card>

      {/* Tabla */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:P[50]}}>
              {["Guía DV","Factura","Pedido Ref.","Ciudad Recogida","Uds","Vol m³","Peso kg","Estado","Conductor","Acciones"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.length===0&&<tr><td colSpan={10} style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Sin devoluciones registradas</td></tr>}
              {filt.map((d,i)=>{
                const cond=conductores.find(c=>c.id===d.conductor_id);
                return (
                  <tr key={d.id} style={{borderTop:`1px solid ${P[100]}`,background:i%2?"#fafafa":"#fff"}}>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:800,color:"#dc2626"}}>{d.guia}</td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12}}>{d.factura}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:P[700]}}>{d.pedido_ref}</td>
                    <td style={{padding:"10px 12px",fontSize:12}}>{d.ciudad_nombre}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700}}>{d.unidades}</td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>{d.volumen_m3}</td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>{d.peso_kg}</td>
                    <td style={{padding:"10px 12px"}}><Badge estado={d.estado}/></td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#64748b"}}>{cond?cond.nombre:<span style={{color:"#ef4444"}}>Sin asignar</span>}</td>
                    <td style={{padding:"10px 12px"}}><Btn size="sm" variant="secondary" onClick={()=>setModDet(d)}>Ver</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal nueva devolución */}
      {modNueva && (
        <Modal title="Nueva Solicitud de Devolución" onClose={()=>{setModNueva(false);setForm(vacio);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fef2f2",borderRadius:10,padding:10,fontSize:12,color:"#dc2626",fontWeight:600}}>
              Se generará automáticamente una Guía de Devolución (DV-{new Date().getFullYear()}-XXXX). Todos los campos son obligatorios.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="N° Factura *"     value={form.factura}     onChange={f("factura")}     placeholder="FAC-2200"/>
              <Field label="N° Pedido Ref. *" value={form.pedido_ref}  onChange={f("pedido_ref")}  placeholder="PED-001"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Field label="Unidades *"   value={form.unidades}   onChange={f("unidades")}   type="number" placeholder="5"/>
              <Field label="Volumen m³ *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
              <Field label="Peso kg *"    value={form.peso_kg}    onChange={f("peso_kg")}    type="number" placeholder="10"/>
            </div>
            <Field label="Dirección de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
            <Field label="Ciudad de Recogida (DANE) *" value={form.ciudad_codigo} onChange={f("ciudad_codigo")} as="select"
              options={[{value:"",label:"— Seleccione ciudad —"},...ciudades.map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
            <Field label="Motivo de Devolución *" value={form.motivo} onChange={f("motivo")} as="textarea" placeholder="Producto dañado, error en pedido, etc."/>
            <Field label="Asignar Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
              options={[{value:"",label:"— Sin asignar —"},...conductores.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}`}))]}/>
            {/* Soporte */}
            <div>
              <label style={{fontSize:12,fontWeight:700,color:P[700],textTransform:"uppercase",letterSpacing:0.5}}>Soporte (imagen o PDF)</label>
              <div style={{display:"flex",gap:10,marginTop:6,alignItems:"center"}}>
                <Btn size="sm" variant="secondary" onClick={()=>fileRef.current&&fileRef.current.click()}>📎 Adjuntar archivo</Btn>
                {form.soporte_nombre&&<span style={{fontSize:12,color:"#059669",fontWeight:600}}>✓ {form.soporte_nombre}</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn onClick={crear}>💾 Crear Devolución</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal detalle devolución */}
      {modDet && (
        <ModalDetalleDV
          dev={modDet}
          conductores={conductores}
          ciudades={ciudades}
          onClose={()=>setModDet(null)}
          onAsignar={asignar}
          onEntregado={marcarEntregado}
          showToast={showToast}
          canEdit={user.rol!=="cliente"}
        />
      )}
    </div>
  );
}

function ModalDetalleDV({ dev, conductores, ciudades, onClose, onAsignar, onEntregado, showToast, canEdit }) {
  const [condId,  setCondId]  = useState(dev.conductor_id?.toString()||"");
  const [novedad, setNovedad] = useState(dev.novedad||false);
  const ciudad = ciudades.find(c=>c.code===dev.ciudad_codigo);
  const cond   = conductores.find(c=>c.id===parseInt(condId||dev.conductor_id));

  const guardar = () => {
    onAsignar(dev.id, condId, novedad);
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
        {/* Info */}
        <div style={{background:"#fef2f2",borderRadius:12,padding:16,border:"1px solid #fca5a5"}}>
          <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>↩️ {dev.guia}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,fontSize:13,color:"#64748b"}}>
            <span>📋 Factura: <strong>{dev.factura}</strong></span>
            <span>📦 Pedido: <strong>{dev.pedido_ref}</strong></span>
            <span>🔢 Unidades: <strong>{dev.unidades}</strong></span>
            <span>📐 Vol: <strong>{dev.volumen_m3} m³</strong></span>
            <span>⚖️ Peso: <strong>{dev.peso_kg} kg</strong></span>
            <span>🏙️ {dev.ciudad_nombre}</span>
            <span>📍 {dev.dir_recogida}</span>
            <span>📅 Creado: {dev.fecha_creacion}</span>
            {dev.fecha_real&&<span style={{color:"#059669"}}>✅ Recogido: {dev.fecha_real}</span>}
          </div>
          <div style={{marginTop:10,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:13,color:"#92400e"}}>
            📝 Motivo: {dev.motivo}
          </div>
          {dev.solicitado_por&&<div style={{marginTop:6,fontSize:12,color:"#94a3b8"}}>Solicitado por: {dev.solicitado_por}</div>}
        </div>

        {/* Estado actual */}
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontWeight:700,fontSize:13,color:P[800]}}>Estado:</span>
          <Badge estado={dev.estado}/>
          {dev.novedad&&<span style={{fontSize:12,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
        </div>

        {/* Soporte adjunto */}
        {dev.soporte_data&&(
          <div style={{background:"#f0fdf4",borderRadius:10,padding:12,border:"1px solid #86efac"}}>
            <div style={{fontWeight:700,color:"#15803d",marginBottom:8,fontSize:13}}>📎 Soporte adjunto: {dev.soporte_nombre}</div>
            {dev.soporte_data.startsWith("data:image")?(
              <img src={dev.soporte_data} alt="soporte" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:`1px solid ${P[200]}`}}/>
            ):(
              <Btn size="sm" variant="success" onClick={()=>window.open(dev.soporte_data,"_blank")}>Ver PDF</Btn>
            )}
          </div>
        )}

        {/* Asignación conductor (solo admin/operador) */}
        {canEdit&&(
          <>
            <Field label="Asignar Conductor (al asignar → En Tránsito)" value={condId} onChange={setCondId} as="select"
              options={[{value:"",label:"— Sin asignar —"},...conductores.map(c=>({value:c.id.toString(),label:`${c.nombre} · ${c.placa}`}))]}/>
            <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
              onClick={()=>setNovedad(!novedad)}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {novedad&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad al completar</span>
            </div>
          </>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
          <div>
            {canEdit&&dev.estado!=="entregado"&&dev.estado!=="novedad"&&(
              <Btn variant="success" onClick={marcar}>✓ Marcar Recogida Completada</Btn>
            )}
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {canEdit&&<Btn onClick={guardar}>💾 Guardar</Btn>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════
//  MÓDULO RECOGIDAS
// ══════════════════════════════════════════════════════════
function ModuloRecogidas({ recogidas, setRecogidas, conductores, ciudades, showToast, user }) {
  const [modNueva, setModNueva] = useState(false);
  const [modDet,   setModDet]   = useState(null);
  const [busq,     setBusq]     = useState("");
  const fileRef = useRef(null);

  const vacio = {
    dir_recogida:"", ciudad_recogida_cod:"",
    dir_entrega:"",  ciudad_entrega_cod:"",
    unidades:"", volumen_m3:"", peso_kg:"",
    observaciones:"", conductor_id:"",
    doc_data:null, doc_nombre:"",
  };
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const cargarDoc = async (files) => {
    const file = files[0];
    if (!file) return;
    const data = await fileToBase64(file);
    setForm(p=>({...p, doc_data:data, doc_nombre:file.name}));
  };

  const crear = () => {
    const req = ["dir_recogida","ciudad_recogida_cod","dir_entrega","ciudad_entrega_cod","unidades","volumen_m3","peso_kg"];
    for (const k of req) {
      if (!form[k].toString().trim()) { showToast("Todos los campos marcados son obligatorios","error"); return; }
    }
    const crec = ciudades.find(c=>c.code===form.ciudad_recogida_cod);
    const cent = ciudades.find(c=>c.code===form.ciudad_entrega_cod);
    const cond = conductores.find(c=>c.id===parseInt(form.conductor_id));
    const guia = generarGuiaRC(recogidas);
    const nueva = {
      id: guia, guia, tipo_modulo:"recogida",
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
      doc_data: form.doc_data,
      doc_nombre: form.doc_nombre,
      fecha_creacion: new Date().toISOString().split("T")[0],
      fecha_real: null, novedad: false,
      solicitado_por: user.nombre||user.user,
    };
    setRecogidas(prev=>[nueva,...prev]);
    setModNueva(false); setForm(vacio);
    showToast(`✓ Recogida creada · Guía: ${guia}`,"success");
  };

  const asignar = (id, condId, novedad) => {
    const cond = conductores.find(c=>c.id===parseInt(condId));
    setRecogidas(prev=>prev.map(r=>r.id===id?{
      ...r,
      conductor_id: cond?cond.id:null,
      placa: cond?cond.placa:null,
      nit_proveedor: cond?cond.nit_proveedor:null,
      estado: cond?"en_transito":"sin_asignar",
      novedad: novedad!==undefined?novedad:r.novedad,
    }:r));
  };

  const marcarEntregado = (id, novedad) => {
    const hoy = new Date().toISOString().split("T")[0];
    setRecogidas(prev=>prev.map(r=>r.id===id?{
      ...r, estado: novedad?"novedad":"entregado", fecha_real:hoy, novedad
    }:r));
  };

  const filt = recogidas.filter(r=>{
    const q=busq.toLowerCase();
    return !busq||r.guia.toLowerCase().includes(q)||(r.ciudad_recogida_nombre||"").toLowerCase().includes(q)||(r.ciudad_entrega_nombre||"").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,color:P[800],fontWeight:900}}>🔄 Solicitudes de Recogida</h2>
        <Btn size="sm" onClick={()=>setModNueva(true)}>+ Nueva Recogida</Btn>
      </div>

      <Card style={{padding:14,marginBottom:16}}>
        <input value={busq} onChange={e=>setBusq(e.target.value)}
          placeholder="🔍 Buscar por guía RC, ciudad recogida o entrega..." style={iSt}/>
        <div style={{marginTop:8,fontSize:12,color:"#64748b"}}>{filt.length} recogida(s) registrada(s)</div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:P[50]}}>
              {["Guía RC","Recogida en","Entrega en","Uds","Vol m³","Peso kg","Estado","Conductor","Acciones"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:P[700],fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filt.length===0&&<tr><td colSpan={9} style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Sin recogidas registradas</td></tr>}
              {filt.map((r,i)=>{
                const cond=conductores.find(c=>c.id===r.conductor_id);
                return (
                  <tr key={r.id} style={{borderTop:`1px solid ${P[100]}`,background:i%2?"#fafafa":"#fff"}}>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontWeight:800,color:"#059669"}}>{r.guia}</td>
                    <td style={{padding:"10px 12px",fontSize:12}}>
                      <div style={{fontWeight:600}}>{r.ciudad_recogida_nombre}</div>
                      <div style={{color:"#94a3b8",fontSize:11}}>{r.dir_recogida}</div>
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12}}>
                      <div style={{fontWeight:600}}>{r.ciudad_entrega_nombre}</div>
                      <div style={{color:"#94a3b8",fontSize:11}}>{r.dir_entrega}</div>
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700}}>{r.unidades}</td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>{r.volumen_m3}</td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>{r.peso_kg}</td>
                    <td style={{padding:"10px 12px"}}><Badge estado={r.estado}/></td>
                    <td style={{padding:"10px 12px",fontSize:12,color:"#64748b"}}>{cond?cond.nombre:<span style={{color:"#ef4444"}}>Sin asignar</span>}</td>
                    <td style={{padding:"10px 12px"}}><Btn size="sm" variant="secondary" onClick={()=>setModDet(r)}>Ver</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {modNueva && (
        <Modal title="Nueva Solicitud de Recogida" onClose={()=>{setModNueva(false);setForm(vacio);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#ecfdf5",borderRadius:10,padding:10,fontSize:12,color:"#059669",fontWeight:600}}>
              Se generará automáticamente una Guía de Recogida (RC-{new Date().getFullYear()}-XXXX). Campos marcados * son obligatorios.
            </div>
            <div style={{borderLeft:`3px solid #dc2626`,paddingLeft:12}}>
              <p style={{margin:"0 0 10px",fontWeight:700,color:"#dc2626",fontSize:13}}>📍 PUNTO DE RECOGIDA</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Dirección de Recogida *" value={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47"/>
                <Field label="Ciudad Recogida (DANE) *" value={form.ciudad_recogida_cod} onChange={f("ciudad_recogida_cod")} as="select"
                  options={[{value:"",label:"— Seleccione —"},...ciudades.map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
              </div>
            </div>
            <div style={{borderLeft:`3px solid #059669`,paddingLeft:12}}>
              <p style={{margin:"0 0 10px",fontWeight:700,color:"#059669",fontSize:13}}>📍 PUNTO DE ENTREGA</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Dirección de Entrega *" value={form.dir_entrega} onChange={f("dir_entrega")} placeholder="Av 6N #23-10"/>
                <Field label="Ciudad Entrega (DANE) *" value={form.ciudad_entrega_cod} onChange={f("ciudad_entrega_cod")} as="select"
                  options={[{value:"",label:"— Seleccione —"},...ciudades.map(c=>({value:c.code,label:`${c.name} — ${c.code}`}))]}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Field label="Unidades *"   value={form.unidades}   onChange={f("unidades")}   type="number" placeholder="5"/>
              <Field label="Volumen m³ *" value={form.volumen_m3} onChange={f("volumen_m3")} type="number" placeholder="0.5"/>
              <Field label="Peso kg *"    value={form.peso_kg}    onChange={f("peso_kg")}    type="number" placeholder="10"/>
            </div>
            <Field label="Observaciones" value={form.observaciones} onChange={f("observaciones")} as="textarea" placeholder="Instrucciones especiales, horario de recogida, contacto..."/>
            <Field label="Asignar Conductor (opcional)" value={form.conductor_id} onChange={f("conductor_id")} as="select"
              options={[{value:"",label:"— Sin asignar —"},...conductores.map(c=>({value:c.id,label:`${c.nombre} · ${c.placa}`}))]}/>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:P[700],textTransform:"uppercase",letterSpacing:0.5}}>Documento de Entrega (imagen o PDF)</label>
              <div style={{display:"flex",gap:10,marginTop:6,alignItems:"center"}}>
                <Btn size="sm" variant="secondary" onClick={()=>fileRef.current&&fileRef.current.click()}>📎 Adjuntar documento</Btn>
                {form.doc_nombre&&<span style={{fontSize:12,color:"#059669",fontWeight:600}}>✓ {form.doc_nombre}</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>cargarDoc(e.target.files)}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setModNueva(false);setForm(vacio);}}>Cancelar</Btn>
              <Btn onClick={crear}>💾 Crear Recogida</Btn>
            </div>
          </div>
        </Modal>
      )}

      {modDet && (
        <ModalDetalleRC
          rec={modDet}
          conductores={conductores}
          ciudades={ciudades}
          onClose={()=>setModDet(null)}
          onAsignar={asignar}
          onEntregado={marcarEntregado}
          showToast={showToast}
          canEdit={user.rol!=="cliente"}
        />
      )}
    </div>
  );
}

function ModalDetalleRC({ rec, conductores, ciudades, onClose, onAsignar, onEntregado, showToast, canEdit }) {
  const [condId,  setCondId]  = useState(rec.conductor_id?.toString()||"");
  const [novedad, setNovedad] = useState(rec.novedad||false);
  const cond = conductores.find(c=>c.id===parseInt(condId||rec.conductor_id));

  const guardar = () => {
    onAsignar(rec.id, condId, novedad);
    showToast("✓ Recogida actualizada","success");
    onClose();
  };
  const marcar = () => {
    onEntregado(rec.id, novedad);
    showToast(novedad?"✓ Marcada con novedad":"✓ Recogida entregada","success");
    onClose();
  };

  return (
    <Modal title={`Recogida ${rec.guia}`} onClose={onClose} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:"#fef2f2",borderRadius:12,padding:14,border:"1px solid #fca5a5"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#dc2626",textTransform:"uppercase",marginBottom:8}}>📍 Recogida</div>
            <div style={{fontWeight:700,color:"#334155"}}>{rec.ciudad_recogida_nombre}</div>
            <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{rec.dir_recogida}</div>
          </div>
          <div style={{background:"#ecfdf5",borderRadius:12,padding:14,border:"1px solid #86efac"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#059669",textTransform:"uppercase",marginBottom:8}}>📍 Entrega</div>
            <div style={{fontWeight:700,color:"#334155"}}>{rec.ciudad_entrega_nombre}</div>
            <div style={{fontSize:13,color:"#64748b",marginTop:4}}>{rec.dir_entrega}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {[["🔢 Unidades",rec.unidades],["📐 Volumen",`${rec.volumen_m3} m³`],["⚖️ Peso",`${rec.peso_kg} kg`],["📅 Creado",rec.fecha_creacion],[rec.fecha_real?"✅ Entregado":"📅 Pendiente",rec.fecha_real||"—"]].map(([k,v])=>(
            <div key={k} style={{background:P[50],borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:11,color:P[700],fontWeight:700}}>{k}</div>
              <div style={{fontWeight:800,color:"#1e293b",marginTop:4}}>{v}</div>
            </div>
          ))}
        </div>
        {rec.observaciones&&(
          <div style={{background:"#fffbeb",borderRadius:10,padding:12,fontSize:13,color:"#92400e"}}>📝 {rec.observaciones}</div>
        )}
        {rec.solicitado_por&&<div style={{fontSize:12,color:"#94a3b8"}}>Solicitado por: {rec.solicitado_por}</div>}
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontWeight:700,fontSize:13,color:P[800]}}>Estado:</span>
          <Badge estado={rec.estado}/>
          {rec.novedad&&<span style={{fontSize:12,color:"#dc2626",fontWeight:700}}>⚠️ Con Novedad</span>}
        </div>
        {rec.doc_data&&(
          <div style={{background:"#f0fdf4",borderRadius:10,padding:12,border:"1px solid #86efac"}}>
            <div style={{fontWeight:700,color:"#15803d",marginBottom:8,fontSize:13}}>📎 Documento: {rec.doc_nombre}</div>
            {rec.doc_data.startsWith("data:image")?(
              <img src={rec.doc_data} alt="doc" style={{maxWidth:"100%",maxHeight:200,borderRadius:8}}/>
            ):(
              <Btn size="sm" variant="success" onClick={()=>window.open(rec.doc_data,"_blank")}>Ver PDF</Btn>
            )}
          </div>
        )}
        {canEdit&&(
          <>
            <Field label="Asignar Conductor (al asignar → En Tránsito)" value={condId} onChange={setCondId} as="select"
              options={[{value:"",label:"— Sin asignar —"},...conductores.map(c=>({value:c.id.toString(),label:`${c.nombre} · ${c.placa}`}))]}/>
            <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"10px 14px",cursor:"pointer"}}
              onClick={()=>setNovedad(!novedad)}>
              <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {novedad&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontSize:13,fontWeight:700,color:novedad?"#dc2626":P[800]}}>Marcar con Novedad al entregar</span>
            </div>
          </>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
          <div>
            {canEdit&&rec.estado!=="entregado"&&rec.estado!=="novedad"&&(
              <Btn variant="success" onClick={marcar}>✓ Marcar Entregado</Btn>
            )}
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {canEdit&&<Btn onClick={guardar}>💾 Guardar</Btn>}
          </div>
        </div>
      </div>
    </Modal>
  );
}


function Login({ onLogin, usuarios }) {
  const [u,   setU]   = useState("");
  const [p,   setP]   = useState("");
  const [err, setErr] = useState("");

  const login = (e) => {
    e.preventDefault();
    setErr("");
    const found = usuarios.find(x => x.user === u.trim() && x.pass === p);
    if (found) onLogin(found);
    else setErr("Usuario o contraseña incorrectos.");
  };

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
  const [pedidos,        setPedidos]        = useState(PEDIDOS_INICIALES);
  const [conductores,    setConductores]    = useState(CONDUCTORES_INICIALES);
  const [transportistas, setTransportistas] = useState(TRANSPORTISTAS_INICIALES);
  const [usuarios,       setUsuarios]       = useState(USUARIOS_INICIALES);
  const [ciudades,       setCiudades]       = useState(CIUDADES_BASE);
  const [paqueterias,    setPaqueterias]    = useState(PAQUETERIAS_INICIALES);
  const [devoluciones,   setDevoluciones]   = useState([]);
  const [recogidas,      setRecogidas]      = useState([]);
  const [collapsed,      setCollapsed]      = useState(false);
  const [toast,          setToast]          = useState(null);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const handleLogin = (u) => {
    setUser(u);
    const def = { admin: "dashboard", operador: "dashboard", transportista: "mi_empresa", conductor: "mis_pedidos", cliente: "consultas" };
    setTab(def[u.rol] || "dashboard");
  };

  useEffect(() => {
    const check = () => setCollapsed(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!user) return <Login onLogin={handleLogin} usuarios={usuarios} />;

  const props = { pedidos, setPedidos, conductores, setConductores, usuarios, setUsuarios, showToast, user };

  const renderContent = () => {
    switch (tab) {
      case "dashboard":      return <Dashboard pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas}/>;
      case "pedidos":        return <Pedidos pedidos={pedidos} setPedidos={setPedidos} conductores={conductores} ciudades={ciudades} showToast={showToast} paqueterias={paqueterias}/>;
      case "rastreo":        return <RastreoGPS pedidos={pedidos} conductores={conductores} ciudades={ciudades}/>;
      case "conductores":    return <Conductores conductores={conductores} setConductores={setConductores} pedidos={pedidos} showToast={showToast} usuarios={usuarios} setUsuarios={setUsuarios} transportistas={transportistas}/>;
      case "transportistas": return <Transportistas transportistas={transportistas} setTransportistas={setTransportistas} conductores={conductores} setConductores={setConductores} showToast={showToast} user={{rol:"admin",nombre:"Admin"}} usuarios={usuarios} setUsuarios={setUsuarios}/>;
      case "resumen":        return <ResumenTransportador pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas}/>;
      case "ciudades":       return <Ciudades ciudades={ciudades} setCiudades={setCiudades} showToast={showToast}/>;
      case "paqueterias":    return <GestionPaqueterias paqueterias={paqueterias} setPaqueterias={setPaqueterias} showToast={showToast}/>;
      case "usuarios":       return <Usuarios usuarios={usuarios} setUsuarios={setUsuarios} showToast={showToast}/>;
      case "mi_empresa":     return <Transportistas transportistas={transportistas} setTransportistas={setTransportistas} conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} usuarios={usuarios} setUsuarios={setUsuarios}/>;
      case "mis_pedidos":    return <MisPedidosConductor pedidos={pedidos} setPedidos={setPedidos} user={user} conductores={conductores} ciudades={ciudades} showToast={showToast}/>;
      case "mi_ubicacion":   return <MiUbicacion/>;
      case "consultas":      return <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
      case "devoluciones":   return <ModuloDevoluciones devoluciones={devoluciones} setDevoluciones={setDevoluciones} conductores={conductores} ciudades={ciudades} showToast={showToast} user={user}/>;
      case "recogidas":      return <ModuloRecogidas recogidas={recogidas} setRecogidas={setRecogidas} conductores={conductores} ciudades={ciudades} showToast={showToast} user={user}/>;
      default:               return <Dashboard pedidos={pedidos} conductores={conductores}/>;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f5ff" }}>
      <SidebarApp user={user} activeTab={tab} setActiveTab={setTab} onLogout={() => setUser(null)} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: "100%", boxSizing: "border-box" }}>
        {renderContent()}
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

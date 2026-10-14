import React from 'react';
import { createPortal } from 'react-dom';
import { P } from '../../Constants';
import { Logo, Badge, Btn, Modal } from '../../Subcomponentes';

export function GuiaImprimible({ pedido, conductores, ciudades, onClose }) {
 const cond = conductores.find(c=>c.id===pedido.conductor_id);
 const ciudad= (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);
 const fecha = new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"});

 const guiaDocumento = (printable = false) => (
   <div
    id={printable ? "guia-print-document" : "guia-screen-document"}
    className={printable ? "guia-print-document" : ""}
    style={{border:`2px solid ${P[200]}`,borderRadius:12,padding:28,background:"#fff"}}
   >
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
         ...(pedido.ciudad_origen_nombre?[["Origen CEDI:",`${pedido.ciudad_origen_nombre}${pedido.direccion_origen?" "+pedido.direccion_origen:""}`]]:[]),
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
 );

 return (
  <>
   <Modal title={"Guia - "+(pedido.guia_interna||pedido.id)} onClose={onClose} wide>
    <div style={{marginBottom:14,display:"flex",justifyContent:"flex-end",gap:8}}>
     <Btn onClick={()=>window.print()}>Imprimir / PDF</Btn>
     <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
    </div>
    {guiaDocumento()}
   </Modal>
   {typeof document !== "undefined" && createPortal(
    <div className="guia-print-portal">
     {guiaDocumento(true)}
    </div>,
    document.body
   )}
   <style>{`
    .guia-print-portal{display:none}
    @media print{
     @page{size:A4;margin:12mm}
     body > *:not(.guia-print-portal){display:none!important}
     .guia-print-portal{display:block!important;background:#fff!important}
     .guia-print-document{
      width:100%!important;
      box-sizing:border-box!important;
      border:none!important;
      border-radius:0!important;
      padding:0!important;
      page-break-after:avoid!important;
      break-after:avoid!important;
     }
    }
   `}</style>
  </>
 );
}

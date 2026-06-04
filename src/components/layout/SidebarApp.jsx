import React from 'react';
import { P, ROLES } from '../../Constants';
import { Logo } from '../../Subcomponentes';

const MENUS = {
  admin: [
    ["dashboard", "Dashboard"],
    ["pedidos", "Pedidos"],
    ["rastreo", "Rastreo GPS"],
    ["conductores", "Conductores"],
    ["transportistas", "Transportistas"],
    ["resumen", "Resumen Transportador"],
    ["devoluciones", "Devoluciones"],
    ["recogidas", "Recogidas"],
    ["pqrs", "PQRS"],
    ["ciudades", "Ciudades / DANE"],
    ["paqueterias", "Paqueterias"],
    ["promesas", "Promesas de Servicio"],
    ["facturas", "Facturas Proveedor"],
    ["usuarios", "Usuarios"],
  ],
  operador: [
    ["dashboard", "Dashboard"],
    ["pedidos", "Pedidos"],
    ["rastreo", "Rastreo GPS"],
    ["conductores", "Conductores"],
    ["resumen", "Resumen Transportador"],
    ["devoluciones", "Devoluciones"],
    ["recogidas", "Recogidas"],
    ["pqrs", "PQRS"],
    ["promesas", "Promesas de Servicio"],
    ["facturas", "Facturas Proveedor"],
  ],
  transportista: [["mi_empresa", "Mi Empresa"]],
  conductor: [["mis_pedidos", "Mis Pedidos"], ["mi_ubicacion", "Mi Ubicacion GPS"]],
  cliente: [["consultas", "Estado Pedidos"], ["devoluciones", "Mis Devoluciones"], ["recogidas", "Mis Recogidas"], ["pqrs", "PQRS"]],
};

const shortLabel = (label) => label.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

export function SidebarApp({ user, activeTab, setActiveTab, onLogout, onShareApp, collapsed, setCollapsed, pqrs = [] }) {
  const items = MENUS[user.rol] || [];
  const w = collapsed ? 64 : 210;
  const canShareApp = ["admin", "operador", "transportista"].includes(user.rol);

  return (
    <div style={{ width:w, minHeight:"100vh", background:`linear-gradient(180deg,${P[950]},${P[800]})`, display:"flex", flexDirection:"column", transition:"width .2s", flexShrink:0, position:"relative", zIndex:10 }}>
      <div style={{ padding: collapsed?"14px 10px":"18px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${P[700]}40` }}>
        <Logo size={collapsed?36:42}/>
        {!collapsed&&<div><div style={{color:"#fff",fontWeight:900,fontSize:14,lineHeight:1}}>Somos PRO</div><div style={{color:P[300],fontSize:10}}>Tracking</div></div>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{marginLeft:"auto",background:"none",border:"none",color:P[300],cursor:"pointer",fontSize:16,padding:2,lineHeight:1}}>
          {collapsed ? ">" : "<"}
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
        {items.map(([id,label])=>{
          const active = activeTab===id;
          const badgeCount = id==="pqrs" ? (pqrs||[]).filter(p=>p.estado==="abierta").length : 0;
          return (
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"12px":"10px 16px",background:active?`${P[600]}40`:"transparent",border:"none",cursor:"pointer",color:active?"#fff":P[300],fontWeight:active?700:400,fontSize:13,transition:"all .15s",textAlign:"left",borderLeft:active?`3px solid ${P[400]}`:"3px solid transparent",justifyContent:collapsed?"center":"flex-start"}}>
              <span style={{fontSize:11,flexShrink:0,position:"relative",fontWeight:900,minWidth:collapsed?24:22,textAlign:"center",letterSpacing:0}}>
                {shortLabel(label)}
                {badgeCount>0&&<span style={{position:"absolute",top:-8,right:-9,background:"#dc2626",color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{badgeCount>9?"9+":badgeCount}</span>}
              </span>
              {!collapsed&&<span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{label}</span>}
              {!collapsed&&badgeCount>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:12,padding:"1px 7px",fontSize:10,fontWeight:900,flexShrink:0}}>{badgeCount}</span>}
            </button>
          );
        })}
      </nav>
      {canShareApp && onShareApp && (
        <button onClick={onShareApp}
          style={{margin:"8px 8px 0",padding:"10px",background:`${P[600]}60`,border:`1px solid ${P[500]}`,borderRadius:8,color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
          <span>{collapsed ? "QR" : "Compartir App"}</span>
        </button>
      )}
      <button onClick={onLogout}
        style={{margin:"8px",padding:"10px",background:`${P[700]}50`,border:`1px solid ${P[600]}`,borderRadius:8,color:P[200],cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:8,justifyContent:collapsed?"center":"flex-start"}}>
        <span>{collapsed ? "X" : "Salir"}</span>{!collapsed&&"Cerrar Sesion"}
      </button>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../Subcomponentes';

const card = {
 background: "#fff",
 border: "1px solid #e5e7eb",
 borderRadius: 16,
 boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
};

const fmtPct = (value) => `${Math.round(value)}%`;

export function Dashboard({ pedidos, conductores, devoluciones = [], recogidas = [], pqrs = [], promesas = [], ciudades = [], setActiveTab }) {
 const [gpsTick, setGpsTick] = useState(0);
 useEffect(() => {
  const t = setInterval(() => setGpsTick(n => n + 1), 15000);
  return () => clearInterval(t);
 }, []);

 const hoy = new Date().toISOString().split("T")[0];
 const entregados = pedidos.filter(p => p.estado === "entregado" || p.estado === "novedad");
 const activos = pedidos.filter(p => ["en_transito", "pendiente", "sin_asignar"].includes(p.estado));

 const promMap = Object.fromEntries((promesas || []).map(p => [p.ciudad_codigo, Number(p.dias_plazo || 0)]));
 const tienePromesa = (p) => promMap[p.ciudad_codigo] !== undefined;
 const fechaLimite = (p) => {
  if (!p.fecha_creacion || promMap[p.ciudad_codigo] === undefined) return null;
  const d = new Date(p.fecha_creacion);
  d.setDate(d.getDate() + promMap[p.ciudad_codigo]);
  return d.toISOString().split("T")[0];
 };
 const fechaRiesgoInfo = (p) => {
  const limitePromesa = fechaLimite(p);
  if (limitePromesa) return { fecha: limitePromesa, fuente: "promesa" };
  return { fecha: p.fecha_estimada || "", fuente: "fecha estimada" };
 };

 const vencidos = activos.filter(p => {
  const lim = fechaLimite(p);
  if (!lim) return p.fecha_estimada && p.fecha_estimada < hoy;
  return lim < hoy;
 });

 const manana = new Date();
 manana.setDate(manana.getDate() + 1);
 const mananaStr = manana.toISOString().split("T")[0];
 const enRiesgo = activos
  .filter(p => {
   const info = fechaRiesgoInfo(p);
   return info.fecha && info.fecha >= hoy && info.fecha <= mananaStr;
  })
  .filter(p => !vencidos.includes(p));

 const tiemposEntrega = entregados
  .filter(p => p.fecha_creacion && p.fecha_real)
  .map(p => Math.round((new Date(p.fecha_real) - new Date(p.fecha_creacion)) / 86400000))
  .filter(d => d >= 0);
 const promedioEntrega = tiemposEntrega.length
  ? (tiemposEntrega.reduce((a, b) => a + b, 0) / tiemposEntrega.length).toFixed(1)
  : "0.0";
 const diasPromPromedio = promesas.length
  ? (promesas.reduce((a, p) => a + Number(p.dias_plazo || 0), 0) / promesas.length).toFixed(1)
  : "0.0";

 const entregadosConPromesa = entregados.filter(p => tienePromesa(p) && p.fecha_real && p.fecha_creacion);
 const cumplidos = entregadosConPromesa.filter(p => p.fecha_real <= fechaLimite(p));
 const noCumplidos = entregadosConPromesa.length - cumplidos.length;
 const sinPromesaEntregados = entregados.filter(p => !tienePromesa(p) && p.fecha_real && p.fecha_estimada);
 const aTiempoFallback = sinPromesaEntregados.filter(p => p.fecha_real <= p.fecha_estimada).length;
 const tardeFallback = sinPromesaEntregados.length - aTiempoFallback;
 const totalParaCumpl = entregadosConPromesa.length + sinPromesaEntregados.length;
 const aTiempo = cumplidos.length + aTiempoFallback;
 const tarde = noCumplidos + tardeFallback;
 const pctCumpl = totalParaCumpl > 0 ? Math.round((aTiempo / totalParaCumpl) * 100) : 0;

 const condActivos = [...new Set(activos.filter(p => p.conductor_id).map(p => String(p.conductor_id)))]
  .map(id => {
   const cond = conductores.find(c => String(c.id) === id);
   const gps = window._gpsData && window._gpsData[id];
   const gpsOk = gps && (Date.now() - gps.ts) < 300000;
   return { cond, gpsOk, id };
  })
  .filter(x => x.cond);
 const sinGPS = condActivos.filter(x => !x.gpsOk);

 const estadoOrden = [
  { key: "sin_asignar", label: "Sin Asignar", color: "#94a3b8" },
  { key: "pendiente", label: "Pendiente", color: "#d97706" },
  { key: "en_transito", label: "En Transito", color: "#6d42d8" },
  { key: "paqueteria", label: "Paqueteria", color: "#6d42d8" },
  { key: "entregado", label: "Entregado", color: "#6d42d8" },
  { key: "novedad", label: "Con Novedad", color: "#ef2d2d" },
 ];

 const stats = [
  { label: "Total Pedidos", value: pedidos.length, color: "#111827" },
  { label: "Activos", value: activos.length, color: "#111827" },
  { label: "Entregados", value: entregados.length, color: "#111827" },
  { label: "En Riesgo", value: enRiesgo.length, color: enRiesgo.length ? "#d97706" : "#6b7280" },
  { label: "Vencidos", value: vencidos.length, color: vencidos.length ? "#ef2d2d" : "#111827" },
  { label: "Devoluciones", value: devoluciones.length, color: "#111827" },
 ];

 const pqrsRows = [
  { label: "Abiertas", value: pqrs.filter(p => p.estado === "abierta").length, color: "#ef2d2d" },
  { label: "En Gestion", value: pqrs.filter(p => p.estado === "en_gestion").length, color: "#d97706" },
  { label: "Cerradas", value: pqrs.filter(p => p.estado === "cerrada").length, color: "#08a66a" },
 ];

 const alerta = vencidos.length > 0 ? {
  items: vencidos,
  title: `${vencidos.length} pedidos fuera de promesa`,
  color: "#ef2d2d",
  bg: "#fff5f5",
  border: "#f6b0b0",
 } : enRiesgo.length > 0 ? {
  items: enRiesgo,
  title: `${enRiesgo.length} pedidos en riesgo de vencer hoy o manana`,
  color: "#d97706",
  bg: "#fffbeb",
  border: "#f8cf76",
 } : null;
 const pedidosRecientes = pedidos.slice(0, 10);

 return (
  <div style={{ minHeight: "100%", background: "#fafafa", margin: "-28px -24px", color: "#111827" }}>
   <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "18px 32px" }}>
    <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.15, fontWeight: 800 }}>Dashboard</h1>
    <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>Resumen operativo de seguimiento y entregas</p>
   </header>

   <div style={{ maxWidth: 1216, margin: "0 auto", padding: "24px 24px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
    {alerta && (
     <div style={{
      ...card,
      borderColor: alerta.border,
      background: alerta.bg,
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      gap: 14,
     }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, display: "grid", placeItems: "center", background: "#fff", color: alerta.color, flexShrink: 0 }}>
       <AlertTriangle size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
       <div style={{ color: alerta.color, fontWeight: 800, fontSize: 15 }}>{alerta.title}</div>
       <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "#4b5563" }}>
        {alerta.items.slice(0, 4).map(p => {
         const info = fechaRiesgoInfo(p);
         return <span key={p.id}><strong>{p.id}</strong> vencio {info.fecha}</span>;
        })}
       </div>
      </div>
      <span style={{ background: alerta.color, color: "#fff", borderRadius: 18, minWidth: 32, height: 32, display: "grid", placeItems: "center", fontWeight: 900 }}>{alerta.items.length}</span>
     </div>
    )}

    <section style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(140px, 1fr))", gap: 12 }}>
     {stats.map(s => (
      <div key={s.label} style={{ ...card, padding: "18px 16px" }}>
       <div style={{ fontSize: 32, lineHeight: 1, fontWeight: 850, color: s.color }}>{s.value}</div>
       <div style={{ color: "#4b5563", fontSize: 13, marginTop: 9 }}>{s.label}</div>
      </div>
     ))}
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
     <div style={{ ...card, padding: 22, minHeight: 152 }}>
      <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>Tiempo Medio Entrega</div>
      <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 5 }}>Promesa promedio: {diasPromPromedio} dias</div>
      <div style={{ marginTop: 36, display: "flex", alignItems: "flex-end", gap: 6 }}>
       <span style={{ fontSize: 36, lineHeight: 1, fontWeight: 900 }}>{promedioEntrega}</span>
       <span style={{ fontSize: 13, color: "#4b5563", paddingBottom: 4 }}>dias</span>
      </div>
      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 12 }}>Calculado sobre {tiemposEntrega.length} pedidos</div>
     </div>

     <div style={{ ...card, padding: 22, minHeight: 152 }}>
      <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}>Cumplimiento</div>
      <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 5 }}>Basado en promesas de servicio</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
       <svg viewBox="0 0 140 84" style={{ width: 140, height: 84 }}>
        <path d="M20,70 A50,50 0 0,1 120,70" fill="none" stroke="#eef0f3" strokeWidth="14" strokeLinecap="round" />
        <path
         d="M20,70 A50,50 0 0,1 120,70"
         fill="none"
         stroke="#08a66a"
         strokeWidth="14"
         strokeLinecap="round"
         strokeDasharray={`${pctCumpl * 1.57} 157`}
        />
        <text x="70" y="69" textAnchor="middle" fontSize="20" fontWeight="900" fill="#111827">{pctCumpl}%</text>
       </svg>
      </div>
      <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>{aTiempo} a tiempo {tarde} tarde de {totalParaCumpl || entregados.length} entregados</div>
     </div>

     <div style={{ ...card, padding: 22, minHeight: 152 }}>
      <div style={{ color: "#6b7280", fontWeight: 800, fontSize: 12, textTransform: "uppercase", marginBottom: 22 }}>PQRS</div>
      {pqrsRows.map(row => (
       <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", padding: "10px 0" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
         <span style={{ width: 8, height: 8, borderRadius: 4, background: row.color }} />
         <span>{row.label}</span>
        </span>
        <strong>{row.value}</strong>
       </div>
      ))}
     </div>
    </section>

    <section style={{ ...card, padding: "22px 28px" }}>
     <h2 style={{ margin: "0 0 22px", fontSize: 16 }}>Pedidos por Estado</h2>
     <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {estadoOrden.map(e => {
       const count = pedidos.filter(p => p.estado === e.key).length;
       const pct = pedidos.length ? (count / pedidos.length) * 100 : 0;
       return (
        <div key={e.key} style={{ display: "grid", gridTemplateColumns: "110px 1fr 42px", alignItems: "center", gap: 14 }}>
         <div style={{ textAlign: "right", color: "#6b7280", fontSize: 13 }}>{e.label}</div>
         <div style={{ height: 24, background: "#f0f0f2", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, minWidth: count ? 32 : 0, height: "100%", background: e.color, borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", paddingLeft: count ? 10 : 0, boxSizing: "border-box" }}>
           {count || ""}
          </div>
         </div>
         <div style={{ color: "#6b7280", fontSize: 13, textAlign: "right" }}>{fmtPct(pct)}</div>
        </div>
       );
      })}
     </div>
    </section>

    {condActivos.length > 0 && (
     <section style={{ ...card, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
       <h2 style={{ margin: 0, fontSize: 16 }}>GPS Conductores Activos</h2>
       {sinGPS.length > 0 && <span style={{ background: "#fee2e2", color: "#ef2d2d", borderRadius: 14, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{sinGPS.length} sin GPS</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
       {condActivos.slice(0, 6).map(({ cond, gpsOk }) => (
        <div key={cond.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
         <span style={{ width: 40, height: 40, borderRadius: 20, background: "#f6f6f7", display: "grid", placeItems: "center", color: "#6b7280" }}>
          <AlertTriangle size={18} />
         </span>
         <div>
          <div style={{ fontWeight: 800 }}>{cond.nombre}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{gpsOk ? "GPS activo" : `${cond.placa || "Sin placa"}`}</div>
         </div>
        </div>
       ))}
      </div>
     </section>
    )}

    <section style={{ ...card, padding: 0, overflow: "hidden" }}>
     <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Pedidos Recientes</h2>
      <button onClick={() => setActiveTab?.("pedidos")} style={{ border:"none", background:"transparent", color:"#6d42d8", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Ver todos</button>
     </div>
     <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
       <thead>
        <tr style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>
         {["No. Pedido", "Factura", "Cliente", "Ciudad", "Cajas", "Estado", "Conductor"].map(h => (
          <th key={h} style={{ textAlign: "left", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody>
        {pedidosRecientes.map(p => {
         const cond = conductores.find(c => String(c.id) === String(p.conductor_id));
         return (
          <tr key={p.id}>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ color: "#5b33d6", fontWeight: 800 }}>{p.guia_interna || p.id}</div>
            {p.tipo !== "paqueteria" && p.guia_interna && p.guia_interna !== p.id && (
             <div style={{ color: "#6b7280", fontSize: 12, fontFamily: "monospace", marginTop: 3 }}>{p.id}</div>
            )}
           </td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>{p.factura}</td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>{p.cliente}</td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <div>{p.ciudad_nombre}</div>
            {p.ciudad_origen_nombre && <div style={{ color: "#6b7280", fontSize: 12 }}>Origen: {p.ciudad_origen_nombre}</div>}
           </td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>{p.cajas}</td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}><Badge estado={p.estado} /></td>
           <td style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>{p.tipo === "paqueteria" ? p.paqueteria : cond?.nombre || "Sin asignar"}</td>
          </tr>
         );
        })}
       </tbody>
     </table>
     </div>
    </section>
   </div>
  </div>
 );
}

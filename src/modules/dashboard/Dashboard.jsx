import React, { useEffect, useState } from 'react';
import { P } from '../../Constants';
import { Badge, Card } from '../../Subcomponentes';


export function Dashboard({ pedidos, conductores, devoluciones = [], recogidas = [], pqrs = [], promesas = [], ciudades = [] }) {
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


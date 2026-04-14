import React, { useState, useEffect, useRef } from 'react';
import { P, CIUDADES, PAQUETERIAS, ESTADOS_PEDIDO, ROLES } from './Constants';
import { USUARIOS_INICIALES, CONDUCTORES_INICIALES, PEDIDOS_INICIALES } from './DataStore';
import { Logo, Badge, Card, Btn, Field, Modal, Toast, Sidebar } from './Subcomponentes';

const inputStyle = {
  border: `1.5px solid ${P[200]}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
  outline: "none", background: "#fafafa",
  width: "100%", boxSizing: "border-box",
};

function GuiaImprimible({ pedido, conductores, onClose }) {
  const cond   = conductores.find(c => c.id === pedido.conductor_id);
  const ciudad = CIUDADES.find(c => c.code === pedido.ciudad_codigo);
  const fecha  = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <Modal title={`Guía — ${pedido.id}`} onClose={onClose} wide>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn onClick={() => window.print()}>🖨️ Imprimir / PDF</Btn>
        <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
      </div>
      <div id="guia-print" style={{ border: `2px solid ${P[200]}`, borderRadius: 12, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, marginBottom: 20, borderBottom: `3px solid ${P[600]}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo size={60} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: P[800] }}>SOMOS PRO TRACKING</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Sistema de Gestión de Transporte</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: P[600], color: "#fff", borderRadius: 10, padding: "8px 18px", fontSize: 20, fontWeight: 900 }}>{pedido.id}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Fecha: {fecha}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Badge estado={pedido.estado} />
          {pedido.tipo === "paqueteria" && (
            <span style={{ background: "#ecfeff", color: "#0891b2", border: "1px solid #67e8f9", borderRadius: 8, padding: "4px 14px", fontWeight: 700, fontSize: 13 }}>
              📦 {pedido.paqueteria}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: P[50], borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P[700], textTransform: "uppercase", marginBottom: 10 }}>📦 Destinatario</div>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <tbody>
                {[["Cliente:", pedido.cliente], ["Dirección:", pedido.direccion], ["Ciudad:", ciudad?.name || "—"], ["Cód. DANE:", pedido.ciudad_codigo], ["Factura:", pedido.factura], ["Cajas:", pedido.cajas]].map(([k, v]) => (
                  <tr key={k}><td style={{ fontWeight: 700, color: "#475569", paddingBottom: 5, paddingRight: 8, whiteSpace: "nowrap" }}>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P[700], textTransform: "uppercase", marginBottom: 10 }}>🚚 Transportista</div>
            {pedido.tipo === "paqueteria" ? (
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  {[["Empresa:", pedido.paqueteria], ["Guía N°:", pedido.guia_paqueteria]].map(([k, v]) => (
                    <tr key={k}><td style={{ fontWeight: 700, paddingBottom: 5, paddingRight: 8 }}>{k}</td><td style={{ fontFamily: "monospace", fontWeight: 700, color: P[700] }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                <tbody>
                  {[["Conductor:", cond?.nombre || "Por asignar"], ["Placa:", pedido.placa || "—"], ["Empresa:", cond?.empresa || "—"], ["NIT:", pedido.nit_proveedor || "—"]].map(([k, v]) => (
                    <tr key={k}><td style={{ fontWeight: 700, paddingBottom: 5, paddingRight: 8, whiteSpace: "nowrap" }}>{k}</td><td style={{ fontFamily: "monospace" }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, marginBottom: 20, display: "flex", gap: 32, fontSize: 13, flexWrap: "wrap" }}>
          <span><strong>Fecha estimada:</strong> {pedido.fecha_estimada || "—"}</span>
          <span><strong>Fecha real de entrega:</strong> {pedido.fecha_real || "Pendiente"}</span>
        </div>
        {pedido.notas && <div style={{ background: "#fffbeb", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: "#92400e" }}>📝 <strong>Notas:</strong> {pedido.notas}</div>}
        {pedido.soportes?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: P[700], marginBottom: 6, fontSize: 13 }}>📎 Soportes:</div>
            {pedido.soportes.map((s, i) => <div key={i} style={{ fontSize: 12, color: "#64748b" }}>• {s}</div>)}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 28 }}>
          {["Despachado por", "Recibido por", "Conductor"].map(f => (
            <div key={f} style={{ textAlign: "center" }}>
              <div style={{ height: 52, borderBottom: "2px solid #cbd5e1", marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{f}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Firma / Cédula / Fecha</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Generado por Somos PRO Tracking · {fecha}</div>
          <div style={{ width: 56, height: 56, border: "2px solid #cbd5e1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8", textAlign: "center" }}>QR<br/>Pedido</div>
        </div>
      </div>
      <style>{`@media print{body>*{visibility:hidden!important}#guia-print,#guia-print *{visibility:visible!important}#guia-print{position:fixed;top:0;left:0;width:100%;padding:20px}}`}</style>
    </Modal>
  );
}

function ModalDetalle({ pedido, conductores, onClose, setPedidos, showToast, canEdit }) {
  const [estado,    setEstado]    = useState(pedido.estado);
  const [condId,    setCondId]    = useState(pedido.conductor_id?.toString() || "");
  const [fechaReal, setFechaReal] = useState(pedido.fecha_real || "");
  const [soporte,   setSoporte]   = useState("");
  const [verMapa,   setVerMapa]   = useState(false);
  const [verGuia,   setVerGuia]   = useState(false);
  const cond   = conductores.find(c => c.id === parseInt(condId || pedido.conductor_id));
  const ciudad = CIUDADES.find(c => c.code === pedido.ciudad_codigo);

  const guardar = () => {
    const c = conductores.find(c => c.id === parseInt(condId));
    setPedidos(prev => prev.map(p => p.id === pedido.id ? {
      ...p, estado,
      conductor_id:  c?.id            || null,
      placa:         c?.placa         || null,
      nit_proveedor: c?.nit_proveedor || null,
      fecha_real:    fechaReal        || null,
    } : p));
    showToast("✓ Cambios guardados", "success");
    onClose();
  };

  const subirSoporte = () => {
    if (!soporte.trim()) { showToast("Escribe el nombre del soporte", "error"); return; }
    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, soportes: [...(p.soportes || []), soporte.trim()] } : p));
    setSoporte("");
    showToast("📎 Soporte registrado", "success");
  };

  return (
    <Modal title={`Pedido ${pedido.id}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: P[50], borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: P[800], marginBottom: 8 }}>{pedido.cliente}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 8, fontSize: 13, color: "#64748b" }}>
            <span>📍 {pedido.direccion}</span>
            <span>🏙️ {ciudad?.name} <span style={{ fontFamily: "monospace", color: P[500], fontSize: 11 }}>({pedido.ciudad_codigo})</span></span>
            <span>📦 Factura: <strong>{pedido.factura}</strong></span>
            <span>🗃️ Cajas: <strong>{pedido.cajas}</strong></span>
            <span>📅 Estimado: {pedido.fecha_estimada || "—"}</span>
            <span>✅ Real: {pedido.fecha_real || "Pendiente"}</span>
          </div>
          {pedido.notas && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8" }}>📝 {pedido.notas}</p>}
        </div>

        {pedido.tipo === "paqueteria" && (
          <div style={{ background: "#ecfeff", borderRadius: 10, padding: 14, border: "1px solid #67e8f9" }}>
            <span style={{ fontWeight: 700, color: "#0891b2" }}>📦 {pedido.paqueteria}</span>
            <span style={{ marginLeft: 14, color: "#0e7490" }}>Guía: <strong style={{ fontFamily: "monospace" }}>{pedido.guia_paqueteria}</strong></span>
          </div>
        )}

        {canEdit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Estado" value={estado} onChange={setEstado} as="select"
              options={Object.entries(ESTADOS_PEDIDO).map(([k, v]) => ({ value: k, label: v.label }))} />
            {pedido.tipo !== "paqueteria" && (
              <Field label="Conductor" value={condId} onChange={setCondId} as="select"
                options={[{ value: "", label: "— Sin asignar —" }, ...conductores.map(c => ({ value: c.id.toString(), label: `${c.nombre} · ${c.placa}` }))]} />
            )}
          </div>
        )}

        {!canEdit && cond && (
          <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12 }}>
            <span style={{ fontSize: 13, color: "#1e40af" }}>🚗 <strong>{cond.nombre}</strong> — Placa: <strong>{pedido.placa}</strong></span>
          </div>
        )}

        <Field label="Fecha de Entrega Real" value={fechaReal} onChange={setFechaReal} type="date" />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: P[800] }}>🗺️ Mapa de destino</span>
            <Btn size="sm" variant={verMapa ? "danger" : "secondary"} onClick={() => setVerMapa(!verMapa)}>
              {verMapa ? "Ocultar" : "Ver Mapa"}
            </Btn>
          </div>
          {verMapa && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${P[200]}` }}>
              <iframe title="mapa" width="100%" height="260" style={{ border: "none", display: "block" }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent((pedido.direccion || "") + ", " + (ciudad?.name || "") + ", Colombia")}&output=embed&z=14`}
                allowFullScreen loading="lazy" />
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: P[800], marginBottom: 10 }}>📎 Soportes de Entrega</div>
          {!pedido.soportes?.length
            ? <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>Sin soportes cargados.</p>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {pedido.soportes.map((s, i) => (
                  <div key={i} style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#15803d" }}>📷 {s}</div>
                ))}
              </div>
          }
          <div style={{ display: "flex", gap: 8 }}>
            <input value={soporte} onChange={e => setSoporte(e.target.value)}
              placeholder="Nombre del soporte, ej: firma_cliente.jpg"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === "Enter" && subirSoporte()} />
            <Btn variant="success" size="sm" onClick={subirSoporte}>📎 Cargar</Btn>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <Btn variant="secondary" size="sm" onClick={() => setVerGuia(true)}>🖨️ Ver Guía / Planilla</Btn>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {canEdit && <Btn onClick={guardar}>💾 Guardar Cambios</Btn>}
          </div>
        </div>
      </div>
      {verGuia && <GuiaImprimible pedido={pedido} conductores={conductores} onClose={() => setVerGuia(false)} />}
    </Modal>
  );
}

function ModalCSV({ onClose, onImportar }) {
  const [txt,  setTxt]  = useState("");
  const [prev, setPrev] = useState([]);
  const [err,  setErr]  = useState("");

  const plantilla = `id,cliente,ciudad_codigo,direccion,cajas,factura,fecha_estimada,tipo,paqueteria,guia_paqueteria,notas
PED-010,Empresa Ejemplo S.A.S,11001,Cra 10 #20-30 Of 201,5,FAC-3000,2026-05-10,propio,,,Fragil
PED-011,Comercio del Norte Ltda,05001,Av El Poblado 43A-15,12,FAC-3001,2026-05-12,paqueteria,Servientrega,SRV-2026-12345,`;

  const parsear = (texto) => {
    const lineas = texto.trim().split("\n").filter(l => l.trim());
    if (lineas.length < 2) throw new Error("Se necesita encabezado y al menos una fila de datos.");
    const hdrs = lineas[0].split(",").map(h => h.trim().toLowerCase());
    return lineas.slice(1).map((l, idx) => {
      const cols = l.split(",").map(c => c.trim());
      const obj  = {};
      hdrs.forEach((h, i) => { obj[h] = cols[i] || ""; });
      const ciudad = CIUDADES.find(c => c.code === obj.ciudad_codigo);
      const esPaq  = obj.tipo === "paqueteria";
      return {
        id: obj.id || `IMP-${Date.now()}-${idx}`,
        cliente: obj.cliente || "Sin nombre",
        ciudad_codigo: ciudad?.code || obj.ciudad_codigo || "",
        ciudad_nombre: ciudad?.name || "",
        direccion: obj.direccion || "",
        cajas: parseInt(obj.cajas) || 0,
        factura: obj.factura || "",
        fecha_estimada: obj.fecha_estimada || "",
        notas: obj.notas || "",
        tipo: esPaq ? "paqueteria" : "propio",
        paqueteria: esPaq ? obj.paqueteria : null,
        guia_paqueteria: esPaq ? obj.guia_paqueteria : null,
        conductor_id: null, placa: null, nit_proveedor: null,
        estado: esPaq ? "paqueteria" : "sin_asignar",
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
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
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

function Dashboard({ pedidos, conductores }) {
  const stats = [
    { l: "Total Pedidos",  v: pedidos.length,                                           c: P[600],    i: "📦" },
    { l: "Sin Asignar",    v: pedidos.filter(p => p.estado === "sin_asignar").length,    c: "#64748b", i: "○" },
    { l: "En Tránsito",    v: pedidos.filter(p => p.estado === "en_transito").length,    c: P[600],    i: "▶" },
    { l: "Paquetería",     v: pedidos.filter(p => p.tipo === "paqueteria").length,       c: "#0891b2", i: "📦" },
    { l: "Entregados",     v: pedidos.filter(p => p.estado === "entregado").length,      c: "#059669", i: "✓" },
    { l: "Cajas Totales",  v: pedidos.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0),c: P[700],    i: "🗃️" },
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

function Pedidos({ pedidos, setPedidos, conductores, showToast }) {
  const [filtro,   setFiltro]   = useState("todos");
  const [busq,     setBusq]     = useState("");
  const [modNuevo, setModNuevo] = useState(false);
  const [modDet,   setModDet]   = useState(null);
  const [modGuia,  setModGuia]  = useState(null);
  const [modCSV,   setModCSV]   = useState(false);

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
    const ciudad = CIUDADES.find(c => c.code === form.ciudad_codigo);
    const cond   = conductores.find(c => c.id === parseInt(form.conductor_id));
    const esPaq  = form.tipo === "paqueteria";
    setPedidos(prev => [{
      id: form.id.trim(), cliente: form.cliente.trim(),
      ciudad_codigo: form.ciudad_codigo, ciudad_nombre: ciudad?.name || "",
      direccion: form.direccion.trim(), cajas: parseInt(form.cajas) || 0,
      factura: form.factura.trim(), fecha_estimada: form.fecha_estimada,
      notas: form.notas.trim(), tipo: form.tipo,
      paqueteria: esPaq ? form.paqueteria : null,
      guia_paqueteria: esPaq ? form.guia_paqueteria.trim() : null,
      conductor_id: cond ? cond.id : null,
      placa: cond ? cond.placa : null,
      nit_proveedor: cond ? cond.nit_proveedor : null,
      estado: esPaq ? "paqueteria" : (cond ? "pendiente" : "sin_asignar"),
      fecha_creacion: new Date().toISOString().split("T")[0],
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
    <style>body{font-family:Arial,sans-serif;padding:32px}h1{color:#4c1d95}table{width:100%;border-collapse:collapse}
    th{background:#f5f3ff;color:#4c1d95;padding:10px 12px;text-align:left;font-size:12px;border-bottom:2px solid #ddd6fe}
    td{padding:10px 12px;border-bottom:1px solid #ede9fe;font-size:13px}</style></head>
    <body><h1>Planilla de Despachos — Somos PRO Tracking</h1>
    <p>Fecha: ${new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"})} · Pedidos: ${filtrados.length}</p>
    <table><thead><tr><th>#</th><th>N° Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad</th><th>Dirección</th><th>Cajas</th><th>Estado</th><th>Conductor / Paquetería</th><th>Firma Recibido</th></tr></thead>
    <tbody>${filtrados.map((p, i) => {
      const cond = conductores.find(c => c.id === p.conductor_id);
      const trans = p.tipo === "paqueteria" ? `📦 ${p.paqueteria} — ${p.guia_paqueteria}` : (cond ? `${cond.nombre} · ${p.placa}` : "Sin asignar");
      return `<tr><td>${i+1}</td><td><strong>${p.id}</strong></td><td>${p.factura||"—"}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}</td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${trans}</td><td></td></tr>`;
    }).join("")}</tbody></table></body></html>`);
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
            style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
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
              {filtrados.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Sin pedidos que coincidan</td></tr>}
              {filtrados.map((p, i) => {
                const cond = conductores.find(c => c.id === p.conductor_id);
                return (
                  <tr key={p.id} style={{ borderTop: `1px solid ${P[100]}`, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 800, color: P[700] }}>{p.id}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{p.factura}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cliente}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ color: "#334155" }}>{p.ciudad_nombre}</div>
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
              options={[{ value: "", label: "— Seleccione ciudad —" }, ...CIUDADES.map(c => ({ value: c.code, label: `${c.name} — ${c.code}` }))]} />
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

      {modDet  && <ModalDetalle pedido={modDet} conductores={conductores} onClose={() => setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={true} />}
      {modGuia && <GuiaImprimible pedido={modGuia} conductores={conductores} onClose={() => setModGuia(null)} />}
      {modCSV  && <ModalCSV onClose={() => setModCSV(false)} onImportar={rows => { setPedidos(p => [...rows, ...p]); setModCSV(false); showToast(`✓ ${rows.length} pedido(s) importados`, "success"); }} />}
    </div>
  );
}

function RastreoGPS({ pedidos, conductores }) {
  const conCond = pedidos.filter(p => p.conductor_id);
  const [sel, setSel] = useState(conCond[0] || null);
  const cond   = conductores.find(c => c.id === sel?.conductor_id);
  const ciudad = CIUDADES.find(c => c.code === sel?.ciudad_codigo);
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
          ) : <p style={{ color: "#94a3b8", textAlign: "center", padding: 48 }}>Selecciona un pedido para ver el mapa.</p>}
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
    if (!form.nombre.trim() || !form.placa.trim()) { showToast("Nombre y placa son obligatorios", "error"); return; }
    setConductores(prev => [...prev, { ...form, id: Date.now(), activo: true }]);
    setModal(false);
    setForm({ nombre: "", placa: "", nit_proveedor: "", empresa: "" });
    showToast("✓ Conductor registrado", "success");
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
            <Field label="Placa del vehículo" value={form.placa} onChange={f("placa")} required placeholder="ABC-123" />
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

function Transportistas({ conductores, setConductores, showToast, user }) {
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ nombre: "", placa: "" });
  const esMia = user.rol === "transportista";
  const miNit = user.nit || "";
  const lista = esMia ? conductores.filter(c => c.nit_proveedor === miNit) : conductores;
  const inscribir = () => {
    if (!form.nombre.trim() || !form.placa.trim()) { showToast("Nombre y placa son obligatorios", "error"); return; }
    setConductores(prev => [...prev, { ...form, id: Date.now(), nit_proveedor: miNit, empresa: user.empresa || user.nombre, activo: true }]);
    setModal(false);
    setForm({ nombre: "", placa: "" });
    showToast("✓ Conductor inscrito", "success");
  };
  return (
    <div>
      {esMia && (
        <Card style={{ background: `linear-gradient(135deg,${P[950]},${P[700]})`, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo size={46} />
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontWeight: 900 }}>{user.empresa || user.nombre}</h2>
              <p style={{ margin: "4px 0 0", color: P[300], fontSize: 13 }}>NIT: {miNit} · {lista.filter(c => c.activo).length} conductor(es)</p>
            </div>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, color: P[800], fontWeight: 800 }}>{esMia ? "Mis Conductores" : "Todos los Conductores"}</h3>
        {esMia && <Btn onClick={() => setModal(true)}>+ Inscribir Conductor</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {lista.map(c => (
          <Card key={c.id} style={{ borderLeft: `3px solid ${P[400]}` }}>
            <div style={{ fontWeight: 800, color: P[800] }}>🚗 {c.nombre}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Placa: <strong style={{ fontFamily: "monospace" }}>{c.placa}</strong></div>
            {!esMia && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{c.empresa}</div>}
            <span style={{ display: "inline-block", marginTop: 10, background: "#ecfdf5", color: "#059669", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>✓ Activo</span>
          </Card>
        ))}
        {lista.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Sin conductores inscritos.</p>}
      </div>
      {modal && (
        <Modal title="Inscribir Conductor" onClose={() => setModal(false)}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>Empresa: <strong>{user.empresa}</strong> · NIT: <strong>{miNit}</strong></p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre del conductor" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} required />
            <Field label="Placa del vehículo"   value={form.placa}  onChange={v => setForm(p => ({ ...p, placa: v }))} required placeholder="XYZ-456" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={inscribir}>Inscribir</Btn>
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
    if (usuarios.find(u => u.user === form.user.trim())) { showToast("Ese usuario ya existe", "error"); return; }
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
            <span style={{ background: `${roleColors[u.rol]}18`, color: roleColors[u.rol], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{ROLES[u.rol] || u.rol}</span>
            {u.nit     && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>NIT: {u.nit}</p>}
            {u.placa   && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Placa: {u.placa}</p>}
            {u.empresa && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{u.empresa}</p>}
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

function MisPedidosConductor({ pedidos, setPedidos, user, conductores, showToast }) {
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
      {misPeds.length === 0 && <Card style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p>Sin pedidos asignados.</p></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {misPeds.map(p => (
          <Card key={p.id} style={{ cursor: "pointer", borderLeft: `4px solid ${ESTADOS_PEDIDO[p.estado]?.color || "#ccc"}` }} onClick={() => setModDet(p)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, color: P[700], fontSize: 17 }}>{p.id}</div>
              <Badge estado={p.estado} />
            </div>
            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{p.cliente}</div>
            <div style={{ fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 3 }}>
              <span>📦 Factura: {p.factura} · {p.cajas} cajas</span>
              <span>📍 {p.direccion}</span>
              <span>🏙️ {p.ciudad_nombre}</span>
              <span>📅 Entrega: {p.fecha_estimada || "—"}</span>
            </div>
            <Btn size="sm" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} variant="secondary">Ver detalle / Cargar soporte →</Btn>
          </Card>
        ))}
      </div>
      {modDet && <ModalDetalle pedido={modDet} conductores={conductores} onClose={() => setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={false} />}
    </div>
  );
}

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

function Consultas({ pedidos, conductores, showToast }) {
  const [busq,   setBusq]   = useState("");
  const [modDet, setModDet] = useState(null);
  const filt = pedidos.filter(p => {
    const q = busq.toLowerCase();
    return !busq || p.id.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.factura?.toLowerCase().includes(q) || (p.ciudad_nombre || "").toLowerCase().includes(q);
  });
  return (
    <div>
      <h2 style={{ margin: "0 0 22px", color: P[800], fontWeight: 900 }}>🔍 Estado de Pedidos</h2>
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="🔍 Buscar por N° pedido, factura, cliente o ciudad..."
          style={inputStyle} />
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
                {p.soportes?.length > 0 && <Btn size="sm" variant="success" onClick={() => showToast(`📎 ${p.soportes.length} soporte(s) disponibles`, "info")}>⬇ Soportes</Btn>}
                <Btn size="sm" variant="secondary" onClick={() => setModDet(p)}>Ver</Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {modDet && <ModalDetalle pedido={modDet} conductores={conductores} onClose={() => setModDet(null)} setPedidos={() => {}} showToast={showToast} canEdit={false} />}
    </div>
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
    { l: "👑 Admin",         u: "admin",    p: "1039456779" },
    { l: "⚙️ Operador",      u: "operador", p: "op123" },
    { l: "🏢 Transportista", u: "veloz",    p: "trans123" },
    { l: "🚗 Conductor",     u: "driver1",  p: "cond123" },
    { l: "📦 Cliente",       u: "cliente",  p: "cli123" },
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
  const [user,        setUser]        = useState(null);
  const [tab,         setTab]         = useState("");
  const [pedidos,     setPedidos]     = useState(PEDIDOS_INICIALES);
  const [conductores, setConductores] = useState(CONDUCTORES_INICIALES);
  const [usuarios,    setUsuarios]    = useState(USUARIOS_INICIALES);
  const [collapsed,   setCollapsed]   = useState(false);
  const [toast,       setToast]       = useState(null);

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

  const renderContent = () => {
    switch (tab) {
      case "dashboard":      return <Dashboard pedidos={pedidos} conductores={conductores} />;
      case "pedidos":        return <Pedidos pedidos={pedidos} setPedidos={setPedidos} conductores={conductores} showToast={showToast} />;
      case "rastreo":        return <RastreoGPS pedidos={pedidos} conductores={conductores} />;
      case "conductores":    return <Conductores conductores={conductores} setConductores={setConductores} pedidos={pedidos} showToast={showToast} />;
      case "transportistas": return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={{ rol: "admin", nombre: "Admin" }} />;
      case "usuarios":       return <Usuarios usuarios={usuarios} setUsuarios={setUsuarios} showToast={showToast} />;
      case "mi_empresa":     return <Transportistas conductores={conductores} setConductores={setConductores} showToast={showToast} user={user} />;
      case "mis_pedidos":    return <MisPedidosConductor pedidos={pedidos} setPedidos={setPedidos} user={user} conductores={conductores} showToast={showToast} />;
      case "mi_ubicacion":   return <MiUbicacion />;
      case "consultas":      return <Consultas pedidos={pedidos} conductores={conductores} showToast={showToast} />;
      default:               return <Dashboard pedidos={pedidos} conductores={conductores} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f5ff" }}>
      <Sidebar user={user} activeTab={tab} setActiveTab={setTab} onLogout={() => setUser(null)} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px", maxWidth: "100%", boxSizing: "border-box" }}>
        {renderContent()}
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

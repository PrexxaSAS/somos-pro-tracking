import React, { useState } from 'react';
import { P } from '../../Constants';
import { Btn, Card, Field, Modal } from '../../Subcomponentes';
import { supabase } from '../../supabase';
import { mensajeError } from '../../utils/errors';
import { exportarCSVFacturaProveedor } from '../../utils/facturasCsv';

const iSt = {
  border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",
  fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",
  width:"100%",boxSizing:"border-box",
};

export function FacturasProveedor({ facturas, transportistas, pedidos, showToast, recargar }) {
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
      if (error) { showToast(mensajeError(error, "la factura"), "error"); setGuard(false); return; }
      showToast("✓ Factura creada · Ahora agrega las guías relacionadas", "success");
      setModNueva(false); setForm(vacio);
      if (recargar) await recargar();
    } catch(e) { showToast("Error de conexión", "error"); }
    setGuard(false);
  };

  // ── Eliminar factura ───────────────────────────────────────────────────────
  const eliminar = async (id, num) => {
    if (!window.confirm(`¿Eliminar factura ${num}? Se eliminarán también las guías relacionadas.`)) return;
    const { error: guiasError } = await supabase.from('factura_guias').delete().eq('factura_id', id);
    if (guiasError) { showToast(mensajeError(guiasError, "las guias asociadas"), "error"); return; }
    const { error } = await supabase.from('facturas_proveedor').delete().eq('id', id);
    if (error) { showToast(mensajeError(error, "la factura"), "error"); return; }
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
                  <Btn size="sm" variant="success" onClick={()=>exportarCSVFacturaProveedor(fac, calcularLineas(fac), trans, formatCOP)}>⬇ Exportar CSV</Btn>
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
      if (error) { showToast(mensajeError(error, "la guia relacionada"), "error"); setGuard(false); return; }
      showToast("✓ Guía relacionada", "success");
      setPedidoSel("");
      if (recargar) await recargar();
    } catch(e) { showToast("Error de conexión", "error"); }
    setGuard(false);
  };

  const quitarGuia = async (guiaId) => {
    const { error } = await supabase.from('factura_guias').delete().eq('id', guiaId);
    if (error) { showToast(mensajeError(error, "la guia relacionada"), "error"); return; }
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
              onClick={()=>exportarCSVFacturaProveedor(factura, guiasRel.map(g=>({
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



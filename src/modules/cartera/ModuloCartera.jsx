import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { leerTextoCsv, filasCsv } from '../../utils/files';
import { P } from '../../Constants';
import { T, tarjeta } from '../../design/tokens';
import { Plus, Printer, Trash2, Upload } from 'lucide-react';
import {
 Pagina, Encabezado, Indicadores, BarraFiltros, BarraSeleccion, Buscador, SelectFiltro,
 Segmentado, Paginador,
 PieTabla, th, td, tdCifra, mono, chipMono, botonBarra, botonFila, botonPrincipal, iconoAccion,
} from '../../components/ui/listas';
import {
 ModalForm, ModalGestion, Seccion, FranjaInfo, Resumen, Fila, Texto, Selector, AreaTexto,
 CasillaNovedad,
} from '../../components/ui/formularios';
import emailjs from '@emailjs/browser';

// ── Configuración ──────────────────────────────────────────────────────────────

const EJS_SERVICE   = 'service_oyce136';
const EJS_TEMPLATE  = 'template_7mepnqg';
const EJS_PUBLIC    = 'ZMsvylkrklU4MQ-Bx';

// ── Colores verdes ─────────────────────────────────────────────────────────────
// ── Helpers ────────────────────────────────────────────────────────────────────
const fCOP = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0);
const fFecha = d => { if(!d) return '—'; const f = new Date(d); return isNaN(f)?'—':f.toLocaleDateString('es-CO'); };
const fFechaHora = d => { if(!d) return '—'; const f = new Date(d); return isNaN(f)?'—':f.toLocaleString('es-CO'); };

const ESTADOS_CARTERA = {
  pendiente:       {label:"Pendiente",       color:T.color.ojo,  bg:T.color.ojoSuave},
  preaprobado:     {label:"Preaprobado",     color:T.color.bien, bg:T.color.bienSuave},
  cartera_vencida: {label:"Cartera vencida", color:T.color.mal,  bg:T.color.malSuave},
  aprobado:        {label:"Aprobado",        color:T.color.info, bg:T.color.infoSuave},
  rechazado:       {label:"Rechazado",       color:T.color.tinta3, bg:T.color.superficie3},
};


// ── Asignar corte ──────────────────────────────────────────────────────────────
const asignarCorte = async (daneOrigen) => {
  if (!daneOrigen) return null;
  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date();

  const {data:sedesAll} = await supabase
    .from('sedes').select('*, cortes_sede(*)').eq('activa',true);

  if (!sedesAll || sedesAll.length === 0) return null;
  const daneNorm = daneOrigen.trim().padStart(5,'0'); // "5380" -> "05380"
  const sede = sedesAll.find(s=>{
    const cNorm = String(s.dane_code||'').trim().padStart(5,'0');
    return cNorm === daneNorm;
  });
  if (!sede) return null;
  const cortesOrdenados = (sede.cortes_sede||[]).sort((a,b)=>a.orden-b.orden);
  if (cortesOrdenados.length === 0) return null;

  // Intentar en los cortes de hoy
  for (const cs of cortesOrdenados) {
    const corteTime = new Date(hoy+'T'+cs.hora_corte);
    if (corteTime <= ahora) continue;

    let {data:cp} = await supabase.from('cortes_programados')
      .select('*').eq('sede_id',sede.id).eq('corte_sede_id',cs.id).eq('fecha',hoy).maybeSingle();

    if (!cp) {
      const {data:nuevo} = await supabase.from('cortes_programados').insert({
        sede_id:sede.id, corte_sede_id:cs.id, fecha:hoy,
        hora_corte:cs.hora_corte, capacidad_max:cs.capacidad_corte,
        pedidos_asignados:0, estado:'abierto'
      }).select().single();
      cp = nuevo;
    }

    if (cp && cp.pedidos_asignados < cp.capacidad_max && cp.estado==='abierto') {
      await supabase.from('cortes_programados')
        .update({pedidos_asignados:cp.pedidos_asignados+1}).eq('id',cp.id);
      return {corteId:cp.id, fechaCorte:new Date(hoy+'T'+cs.hora_corte).toISOString(), sedeNombre:sede.nombre, horaCorte:cs.hora_corte};
    }
  }

  // Si todos los cortes de hoy están llenos → mañana primer corte
  const man = new Date(); man.setDate(man.getDate()+1);
  const manStr = man.toISOString().split('T')[0];
  const primerCorte = cortesOrdenados[0];

  let {data:cp} = await supabase.from('cortes_programados')
    .select('*').eq('sede_id',sede.id).eq('corte_sede_id',primerCorte.id).eq('fecha',manStr).maybeSingle();

  if (!cp) {
    const {data:nuevo} = await supabase.from('cortes_programados').insert({
      sede_id:sede.id, corte_sede_id:primerCorte.id, fecha:manStr,
      hora_corte:primerCorte.hora_corte, capacidad_max:primerCorte.capacidad_corte,
      pedidos_asignados:0, estado:'abierto'
    }).select().single();
    cp = nuevo;
  }

  if (cp) {
    await supabase.from('cortes_programados')
      .update({pedidos_asignados:cp.pedidos_asignados+1}).eq('id',cp.id);
    return {corteId:cp.id, fechaCorte:new Date(manStr+'T'+primerCorte.hora_corte).toISOString(), sedeNombre:sede.nombre, horaCorte:primerCorte.hora_corte};
  }
  return null;
};

// ── Enviar correo de rechazo ───────────────────────────────────────────────────
const enviarCorreoRechazo = async (pedido, motivo, emailAsesor) => {
  if (!emailAsesor) return;
  try {
    emailjs.init(EJS_PUBLIC);
    await emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
      numero_pedido: pedido.numero_pedido,
      cliente:       pedido.cliente,
      nit:           pedido.nit,
      motivo:        motivo,
      to_email:      emailAsesor,
    });
  } catch(e) { console.error('Error enviando correo:', e); }
};

// ── Componentes base ───────────────────────────────────────────────────────────
function BadgeEstado({estado}) {
  const e = ESTADOS_CARTERA[estado]||ESTADOS_CARTERA.pendiente;
  return <span style={{background:e.bg,color:e.color,border:`1px solid ${e.color}40`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{e.label}</span>;
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
// ── LOGIN ──────────────────────────────────────────────────────────────────────
// ── GESTIÓN SEDES ──────────────────────────────────────────────────────────────
export function GestionSedes({showToast}) {
  const [sedes,     setSedes]     = useState([]);
  const [modSede,   setModSede]   = useState(null); // null=cerrado, {}=nueva, {id...}=editar
  const [modCortes, setModCortes] = useState(null); // sede para gestionar cortes
  const [carg,      setCarg]      = useState(false);
  const vacio = {nombre:'',municipio:'',dane_code:'',capacidad_dia:'50',hora_ultimo_corte:'16:00',num_cortes:'3',activa:true};
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const cargar = async () => {
    const {data} = await supabase.from('sedes').select('*').order('nombre');
    setSedes(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const guardar = async () => {
    if(!form.nombre||!form.municipio||!form.dane_code){showToast("Completa todos los campos","error");return;}
    setCarg(true);
    const datos = {nombre:form.nombre.trim(),municipio:form.municipio.trim(),dane_code:form.dane_code.trim(),
      capacidad_dia:parseInt(form.capacidad_dia)||50,hora_ultimo_corte:form.hora_ultimo_corte,
      num_cortes:parseInt(form.num_cortes)||3,activa:form.activa};
    const {error} = form.id
      ? await supabase.from('sedes').update(datos).eq('id',form.id)
      : await supabase.from('sedes').insert(datos);
    if(error){showToast("Error: "+error.message,"error");}
    else{showToast(form.id?"✓ Sede actualizada":"✓ Sede creada","success");setModSede(null);setForm(vacio);cargar();}
    setCarg(false);
  };

  const eliminar = async (id,nombre) => {
    if(!window.confirm(`¿Eliminar sede "${nombre}"? Se eliminarán también sus cortes configurados.`))return;
    const {error} = await supabase.from('sedes').delete().eq('id',id);
    if(error)showToast("Error: "+error.message,"error");
    else{showToast("Sede eliminada","info");cargar();}
  };

  return (
   <Pagina>
    <Encabezado
     titulo="Sedes y cortes"
     descripcion="Puntos de despacho con su capacidad y sus horarios de corte"
     acciones={
      <button onClick={()=>{setForm(vacio);setModSede({});}} style={botonPrincipal}>
       <Plus size={16}/> Nueva sede
      </button>
     }
    />

    <Indicadores items={[
     { label:"Sedes", valor:sedes.length, color:T.color.marca, destacado:true },
     { label:"Activas", valor:sedes.filter(x=>x.activa).length, color:T.color.bienPunto },
     { label:"Capacidad por dia", valor:sedes.reduce((a,x)=>a+Number(x.capacidad_dia||0),0), color:T.color.infoPunto },
    ]}/>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     {sedes.length === 0 ? (
      <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       No hay sedes registradas. Agrega la primera para poder programar cortes.
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
        <thead>
         <tr>
          <th style={th}>Sede</th>
          <th style={th}>DANE</th>
          <th style={{...th, textAlign:"right"}}>Capacidad/dia</th>
          <th style={{...th, textAlign:"right"}}>Cortes</th>
          <th style={th}>Ultimo corte</th>
          <th style={th}>Estado</th>
          <th style={{...th, textAlign:"right"}}>Acciones</th>
         </tr>
        </thead>
        <tbody>
         {sedes.map(x => (
          <tr key={x.id}>
           <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>
            <div>{x.nombre}</div>
            <div style={{ ...T.texto.meta, color:T.color.tinta3, fontWeight:400 }}>{x.municipio}</div>
           </td>
           <td style={td}><span style={chipMono}>{x.dane_code}</span></td>
           <td style={tdCifra}>{x.capacidad_dia}</td>
           <td style={tdCifra}>{x.num_cortes}</td>
           <td style={td}>{x.hora_ultimo_corte}</td>
           <td style={td}>
            <span style={{
             display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
             borderRadius:T.radio.pastilla, fontSize:12, fontWeight:600,
             background: x.activa ? T.color.bienSuave : T.color.neutroSuave,
             color: x.activa ? T.color.bien : T.color.tinta3,
            }}>
             <span style={{ width:6, height:6, borderRadius:3, background: x.activa ? T.color.bienPunto : T.color.neutroPunto }}/>
             {x.activa ? "Activa" : "Inactiva"}
            </span>
           </td>
           <td style={{ ...td, textAlign:"right" }}>
            <div style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
             <button style={botonFila} onClick={()=>setModCortes(x)}>Cortes</button>
             <button style={botonFila}
              onClick={()=>{setForm({...x, capacidad_dia:String(x.capacidad_dia), num_cortes:String(x.num_cortes)}); setModSede(x);}}>
              Editar
             </button>
             <button title="Eliminar sede" onClick={()=>eliminar(x.id, x.nombre)}
              style={{ ...iconoAccion, color:T.color.mal }}><Trash2 size={15}/></button>
            </div>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </section>

    {modSede && (
     <ModalForm
      titulo={form.id ? "Editar sede" : "Nueva sede"}
      descripcion="Punto de despacho con su capacidad diaria"
      ancho="M"
      onClose={()=>setModSede(null)}
      onPrimario={guardar}
      guardando={carg}
      textoPrimario={form.id ? "Guardar cambios" : "Crear sede"}
     >
      <Texto label="Nombre de la sede" obligatorio valor={form.nombre} onChange={f("nombre")} placeholder="CEDI La Estrella" />
      <Fila>
       <Texto label="Municipio" valor={form.municipio} onChange={f("municipio")} placeholder="La Estrella" />
       <Texto label="Codigo DANE" mono valor={form.dane_code} onChange={f("dane_code")} placeholder="05380" />
      </Fila>
      <Fila columnas={3}>
       <Texto label="Capacidad por dia" tipo="number" valor={form.capacidad_dia} onChange={f("capacidad_dia")} />
       <Texto label="Cortes por dia" tipo="number" valor={form.num_cortes} onChange={f("num_cortes")} />
       <Texto label="Ultimo corte" tipo="time" valor={form.hora_ultimo_corte} onChange={f("hora_ultimo_corte")} />
      </Fila>
      <CasillaNovedad marcada={!form.activa} onChange={v=>f("activa")(!v)}>
       Sede inactiva (no recibe pedidos nuevos)
      </CasillaNovedad>
     </ModalForm>
    )}

    {modCortes && <ModalCortes sede={modCortes} onClose={()=>setModCortes(null)} showToast={showToast}/>}
   </Pagina>
  );
}

export function ModalCortes({sede,onClose,showToast}) {
  const [cortes, setCortes] = useState([]);
  const [form,   setForm]   = useState({hora_corte:'09:00',capacidad_corte:'20',orden:'1'});
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const [carg, setCarg] = useState(false);

  const cargar = async () => {
    const {data} = await supabase.from('cortes_sede').select('*').eq('sede_id',sede.id).order('orden');
    setCortes(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const agregar = async () => {
    if(!form.hora_corte||!form.capacidad_corte){showToast("Completa todos los campos","error");return;}
    setCarg(true);
    const {error} = await supabase.from('cortes_sede').insert({
      sede_id:sede.id,hora_corte:form.hora_corte,
      capacidad_corte:parseInt(form.capacidad_corte)||20,
      orden:parseInt(form.orden)||cortes.length+1
    });
    if(error)showToast("Error: "+error.message,"error");
    else{showToast("✓ Corte agregado","success");setForm({hora_corte:'09:00',capacidad_corte:'20',orden:String(cortes.length+2)});cargar();}
    setCarg(false);
  };

  const eliminar = async (id) => {
    await supabase.from('cortes_sede').delete().eq('id',id);
    showToast("Corte eliminado","info");
    cargar();
  };

  return (
   <ModalGestion
    titulo="Cortes de despacho"
    descripcion={sede.nombre}
    onClose={onClose}
    ancho="M"
    textoCancelar="Cerrar"
   >
    <Seccion titulo="Agregar corte"/>
    <div style={{
     display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10, alignItems:"end",
     background:T.color.superficie2, border:`1px solid ${T.color.borde}`,
     borderRadius:T.radio.control, padding:14,
    }}>
     <Texto label="Hora" tipo="time" valor={form.hora_corte} onChange={f("hora_corte")}/>
     <Texto label="Pedidos max." tipo="number" valor={form.capacidad_corte} onChange={f("capacidad_corte")} placeholder="20"/>
     <Texto label="Orden" tipo="number" valor={form.orden} onChange={f("orden")} placeholder="1"/>
     <button onClick={agregar} disabled={carg} style={{ ...botonPrincipal, height:40 }}>
      <Plus size={15}/> Agregar
     </button>
    </div>

    <Seccion titulo={`Cortes configurados (${cortes.length})`}/>
    {cortes.length === 0 ? (
     <div style={{
      padding:28, textAlign:"center", fontSize:13, color:T.color.tinta3,
      border:`1px dashed ${T.color.borde2}`, borderRadius:T.radio.control,
     }}>Esta sede aun no tiene cortes configurados.</div>
    ) : (
     <div style={{ border:`1px solid ${T.color.borde}`, borderRadius:T.radio.tarjeta, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr>
         <th style={{...th, width:70}}>Orden</th>
         <th style={th}>Hora</th>
         <th style={{...th, textAlign:"right"}}>Pedidos max.</th>
         <th style={{...th, textAlign:"right", width:64}}></th>
        </tr>
       </thead>
       <tbody>
        {cortes.map(c => (
         <tr key={c.id}>
          <td style={{ ...td, fontWeight:700, color:T.color.tinta }}>{c.orden}</td>
          <td style={td}><span style={chipMono}>{c.hora_corte}</span></td>
          <td style={tdCifra}>{c.capacidad_corte}</td>
          <td style={{ ...td, textAlign:"right" }}>
           <button title="Eliminar corte" onClick={()=>eliminar(c.id)}
            style={{ ...iconoAccion, color:T.color.mal }}><Trash2 size={15}/></button>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}
   </ModalGestion>
  );
}

// ── GESTIÓN ASESORES ───────────────────────────────────────────────────────────
// soloCrear: el cliente agrega asesores pero no toca los que ya estan. La base
// tampoco se lo permite (la politica asesores_cliente_insert le da insert y nada
// mas); aqui se esconde lo que no puede hacer para que no descubra el limite
// cuando ya escribio el formulario.
export function GestionAsesores({showToast, soloCrear = false}) {
  const [asesores, setAsesores] = useState([]);
  const [modNuevo, setModNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const vacio = {codigo:'',nombre:'',email:''};
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const [carg, setCarg] = useState(false);
  const fileRef = useRef(null);

  const cargar = async () => {
    const {data} = await supabase.from('asesores').select('*').order('codigo');
    setAsesores(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const guardar = async () => {
    if(!form.codigo||!form.nombre||!form.email){showToast("Completa todos los campos","error");return;}
    setCarg(true);
    const datos = {codigo:form.codigo.trim(),nombre:form.nombre.trim(),email:form.email.trim()};
    // El upsert sobre un codigo existente es un update encubierto, y a quien
    // solo puede crear la base se lo rechaza: se inserta derecho y el codigo
    // repetido se avisa como lo que es.
    const {error} = editando
      ? await supabase.from('asesores').update(datos).eq('id',editando)
      : soloCrear
        ? await supabase.from('asesores').insert(datos)
        : await supabase.from('asesores').upsert(datos,{onConflict:'codigo'});
    if(error)showToast(error.code === '23505'
      ? `Ya existe un asesor con el codigo ${datos.codigo}`
      : "Error: "+error.message, "error");
    else{showToast("✓ Asesor guardado","success");setModNuevo(false);setEditando(null);setForm(vacio);cargar();}
    setCarg(false);
  };

  const eliminar = async (id,nombre) => {
    if(!window.confirm(`¿Eliminar asesor "${nombre}"?`))return;
    await supabase.from('asesores').delete().eq('id',id);
    showToast("Asesor eliminado","info");cargar();
  };

  const cargarCSV = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const filas = filasCsv(text);
      if(filas.length<2){showToast("Archivo vacío o solo tiene encabezado","error");return;}
      const hdrs = filas[0].map(h=>h.toLowerCase());
      const iCod = hdrs.findIndex(h=>h.includes('codigo')||h.includes('código'));
      const iNom = hdrs.findIndex(h=>h.includes('nombre'));
      const iEml = hdrs.findIndex(h=>h.includes('email')||h.includes('correo'));
      if(iCod===-1||iNom===-1||iEml===-1){showToast("El CSV debe tener columnas: codigo, nombre, email","error");return;}
      const datos = filas.slice(1)
        .map(c=>({codigo:c[iCod]||'',nombre:c[iNom]||'',email:c[iEml]||''}))
        .filter(r=>r.codigo&&r.nombre&&r.email);
      let ok=0;
      for(const d of datos){
        const {error}=await supabase.from('asesores').upsert(d,{onConflict:'codigo'});
        if(!error)ok++;
      }
      showToast(`✓ ${ok} asesor(es) importados`,"success");cargar();
    };
    reader.readAsText(file,'UTF-8');
  };

  return (
   <Pagina>
    <Encabezado
     titulo="Asesores comerciales"
     descripcion="Destinatarios del correo cuando se rechaza un pedido"
     acciones={<>
      {!soloCrear && (
       <button onClick={()=>fileRef.current?.click()} style={botonBarra}>
        <Upload size={15}/> Importar CSV
       </button>
      )}
      <button onClick={()=>{setForm(vacio);setEditando(null);setModNuevo(true);}} style={botonPrincipal}>
       <Plus size={16}/> Nuevo asesor
      </button>
     </>}
    />

    <Indicadores items={[
     { label:"Asesores", valor:asesores.length, color:T.color.marca, destacado:true },
     { label:"Con correo", valor:asesores.filter(a=>a.email).length, color:T.color.bienPunto },
     { label:"Sin correo", valor:asesores.filter(a=>!a.email).length, color:T.color.ojoPunto },
    ]}/>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     {asesores.length === 0 ? (
      <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       Sin asesores registrados. Sin ellos, el rechazo de un pedido no avisa a nadie.
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
         <tr>
          <th style={th}>Codigo</th>
          <th style={th}>Nombre</th>
          <th style={th}>Correo</th>
          {!soloCrear && <th style={{...th, textAlign:"right"}}>Acciones</th>}
         </tr>
        </thead>
        <tbody>
         {asesores.slice().sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")).map(a => (
          <tr key={a.id}>
           <td style={td}><span style={chipMono}>{a.codigo}</span></td>
           <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{a.nombre || "-"}</td>
           <td style={td}>
            {a.email || <span style={{ color:T.color.ojo }}>Sin correo</span>}
           </td>
           {!soloCrear && (
            <td style={{ ...td, textAlign:"right" }}>
             <div style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
              <button style={botonFila}
               onClick={()=>{setForm({codigo:a.codigo, nombre:a.nombre||"", email:a.email||""}); setEditando(a); setModNuevo(true);}}>
               Editar
              </button>
              <button title="Eliminar asesor" onClick={()=>eliminar(a.id, a.nombre||a.codigo)}
               style={{ ...iconoAccion, color:T.color.mal }}><Trash2 size={15}/></button>
             </div>
            </td>
           )}
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </section>

    <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}}
     onChange={e=>{ if(e.target.files[0]) cargarCSV(e.target.files[0]); }}/>

    {modNuevo && (
     <ModalForm
      titulo={editando ? "Editar asesor" : "Nuevo asesor"}
      descripcion="El correo recibe el aviso cuando se rechaza uno de sus pedidos"
      onClose={()=>{setModNuevo(false);setEditando(null);}}
      onPrimario={guardar}
      guardando={carg}
      textoPrimario={editando ? "Guardar cambios" : "Crear asesor"}
     >
      <Texto label="Codigo del asesor" obligatorio mono valor={form.codigo} onChange={f("codigo")} placeholder="V001" />
      <Texto label="Nombre" valor={form.nombre} onChange={f("nombre")} placeholder="Juan Perez" />
      <Texto label="Correo" tipo="email" valor={form.email} onChange={f("email")} placeholder="juan.perez@prexxa.com.co" />
     </ModalForm>
    )}
   </Pagina>
  );
}

// ── GESTIÓN USUARIOS ───────────────────────────────────────────────────────────
// ── CARGAR CARTERA VENCIDA ─────────────────────────────────────────────────────
export function CargarCarteraVencida({showToast}) {
  const [archivo,  setArchivo]  = useState('');
  const [preview,  setPreview]  = useState(null);
  const [carg,     setCarg]     = useState(false);
  const [resultado,setResultado]= useState(null);
  const fileRef = useRef(null);

  const parsearCSV = (text) => {
    const filas = filasCsv(text);
    if(filas.length<2) throw new Error("Archivo vacío");
    const hdrs = filas[0].map(h=>h.toLowerCase());
    const iNit  = hdrs.findIndex(h=>h==='cliente'||h.includes('nit'));
    const iRaz  = hdrs.findIndex(h=>h.includes('razonsocial')||h.includes('razon'));
    const iDias = hdrs.findIndex(h=>h.includes('diasexcedio')||h.includes('dias'));
    const iFCor = hdrs.findIndex(h=>h.includes('fechacorte')||h.includes('corte'));
    if(iNit===-1||iDias===-1) throw new Error("No se encontraron columnas requeridas: Cliente (NIT) y DiasExcedio");

    const porNit = {};
    for(const c of filas.slice(1)) {
      const nit  = c[iNit]||'';
      const dias = parseInt(c[iDias])||0;
      const raz  = iRaz!==-1?c[iRaz]||'':'';
      const fcor = iFCor!==-1?c[iFCor]||'':'';
      if(!nit) continue;
      if(!porNit[nit]) porNit[nit]={nit,razon_social:raz,max_dias:dias,fecha_corte:fcor};
      else if(dias>porNit[nit].max_dias) porNit[nit].max_dias=dias;
    }
    return Object.values(porNit).map(r=>({
      nit: r.nit,
      razon_social: r.razon_social,
      tiene_vencidos: r.max_dias>0,
      dias_max_vencido: r.max_dias,
      fecha_corte: r.fecha_corte||new Date().toISOString().split('T')[0],
    }));
  };

  const leerArchivo = async (file) => {
    setArchivo(file.name); setPreview(null); setResultado(null);
    if(!/\.(csv|txt)$/i.test(file.name)) {
      showToast("Solo se aceptan archivos .CSV","error");
      setArchivo('');
      return;
    }
    try {
      const datos = parsearCSV(await leerTextoCsv(file));
      const vencidos = datos.filter(d=>d.tiene_vencidos).length;
      setPreview({total:datos.length, vencidos, alDia:datos.length-vencidos, datos});
    } catch(ex) { showToast("Error: "+ex.message,"error"); setArchivo(''); }
  };

  const aplicar = async () => {
    if(!preview) return;
    setCarg(true);
    try {
      // Delete all and replace
      await supabase.from('cartera_clientes').delete().neq('id','00000000-0000-0000-0000-000000000000');
      // Insert in chunks of 100
      const CHUNK=100;
      let ok=0;
      for(let i=0;i<preview.datos.length;i+=CHUNK){
        const chunk=preview.datos.slice(i,i+CHUNK);
        const {error}=await supabase.from('cartera_clientes').insert(chunk);
        if(!error) ok+=chunk.length;
      }
      setResultado({ok, total:preview.datos.length});
      showToast(`✓ ${ok} clientes actualizados en cartera`,"success");
      setPreview(null); setArchivo('');
    } catch(e){showToast("Error de conexión","error");}
    setCarg(false);
  };

  return (
   <Pagina>
    <Encabezado
     titulo="Cargar cartera vencida"
     descripcion="Reemplaza el estado de cartera de todos los clientes"
    />

    <section style={{ ...tarjeta, padding:20, display:"flex", flexDirection:"column", gap:16 }}>
     <button onClick={()=>fileRef.current?.click()}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault(); if(e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]);}}
      style={{
       width:"100%", padding:"32px 20px", borderRadius:T.radio.tarjeta,
       border:`1px dashed ${T.color.borde2}`, background:T.color.superficie2,
       cursor:"pointer", fontFamily:"inherit", textAlign:"center",
      }}>
      <span style={{
       width:44, height:44, borderRadius:T.radio.control, margin:"0 auto 12px",
       background:T.color.marcaSuave, color:T.color.marca, display:"grid", placeItems:"center",
      }}><Upload size={20}/></span>
      <span style={{ display:"block", fontSize:14, fontWeight:700, color:T.color.tinta }}>
       {archivo || "Arrastra el archivo CSV o haz clic para seleccionarlo"}
      </span>
      <span style={{ display:"block", fontSize:12.5, color:T.color.tinta3, marginTop:4 }}>
       Solo archivos .csv · columnas Cliente (NIT) y DiasExcedio
      </span>
     </button>
     <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}}
      onChange={e=>{ if(e.target.files[0]) leerArchivo(e.target.files[0]); }}/>

     <FranjaInfo>
      Cada carga <strong>reemplaza</strong> la tabla completa: los clientes que no vengan en el
      archivo quedan sin cartera vencida.
     </FranjaInfo>

     {preview && (
      <>
       <Indicadores items={[
        { label:"Clientes", valor:preview.total, color:T.color.marca, destacado:true },
        { label:"Con cartera vencida", valor:preview.vencidos, color:T.color.malPunto },
        { label:"Al dia", valor:preview.alDia, color:T.color.bienPunto },
       ]}/>
       <button onClick={aplicar} disabled={carg} style={{ ...botonPrincipal, alignSelf:"flex-start" }}>
        {carg ? "Aplicando..." : `Aplicar a ${preview.total} cliente(s)`}
       </button>
      </>
     )}

     {resultado && (
      <FranjaInfo>
       {resultado.ok} de {resultado.total} cliente(s) cargados.
      </FranjaInfo>
     )}
    </section>
   </Pagina>
  );
}

// ── CARGAR PEDIDOS ─────────────────────────────────────────────────────────────
export function CargarPedidos({showToast,onCargado}) {
  const [archivo,   setArchivo]  = useState('');
  const [pedidos,   setPedidos]  = useState([]);
  const [errMsg,    setErrMsg]   = useState('');
  const [carg,      setCarg]     = useState(false);
  const [resultado, setResultado]= useState(null);
  const [cartera,   setCartera]  = useState({});
  const fileRef = useRef(null);

  // Cargar estado de cartera para clasificar
  useEffect(()=>{
    supabase.from('cartera_clientes').select('nit,tiene_vencidos').then(({data})=>{
      const mapa={};
      (data||[]).forEach(c=>{mapa[c.nit]={tiene_vencidos:c.tiene_vencidos};});
      setCartera(mapa);
    });
  },[]);

  const clasificar = (nit, plazo) => {
    const nitStr = String(nit||'').trim();
    if(cartera[nitStr]?.tiene_vencidos) return 'cartera_vencida';
    if(parseInt(plazo||0)>0) return 'preaprobado';
    return 'pendiente';
  };

  // Solo CSV. leerTextoCsv resuelve el encoding (UTF-8 y, si no, Windows-1252) y
  // filasCsv respeta las comillas, asi que un campo con comas o saltos de linea
  // adentro ya no corre las columnas.
  const leerArchivo = async (file) => {
    setArchivo(file.name); setPedidos([]); setErrMsg(''); setResultado(null);
    if(!/\.(csv|txt)$/i.test(file.name)) {
      setErrMsg("Solo se aceptan archivos .CSV. Si tienes un Excel, guardalo como CSV y vuelve a subirlo.");
      setArchivo('');
      return;
    }
      try {
        const rows = filasCsv(await leerTextoCsv(file));
        if(rows.length<2){setErrMsg("El archivo está vacío o solo tiene encabezado");return;}

        const hdrs = rows[0].map(h=>String(h||'').trim().toLowerCase().replace(/\s+/g,'_'));
        const col = (...names)=>{for(const n of names){const i=hdrs.findIndex(h=>h.includes(n));if(i!==-1)return i;}return -1;};

        const iCia   = col('cia');
        const iFech  = col('fecha');
        const iPed   = col('pedido');
        const iNit   = col('nit');
        const iCli   = col('nombre_cliente','cliente');
        const iDir   = col('direccion','dirección');
        const iDane  = col('sector_dane');
        const iValDec= col('valor_declarado');
        const iCodMsg= col('codigo_mensaje','código_mensaje');
        const iPlazo = col('plazo');
        const iObs   = col('observacion','observación');
        const iVend  = col('vendedor');
        const iOrig  = col('origen');
        const iDaneO = col('dane_origen');
        const iCBRef = col('cia_bod_ref');
        const iBod   = col('bodega');
        const iRef   = col('referencia');
        const iDesc  = col('descripcion_ref','descripción');
        const iPrecio= col('precio');
        const iCant  = col('cantidad_pedida','cantidad');
        const iLios  = col('lios','líos');
        const iVTotal= col('valor_total');

        if(iPed===-1) {setErrMsg("No se encontró la columna 'Pedido'");return;}

        // Group rows by pedido
        const grupos = {};
        for(const row of rows.slice(1)) {
          const numPed = String(row[iPed]||'').trim();
          if(!numPed) continue;
          if(!grupos[numPed]) {
            grupos[numPed]={
              numero_pedido:numPed,
              cia:          String(row[iCia]||'').trim(),
              fecha_pedido: isFecha(row[iFech]),
              nit:          String(row[iNit]||'').trim(),
              cliente:      String(row[iCli]||'').trim(),
              direccion:    String(row[iDir]||'').trim(),
              sector_dane:  String(row[iDane]||'').trim(),
              codigo_mensaje:String(row[iCodMsg]||'').trim(),
              plazo:        parseInt(row[iPlazo]||0)||0,
              observacion:  String(row[iObs]||'').trim(),
              vendedor:     String(row[iVend]||'').trim(),
              origen:       String(row[iOrig]||'').trim(),
              dane_origen:  String(row[iDaneO]||'').trim(),
              valor_total:  0,
              lineas:[],
            };
          }
          const linea={
            cia_bod_ref:String(row[iCBRef]||'').trim(),
            bodega:     String(row[iBod]||'').trim(),
            referencia: String(row[iRef]||'').trim(),
            descripcion:String(row[iDesc]||'').trim(),
            precio:     parseFloat(String(row[iPrecio]||'0').replace(/[^0-9.-]/g,''))||0,
            cantidad_pedida:parseInt(row[iCant]||0)||0,
            lios:       parseInt(row[iLios]||0)||0,
            valor_total:parseFloat(String(row[iVTotal]||'0').replace(/[^0-9.-]/g,''))||0,
          };
          grupos[numPed].lineas.push(linea);
          grupos[numPed].valor_total += linea.valor_total;
        }

        const lista = Object.values(grupos).map(p=>({
          ...p,
          estado_cartera: clasificar(p.nit, p.plazo),
        }));

        if(lista.length===0){setErrMsg("No se encontraron pedidos en el archivo");return;}
        setPedidos(lista);
      } catch(ex){setErrMsg("Error leyendo el archivo: "+ex.message);}
  };

  const isFecha = (val) => {
    if(!val) return null;
    if(val instanceof Date) return val.toISOString().split('T')[0];
    if(typeof val==='number') {
      const d = new Date((val-25569)*86400*1000);
      return d.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if(s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0,10);
    return s;
  };

  const confirmar = async () => {
    if(!pedidos.length) return;
    setCarg(true);
    // Verificar cuáles números de pedido ya existen en la base, antes de insertar
    const numeros = pedidos.map(p=>p.numero_pedido);
    const {data:existentes} = await supabase.from('pedidos_cartera').select('numero_pedido').in('numero_pedido',numeros);
    const yaExisten = new Set((existentes||[]).map(e=>e.numero_pedido));

    let ok=0, errores=0;
    const duplicados=[];
    for(const p of pedidos) {
      if(yaExisten.has(p.numero_pedido)){ duplicados.push(p.numero_pedido); continue; }
      const {lineas,...pedData} = p;
      const {data:inserted,error} = await supabase.from('pedidos_cartera').insert(pedData).select().single();
      if(error||!inserted){errores++;continue;}
      if(lineas.length>0){
        await supabase.from('pedidos_cartera_detalle').insert(lineas.map(l=>({...l,pedido_id:inserted.id})));
      }
      ok++;
    }
    setCarg(false);
    setResultado({ok,errores,total:pedidos.length,duplicados});
    let msg=`✓ ${ok} pedido(s) cargados`;
    if(duplicados.length>0) msg+=` · ${duplicados.length} ya existían (omitidos)`;
    showToast(msg,"success");
    if(ok>0 && onCargado) onCargado();
  };

  const resumen = {
    total:pedidos.length,
    vencida:pedidos.filter(p=>p.estado_cartera==='cartera_vencida').length,
    preaprobado:pedidos.filter(p=>p.estado_cartera==='preaprobado').length,
    pendiente:pedidos.filter(p=>p.estado_cartera==='pendiente').length,
  };

  return (
   <Pagina>
    <Encabezado
     titulo="Cargar pedidos"
     descripcion="Pedidos del dia para revisar contra el estado de cartera"
    />

    <section style={{ ...tarjeta, padding:20, display:"flex", flexDirection:"column", gap:16 }}>
     <button onClick={()=>fileRef.current?.click()}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault(); if(e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]);}}
      style={{
       width:"100%", padding:"32px 20px", borderRadius:T.radio.tarjeta,
       border:`1px dashed ${T.color.borde2}`, background:T.color.superficie2,
       cursor:"pointer", fontFamily:"inherit", textAlign:"center",
      }}>
      <span style={{
       width:44, height:44, borderRadius:T.radio.control, margin:"0 auto 12px",
       background:T.color.marcaSuave, color:T.color.marca, display:"grid", placeItems:"center",
      }}><Upload size={20}/></span>
      <span style={{ display:"block", fontSize:14, fontWeight:700, color:T.color.tinta }}>
       {archivo || "Arrastra el archivo CSV o haz clic para seleccionarlo"}
      </span>
      <span style={{ display:"block", fontSize:12.5, color:T.color.tinta3, marginTop:4 }}>
       Solo archivos .csv · una linea por referencia del pedido
      </span>
     </button>
     <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}}
      onChange={e=>{ if(e.target.files[0]) leerArchivo(e.target.files[0]); }}/>

     {errMsg && (
      <div style={{
       background:T.color.malSuave, border:`1px solid ${T.color.malBorde}`,
       color:T.color.mal, borderRadius:T.radio.control, padding:"10px 12px", fontSize:13,
      }}>{errMsg}</div>
     )}

     {pedidos.length > 0 && (
      <>
       <Indicadores items={[
        { label:"Pedidos leidos", valor:resumen.total, color:T.color.marca, destacado:true },
        { label:"Cartera vencida", valor:resumen.vencida, color:T.color.malPunto },
        { label:"Preaprobados", valor:resumen.preaprobado, color:T.color.bienPunto },
        { label:"Pendientes", valor:resumen.pendiente, color:T.color.ojoPunto },
       ]}/>

       <div style={{ border:`1px solid ${T.color.borde}`, borderRadius:T.radio.tarjeta, overflow:"hidden" }}>
        <div style={{ maxHeight:280, overflowY:"auto" }}>
         <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
           <tr>
            <th style={th}>Pedido</th>
            <th style={th}>Cliente</th>
            <th style={{...th, textAlign:"right"}}>Valor</th>
            <th style={th}>Clasificacion</th>
           </tr>
          </thead>
          <tbody>
           {pedidos.slice(0, 100).map((x,i) => {
            const est = ESTADOS_CARTERA[x.estado_cartera] || ESTADOS_CARTERA.pendiente;
            return (
             <tr key={i}>
              <td style={td}><span style={chipMono}>{x.numero_pedido}</span></td>
              <td style={{ ...td, maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
               <div style={{ fontWeight:600, color:T.color.tinta }}>{x.cliente}</div>
               <div style={mono}>{x.nit}</div>
              </td>
              <td style={tdCifra}>{fCOP(x.valor_total)}</td>
              <td style={td}>
               <span style={{
                display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
                borderRadius:T.radio.pastilla, background:est.bg, color:est.color,
                fontSize:12, fontWeight:600, whiteSpace:"nowrap",
               }}>
                <span style={{ width:6, height:6, borderRadius:3, background:est.color }}/>
                {est.label}
               </span>
              </td>
             </tr>
            );
           })}
          </tbody>
         </table>
        </div>
        {pedidos.length > 100 && (
         <div style={{ padding:"9px 14px", borderTop:`1px solid ${T.color.divisor}`, fontSize:12.5, color:T.color.tinta3 }}>
          Mostrando 100 de {pedidos.length}; se cargan todos.
         </div>
        )}
       </div>

       <button onClick={confirmar} disabled={carg} style={{ ...botonPrincipal, alignSelf:"flex-start" }}>
        {carg ? "Cargando..." : `Cargar ${pedidos.length} pedido(s)`}
       </button>
      </>
     )}

     {resultado && (
      <FranjaInfo>
       {resultado.ok} de {resultado.total} pedido(s) cargados
       {resultado.duplicados.length > 0 ? `, ${resultado.duplicados.length} ya existian y se omitieron` : ""}
       {resultado.errores > 0 ? `, ${resultado.errores} con error` : ""}.
      </FranjaInfo>
     )}
    </section>
   </Pagina>
  );
}

// ── GESTIÓN PEDIDOS (CARTERA) ──────────────────────────────────────────────────
export function GestionPedidos({user, showToast}) {
  const [pedidos,    setPedidos]    = useState([]);
  const [filtroEst,  setFiltroEst]  = useState('todos');
  const [busq,       setBusq]       = useState('');
  const [seleccion,  setSeleccion]  = useState(new Set());
  const [modRechazar,setModRechazar]= useState(null);
  const [carg,       setCarg]       = useState(false);
  const [aprobando,  setAprobando]  = useState(false);

  const cargar = async () => {
    setCarg(true);
    const {data} = await supabase.from('pedidos_cartera').select('*')
      .in('estado_cartera',['pendiente','preaprobado','cartera_vencida','aprobado','rechazado'])
      .order('created_at',{ascending:false});
    setPedidos(data||[]);
    setSeleccion(new Set());
    setCarg(false);
  };
  useEffect(()=>{cargar();},[]);

  const filtrados = pedidos.filter(p=>{
    if(filtroEst!=='todos'&&p.estado_cartera!==filtroEst) return false;
    if(busq){
      const q=busq.toLowerCase();
      return p.numero_pedido?.toLowerCase().includes(q)||p.cliente?.toLowerCase().includes(q)||p.nit?.toLowerCase().includes(q)||p.vendedor?.toLowerCase().includes(q);
    }
    return true;
  });

  const pendientesAprobacion = filtrados.filter(p=>['pendiente','preaprobado','cartera_vencida'].includes(p.estado_cartera));

  const toggleSel = (id) => {
    const s=new Set(seleccion);
    s.has(id)?s.delete(id):s.add(id);
    setSeleccion(s);
  };
  const selTodos = () => {
    if(seleccion.size===pendientesAprobacion.length) setSeleccion(new Set());
    else setSeleccion(new Set(pendientesAprobacion.map(p=>p.id)));
  };

  const aprobarPedido = async (id) => {
    const pedido = pedidos.find(p=>p.id===id);
    if(!pedido) return {ok:false};
    const ahora = new Date().toISOString();
    const corte = await asignarCorte(pedido.dane_origen);
    const upd = { estado_cartera:'aprobado', fecha_aprobacion:ahora, aprobado_por:user.id, estado_impresion:'no_impreso' };
    if(corte){upd.corte_id=corte.corteId;upd.fecha_corte=corte.fechaCorte;}
    await supabase.from('pedidos_cartera').update(upd).eq('id',id);
    await supabase.from('historial_cartera').insert({pedido_id:id,decision:'aprobado',usuario_id:user.id,motivo:'Aprobado por cartera'});
    return {ok:true, sinCorte:!corte};
  };

  const aprobarUno = async (id) => {
    setAprobando(true);
    const {sinCorte} = await aprobarPedido(id);
    setAprobando(false);
    showToast("✓ Pedido aprobado"+(sinCorte?" · Sin sede configurada (verificar DANE Origen)":""),"success");
    cargar();
  };

  const aprobarSeleccionados = async () => {
    if(!seleccion.size){showToast("Selecciona al menos un pedido","error");return;}
    setAprobando(true);
    let ok=0; let sinCorte=0;
    for(const id of seleccion){
      const res = await aprobarPedido(id);
      if(res.ok){ ok++; if(res.sinCorte) sinCorte++; }
    }
    setAprobando(false);
    let msg=`✓ ${ok} pedido(s) aprobado(s)`;
    if(sinCorte>0) msg+=` · ${sinCorte} sin sede configurada (verificar DANE Origen)`;
    showToast(msg,"success");
    cargar();
  };

  const reactivar = async (id) => {
    if(!window.confirm("¿Reactivar este pedido? Volverá a estado Pendiente para revisión.")) return;
    await supabase.from('pedidos_cartera').update({estado_cartera:'pendiente',motivo_rechazo:null}).eq('id',id);
    await supabase.from('historial_cartera').insert({pedido_id:id,decision:'reactivado',usuario_id:user.id,motivo:'Reactivado desde rechazado'});
    showToast("↺ Pedido reactivado · Ahora está Pendiente","success");
    cargar();
  };

  const rechazar = async (pedidoId, motivo) => {
    const pedido = pedidos.find(p=>p.id===pedidoId);
    if(!pedido) return;
    // Buscar email del asesor
    let emailAsesor='';
    if(pedido.vendedor){
      const codVend = pedido.vendedor.trim();
      const codNorm = codVend.replace(/^0+/,'')||'0'; // "01" -> "1", ignora ceros a la izquierda
      const {data:asesoresMatch} = await supabase.from('asesores').select('email,codigo');
      const asesor = (asesoresMatch||[]).find(a=>{
        const c = String(a.codigo||'').trim();
        return c===codVend || (c.replace(/^0+/,'')||'0')===codNorm;
      });
      if(asesor) emailAsesor=asesor.email;
    }
    await supabase.from('pedidos_cartera').update({estado_cartera:'rechazado',motivo_rechazo:motivo}).eq('id',pedidoId);
    await supabase.from('historial_cartera').insert({pedido_id:pedidoId,decision:'rechazado',usuario_id:user.id,motivo});
    if(emailAsesor) await enviarCorreoRechazo(pedido,motivo,emailAsesor);
    showToast("Pedido rechazado"+(emailAsesor?` · Correo enviado a ${emailAsesor}`:""),"info");
    setModRechazar(null);
    cargar();
  };

  const tabs=[
    {k:'todos',l:'Todos'},
    {k:'preaprobado',l:'Preaprobados'},
    {k:'pendiente',l:'Pendientes'},
    {k:'cartera_vencida',l:'Cartera Vencida'},
    {k:'aprobado',l:'Aprobados'},
    {k:'rechazado',l:'Rechazados'},
  ];

  const conteos={};
  pedidos.forEach(p=>{conteos[p.estado_cartera]=(conteos[p.estado_cartera]||0)+1;});

  const todosVisiblesMarcados = filtrados.length > 0 && filtrados.every(x => seleccion.has(x.id));

  return (
   <Pagina>
    <Encabezado
     titulo="Gestion de pedidos"
     descripcion="Aprobacion de pedidos segun el estado de cartera del cliente"
     acciones={
      <button onClick={cargar} style={botonBarra} disabled={carg}>
       {carg ? "Actualizando..." : "Actualizar"}
      </button>
     }
    />

    {/* Los indicadores son el filtro: tocar uno deja solo ese estado. */}
    <Indicadores items={tabs.map(x => ({
     label: x.l,
     valor: x.k === "todos" ? pedidos.length : (conteos[x.k] || 0),
     color: x.k === "todos" ? T.color.tinta : (ESTADOS_CARTERA[x.k]?.color || T.color.tinta3),
     activo: filtroEst === x.k,
     onClick: () => setFiltroEst(x.k),
    }))}/>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     {seleccion.size > 0 ? (
      <BarraSeleccion
       cantidad={seleccion.size}
       onLimpiar={()=>setSeleccion(new Set())}
       acciones={
        <button onClick={aprobarSeleccionados} disabled={aprobando}
         style={{ ...botonBarra, background:T.color.bienPunto, border:"none", color:"#fff" }}>
         {aprobando ? "Aprobando..." : `Aprobar ${seleccion.size} pedido(s)`}
        </button>
       }
      />
     ) : (
      <BarraFiltros derecha={`${filtrados.length} de ${pedidos.length}`}>
       <Buscador valor={busq} onChange={setBusq} placeholder="Buscar pedido, NIT, cliente o asesor" ancho={300}/>
      </BarraFiltros>
     )}

     {filtrados.length === 0 ? (
      <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       {pedidos.length === 0 ? "Sin pedidos cargados. Empieza por Cargar pedidos." : "Ningun pedido coincide con el filtro."}
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", minWidth:940 }}>
        <thead>
         <tr>
          <th style={{ ...th, width:42 }}>
           <input type="checkbox" checked={todosVisiblesMarcados} onChange={selTodos}
            title="Seleccionar los visibles"
            style={{ width:15, height:15, accentColor:T.color.marca, cursor:"pointer" }}/>
          </th>
          <th style={th}>Pedido</th>
          <th style={th}>Cliente</th>
          <th style={th}>Asesor</th>
          <th style={{...th, textAlign:"right"}}>Valor</th>
          <th style={{...th, textAlign:"right"}}>Plazo</th>
          <th style={th}>Estado</th>
          <th style={{...th, textAlign:"right"}}>Acciones</th>
         </tr>
        </thead>
        <tbody>
         {filtrados.map(x => {
          const marcado = seleccion.has(x.id);
          const est = ESTADOS_CARTERA[x.estado_cartera] || ESTADOS_CARTERA.pendiente;
          const decidible = x.estado_cartera !== "aprobado" && x.estado_cartera !== "rechazado";
          return (
           <tr key={x.id} style={{ background: marcado ? T.color.marcaSuave : "transparent" }}>
            <td style={td}>
             <input type="checkbox" checked={marcado} onChange={()=>toggleSel(x.id)}
              style={{ width:15, height:15, accentColor:T.color.marca, cursor:"pointer" }}/>
            </td>
            <td style={td}>
             <span style={chipMono}>{x.numero_pedido}</span>
             {x.fecha_pedido && <div style={{ ...T.texto.meta, color:T.color.tinta3, marginTop:3 }}>{x.fecha_pedido}</div>}
            </td>
            <td style={{ ...td, maxWidth:220 }}>
             <div style={{ fontWeight:600, color:T.color.tinta, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {x.cliente}
             </div>
             <div style={mono}>{x.nit}</div>
            </td>
            <td style={td}>{x.vendedor || <span style={{ color:T.color.tinta3 }}>-</span>}</td>
            <td style={tdCifra}>{fCOP(x.valor_total)}</td>
            <td style={tdCifra}>{x.plazo || 0}</td>
            <td style={td}>
             <span style={{
              display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
              borderRadius:T.radio.pastilla, background:est.bg, color:est.color,
              fontSize:12, fontWeight:600, whiteSpace:"nowrap",
             }}>
              <span style={{ width:6, height:6, borderRadius:3, background:est.color }}/>
              {est.label}
             </span>
             {x.motivo_rechazo && (
              <div style={{ ...T.texto.meta, color:T.color.mal, marginTop:3 }}>{x.motivo_rechazo}</div>
             )}
            </td>
            <td style={{ ...td, textAlign:"right" }}>
             <div style={{ display:"inline-flex", gap:6 }}>
              {decidible && (
               <>
                <button style={{ ...botonFila, background:T.color.bienPunto, border:"none", color:"#fff" }}
                 onClick={()=>aprobarUno(x.id)}>Aprobar</button>
                <button style={{ ...botonFila, color:T.color.mal, borderColor:T.color.malBorde }}
                 onClick={()=>setModRechazar(x)}>Rechazar</button>
               </>
              )}
              {x.estado_cartera === "rechazado" && (
               <button style={botonFila} onClick={()=>reactivar(x.id)}>Reactivar</button>
              )}
              {x.estado_cartera === "aprobado" && (
               <span style={{ fontSize:12.5, color:T.color.tinta3 }}>
                {x.fecha_corte ? fFechaHora(x.fecha_corte) : "En espera de corte"}
               </span>
              )}
             </div>
            </td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>
     )}

     <PieTabla izquierda={`${filtrados.length} ${filtrados.length === 1 ? "pedido" : "pedidos"}`}/>
    </section>

    {modRechazar && (
     <ModalRechazar pedido={modRechazar} onClose={()=>setModRechazar(null)}
      onRechazar={(motivo)=>rechazar(modRechazar.id, motivo)}/>
    )}
   </Pagina>
  );
}

export function ModalRechazar({pedido, onRechazar, onClose}) {
  const [motivo, setMotivo] = useState('');
  const [carg,   setCarg]   = useState(false);
  const confirmar = async () => {
    if(!motivo.trim()){return;}
    setCarg(true);
    await onRechazar(pedido.id, motivo.trim());
    setCarg(false);
  };
  return (
   <ModalGestion
    titulo="Rechazar pedido"
    descripcion={pedido.numero_pedido}
    onClose={onClose}
    onGuardar={confirmar}
    textoGuardar="Confirmar rechazo"
    guardando={carg}
    guardarDeshabilitado={!motivo.trim()}
   >
    <Resumen datos={[
     { label:"Cliente", valor:pedido.cliente },
     { label:"NIT", valor:pedido.nit, mono:true },
     { label:"Valor", valor:fCOP(pedido.valor_total) },
     { label:"Asesor", valor:pedido.vendedor || "Sin asesor" },
    ]}/>

    <AreaTexto
     label="Motivo del rechazo"
     obligatorio
     valor={motivo}
     onChange={setMotivo}
     placeholder="Explica el motivo para notificar al asesor"
     filas={4}
    />

    <FranjaInfo>
     Al confirmar se envia un correo automatico al asesor con el motivo del rechazo.
    </FranjaInfo>
   </ModalGestion>
  );
}

// ── MÓDULO LOGÍSTICA ───────────────────────────────────────────────────────────
export function ModuloLogistica({showToast}) {
  const [sedes,   setSedes]   = useState([]);
  const [cortes,  setCortes]  = useState([]);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroFecha,setFiltroFecha]= useState(new Date().toISOString().split('T')[0]);
  const [filtroImp,  setFiltroImp]  = useState('no_impreso');
  const [pedidos,    setPedidos]    = useState([]);
  const [transmitiendo,setTransmitiendo]=useState(false);

  useEffect(()=>{
    supabase.from('sedes').select('*').order('nombre').then(({data})=>setSedes(data||[]));
  },[]);

  const cargar = async () => {
    let q = supabase.from('cortes_programados').select('*, sedes(nombre,municipio)')
      .eq('fecha',filtroFecha).order('hora_corte');
    if(filtroSede) q=q.eq('sede_id',filtroSede);
    const {data:cortesData} = await q;
    setCortes(cortesData||[]);

    // Load pedidos — se filtra por los IDs de los cortes ya cargados (evita bug de huso horario
    // al comparar fecha_corte, que se guarda en UTC, contra un rango de fecha local)
    const corteIds = (cortesData||[]).map(c=>c.id);
    let peds = [];
    if(corteIds.length){
      let qp = supabase.from('pedidos_cartera').select('*, pedidos_cartera_detalle(*)')
        .eq('estado_cartera','aprobado').in('corte_id',corteIds).order('fecha_corte');
      if(filtroImp==='no_impreso') qp=qp.or('estado_impresion.eq.no_impreso,estado_impresion.is.null');
      else if(filtroImp!=='todos') qp=qp.eq('estado_impresion',filtroImp);
      const res = await qp;
      peds = res.data||[];
    }
    setPedidos(peds);
  };
  useEffect(()=>{cargar();},[filtroSede,filtroFecha,filtroImp]);

  const transmitirCorte = async (corteId) => {
    setTransmitiendo(true);
    const ahora=new Date().toISOString();
    // Update pedidos in this corte
    await supabase.from('pedidos_cartera')
      .update({transmitido_tms:true,fecha_transmision:ahora})
      .eq('corte_id',corteId).eq('estado_cartera','aprobado');
    // Update corte status
    await supabase.from('cortes_programados')
      .update({estado:'transmitido',fecha_transmision:ahora}).eq('id',corteId);
    showToast("✓ Corte transmitido a logística","success");
    setTransmitiendo(false);
    cargar();
  };

  const imprimir = (pedidosImprimir) => {
    if(!pedidosImprimir.length){showToast("No hay pedidos para imprimir","error");return;}
    const win=window.open('','_blank');
    const html=pedidosImprimir.map((p,i)=>generarHTMLPedido(p,i<pedidosImprimir.length-1)).join('');
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pedidos QTracking</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:11px;color:#000;}
      .pagina{padding:16px;width:210mm;min-height:148mm;}
      .titulo{font-size:16px;font-weight:bold;margin-bottom:4px;}
      .subtitulo{font-size:12px;font-weight:bold;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;margin-bottom:8px;}
      th,td{border:1px solid #000;padding:4px 8px;text-align:left;font-size:10px;}
      th{background:#e5e7eb;font-weight:bold;}
      .enc-tabla td{border:none;padding:3px 0;}
      .enc-tabla td:first-child{font-weight:bold;width:140px;}
      .page-break{page-break-after:always;}
      @media print{body{-webkit-print-color-adjust:exact;}}
    </style></head><body>${html}</body></html>`);
    win.document.close();
    // Mark as printed
    pedidosImprimir.forEach(async p=>{
      await supabase.from('pedidos_cartera')
        .update({estado_impresion:'impreso',fecha_impresion:new Date().toISOString()}).eq('id',p.id);
    });
    win.print();
    cargar();
  };

  const generarHTMLPedido = (p, conSalto) => {
    const lineas=(p.pedidos_cartera_detalle||[]);
    const totalCant=lineas.reduce((a,l)=>a+l.cantidad_pedida,0);
    const totalLios=lineas.reduce((a,l)=>a+l.lios,0);
    const totalVal=lineas.reduce((a,l)=>a+l.valor_total,0);
    const fechaDoc = p.fecha_corte?fFecha(p.fecha_corte):fFecha(p.fecha_pedido);
    return `
    <div class="pagina${conSalto?' page-break':''}">
      <div class="titulo">SOMOS PRO</div>
      <div class="subtitulo">ORDEN DE PEDIDO</div>
      <table class="enc-tabla" style="margin-bottom:12px">
        <tr><td>Pedido No.</td><td><strong>${p.numero_pedido}</strong></td><td>Fecha</td><td><strong>${fechaDoc}</strong></td></tr>
        <tr><td>Compañía (Cia)</td><td>${p.cia||''}</td><td>Vendedor</td><td>${p.vendedor||''}</td></tr>
        <tr><td>Cliente</td><td colspan="3"><strong>${p.cliente||''}</strong></td></tr>
        <tr><td>Nit</td><td>${p.nit||''}</td><td>Sector Dane</td><td>${p.sector_dane||'(sin dato)'}</td></tr>
        <tr><td>Dirección</td><td colspan="3">${p.direccion||''}</td></tr>
        <tr><td>Código Mensaje</td><td>${p.codigo_mensaje||''}</td><td>Plazo (días)</td><td>${p.plazo||0}</td></tr>
        <tr><td>Valor Declarado</td><td colspan="3">${fCOP(p.valor_total)}</td></tr>
        <tr><td>Origen</td><td>${p.origen||''}</td><td>DANE Origen</td><td>${p.dane_origen||''}</td></tr>
        <tr><td>Observación</td><td colspan="3">${p.observacion||'(sin observaciones)'}</td></tr>
      </table>
      <table>
        <thead><tr><th>Referencia</th><th>Descripción</th><th>Bodega</th><th>Precio</th><th>Cant. Pedida</th><th>Líos</th><th>Valor Total</th></tr></thead>
        <tbody>
          ${lineas.map(l=>`<tr><td>${l.referencia||''}</td><td>${l.descripcion||''}</td><td>${l.bodega||''}</td><td>${fCOP(l.precio)}</td><td style="text-align:center">${l.cantidad_pedida}</td><td style="text-align:center">${l.lios}</td><td>${fCOP(l.valor_total)}</td></tr>`).join('')}
          <tr style="font-weight:bold;background:#f3f4f6"><td colspan="4">TOTALES</td><td style="text-align:center">${totalCant}</td><td style="text-align:center">${totalLios}</td><td>${fCOP(totalVal)}</td></tr>
        </tbody>
      </table>
    </div>`;
  };

  // Pedidos transmitidos y no impresos
  const pedidosTransmitidos = pedidos.filter(p=>p.transmitido_tms);

  const porImprimir = pedidos.filter(x => x.estado_impresion !== "impreso");

  return (
   <Pagina>
    <Encabezado
     titulo="Logistica de cartera"
     descripcion="Pedidos aprobados listos para imprimir y transmitir al TMS"
     acciones={
      <button onClick={()=>imprimir(pedidos)} disabled={pedidos.length === 0}
       style={{ ...botonBarra, opacity: pedidos.length ? 1 : 0.5, cursor: pedidos.length ? "pointer" : "not-allowed" }}>
       <Printer size={15}/> Imprimir {pedidos.length > 0 ? `(${pedidos.length})` : ""}
      </button>
     }
    />

    <Indicadores items={[
     { label:"Pedidos del corte", valor:pedidos.length, color:T.color.marca, destacado:true },
     { label:"Por imprimir", valor:porImprimir.length, color:T.color.ojoPunto },
     { label:"Cortes del dia", valor:cortes.length, color:T.color.infoPunto },
     { label:"Transmitidos", valor:cortes.filter(c=>c.estado === "transmitido").length, color:T.color.bienPunto },
    ]}/>

    <section style={{ ...tarjeta, padding:14, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
     <SelectFiltro valor={filtroSede} onChange={setFiltroSede} ancho={240}>
      <option value="">Todas las sedes</option>
      {sedes.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}
     </SelectFiltro>
     <input type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}
      style={{
       height:38, padding:"0 12px", border:`1px solid ${T.color.borde2}`,
       borderRadius:T.radio.control, fontSize:13, fontFamily:"inherit", outline:"none",
      }}/>
     <Segmentado valor={filtroImp} onChange={setFiltroImp}
      opciones={[["no_impreso","Por imprimir"], ["impreso","Impresos"], ["todos","Todos"]]}/>
    </section>

    {cortes.length > 0 && (
     <section style={{ ...tarjeta, overflow:"hidden" }}>
      <div style={{ padding:"13px 18px", borderBottom:`1px solid ${T.color.borde}`, ...T.texto.tarjeta }}>
       Cortes programados
      </div>
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
         <tr>
          <th style={th}>Hora</th>
          <th style={{...th, textAlign:"right"}}>Pedidos</th>
          <th style={{...th, textAlign:"right"}}>Capacidad</th>
          <th style={th}>Estado</th>
          <th style={{...th, textAlign:"right"}}>Acciones</th>
         </tr>
        </thead>
        <tbody>
         {cortes.map(c => (
          <tr key={c.id}>
           <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{c.hora_corte}</td>
           <td style={tdCifra}>{c.pedidos_asignados}</td>
           <td style={tdCifra}>{c.capacidad_max}</td>
           <td style={td}>
            <span style={{
             display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
             borderRadius:T.radio.pastilla, fontSize:12, fontWeight:600,
             background: c.estado === "transmitido" ? T.color.bienSuave : T.color.ojoSuave,
             color: c.estado === "transmitido" ? T.color.bien : T.color.ojo,
            }}>
             <span style={{ width:6, height:6, borderRadius:3,
              background: c.estado === "transmitido" ? T.color.bienPunto : T.color.ojoPunto }}/>
             {c.estado === "transmitido" ? "Transmitido" : "Abierto"}
            </span>
           </td>
           <td style={{ ...td, textAlign:"right" }}>
            {c.estado !== "transmitido" && (
             <button style={{ ...botonFila, background:T.color.marca, border:"none", color:"#fff" }}
              onClick={()=>transmitirCorte(c.id)} disabled={transmitiendo}>
              {transmitiendo ? "Transmitiendo..." : "Transmitir al TMS"}
             </button>
            )}
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     </section>
    )}

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <div style={{ padding:"13px 18px", borderBottom:`1px solid ${T.color.borde}`, ...T.texto.tarjeta }}>
      Pedidos del corte
     </div>
     {pedidos.length === 0 ? (
      <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       No hay pedidos aprobados para esa sede y esa fecha.
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", minWidth:860 }}>
        <thead>
         <tr>
          <th style={th}>Pedido</th>
          <th style={th}>Cliente</th>
          <th style={th}>Destino</th>
          <th style={{...th, textAlign:"right"}}>Valor</th>
          <th style={th}>Impresion</th>
          <th style={{...th, textAlign:"right"}}>Acciones</th>
         </tr>
        </thead>
        <tbody>
         {pedidos.map(x => (
          <tr key={x.id}>
           <td style={td}><span style={chipMono}>{x.numero_pedido}</span></td>
           <td style={{ ...td, fontWeight:600, color:T.color.tinta, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {x.cliente}
           </td>
           <td style={td}>
            <div>{x.direccion || "-"}</div>
            <div style={mono}>{x.sector_dane}</div>
           </td>
           <td style={tdCifra}>{fCOP(x.valor_total)}</td>
           <td style={td}>
            <span style={{
             display:"inline-flex", alignItems:"center", gap:6, fontSize:12.5,
             color: x.estado_impresion === "impreso" ? T.color.bien : T.color.tinta3,
            }}>
             <span style={{ width:6, height:6, borderRadius:3,
              background: x.estado_impresion === "impreso" ? T.color.bienPunto : T.color.neutroPunto }}/>
             {x.estado_impresion === "impreso" ? "Impreso" : "Sin imprimir"}
            </span>
           </td>
           <td style={{ ...td, textAlign:"right" }}>
            <button style={botonFila} onClick={()=>imprimir([x])}>
             <Printer size={14}/> Imprimir
            </button>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
     <PieTabla izquierda={`${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}`}/>
    </section>
   </Pagina>
  );
}

// ── MÓDULO CONSULTAS ───────────────────────────────────────────────────────────
export function ModuloConsultas({showToast}) {
  const [pedidos, setPedidos] = useState([]);
  const [busq,    setBusq]    = useState('');
  const [filtroEst,setFiltroEst]=useState('todos');

  const cargar = async () => {
    const {data}=await supabase.from('pedidos_cartera').select('*').order('created_at',{ascending:false}).limit(500);
    setPedidos(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const filtrados=pedidos.filter(p=>{
    if(filtroEst!=='todos'&&p.estado_cartera!==filtroEst) return false;
    if(busq){const q=busq.toLowerCase();return p.numero_pedido?.toLowerCase().includes(q)||p.cliente?.toLowerCase().includes(q)||p.nit?.toLowerCase().includes(q);}
    return true;
  });

  const getEstadoTexto = (p) => {
    if(p.estado_cartera==='rechazado') return {label:'Rechazado',color:T.color.mal};
    if(p.estado_cartera==='aprobado'&&!p.transmitido_tms) return {label:'Aprobado — En espera de corte',color:T.color.ojo};
    if(p.transmitido_tms&&p.estado_impresion==='no_impreso') return {label:'Transmitido a logistica',color:T.color.info};
    if(p.estado_impresion==='impreso') return {label:'Impreso — En picking',color:T.color.marca};
    return ESTADOS_CARTERA[p.estado_cartera]||{label:p.estado_cartera,color:T.color.tinta3};
  };

  return (
   <Pagina>
    <Encabezado
     titulo="Consultas de cartera"
     descripcion="Estado de aprobacion de los pedidos, solo lectura"
    />

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <BarraFiltros derecha={`${filtrados.length} de ${pedidos.length}`}>
      <Buscador valor={busq} onChange={setBusq} placeholder="Buscar pedido, cliente o NIT" ancho={280}/>
      <SelectFiltro valor={filtroEst} onChange={setFiltroEst} ancho={200}>
       <option value="todos">Todos los estados</option>
       {Object.entries(ESTADOS_CARTERA).map(([k,v])=>(
        <option key={k} value={k}>{v.label}</option>
       ))}
      </SelectFiltro>
     </BarraFiltros>

     {filtrados.length === 0 ? (
      <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       {pedidos.length === 0 ? "Sin pedidos cargados." : "Ningun pedido coincide con el filtro."}
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", minWidth:860 }}>
        <thead>
         <tr>
          <th style={th}>Pedido</th>
          <th style={th}>Cliente</th>
          <th style={th}>NIT</th>
          <th style={{...th, textAlign:"right"}}>Valor</th>
          <th style={th}>Estado</th>
          <th style={th}>Corte</th>
         </tr>
        </thead>
        <tbody>
         {filtrados.slice(0, 300).map(x => {
          const info = getEstadoTexto(x);
          return (
           <tr key={x.id}>
            <td style={td}><span style={chipMono}>{x.numero_pedido}</span></td>
            <td style={{ ...td, fontWeight:600, color:T.color.tinta, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
             {x.cliente}
            </td>
            <td style={td}><span style={mono}>{x.nit}</span></td>
            <td style={tdCifra}>{fCOP(x.valor_total)}</td>
            <td style={td}>
             <span style={{
              display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
              borderRadius:T.radio.pastilla, background:T.color.neutroSuave,
              fontSize:12, fontWeight:600, color:T.color.tinta2, whiteSpace:"nowrap",
             }}>
              <span style={{ width:6, height:6, borderRadius:3, background:info.color }}/>
              {info.label}
             </span>
            </td>
            <td style={td}>
             {x.fecha_corte ? fFechaHora(x.fecha_corte) : <span style={{ color:T.color.tinta3 }}>Sin corte</span>}
            </td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>
     )}

     <PieTabla izquierda={`${filtrados.length} ${filtrados.length === 1 ? "pedido" : "pedidos"}`}/>
    </section>
   </Pagina>
  );
}

// ── Despachador de vistas ──────────────────────────────────
// QTracking decide que pestana mostrar; aqui solo se traduce el nombre de la
// pestana a la vista correspondiente. Las pestanas llevan prefijo "cartera_"
// para no chocar con las que ya existen (por ejemplo "consultas", que el rol
// cliente usa para ver sus pedidos).
export function ModuloCartera({ tab, user, showToast, setTab }) {
 switch (tab) {
  case "cartera_sedes":     return <GestionSedes showToast={showToast}/>;
  case "cartera_asesores":  return <GestionAsesores showToast={showToast} soloCrear={user?.rol === "cliente"}/>;
  case "cartera_vencida":   return <CargarCarteraVencida showToast={showToast}/>;
  case "cartera_cargar":    return <CargarPedidos showToast={showToast} onCargado={()=>setTab("cartera_pedidos")}/>;
  case "cartera_pedidos":   return <GestionPedidos user={user} showToast={showToast}/>;
  case "cartera_logistica": return <ModuloLogistica showToast={showToast}/>;
  case "cartera_consultas": return <ModuloConsultas showToast={showToast}/>;
  default: return null;
 }
}

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { leerTextoCsv, filasCsv } from '../../utils/files';
import { P } from '../../Constants';
import { T, tarjeta } from '../../design/tokens';
import { Plus, Printer, Trash2, Upload, Check, X, RefreshCw, Mail, Clock, FolderOpen } from 'lucide-react';
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
import { hoyLocal, hoyMas } from '../../utils/fechas';
import { useEsMovil } from '../../design/responsive';

// ── Configuración ──────────────────────────────────────────────────────────────

const EJS_SERVICE   = 'service_oyce136';
const EJS_TEMPLATE  = 'template_7mepnqg';
const EJS_PUBLIC    = 'ZMsvylkrklU4MQ-Bx';

// ── Colores verdes ─────────────────────────────────────────────────────────────
// ── Helpers ────────────────────────────────────────────────────────────────────
const fCOP = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0);
const fFecha = d => { if(!d) return '—'; const f = new Date(d); return isNaN(f)?'—':f.toLocaleDateString('es-CO'); };
// cortes_programados.fecha es una fecha sola ("2026-09-25"), y asi la lee Date
// como medianoche UTC: en Colombia eso cae el dia anterior. Se ancla al mediodia
// para que el dia mostrado sea el que dice la cadena.
const fFechaDia = d => { if(!d) return '—'; const f = new Date(String(d).slice(0,10)+'T12:00:00'); return isNaN(f)?'—':f.toLocaleDateString('es-CO'); };
const fFechaHora = d => { if(!d) return '—'; const f = new Date(d); return isNaN(f)?'—':f.toLocaleString('es-CO'); };

// Por donde va un pedido ya aprobado. El camino es siempre el mismo: se le
// asigna un corte, el corte se transmite a logistica y alli se imprime. Vive
// aqui porque lo dicen dos pantallas, la de cartera y la de consultas, y antes
// cada una contaba una version distinta: consultas decia "En espera de corte"
// para todo lo aprobado, aunque el corte ya estuviera asignado.
const etapaCartera = (p) => {
  if(p.estado_impresion==='impreso') return {corto:'Impreso', label:'Impreso — En picking', color:T.color.marca};
  if(p.transmitido_tms)              return {corto:'Transmitido', label:'Transmitido a logistica', color:T.color.info};
  if(p.fecha_corte)                  return {corto:'En corte', label:'Aprobado — En corte', color:T.color.bien};
  return {corto:'Sin corte', label:'Aprobado — En espera de corte', color:T.color.ojo};
};

const ESTADOS_CARTERA = {
  pendiente:       {label:"Pendiente",       color:T.color.ojo,  bg:T.color.ojoSuave},
  preaprobado:     {label:"Preaprobado",     color:T.color.bien, bg:T.color.bienSuave},
  // Ya no se produce: la cartera vencida se elimino. Se conserva la etiqueta
  // para que los pedidos que quedaron con ese estado se sigan leyendo bien.
  cartera_vencida: {label:"Cartera vencida", color:T.color.mal,  bg:T.color.malSuave},
  aprobado:        {label:"Aprobado",        color:T.color.info, bg:T.color.infoSuave},
  rechazado:       {label:"Rechazado",       color:T.color.tinta3, bg:T.color.superficie3},
};


// El DANE de municipio son 5 digitos: 2 de departamento y 3 de municipio. El
// plano puede traerlo sin el cero de la izquierda ("5380") o con el
// corregimiento pegado ("05001001"); si se guarda tal cual, no cruza contra
// ciudades ni contra promesas_servicio y el pedido se queda sin nombre de
// ciudad, sin fecha estimada y, en el origen, sin sede que le asigne corte.
const dane5 = (v) => {
  const d = String(v||'').replace(/[^0-9]/g,'');
  if(!d) return '';
  return d.length < 5 ? d.padStart(5,'0') : d.slice(0,5);
};

// ── Asignar corte ──────────────────────────────────────────────────────────────
const asignarCorte = async (daneOrigen) => {
  if (!daneOrigen) return null;
  const hoy = hoyLocal();
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
  // Por hora y no por la columna "orden": esa la digitaba una persona y no
  // tenia por que coincidir con el reloj. Si alguien registraba el corte de las
  // 16:00 antes que el de las 08:00, este recorrido tomaba el de las 16:00
  // primero y el pedido salia mas tarde de lo que debia; y como orden venia con
  // 1 por defecto, varios cortes empatados quedaban en un orden cualquiera.
  const cortesOrdenados = (sede.cortes_sede||[])
    .slice()
    .sort((a,b)=>String(a.hora_corte||'').localeCompare(String(b.hora_corte||'')));
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
  const manStr = hoyMas(1);
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
// ── Límites de una sede ────────────────────────────────────────────────────────
// Cortes por dia, capacidad por dia y ultimo corte son el techo de los cortes de
// la sede: cuantos puede tener, cuantos pedidos pueden sumar entre todos y hasta
// que hora. Antes solo se guardaban y nadie los miraba, asi que una sede de 3
// cortes y 50 pedidos admitia 5 cortes de 40 despues de las 4 p.m.
const hhmm = (h) => String(h || '').slice(0, 5);

const limitesSede = (sede) => ({
  cortes: parseInt(sede?.num_cortes) || 0,
  capacidad: parseInt(sede?.capacidad_dia) || 0,
  ultimo: hhmm(sede?.hora_ultimo_corte),
});

// Por que no cabe un corte nuevo en la sede, o null si cabe.
export const razonCorteNoCabe = (sede, cortes, hora, capacidad) => {
  const lim = limitesSede(sede);
  const suma = cortes.reduce((a, c) => a + (parseInt(c.capacidad_corte) || 0), 0);
  if (lim.cortes && cortes.length >= lim.cortes)
    return `La sede admite ${lim.cortes} ${lim.cortes === 1 ? 'corte' : 'cortes'} por día y ya los tiene. Elimina uno o sube "Cortes por día" en la sede.`;
  if (cortes.some(c => hhmm(c.hora_corte) === hhmm(hora)))
    return `Ya hay un corte a las ${hhmm(hora)}.`;
  if (lim.ultimo && hhmm(hora) > lim.ultimo)
    return `El último corte de la sede es a las ${lim.ultimo}; este no puede ser más tarde.`;
  if (lim.capacidad && suma + capacidad > lim.capacidad)
    return `La capacidad por día es ${lim.capacidad} y los cortes ya suman ${suma}: a este le caben máximo ${Math.max(0, lim.capacidad - suma)}.`;
  return null;
};

// Por que la sede no puede quedar con esos limites, dados los cortes que ya tiene.
export const razonSedeNoCabe = (datos, cortes) => {
  if (!cortes.length) return null;
  const suma = cortes.reduce((a, c) => a + (parseInt(c.capacidad_corte) || 0), 0);
  const tarde = cortes.map(c => hhmm(c.hora_corte)).sort().pop();
  if (cortes.length > datos.num_cortes)
    return `La sede ya tiene ${cortes.length} cortes; "Cortes por día" no puede ser menor. Elimina cortes primero.`;
  if (suma > datos.capacidad_dia)
    return `Los cortes ya suman ${suma} pedidos; "Capacidad por día" no puede ser menor.`;
  if (datos.hora_ultimo_corte && tarde > hhmm(datos.hora_ultimo_corte))
    return `Ya hay un corte a las ${tarde}; "Último corte" no puede ser más temprano.`;
  return null;
};

// Una linea con lo usado frente al limite: "2 de 3 cortes · 40 de 50 pedidos · hasta las 16:00".
function UsoSede({ sede, cortes }) {
  const lim = limitesSede(sede);
  const suma = cortes.reduce((a, c) => a + (parseInt(c.capacidad_corte) || 0), 0);
  const lleno = (lim.cortes && cortes.length >= lim.cortes) || (lim.capacidad && suma >= lim.capacidad);
  return (
    <div style={{ fontSize: 12.5, color: lleno ? T.color.ojo : T.color.tinta3, fontWeight: lleno ? 600 : 400 }}>
      {`${cortes.length} de ${lim.cortes || '—'} cortes · ${suma} de ${lim.capacidad || '—'} pedidos por día · hasta las ${lim.ultimo || '—'}`}
    </div>
  );
}

// ── GESTIÓN SEDES ──────────────────────────────────────────────────────────────
export function GestionSedes({showToast}) {
  const esMovil = useEsMovil();
  const [sedes,     setSedes]     = useState([]);
  const [menuSede, setMenuSede] = useState(null);
  const [modSede,   setModSede]   = useState(null); // null=cerrado, {}=nueva, {id...}=editar
  const [modCortes, setModCortes] = useState(null); // sede para gestionar cortes
  const [carg,      setCarg]      = useState(false);
  const vacio = {nombre:'',municipio:'',dane_code:'',capacidad_dia:'50',hora_ultimo_corte:'16:00',num_cortes:'3',activa:true};
  const [form, setForm] = useState(vacio);
  const f = k => v => setForm(p=>({...p,[k]:v}));

  const cargar = async () => {
    const {data} = await supabase.from('sedes').select('*, cortes_sede(*)').order('nombre');
    setSedes(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const guardar = async () => {
    if(!form.nombre||!form.municipio||!form.dane_code){showToast("Completa todos los campos","error");return;}
    setCarg(true);
    const datos = {nombre:form.nombre.trim(),municipio:form.municipio.trim(),dane_code:form.dane_code.trim(),
      capacidad_dia:parseInt(form.capacidad_dia)||50,hora_ultimo_corte:form.hora_ultimo_corte,
      num_cortes:parseInt(form.num_cortes)||3,activa:form.activa};
    // Al editar, los limites no pueden quedar por debajo de los cortes que ya hay.
    if(form.id){
      const {data:actuales} = await supabase.from('cortes_sede').select('hora_corte,capacidad_corte').eq('sede_id',form.id);
      const razon = razonSedeNoCabe(datos, actuales||[]);
      if(razon){showToast(razon,"error");setCarg(false);return;}
    }
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
    {esMovil ? <header style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:10}}>
     <div><div style={{fontSize:12,color:T.color.tinta3}}>{sedes.length} sedes · {sedes.filter(x=>x.activa).length} activas · {sedes.reduce((a,x)=>a+Number(x.capacidad_dia||0),0)} pedidos/día</div>
      <h1 style={{...T.texto.titulo,fontSize:23,margin:0}}>Sedes y cortes</h1></div>
     <button aria-label="Nueva sede" onClick={()=>{setForm(vacio);setModSede({});}} style={{...botonPrincipal,width:38,height:38,padding:0,display:'grid',placeItems:'center'}}><Plus size={20}/></button>
    </header> : <Encabezado
     titulo="Sedes y cortes"
     descripcion="Puntos de despacho con su capacidad y sus horarios de corte"
     acciones={
      <button onClick={()=>{setForm(vacio);setModSede({});}} style={botonPrincipal}>
       <Plus size={16}/> Nueva sede
      </button>
     }
    />}

    {!esMovil && <Indicadores items={[
     { label:"Sedes", valor:sedes.length, color:T.color.marca, destacado:true },
     { label:"Activas", valor:sedes.filter(x=>x.activa).length, color:T.color.bienPunto },
     { label:"Capacidad por dia", valor:sedes.reduce((a,x)=>a+Number(x.capacidad_dia||0),0), color:T.color.infoPunto },
    ]}/>}

    {esMovil ? <div style={{display:'grid',gap:8}}>
     {sedes.length===0 && <div style={{...tarjeta,padding:24,textAlign:'center',color:T.color.tinta3}}>No hay sedes registradas.</div>}
     {sedes.map(x=><article key={x.id} style={{...tarjeta,padding:'12px 13px',opacity:x.activa?1:.65}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
       <span style={{width:36,height:36,borderRadius:10,display:'grid',placeItems:'center',background:T.color.marcaSuave,color:T.color.marca,flexShrink:0}}>▣</span>
       <div style={{minWidth:0,flex:1}}><strong style={{fontSize:13.5}}>{x.nombre}</strong><div style={{fontSize:11.5,color:T.color.tinta3}}>{x.municipio} · DANE {x.dane_code}</div></div>
       <span style={{fontSize:11,color:x.activa?T.color.bien:T.color.tinta3,whiteSpace:'nowrap'}}>● {x.activa?'Activa':'Inactiva'}</span>
      </div>
      <div style={{display:'flex',gap:5,overflowX:'auto',marginTop:11,paddingBottom:3}}>
       {(x.cortes_sede||[]).length ? x.cortes_sede.slice().sort((a,b)=>String(a.hora_corte).localeCompare(String(b.hora_corte))).map(c=><span key={c.id} style={{background:T.color.superficie2,border:`1px solid ${T.color.borde}`,borderRadius:5,padding:'3px 6px',fontSize:11.5,whiteSpace:'nowrap'}}><strong>{String(c.hora_corte).slice(0,5)}</strong> · {c.capacidad_corte}</span>) : <span style={{fontSize:11.5,color:T.color.ojo}}>⚠ Sin cortes configurados</span>}
      </div>
      <div style={{borderTop:`1px solid ${T.color.divisor}`,marginTop:8,paddingTop:9,display:'flex',alignItems:'center',gap:6}}>
       <span style={{flex:1,fontSize:11.5,color:T.color.tinta3}}>{x.capacidad_dia} pedidos/día</span>
       <div style={{position:'relative'}}><button aria-label={`Opciones de ${x.nombre}`} onClick={()=>setMenuSede(menuSede===x.id?null:x.id)} style={{...botonBarra,padding:'6px 10px'}}>···</button>
        {menuSede===x.id&&<div style={{position:'absolute',right:0,bottom:'100%',zIndex:20,...tarjeta,padding:5,minWidth:110,boxShadow:T.sombra.flotante}}>
         <button onClick={()=>{setForm({...x,capacidad_dia:String(x.capacidad_dia),num_cortes:String(x.num_cortes)});setModSede(x);setMenuSede(null);}} style={{...botonBarra,width:'100%',justifyContent:'center',border:'none'}}>Editar</button>
         <button onClick={()=>{eliminar(x.id,x.nombre);setMenuSede(null);}} style={{...botonBarra,width:'100%',justifyContent:'center',border:'none',color:T.color.mal}}>Eliminar</button>
        </div>}
       </div>
       <button onClick={()=>setModCortes(x)} style={{...botonBarra,padding:'6px 9px',background:T.color.marcaSuave,color:T.color.marca,border:'none'}}>◷ Cortes</button>
      </div>
     </article>)}
    </div> : <section style={{ ...tarjeta, overflow:"hidden" }}>
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
    </section>}

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

    {modCortes && <ModalCortes sede={modCortes} onClose={()=>{setModCortes(null);cargar();}} showToast={showToast} onCambiar={cargar}/>}
   </Pagina>
  );
}

export function ModalCortes({sede,onClose,showToast,onCambiar}) {
  const esMovil = useEsMovil();
  const [cortes, setCortes] = useState([]);
  // Sin "orden": el orden de un corte es su hora. La columna sigue en la base
  // con su valor por defecto, pero ya nadie la lee.
  const [form,   setForm]   = useState({hora_corte:'09:00',capacidad_corte:'20'});
  const f = k => v => setForm(p=>({...p,[k]:v}));
  const [carg, setCarg] = useState(false);

  const cargar = async () => {
    const {data} = await supabase.from('cortes_sede').select('*').eq('sede_id',sede.id).order('hora_corte');
    setCortes(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const agregar = async () => {
    if(!form.hora_corte||!form.capacidad_corte){showToast("Completa todos los campos","error");return;}
    const capacidad = parseInt(form.capacidad_corte)||0;
    if(capacidad<1){showToast("El máximo de pedidos del corte debe ser mayor que 0","error");return;}
    // Se revisa contra los cortes de la base, no contra la lista en pantalla,
    // por si otra persona agrego uno mientras tanto.
    setCarg(true);
    const {data:actuales} = await supabase.from('cortes_sede').select('hora_corte,capacidad_corte').eq('sede_id',sede.id);
    const razon = razonCorteNoCabe(sede, actuales||[], form.hora_corte, capacidad);
    if(razon){showToast(razon,"error");setCarg(false);return;}
    const {error} = await supabase.from('cortes_sede').insert({
      sede_id:sede.id,hora_corte:form.hora_corte,
      capacidad_corte:capacidad
    });
    if(error)showToast("Error: "+error.message,"error");
    else{showToast("✓ Corte agregado","success");setForm({hora_corte:'09:00',capacidad_corte:'20'});cargar();onCambiar?.();}
    setCarg(false);
  };

  // Sin cupo para otro corte: el boton se apaga y la linea de uso dice por que.
  const lim = limitesSede(sede);
  const sumaCortes = cortes.reduce((a,c)=>a+(parseInt(c.capacidad_corte)||0),0);
  const sinCupo = (lim.cortes && cortes.length>=lim.cortes) || (lim.capacidad && sumaCortes>=lim.capacidad);

  const eliminar = async (id) => {
    await supabase.from('cortes_sede').delete().eq('id',id);
    showToast("Corte eliminado","info");
    cargar();
    onCambiar?.();
  };

  if(esMovil) return <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:150,background:'rgba(23,20,31,.45)',display:'flex',alignItems:'flex-end'}}>
   <div onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Cortes de ${sede.nombre}`} style={{width:'100%',boxSizing:'border-box',maxHeight:'85vh',overflowY:'auto',background:T.color.superficie,borderRadius:'20px 20px 0 0',padding:'9px 16px calc(16px + env(safe-area-inset-bottom, 0px))'}}>
    <div style={{width:36,height:4,background:T.color.tenue,borderRadius:4,margin:'0 auto 14px'}}/>
    <h2 style={{fontSize:17,margin:'0 0 2px'}}>Cortes · {sede.nombre}</h2>
    <p style={{fontSize:12,color:T.color.tinta3,margin:'0 0 6px'}}>Ordenados por hora. Se agregan y eliminan; no se editan.</p>
    <div style={{margin:'0 0 10px'}}><UsoSede sede={sede} cortes={cortes}/></div>
    {cortes.map(c=><div key={c.id} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 0',borderBottom:`1px solid ${T.color.divisor}`,fontSize:13}}><Clock size={15} color={T.color.tinta3}/><strong style={{minWidth:54}}>{String(c.hora_corte).slice(0,5)}</strong><span style={{flex:1,color:T.color.tinta3}}>{c.capacidad_corte} pedidos máximo</span><button aria-label={`Eliminar corte ${c.hora_corte}`} onClick={()=>eliminar(c.id)} style={{border:'none',background:'transparent',color:T.color.tinta3}}><Trash2 size={16}/></button></div>)}
    {cortes.length===0&&<p style={{fontSize:13,color:T.color.tinta3}}>Esta sede aún no tiene cortes.</p>}
    <div style={{background:T.color.superficie2,borderRadius:10,padding:10,marginTop:12}}><div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Agregar corte</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:6}}>
     <input aria-label="Hora del corte" type="time" value={form.hora_corte} onChange={e=>f('hora_corte')(e.target.value)} style={{minWidth:0,width:'100%',boxSizing:'border-box',padding:8,border:`1px solid ${T.color.borde2}`,borderRadius:8}}/>
     <input aria-label="Máximo de pedidos" type="number" min="1" value={form.capacidad_corte} onChange={e=>f('capacidad_corte')(e.target.value)} placeholder="Máx. pedidos" style={{minWidth:0,width:'100%',boxSizing:'border-box',padding:8,border:`1px solid ${T.color.borde2}`,borderRadius:8}}/>
     <button onClick={agregar} disabled={carg||sinCupo} aria-label="Agregar corte" style={{...botonPrincipal,padding:'0 11px',opacity:sinCupo?0.5:1,cursor:sinCupo?'not-allowed':'pointer'}}><Plus size={18}/></button>
    </div></div>
    <button onClick={onClose} style={{...botonBarra,width:'100%',justifyContent:'center',marginTop:12}}>Cerrar</button>
   </div>
  </div>;

  return (
   <ModalGestion
    titulo="Cortes de despacho"
    descripcion={sede.nombre}
    onClose={onClose}
    ancho="M"
    textoCancelar="Cerrar"
   >
    <UsoSede sede={sede} cortes={cortes}/>
    <Seccion titulo="Agregar corte"/>
    <div style={{
     display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, alignItems:"end",
     background:T.color.superficie2, border:`1px solid ${T.color.borde}`,
     borderRadius:T.radio.control, padding:14,
    }}>
     <Texto label="Hora" tipo="time" valor={form.hora_corte} onChange={f("hora_corte")}/>
     <Texto label="Pedidos max." tipo="number" valor={form.capacidad_corte} onChange={f("capacidad_corte")} placeholder="20"/>
     <button onClick={agregar} disabled={carg||sinCupo} style={{ ...botonPrincipal, height:40, opacity:sinCupo?0.5:1, cursor:sinCupo?"not-allowed":"pointer" }}>
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
         <th style={th}>Hora</th>
         <th style={{...th, textAlign:"right"}}>Pedidos max.</th>
         <th style={{...th, textAlign:"right", width:64}}></th>
        </tr>
       </thead>
       <tbody>
        {cortes.map(c => (
         <tr key={c.id}>
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
  const esMovil = useEsMovil();
  const [asesores, setAsesores] = useState([]);
  const [busq, setBusq] = useState('');
  const [menuAsesor, setMenuAsesor] = useState(null);
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
   <Pagina anchoCompleto>
    {esMovil ? <header style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
     <div><div style={{fontSize:12,color:T.color.tinta3}}>{asesores.length} asesores · {asesores.filter(a=>!a.email).length} sin correo</div><h1 style={{...T.texto.titulo,fontSize:23,margin:0}}>Asesores</h1></div>
     <div style={{display:'flex',gap:7}}>{!soloCrear&&<button aria-label="Importar CSV" onClick={()=>fileRef.current?.click()} style={{...botonBarra,width:38,height:38,padding:0,display:'grid',placeItems:'center'}}><Upload size={17}/></button>}
      <button aria-label="Nuevo asesor" onClick={()=>{setForm(vacio);setEditando(null);setModNuevo(true);}} style={{...botonPrincipal,width:38,height:38,padding:0,display:'grid',placeItems:'center'}}><Plus size={19}/></button></div>
    </header> : <Encabezado
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
    />}

    {!esMovil && <Indicadores items={[
     { label:"Asesores", valor:asesores.length, color:T.color.marca, destacado:true },
     { label:"Con correo", valor:asesores.filter(a=>a.email).length, color:T.color.bienPunto },
     { label:"Sin correo", valor:asesores.filter(a=>!a.email).length, color:T.color.ojoPunto },
    ]}/>}

    {esMovil ? <>
     <Buscador valor={busq} onChange={setBusq} placeholder="Código, nombre o correo" ancho="100%"/>
     <section style={{...tarjeta,overflow:'hidden'}}>
      {asesores.filter(a=>`${a.codigo} ${a.nombre||''} ${a.email||''}`.toLowerCase().includes(busq.toLowerCase())).length===0 ? <div style={{padding:25,textAlign:'center',fontSize:13,color:T.color.tinta3}}>Sin asesores para mostrar.</div> :
       asesores.filter(a=>`${a.codigo} ${a.nombre||''} ${a.email||''}`.toLowerCase().includes(busq.toLowerCase())).slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es')).map(a=><div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 13px',borderBottom:`1px solid ${T.color.divisor}`}}>
        <span style={{width:36,height:36,flexShrink:0,borderRadius:9,display:'grid',placeItems:'center',background:T.color.marcaSuave,color:T.color.marca,fontSize:11,fontWeight:700}}>{a.codigo}</span>
        <div style={{minWidth:0,flex:1}}><strong style={{fontSize:13}}>{a.nombre||'—'}</strong><div style={{fontSize:11.5,color:a.email?T.color.tinta3:T.color.ojo,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email?<><Mail size={11} style={{verticalAlign:'middle',marginRight:3}}/>{a.email}</>:'✉ Sin correo'}</div></div>
        {!soloCrear&&<div style={{position:'relative'}}><button aria-label={`Opciones de ${a.nombre}`} onClick={()=>setMenuAsesor(menuAsesor===a.id?null:a.id)} style={{border:'none',background:'transparent',color:T.color.tinta3,fontSize:20,padding:5}}>···</button>
         {menuAsesor===a.id&&<div style={{...tarjeta,position:'absolute',right:0,top:'100%',zIndex:20,padding:5,minWidth:105,boxShadow:T.sombra.flotante}}><button onClick={()=>{setForm({codigo:a.codigo,nombre:a.nombre||'',email:a.email||''});setEditando(a.id);setModNuevo(true);setMenuAsesor(null);}} style={{...botonBarra,width:'100%',justifyContent:'center',border:'none'}}>Editar</button><button onClick={()=>{eliminar(a.id,a.nombre||a.codigo);setMenuAsesor(null);}} style={{...botonBarra,width:'100%',justifyContent:'center',border:'none',color:T.color.mal}}>Eliminar</button></div>}
        </div>}
       </div>)}
     </section>
     {asesores.filter(a=>!a.email).length>0&&<div style={{background:T.color.ojoSuave,color:T.color.ojo,borderRadius:10,padding:12,fontSize:12,lineHeight:1.5}}><Mail size={14} style={{verticalAlign:'middle',marginRight:5}}/>{asesores.filter(a=>!a.email).length} asesor(es) sin correo: si se rechaza un pedido suyo, el aviso no les llega.</div>}
    </> : <section style={{ ...tarjeta, overflow:"hidden" }}>
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
               onClick={()=>{setForm({codigo:a.codigo, nombre:a.nombre||"", email:a.email||""}); setEditando(a.id); setModNuevo(true);}}>
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
    </section>}

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
// ── CARGAR PEDIDOS ─────────────────────────────────────────────────────────────
export function CargarPedidos({user,showToast,onCargado}) {
  const esMovil = useEsMovil();
  const [archivo,   setArchivo]  = useState('');
  const [filasLeidas, setFilasLeidas] = useState(0);
  const [pedidos,   setPedidos]  = useState([]);
  const [errMsg,    setErrMsg]   = useState('');
  const [carg,      setCarg]     = useState(false);
  const [resultado, setResultado]= useState(null);
  const fileRef = useRef(null);

  // El pedido con plazo entra aprobado: el plazo es justamente la autorizacion
  // de credito, asi que no tiene a quien esperarle.
  const clasificar = (plazo) => parseInt(plazo||0)>0 ? 'aprobado' : 'pendiente';

  // Solo CSV. leerTextoCsv resuelve el encoding (UTF-8 y, si no, Windows-1252) y
  // filasCsv respeta las comillas, asi que un campo con comas o saltos de linea
  // adentro ya no corre las columnas.
  const leerArchivo = async (file) => {
    setArchivo(file.name); setPedidos([]); setFilasLeidas(0); setErrMsg(''); setResultado(null);
    if(!/\.(csv|txt)$/i.test(file.name)) {
      setErrMsg("Solo se aceptan archivos .CSV. Si tienes un Excel, guardalo como CSV y vuelve a subirlo.");
      setArchivo('');
      return;
    }
      try {
        const rows = filasCsv(await leerTextoCsv(file));
        if(rows.length<2){setErrMsg("El archivo está vacío o solo tiene encabezado");return;}
        setFilasLeidas(rows.length - 1);

        // Sin tildes: el plano escribe "Direccion" o "Condicion de pago" con o
        // sin ellas segun quien lo genere, y una columna que no se reconoce se
        // pierde en silencio. Comparar sin tildes evita adivinar cada variante.
        const sinTildes = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const hdrs = rows[0].map(h=>sinTildes(h).trim().toLowerCase().replace(/\s+/g,'_'));
        const col = (...names)=>{for(const n of names){const i=hdrs.findIndex(h=>h.includes(n));if(i!==-1)return i;}return -1;};

        const iCia   = col('cia');
        const iFech  = col('fecha_pedido','fecha_del_pedido','fecha');
        const iPed   = col('pedido');
        const iNit   = col('nit');
        const iCli   = col('nombre_cliente','cliente');
        const iDir   = col('direccion','dirección');
        const iDane  = col('sector_dane');
        const iValDec= col('valor_declarado');
        const iCodMsg= col('codigo_mensaje','código_mensaje');
        // La condicion de pago es el plazo: es la que decide si el pedido entra
        // aprobado. Se busca con sus dos nombres porque el plano usa uno u otro.
        const iPlazo = col('plazo','condicion_de_pago','condicion_pago','condicion');
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
        // La fecha y la condicion de pago van siempre en el plano. Si faltan se
        // para aqui: sin condicion de pago todo entraria como pendiente, y
        // serian cientos de pedidos sin aprobar sin que nada lo dijera.
        const faltan = [
          iFech===-1  && "Fecha del pedido",
          iPlazo===-1 && "Condición de pago (plazo)",
        ].filter(Boolean);
        if(faltan.length) {
          setErrMsg(`Al archivo le falta: ${faltan.join(" y ")}. Esas columnas siempre vienen en el plano.`);
          return;
        }

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
              sector_dane:  dane5(row[iDane]),
              codigo_mensaje:String(row[iCodMsg]||'').trim(),
              // "30", "30 DIAS" o "CREDITO 30" dan 30; "CONTADO" da 0, que es
              // justo lo que significa: sin plazo, el pedido no se autoaprueba.
              plazo:        parseInt(String(row[iPlazo]||'').replace(/[^0-9]/g,''),10)||0,
              observacion:  String(row[iObs]||'').trim(),
              vendedor:     String(row[iVend]||'').trim(),
              origen:       String(row[iOrig]||'').trim(),
              dane_origen:  dane5(row[iDaneO]),
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
          estado_cartera: clasificar(p.plazo),
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

    let ok=0, errores=0, sinCorte=0;
    const duplicados=[];
    for(const p of pedidos) {
      if(yaExisten.has(p.numero_pedido)){ duplicados.push(p.numero_pedido); continue; }
      const {lineas,...pedData} = p;
      // Poner el estado en 'aprobado' no basta: logistica solo ve los aprobados
      // que tienen corte, y el trigger de la base crea el pedido de produccion a
      // partir de esta fila y le saca de ahi la fecha y la hora. Por eso el
      // corte se pide ANTES de insertar: la fila tiene que nacer completa.
      if(pedData.estado_cartera==='aprobado'){
        const corte = await asignarCorte(p.dane_origen);
        if(!corte) sinCorte++;
        pedData.fecha_aprobacion = new Date().toISOString();
        pedData.aprobado_por = user?.id||null;
        pedData.estado_impresion = 'no_impreso';
        if(corte){pedData.corte_id=corte.corteId; pedData.fecha_corte=corte.fechaCorte;}
      }
      const {data:inserted,error} = await supabase.from('pedidos_cartera').insert(pedData).select().single();
      if(error||!inserted){errores++;continue;}
      if(lineas.length>0){
        await supabase.from('pedidos_cartera_detalle').insert(lineas.map(l=>({...l,pedido_id:inserted.id})));
      }
      if(pedData.estado_cartera==='aprobado'){
        await supabase.from('historial_cartera').insert({
          pedido_id:inserted.id, decision:'aprobado', usuario_id:user?.id||null,
          motivo:'Aprobado en el cargue: el pedido tiene plazo',
        });
      }
      ok++;
    }
    setCarg(false);
    setResultado({ok,errores,total:pedidos.length,duplicados});
    let msg=`✓ ${ok} pedido(s) cargados`;
    if(duplicados.length>0) msg+=` · ${duplicados.length} ya existían (omitidos)`;
    if(sinCorte>0) msg+=` · ${sinCorte} aprobado(s) sin sede configurada (verificar DANE Origen)`;
    showToast(msg,"success");
    if(ok>0 && onCargado) onCargado();
  };

  const resumen = {
    total:pedidos.length,
    aprobado:pedidos.filter(p=>p.estado_cartera==='aprobado').length,
    pendiente:pedidos.filter(p=>p.estado_cartera==='pendiente').length,
  };

  if (esMovil) return <CargarPedidosMovil
    archivo={archivo} pedidos={pedidos} filasLeidas={filasLeidas} errMsg={errMsg}
    resultado={resultado} resumen={resumen} carg={carg} fileRef={fileRef}
    leerArchivo={leerArchivo} confirmar={confirmar}
    cancelar={()=>{setArchivo('');setPedidos([]);setFilasLeidas(0);setErrMsg('');setResultado(null);}}
  />;

  return (
   <Pagina anchoCompleto>
    <Encabezado
     titulo="Cargar pedidos"
     descripcion="Pedidos del dia para revisar contra el estado de cartera"
    />

    <section style={{ ...tarjeta, width:"100%", boxSizing:"border-box", padding:20, display:"flex", flexDirection:"column", gap:16 }}>
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
        { label:"Aprobados", valor:resumen.aprobado, color:T.color.bienPunto },
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

function CargarPedidosMovil({ archivo, pedidos, filasLeidas, errMsg, resultado, resumen, carg, fileRef, leerArchivo, confirmar, cancelar }) {
  return (
   <Pagina anchoCompleto>
    <header>
     <div style={{ fontSize:12, color:T.color.tinta3 }}>{pedidos.length ? 'Revisa antes de cargar' : 'Plano CSV del día'}</div>
     <h1 style={{ ...T.texto.titulo, fontSize:23, margin:0 }}>Cargar pedidos</h1>
    </header>
    <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}}
     onChange={e=>{if(e.target.files[0]) leerArchivo(e.target.files[0]);e.target.value='';}}/>

    {!pedidos.length ? <>
     <section style={{ ...tarjeta, padding:20 }}>
      <button onClick={()=>fileRef.current?.click()} style={{
       width:'100%', minHeight:225, padding:'24px 20px', background:T.color.superficie,
       border:`1px dashed ${T.color.tenue}`, borderRadius:T.radio.tarjeta,
       display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
       gap:11, textAlign:'center', fontFamily:'inherit', cursor:'pointer',
      }}>
       <span style={{ width:48, height:48, borderRadius:12, display:'grid', placeItems:'center', background:T.color.marcaSuave, color:T.color.marca }}><Upload size={23}/></span>
       <strong style={{ fontSize:15, color:T.color.tinta }}>Elige el archivo CSV</strong>
       <span style={{ fontSize:12.5, color:T.color.tinta3, maxWidth:260 }}>Solo archivos .csv · una línea por referencia del pedido</span>
       <span style={{ ...botonPrincipal, display:'inline-flex', alignItems:'center', gap:7, marginTop:3 }}><FolderOpen size={17}/> Seleccionar archivo</span>
      </button>
     </section>
     <section style={{ ...tarjeta, padding:'14px 16px', display:'grid', gap:13, fontSize:12.5, lineHeight:1.5, color:T.color.tinta2 }}>
      <div><Check size={14} color={T.color.info} style={{verticalAlign:'middle', marginRight:7}}/>Con plazo mayor a 0 días entra Aprobado y toma el siguiente corte de su sede.</div>
      <div><Clock size={14} color={T.color.ojoPunto} style={{verticalAlign:'middle', marginRight:7}}/>De contado entra Pendiente para revisión en Gestión.</div>
      <div><span style={{color:T.color.info,marginRight:8}}>ⓘ</span>Obligatorias: Pedido, Fecha pedido y Condición de pago.</div>
     </section>
    </> : <>
     <section style={{ ...tarjeta, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ width:36, height:36, flexShrink:0, borderRadius:10, display:'grid', placeItems:'center', background:T.color.bienSuave, color:T.color.bien }}><Check size={18}/></span>
      <div style={{minWidth:0,flex:1}}>
       <div style={{fontWeight:700,fontSize:13.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{archivo}</div>
       <div style={{fontSize:11.5,color:T.color.tinta3}}>{filasLeidas} filas · {pedidos.length} pedidos</div>
      </div>
      <button onClick={()=>fileRef.current?.click()} style={{border:'none',background:'transparent',color:T.color.marca,fontWeight:700,cursor:'pointer'}}>Cambiar</button>
     </section>
     <section style={{ ...tarjeta, display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))' }}>
      {[["Leídos",resumen.total,T.color.tinta],["Aprobados",resumen.aprobado,T.color.info],["Pendientes",resumen.pendiente,T.color.ojoPunto]].map(([label,valor,color],i)=>(
       <div key={label} style={{padding:'11px 10px',borderLeft:i?`1px solid ${T.color.borde}`:'none'}}>
        <div style={{fontSize:11,color:T.color.tinta3}}><span style={{color}}>●</span> {label}</div>
        <strong style={{fontSize:19,color:T.color.tinta}}>{valor}</strong>
       </div>
      ))}
     </section>
     <section style={{ ...tarjeta, padding:'2px 14px' }}>
      {pedidos.slice(0,100).map(p=>{
       const est=ESTADOS_CARTERA[p.estado_cartera]||ESTADOS_CARTERA.pendiente;
       return <div key={p.numero_pedido} style={{padding:'12px 0',borderBottom:`1px solid ${T.color.divisor}`,display:'flex',gap:12,justifyContent:'space-between'}}>
        <div style={{minWidth:0}}><strong style={{fontSize:13}}>{p.numero_pedido}</strong>
         <div style={{fontSize:12.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente}</div>
         <div style={{fontSize:11.5,color:T.color.tinta3}}>NIT {p.nit}</div></div>
        <div style={{textAlign:'right',flexShrink:0}}><strong style={{fontSize:13}}>{fCOP(p.valor_total)}</strong>
         <div style={{fontSize:11.5,color:est.color,background:est.bg,borderRadius:20,padding:'2px 7px',marginTop:5}}>● {est.label}</div></div>
       </div>;
      })}
      {pedidos.length>100 && <div style={{padding:10,fontSize:12,color:T.color.tinta3}}>Mostrando 100 de {pedidos.length}; se cargan todos.</div>}
     </section>
     <p style={{textAlign:'center',fontSize:12,color:T.color.tinta3,margin:0}}>Se carga tal como viene; no se puede editar aquí.</p>
    </>}
    {errMsg && <div role="alert" style={{background:T.color.malSuave,color:T.color.mal,padding:12,borderRadius:10,fontSize:13}}>{errMsg}</div>}
    {resultado && <FranjaInfo>{resultado.ok} de {resultado.total} pedidos cargados.</FranjaInfo>}
    {pedidos.length>0 && <div style={{height:65}}/>}
    {pedidos.length>0 && <div style={{position:'fixed',left:0,right:0,bottom:0,zIndex:110,background:T.color.superficie,borderTop:`1px solid ${T.color.borde}`,padding:'10px 16px calc(12px + env(safe-area-inset-bottom, 0px))',display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:8}}>
     <button onClick={cancelar} disabled={carg} style={{...botonBarra,justifyContent:'center'}}>Cancelar</button>
     <button onClick={confirmar} disabled={carg} style={{...botonPrincipal,justifyContent:'center'}}><Upload size={16}/> {carg?'Cargando...':`Cargar ${pedidos.length} pedidos`}</button>
    </div>}
   </Pagina>
  );
}

// ── GESTIÓN PEDIDOS (CARTERA) ──────────────────────────────────────────────────
export function GestionPedidos({user, showToast}) {
  const esMovil = useEsMovil();
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
    {k:'aprobado',l:'Aprobados'},
    {k:'rechazado',l:'Rechazados'},
  ];

  const conteos={};
  pedidos.forEach(p=>{conteos[p.estado_cartera]=(conteos[p.estado_cartera]||0)+1;});

  const todosVisiblesMarcados = filtrados.length > 0 && filtrados.every(x => seleccion.has(x.id));

  if (esMovil) return <GestionPedidosMovil
    pedidos={pedidos} filtrados={filtrados} tabs={tabs} conteos={conteos}
    filtroEst={filtroEst} setFiltroEst={setFiltroEst} busq={busq} setBusq={setBusq}
    seleccion={seleccion} toggleSel={toggleSel} setSeleccion={setSeleccion}
    cargar={cargar} carg={carg} aprobando={aprobando}
    aprobarUno={aprobarUno} aprobarSeleccionados={aprobarSeleccionados}
    reactivar={reactivar} setModRechazar={setModRechazar}
    modRechazar={modRechazar} rechazar={rechazar}
  />;

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
          <th style={th}>Corte</th>
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
             {x.fecha_pedido && <div style={{ ...T.texto.meta, color:T.color.tinta3, marginTop:3 }}>Fecha del plano: {x.fecha_pedido}</div>}
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
            <td style={td}>
             {x.estado_cartera !== "aprobado" ? (
              <span style={{ color:T.color.tinta3 }}>—</span>
             ) : (() => {
              const etapa = etapaCartera(x);
              return (
               <>
                <div>{x.fecha_corte ? fFechaHora(x.fecha_corte) : <span style={{ color:T.color.ojo }}>Sin corte asignado</span>}</div>
                <div style={{ ...T.texto.meta, color:etapa.color, marginTop:3 }}>{etapa.corto}</div>
               </>
              );
             })()}
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

function GestionPedidosMovil({ pedidos, filtrados, tabs, conteos, filtroEst, setFiltroEst, busq, setBusq,
 seleccion, toggleSel, setSeleccion, cargar, carg, aprobando, aprobarUno, aprobarSeleccionados,
 reactivar, setModRechazar, modRechazar, rechazar }) {
 const espera = useRef(null);
 const omitirClick = useRef(0);
 const pendientes = pedidos.filter(p=>['pendiente','preaprobado','cartera_vencida'].includes(p.estado_cartera)).length;
 const ordenados = filtrados.slice().sort((a,b)=>{
  const aPend = ['pendiente','preaprobado','cartera_vencida'].includes(a.estado_cartera);
  const bPend = ['pendiente','preaprobado','cartera_vencida'].includes(b.estado_cartera);
  return Number(bPend)-Number(aPend);
 });
 const detenerPulsacion = () => { if(espera.current){clearTimeout(espera.current);espera.current=null;} };
 useEffect(()=>()=>detenerPulsacion(),[]);

 return <Pagina anchoCompleto>
  <header style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:10}}>
   <div><div style={{fontSize:12,color:T.color.tinta3}}>{pedidos.length} pedidos · {pendientes} por revisar</div>
    <h1 style={{...T.texto.titulo,fontSize:23,margin:0}}>Gestión de pedidos</h1></div>
   <button onClick={cargar} disabled={carg} aria-label="Actualizar pedidos" style={{...botonBarra,width:38,height:38,padding:0,display:'grid',placeItems:'center',flexShrink:0}}><RefreshCw size={17}/></button>
  </header>

  <Buscador valor={busq} onChange={setBusq} placeholder="Pedido, NIT, cliente o asesor" ancho="100%"/>
  <div style={{display:'flex',gap:6,overflowX:'auto',margin:'0 -16px',padding:'0 16px 2px',scrollbarWidth:'none'}}>
   {tabs.filter(t=>t.k!=='preaprobado'||conteos.preaprobado).map(t=>{
    const activo=filtroEst===t.k;
    return <button key={t.k} onClick={()=>setFiltroEst(t.k)} style={{padding:'8px 12px',whiteSpace:'nowrap',borderRadius:99,border:`1px solid ${activo?T.color.marca:T.color.borde2}`,background:activo?T.color.marca:T.color.superficie,color:activo?'#fff':T.color.tinta2,fontFamily:'inherit',fontSize:12.5,fontWeight:600,cursor:'pointer'}}>{t.l} <span style={{marginLeft:4,opacity:.75}}>{t.k==='todos'?pedidos.length:conteos[t.k]||0}</span></button>;
   })}
  </div>

  {seleccion.size>0 && <div style={{...tarjeta,padding:'10px 12px',display:'flex',alignItems:'center',gap:8,position:'sticky',top:0,zIndex:10}}>
   <strong style={{flex:1,fontSize:13}}>{seleccion.size} seleccionado(s)</strong>
   <button onClick={()=>setSeleccion(new Set())} style={{...botonBarra,padding:'7px 9px'}}>Limpiar</button>
   <button onClick={aprobarSeleccionados} disabled={aprobando} style={{...botonPrincipal,padding:'8px 10px',background:T.color.bien}}>{aprobando?'Aprobando...':`Aprobar (${seleccion.size})`}</button>
  </div>}

  {ordenados.length===0 ? <div style={{...tarjeta,padding:30,textAlign:'center',color:T.color.tinta3,fontSize:13}}>Ningún pedido coincide con el filtro.</div> :
   <div style={{display:'grid',gap:8}}>{ordenados.map(x=>{
    const est=ESTADOS_CARTERA[x.estado_cartera]||ESTADOS_CARTERA.pendiente;
    const decidible=x.estado_cartera!=='aprobado'&&x.estado_cartera!=='rechazado';
    const marcado=seleccion.has(x.id);
    const etapa=x.estado_cartera==='aprobado'?etapaCartera(x):null;
    return <article key={x.id}
     onPointerDown={e=>{if(!decidible||e.pointerType!=='touch'||e.target.closest('button'))return;detenerPulsacion();espera.current=setTimeout(()=>{toggleSel(x.id);omitirClick.current=Date.now()+700;espera.current=null;},500);}}
     onPointerUp={detenerPulsacion} onPointerCancel={detenerPulsacion} onPointerLeave={detenerPulsacion}
     onContextMenu={e=>{if(decidible){e.preventDefault();detenerPulsacion();if(Date.now()>omitirClick.current){toggleSel(x.id);omitirClick.current=Date.now()+700;}}}}
     onClick={()=>{if(Date.now()<omitirClick.current)return;if(seleccion.size>0&&decidible)toggleSel(x.id);}}
     style={{...tarjeta,padding:'12px 13px',background:marcado?T.color.marcaSuave:T.color.superficie,borderColor:marcado?T.color.marca:T.color.borde,touchAction:'pan-y'}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start'}}>
      <div style={{display:'flex',gap:6,alignItems:'baseline'}}><strong style={{fontSize:13.5}}>{x.numero_pedido}</strong><span style={{fontSize:11,color:T.color.tinta3}}>{x.fecha_pedido?fFechaDia(x.fecha_pedido):''}</span></div>
      <strong style={{fontSize:13.5,whiteSpace:'nowrap'}}>{fCOP(x.valor_total)}</strong>
     </div>
     <div style={{fontSize:12.5,fontWeight:600,marginTop:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{x.cliente}</div>
     <div style={{fontSize:11.5,color:T.color.tinta3,marginTop:2}}>NIT {x.nit} · Asesor {x.vendedor||'—'} · {x.plazo>0?`${x.plazo} días`:'Contado'}</div>
     <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8,minWidth:0,fontSize:11.5}}>
      <span style={{background:est.bg,color:est.color,borderRadius:99,padding:'3px 7px',fontWeight:700,whiteSpace:'nowrap'}}>● {est.label}</span>
      <span style={{color:etapa?.color||T.color.tinta3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{etapa?(x.fecha_corte?`${fFechaHora(x.fecha_corte)} · ${etapa.corto}`:'Sin corte asignado'):x.estado_cartera==='rechazado'?(x.motivo_rechazo||'Rechazado'):'Contado · requiere revisión'}</span>
     </div>
     {decidible && seleccion.size===0 && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,borderTop:`1px solid ${T.color.divisor}`,marginTop:9,paddingTop:9}}>
      <button onClick={e=>{e.stopPropagation();setModRechazar(x);}} disabled={aprobando} style={{border:'none',borderRadius:9,padding:'10px 6px',background:T.color.malSuave,color:T.color.mal,fontWeight:700,fontFamily:'inherit'}}><X size={14} style={{verticalAlign:'middle',marginRight:4}}/> Rechazar</button>
      <button onClick={e=>{e.stopPropagation();aprobarUno(x.id);}} disabled={aprobando} style={{border:'none',borderRadius:9,padding:'10px 6px',background:T.color.bien,color:'#fff',fontWeight:700,fontFamily:'inherit'}}><Check size={14} style={{verticalAlign:'middle',marginRight:4}}/> Aprobar</button>
     </div>}
     {x.estado_cartera==='rechazado' && <button onClick={e=>{e.stopPropagation();reactivar(x.id);}} style={{...botonBarra,marginTop:9}}>Reactivar</button>}
     {decidible&&seleccion.size>0&&<div style={{fontSize:11,color:T.color.marca,marginTop:7}}>{marcado?'✓ Seleccionado':'Toca para seleccionar'}</div>}
    </article>;
   })}</div>}
  {modRechazar && <ModalRechazar pedido={modRechazar} onClose={()=>setModRechazar(null)} onRechazar={motivo=>rechazar(modRechazar.id,motivo)}/>}
 </Pagina>;
}

export function ModalRechazar({pedido, onRechazar, onClose}) {
  const esMovil = useEsMovil();
  const [motivo, setMotivo] = useState('');
  const [carg,   setCarg]   = useState(false);
  const confirmar = async () => {
    if(!motivo.trim()){return;}
    setCarg(true);
    await onRechazar(motivo.trim());
    setCarg(false);
  };
  if(esMovil) return <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:150,background:'rgba(23,20,31,.45)',display:'flex',alignItems:'flex-end'}}>
   <div onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Rechazar pedido ${pedido.numero_pedido}`} style={{width:'100%',boxSizing:'border-box',maxHeight:'90vh',overflowY:'auto',background:T.color.superficie,borderRadius:'20px 20px 0 0',padding:'9px 16px calc(16px + env(safe-area-inset-bottom, 0px))'}}>
    <div style={{width:36,height:4,background:T.color.tenue,borderRadius:4,margin:'0 auto 14px'}}/>
    <h2 style={{fontSize:17,margin:'0 0 3px'}}>Rechazar pedido {pedido.numero_pedido}</h2>
    <p style={{margin:'0 0 15px',fontSize:12.5,color:T.color.tinta3}}>No pasa a logística. Se puede reactivar después.</p>
    <div style={{background:T.color.superficie2,borderRadius:11,padding:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:12.5}}>
     <div style={{gridColumn:'1 / -1'}}><span style={{color:T.color.tinta3}}>Cliente</span><div>{pedido.cliente}</div></div>
     <div><span style={{color:T.color.tinta3}}>NIT</span><div>{pedido.nit}</div></div><div><span style={{color:T.color.tinta3}}>Valor</span><div style={{fontWeight:700}}>{fCOP(pedido.valor_total)}</div></div>
     <div><span style={{color:T.color.tinta3}}>Asesor</span><div>{pedido.vendedor||'Sin asesor'}</div></div><div><span style={{color:T.color.tinta3}}>Plazo</span><div>{pedido.plazo>0?`${pedido.plazo} días`:'Contado'}</div></div>
    </div>
    <label style={{display:'block',fontSize:13,fontWeight:600,margin:'14px 0 5px'}}>Motivo del rechazo <span style={{color:T.color.mal}}>•</span></label>
    <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={4} placeholder="Explica el motivo" style={{width:'100%',boxSizing:'border-box',border:`1px solid ${T.color.marca}`,borderRadius:10,padding:12,font:'inherit',fontSize:14,resize:'vertical'}}/>
    <div style={{display:'flex',gap:8,background:T.color.ojoSuave,color:T.color.ojo,borderRadius:10,padding:11,fontSize:12,marginTop:10,lineHeight:1.4}}><Mail size={16} style={{flexShrink:0}}/>Al confirmar se envía un correo automático al asesor con el motivo del rechazo.</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:8,marginTop:14}}>
     <button onClick={onClose} disabled={carg} style={{...botonBarra,justifyContent:'center'}}>Cancelar</button>
     <button onClick={confirmar} disabled={carg||!motivo.trim()} style={{...botonPrincipal,background:T.color.mal,justifyContent:'center',opacity:motivo.trim()?1:.55}}>{carg?'Rechazando...':'Rechazar pedido'}</button>
    </div>
   </div>
  </div>;
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
  const esMovil = useEsMovil();
  const [sedes,   setSedes]   = useState([]);
  const [cortes,  setCortes]  = useState([]);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroFecha,setFiltroFecha]= useState(hoyLocal());
  // La pantalla arranca en "pendientes" y no en el dia de hoy porque su trabajo
  // es imprimir lo que falte, no mirar una fecha. Cuando los cortes de hoy se
  // llenan o ya pasaron, el pedido cae en el primer corte de manana: mirando un
  // solo dia esos quedaban invisibles y nadie los imprimia.
  const [modoFecha,  setModoFecha]  = useState('pendientes');
  const [filtroImp,  setFiltroImp]  = useState('no_impreso');
  const [pedidos,    setPedidos]    = useState([]);
  const [transmitiendo,setTransmitiendo]=useState(false);

  useEffect(()=>{
    supabase.from('sedes').select('*').order('nombre').then(({data})=>setSedes(data||[]));
  },[]);

  const cargar = async () => {
    // En "pendientes" se arranca por los pedidos, no por la fecha: se traen
    // todos los aprobados sin imprimir y despues los cortes a los que
    // pertenecen, vengan del dia que vengan.
    if(modoFecha==='pendientes'){
      const {data:pend} = await supabase.from('pedidos_cartera')
        .select('*, pedidos_cartera_detalle(*)')
        .eq('estado_cartera','aprobado')
        .not('corte_id','is',null)
        .or('estado_impresion.eq.no_impreso,estado_impresion.is.null')
        .order('fecha_corte');
      const ids=[...new Set((pend||[]).map(x=>x.corte_id))];
      let cortesPend=[];
      if(ids.length){
        let qc=supabase.from('cortes_programados').select('*, sedes(nombre,municipio)')
          .in('id',ids).order('fecha').order('hora_corte');
        if(filtroSede) qc=qc.eq('sede_id',filtroSede);
        const res=await qc;
        cortesPend=res.data||[];
      }
      const suyos=new Set(cortesPend.map(c=>c.id));
      setCortes(cortesPend);
      setPedidos((pend||[]).filter(x=>suyos.has(x.corte_id)));
      return;
    }

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
  useEffect(()=>{cargar();},[filtroSede,filtroFecha,filtroImp,modoFecha]);

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

  if(esMovil) return <LogisticaMovil
   sedes={sedes} cortes={cortes} pedidos={pedidos} porImprimir={porImprimir}
   filtroSede={filtroSede} setFiltroSede={setFiltroSede} filtroFecha={filtroFecha} setFiltroFecha={setFiltroFecha}
   modoFecha={modoFecha} setModoFecha={setModoFecha} filtroImp={filtroImp} setFiltroImp={setFiltroImp}
   transmitiendo={transmitiendo} transmitirCorte={transmitirCorte} imprimir={imprimir}
  />;

  return (
   <Pagina anchoCompleto>
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
     { label: modoFecha==='pendientes' ? "Pedidos sin imprimir" : "Pedidos del corte",
       valor:pedidos.length, color:T.color.marca, destacado:true },
     { label:"Por imprimir", valor:porImprimir.length, color:T.color.ojoPunto },
     { label: modoFecha==='pendientes' ? "Cortes con pendientes" : "Cortes del dia",
       valor:cortes.length, color:T.color.infoPunto },
     { label:"Transmitidos", valor:cortes.filter(c=>c.estado === "transmitido").length, color:T.color.bienPunto },
    ]}/>

    <section style={{ ...tarjeta, padding:14, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
     <SelectFiltro valor={filtroSede} onChange={setFiltroSede} ancho={240}>
      <option value="">Todas las sedes</option>
      {sedes.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}
     </SelectFiltro>
     <Segmentado valor={modoFecha} onChange={setModoFecha}
      opciones={[["pendientes","Pendientes"], ["fecha","Por fecha"]]}/>
     {modoFecha==='fecha' && (
      <input type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}
       style={{
        height:38, padding:"0 12px", border:`1px solid ${T.color.borde2}`,
        borderRadius:T.radio.control, fontSize:13, fontFamily:"inherit", outline:"none",
       }}/>
     )}
     {/* En pendientes el filtro de impresion no aplica: pendiente ya quiere
         decir sin imprimir, y dejarlo puesto invitaria a pedir "impresos
         pendientes", que no existe. */}
     {modoFecha==='fecha' ? (
      <Segmentado valor={filtroImp} onChange={setFiltroImp}
       opciones={[["no_impreso","Por imprimir"], ["impreso","Impresos"], ["todos","Todos"]]}/>
     ) : (
      <span style={{ fontSize:12.5, color:T.color.tinta3 }}>
       Todo lo aprobado que falta por imprimir, de cualquier fecha
      </span>
     )}
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
          <th style={th}>Fecha</th>
          <th style={th}>Sede</th>
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
           <td style={td}>{fFechaDia(c.fecha)}</td>
           <td style={td}>{c.sedes?.nombre || <span style={{ color:T.color.tinta3 }}>—</span>}</td>
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

function LogisticaMovil({sedes,cortes,pedidos,porImprimir,filtroSede,setFiltroSede,filtroFecha,setFiltroFecha,
 modoFecha,setModoFecha,filtroImp,setFiltroImp,transmitiendo,transmitirCorte,imprimir}) {
 return <Pagina anchoCompleto>
  <header><div style={{fontSize:12,color:T.color.tinta3}}>{porImprimir.length} sin imprimir · {cortes.filter(c=>c.estado!=='transmitido').length} cortes abiertos</div><h1 style={{...T.texto.titulo,fontSize:23,margin:0}}>Logística de cartera</h1></header>
  <div style={{display:'flex',gap:7}}>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,background:T.color.superficie,border:`1px solid ${T.color.borde2}`,borderRadius:9,padding:3,flex:1}}>
    {[["pendientes","Pendientes"],["fecha","Por fecha"]].map(([valor,label])=><button key={valor} onClick={()=>setModoFecha(valor)} style={{border:'none',borderRadius:7,padding:'8px 5px',background:modoFecha===valor?T.color.marca:'transparent',color:modoFecha===valor?'#fff':T.color.tinta2,fontFamily:'inherit',fontWeight:600,fontSize:12}}>{label}</button>)}
   </div>
   <select aria-label="Filtrar sede" value={filtroSede} onChange={e=>setFiltroSede(e.target.value)} style={{maxWidth:105,minWidth:0,border:`1px solid ${T.color.borde2}`,borderRadius:9,background:T.color.superficie,fontSize:12,color:T.color.tinta2}}><option value="">Todas</option>{sedes.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
  </div>
  {modoFecha==='fecha'&&<div style={{display:'flex',gap:7}}><input aria-label="Fecha del corte" type="date" value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)} style={{flex:1,minWidth:0,padding:8,border:`1px solid ${T.color.borde2}`,borderRadius:9}}/><select aria-label="Estado de impresión" value={filtroImp} onChange={e=>setFiltroImp(e.target.value)} style={{flex:1,minWidth:0,border:`1px solid ${T.color.borde2}`,borderRadius:9}}><option value="no_impreso">Por imprimir</option><option value="impreso">Impresos</option><option value="todos">Todos</option></select></div>}
  <section><h2 style={{...T.texto.seccion,color:T.color.placeholder,margin:'0 0 7px'}}>Cortes programados</h2>
   {cortes.length===0?<div style={{...tarjeta,padding:18,fontSize:12.5,color:T.color.tinta3}}>No hay cortes para mostrar.</div>:<div style={{display:'flex',gap:7,overflowX:'auto',margin:'0 -16px',padding:'0 16px 3px',scrollbarWidth:'none'}}>{cortes.map(c=><article key={c.id} style={{...tarjeta,minWidth:188,padding:10,flexShrink:0}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:7}}><strong style={{fontSize:17}}>{String(c.hora_corte).slice(0,5)}</strong><span style={{fontSize:10.5,color:c.estado==='transmitido'?T.color.bien:T.color.ojo,background:c.estado==='transmitido'?T.color.bienSuave:T.color.ojoSuave,padding:'3px 6px',borderRadius:20}}>{c.estado==='transmitido'?'● Transmitido':'● Abierto'}</span></div>
    <div style={{fontSize:11,color:T.color.tinta3,marginTop:5}}>{fFechaDia(c.fecha)} · {c.sedes?.nombre||'Sin sede'}</div>
    <div style={{height:4,background:T.color.superficie3,borderRadius:4,marginTop:10}}><div style={{height:'100%',width:`${Math.min(100,Math.round(100*Number(c.pedidos_asignados||0)/Math.max(1,Number(c.capacidad_max||1))))}%`,background:T.color.marca,borderRadius:4}}/></div>
    <div style={{fontSize:11,color:T.color.tinta3,textAlign:'right',margin:'3px 0 7px'}}>{c.pedidos_asignados}/{c.capacidad_max}</div>
    {c.estado!=='transmitido'?<button onClick={()=>transmitirCorte(c.id)} disabled={transmitiendo} style={{...botonPrincipal,width:'100%',justifyContent:'center',padding:'7px 5px',fontSize:11.5}}>➤ Transmitir al TMS</button>:<div style={{height:30,textAlign:'center',fontSize:11,color:T.color.tinta3}}>Ya transmitido</div>}
   </article>)}</div>}
  </section>
  <section><h2 style={{...T.texto.seccion,color:T.color.placeholder,margin:'0 0 7px'}}>{modoFecha==='pendientes'?'Pedidos sin imprimir':'Pedidos del corte'}</h2>
   {pedidos.length===0?<div style={{...tarjeta,padding:18,fontSize:12.5,color:T.color.tinta3}}>No hay pedidos para mostrar.</div>:<div style={{display:'grid',gap:7}}>{pedidos.map(p=><article key={p.id} style={{...tarjeta,padding:'10px 12px',display:'flex',alignItems:'center',gap:9}}>
    <div style={{minWidth:0,flex:1}}><div style={{display:'flex',justifyContent:'space-between',gap:6,fontSize:13}}><strong>{p.numero_pedido}</strong><strong>{fCOP(p.valor_total)}</strong></div><div style={{fontSize:12,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente}</div><div style={{fontSize:11,color:T.color.tinta3,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.direccion||'—'} · {p.sector_dane||'—'} · {p.fecha_corte?fFechaHora(p.fecha_corte):'Sin corte'}</div></div>
    <button aria-label={`Imprimir pedido ${p.numero_pedido}`} onClick={()=>imprimir([p])} style={{...botonBarra,width:40,height:40,padding:0,display:'grid',placeItems:'center',flexShrink:0}}><Printer size={17}/></button>
   </article>)}</div>}
  </section>
  {porImprimir.length>0&&<><div style={{height:58}}/><div style={{position:'fixed',left:0,right:0,bottom:'calc(62px + env(safe-area-inset-bottom, 0px))',zIndex:60,background:T.color.superficie,borderTop:`1px solid ${T.color.borde}`,padding:'9px 16px'}}><button onClick={()=>imprimir(porImprimir)} style={{...botonPrincipal,width:'100%',justifyContent:'center'}}><Printer size={16}/> Imprimir ({porImprimir.length})</button></div></>}
 </Pagina>;
}

// ── MÓDULO CONSULTAS ───────────────────────────────────────────────────────────
export function ModuloConsultas({showToast}) {
  const esMovil = useEsMovil();
  const [pedidos, setPedidos] = useState([]);
  const [busq,    setBusq]    = useState('');
  const [filtroEst,setFiltroEst]=useState('todos');

  const cargar = async () => {
    const {data}=await supabase.from('pedidos_cartera').select('*').order('created_at',{ascending:false}).limit(500);
    setPedidos(data||[]);
  };
  useEffect(()=>{cargar();},[]);

  const filtrados=pedidos.filter(p=>{
    if(filtroEst!=='todos'){
      if(filtroEst==='en_corte'&&!(p.estado_cartera==='aprobado'&&p.fecha_corte&&!p.transmitido_tms&&p.estado_impresion!=='impreso'))return false;
      else if(filtroEst==='logistica'&&!(p.estado_cartera==='aprobado'&&p.transmitido_tms&&p.estado_impresion!=='impreso'))return false;
      else if(filtroEst==='impreso'&&!(p.estado_cartera==='aprobado'&&p.estado_impresion==='impreso'))return false;
      else if(!['en_corte','logistica','impreso'].includes(filtroEst)&&p.estado_cartera!==filtroEst)return false;
    }
    if(busq){const q=busq.toLowerCase();return p.numero_pedido?.toLowerCase().includes(q)||p.cliente?.toLowerCase().includes(q)||p.nit?.toLowerCase().includes(q);}
    return true;
  });

  const getEstadoTexto = (p) => {
    if(p.estado_cartera==='rechazado') return {label:'Rechazado',color:T.color.mal};
    if(p.estado_cartera==='aprobado') return etapaCartera(p);
    return ESTADOS_CARTERA[p.estado_cartera]||{label:p.estado_cartera,color:T.color.tinta3};
  };

  if(esMovil) return <Pagina anchoCompleto>
   <header><div style={{fontSize:12,color:T.color.tinta3}}>Últimos 500 pedidos · solo lectura</div><h1 style={{...T.texto.titulo,fontSize:23,margin:0}}>Consultas de cartera</h1></header>
   <Buscador valor={busq} onChange={setBusq} placeholder="Pedido, cliente o NIT" ancho="100%"/>
   <div style={{display:'flex',gap:6,overflowX:'auto',margin:'0 -16px',padding:'0 16px 2px',scrollbarWidth:'none'}}>{[
    ['todos','Todos',pedidos.length],['pendiente','Pendiente',pedidos.filter(p=>p.estado_cartera==='pendiente').length],
    ['aprobado','Aprobado',pedidos.filter(p=>p.estado_cartera==='aprobado').length],
    ['en_corte','En corte',pedidos.filter(p=>p.estado_cartera==='aprobado'&&p.fecha_corte&&!p.transmitido_tms&&p.estado_impresion!=='impreso').length],
    ['logistica','En logística',pedidos.filter(p=>p.transmitido_tms&&p.estado_impresion!=='impreso').length],
    ['impreso','Impreso',pedidos.filter(p=>p.estado_impresion==='impreso').length],
    ['rechazado','Rechazado',pedidos.filter(p=>p.estado_cartera==='rechazado').length],
   ].map(([clave,label,conteo])=><button key={clave} onClick={()=>setFiltroEst(clave)} style={{whiteSpace:'nowrap',borderRadius:99,border:`1px solid ${filtroEst===clave?T.color.marca:T.color.borde2}`,background:filtroEst===clave?T.color.marca:T.color.superficie,color:filtroEst===clave?'#fff':T.color.tinta2,padding:'8px 11px',fontFamily:'inherit',fontSize:12,fontWeight:600}}>{label} <span style={{opacity:.75}}>{conteo}</span></button>)}</div>
   {filtrados.length===0?<div style={{...tarjeta,padding:24,textAlign:'center',fontSize:13,color:T.color.tinta3}}>Ningún pedido coincide con el filtro.</div>:<div style={{display:'grid',gap:8}}>{filtrados.map(p=>{
    const info=getEstadoTexto(p);
    const bg=p.estado_cartera==='rechazado'?T.color.neutroSuave:p.estado_cartera==='aprobado'?p.estado_impresion==='impreso'||p.transmitido_tms?T.color.bienSuave:T.color.infoSuave:T.color.ojoSuave;
    return <article key={p.id} style={{...tarjeta,padding:'12px 13px'}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:13}}><strong>{p.numero_pedido}</strong><strong>{fCOP(p.valor_total)}</strong></div>
     <div style={{fontSize:12.5,fontWeight:600,marginTop:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.cliente}</div>
     <div style={{fontSize:11.5,color:T.color.tinta3,marginTop:2}}>NIT {p.nit}</div>
     <div style={{borderTop:`1px solid ${T.color.divisor}`,marginTop:9,paddingTop:9,display:'flex',justifyContent:'space-between',gap:6,alignItems:'center'}}>
      <span style={{background:bg,color:info.color,borderRadius:99,padding:'4px 8px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>● {info.label}</span>
      <span style={{fontSize:11,color:T.color.tinta3,whiteSpace:'nowrap'}}><Clock size={11} style={{verticalAlign:'middle',marginRight:3}}/>{p.fecha_corte?fFechaHora(p.fecha_corte):'Sin corte'}</span>
     </div>
    </article>;
   })}</div>}
  </Pagina>;

  return (
   <Pagina anchoCompleto>
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
  case "cartera_cargar":    return <CargarPedidos user={user} showToast={showToast} onCargado={()=>setTab("cartera_pedidos")}/>;
  case "cartera_pedidos":   return <GestionPedidos user={user} showToast={showToast}/>;
  case "cartera_logistica": return <ModuloLogistica showToast={showToast}/>;
  case "cartera_consultas": return <ModuloConsultas showToast={showToast}/>;
  default: return null;
 }
}

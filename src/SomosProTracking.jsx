import React, { useState, useEffect, useRef, useMemo } from 'react';
import { P, CIUDADES as CIUDADES_BASE, ESTADOS_PEDIDO, ESTADOS_SIN_DESPACHO, ROLES, ROLES_CARTERA, SEDES_DESTINO } from './Constants';
import { Logo, Badge, Card, Btn, Field, Modal, Toast } from './Subcomponentes';
import { supabase } from './supabase';
import { generarGuia } from './utils/guides';
import { descargarCSV, fileToBase64, abrirArchivoGuardado, leerTextoCsv, filasCsv } from './utils/files';
import { mensajeError, mensajeErrorFuncion } from './utils/errors';
import { esTextoSoloFacturar, transportePedido } from './utils/transporte';
import { generarPDFSoportes } from './utils/pdf';
import { Login } from './components/auth/Login';
import { CargadorFotos } from './components/delivery/CargadorFotos';
import { GuiaImprimible } from './components/delivery/GuiaImprimible';
import { SidebarApp } from './components/layout/SidebarApp';
import { NavegacionMovil } from './components/layout/NavegacionMovil';
import { PedidosMovil } from './modules/pedidos/PedidosMovil';
import { useEsMovil, ALTO_BARRA } from './design/responsive';
import { LinkCompartir } from './components/share/LinkCompartir';
import { PaginationControls } from './components/ui/PaginationControls';
import { T, tarjeta } from './design/tokens';
import {
 Pagina, Encabezado, Indicadores, BarraFiltros, Buscador, SelectFiltro, Segmentado, MenuFila,
 Paginador, PieTabla, ChipEstado, th, td, tdCifra, mono, chipMono,
 botonBarra, botonFila, botonPrincipal, iconoAccion,
} from './components/ui/listas';
import {
 ModalForm, ModalGestion, EnlacePie, Resumen, FranjaAviso, CasillaNovedad, ZonaFotos,
 Seccion, FranjaInfo, Fila, Texto, Clave, Selector, AreaTexto, Adjunto,
} from './components/ui/formularios';
import { AlertTriangle, ChevronDown, ChevronRight, ClipboardList, Download, FileText, MapPin, Plus, Search, Trash2, Truck, Upload, UserPlus } from 'lucide-react';
import { Dashboard } from './modules/dashboard/Dashboard';
import { FacturasProveedor } from './modules/facturas/FacturasProveedor';
import { Conductores } from './modules/conductores/Conductores';
import { ModuloCartera } from './modules/cartera/ModuloCartera';
import { Usuarios } from './modules/usuarios/Usuarios';
import logoSrc from '../Logo.png';

const iSt = {
 border:`1.5px solid ${P[200]}`,borderRadius:10,padding:"10px 14px",
 fontSize:14,fontFamily:"inherit",outline:"none",background:"#fafafa",
 width:"100%",boxSizing:"border-box",
};

// Un 0 valido debe mostrarse como "0". Con `valor || ""` el cero cae a cadena
// vacia y el input pinta su placeholder, que se lee como si fuera un dato real.
function numTexto(v) {
 return v === null || v === undefined || v === "" ? "" : String(v);
}

function esVacio(v) {
 return v === null || v === undefined || String(v).trim() === "";
}

// Supabase devuelve como maximo 1000 filas por consulta. Sin paginar, la app solo
// veia los 1000 pedidos mas recientes: la lista y el dashboard quedaban incompletos
// y el cargue de guias marcaba pedidos antiguos como "No encontrados".
// Se pagina hasta recibir una pagina vacia, asi no depende del limite del proyecto.
// Listas de columnas de las consultas. Se excluyen las columnas base64
// (soportes_data, soporte_data, doc_data) que disparaban el egress: se descargan
// solo al abrir cada archivo. Estan a nivel de modulo para que los refrescos
// dirigidos pidan exactamente lo mismo que la carga inicial.
const COLUMNAS_PEDIDOS_CLIENTE = [
 "id","guia_interna","cliente","ciudad_codigo","ciudad_nombre","direccion","cajas",
 "factura","conductor_id","placa","estado","estado_despacho","novedad","fecha_creacion",
 "fecha_estimada","fecha_real","fecha_pedido","hora_pedido","tipo","paqueteria","guia_paqueteria","soportes",
 "ciudad_origen_codigo","ciudad_origen_nombre","direccion_origen","created_at",
].join(",");
const COLUMNAS_PEDIDOS = [
 "id","guia_interna","cliente","ciudad_codigo","ciudad_nombre","direccion","cajas",
 "factura","conductor_id","placa","nit_proveedor","estado","estado_despacho","novedad",
 "fecha_creacion","fecha_estimada","fecha_real","fecha_despacho","fecha_pedido","hora_pedido","tipo","empresa_transporte",
 "paqueteria","guia_paqueteria","soportes","notas","ciudad_origen_codigo",
 "ciudad_origen_nombre","direccion_origen","created_at",
].join(",");
const COLUMNAS_DEVOLUCIONES = [
 "id","guia","factura","pedido_ref","unidades","volumen_m3","peso_kg",
 "dir_recogida","dir_entrega","ciudad_codigo","ciudad_nombre","motivo","conductor_id",
 "placa","nit_proveedor","estado","novedad","tipo","paqueteria","guia_paqueteria",
 "soporte_nombre","fecha_creacion","fecha_real","solicitado_por","created_at",
].join(",");
const COLUMNAS_RECOGIDAS = [
 "id","guia","dir_recogida","ciudad_recogida_cod","ciudad_recogida_nombre",
 "dir_entrega","ciudad_entrega_cod","ciudad_entrega_nombre","unidades",
 "volumen_m3","peso_kg","observaciones","conductor_id","placa","nit_proveedor",
 "estado","novedad","tipo","paqueteria","guia_paqueteria","doc_nombre",
 "fecha_creacion","fecha_real","solicitado_por","created_at",
].join(",");
const COLUMNAS_PQRS = [
 "id","factura","pedido_ref","motivo","descripcion","estado","solicitado_por",
 "gestionado_por","respuesta","fecha_creacion","fecha_gestion",
 "soporte_nombre","created_at",
].join(",");

// El cliente ve menos columnas que el personal interno.
const columnasPedidos = (rol) => rol === "cliente" ? COLUMNAS_PEDIDOS_CLIENTE : COLUMNAS_PEDIDOS;

// Facturas con sus guias. Se consulta en dos pasos porque el join anidado de
// PostgREST no funciona con las politicas RLS actuales.
async function obtenerFacturasConGuias() {
 const { data: facturas, error } = await supabase
  .from('facturas_proveedor').select('*').order('created_at', { ascending: false });
 if (error) throw error;
 const { data: guias } = await supabase
  .from('factura_guias')
  .select('*, pedidos(id,guia_interna,cliente,cajas,factura,ciudad_codigo,ciudad_nombre,fecha_creacion,fecha_despacho)');
 const porFactura = {};
 (guias || []).forEach(g => {
  if (!porFactura[g.factura_id]) porFactura[g.factura_id] = [];
  porFactura[g.factura_id].push(g);
 });
 return (facturas || []).map(f => ({ ...f, factura_guias: porFactura[f.id] || [] }));
}

async function cargarTodosLosPedidos(columnas) {
 const PAGINA = 1000;
 const filas = [];
 for (let desde = 0; ; ) {
  const { data, error } = await supabase
   .from('pedidos')
   .select(columnas)
   .order('created_at', { ascending: false })
   .order('id', { ascending: true })
   .range(desde, desde + PAGINA - 1);
  if (error) return { data: null, error };
  if (!data || data.length === 0) break;
  filas.push(...data);
  desde += data.length;
 }
 return { data: filas, error: null };
}

// Busca en la base, por bloques de 100, los pedidos de una lista de ids.
async function buscarPedidosPorId(ids, columnas) {
 const unicos = [...new Set(ids.map(id => String(id || "").trim()).filter(Boolean))];
 const mapa = new Map();
 for (let i = 0; i < unicos.length; i += 100) {
  const { data, error } = await supabase.from('pedidos').select(columnas).in('id', unicos.slice(i, i + 100));
  if (error) throw error;
  (data || []).forEach(p => mapa.set(String(p.id).trim(), p));
 }
 return mapa;
}

// Las listas ya no descargan las columnas base64 (soportes_data, soporte_data, doc_data)
// para no agotar el egress de Supabase; estos helpers las piden solo al abrir el archivo.
async function cargarSoportesPedido(pedidoId) {
 const { data, error } = await supabase.from('pedidos').select('soportes_data').eq('id', pedidoId).single();
 if (error) throw error;
 return Array.isArray(data?.soportes_data) ? data.soportes_data : [];
}

async function verPDFSoportes(pedido, showToast) {
 try {
  const soportesData = Array.isArray(pedido.soportes_data) && pedido.soportes_data.length > 0
   ? pedido.soportes_data
   : await cargarSoportesPedido(pedido.id);
  await generarPDFSoportes({ ...pedido, soportes_data: soportesData }, []);
 } catch (e) {
  console.error('soportes:', e);
  if (showToast) showToast('No se pudieron cargar los soportes: ' + (e.message || e), 'error');
 }
}

async function abrirArchivoRemoto(tabla, id, colData, colNombre, nombreFallback, showToast) {
 try {
  const { data, error } = await supabase.from(tabla).select(`${colData},${colNombre}`).eq('id', id).single();
  if (error) throw error;
  if (!data?.[colData]) { if (showToast) showToast('El registro no tiene archivo guardado.', 'error'); return; }
  abrirArchivoGuardado(data[colData], data[colNombre] || nombreFallback);
 } catch (e) {
  console.error('archivo:', e);
  if (showToast) showToast('No se pudo abrir el archivo: ' + (e.message || e), 'error');
 }
}

// Rangos del filtro de fecha del modulo de Pedidos.
const RANGOS_PEDIDOS = [
 { id: "todo", label: "Todo el historico", dias: null },
 { id: "7",   label: "Ultimos 7 dias",   dias: 7 },
 { id: "30",  label: "Ultimos 30 dias",  dias: 30 },
 { id: "90",  label: "Ultimos 90 dias",  dias: 90 },
];

// Orden de las pestanas por estado.
const ORDEN_ESTADOS_PEDIDO = [
 "sin_asignar", "pendiente", "en_transito", "paqueteria",
 "novedad", "entregado", "solo_facturar", "cliente_recoge",
];

const selectFiltro = {
 padding: "9px 12px", border: `1px solid ${T.color.borde2}`,
 borderRadius: T.radio.control, background: T.color.superficie,
 fontSize: 13, fontFamily: "inherit", color: T.color.tinta,
 cursor: "pointer", outline: "none", maxWidth: 210,
};

function ModalDetalle({ pedido, conductores, ciudades, transportistas, paqueterias = [], promesas = [], onClose, setPedidos, showToast, canEdit, canBasicEdit = false, canAssign = false, canDeliver = false }) {
 const [condId,   setCondId]   = useState(pedido.conductor_id||"") ;
 const [direccion, setDireccion] = useState(pedido.direccion||"");
 const [cajas,   setCajas]   = useState(numTexto(pedido.cajas));
 const [estadoDesp, setEstadoDesp] = useState(ESTADOS_SIN_DESPACHO.includes(pedido.estado) ? pedido.estado : (pedido.estado_despacho||"despachado"));
 const [novedad,  setNovedad]  = useState(pedido.novedad||false);
 const [tipoModal, setTipoModal] = useState(pedido.tipo||"propio");
 const [facturaEdit, setFacturaEdit] = useState(pedido.factura||"");
 const [fechaEdit,  setFechaEdit]  = useState(pedido.fecha_estimada||"");
 const [ciudadEdit, setCiudadEdit] = useState(pedido.ciudad_codigo||"");
 const [empTrans,  setEmpTrans]  = useState(pedido.empresa_transporte||"");
 const [paqModal,  setPaqModal]  = useState(pedido.paqueteria||"");
 const [guiaPaq,  setGuiaPaq]  = useState(pedido.guia_paqueteria||"");
 const [verMapa,  setVerMapa]  = useState(false);
 const [verGuia,  setVerGuia]  = useState(false);
 const [verCamara, setVerCamara] = useState(false);
 const [novedadEntrega, setNovedadEntrega] = useState(pedido.novedad||false);
 const [soportesData, setSoportesData] = useState(Array.isArray(pedido.soportes_data)?pedido.soportes_data:[]);
 // Fotos adjuntadas que aun no se han guardado. La entrega se registra al presionar
 // Guardar, no al subir la foto: asi los datos del formulario y el cierre del pedido
 // viajan en una sola escritura y no queda a medias si el usuario no alcanza a guardar.
 const [fotosPendientes, setFotosPendientes] = useState([]);

 useEffect(() => {
  let activo = true;
  if ((pedido.soportes||[]).length > 0 && soportesData.length === 0) {
   cargarSoportesPedido(pedido.id).then(d => { if (activo && d.length) setSoportesData(d); }).catch(()=>{});
  }
  return () => { activo = false; };
 }, [pedido.id]);

 const cond  = conductores.find(c=>String(c.id)===String(condId||pedido.conductor_id||""));
 const ciudad = (ciudades||[]).find(c=>c.code===pedido.ciudad_codigo);
 const promesa = (promesas||[]).find(p=>p.ciudad_codigo===pedido.ciudad_codigo);
 const fechaLimitePromesa = promesa && pedido.fecha_creacion ? (() => {
  const d = new Date(pedido.fecha_creacion);
  d.setDate(d.getDate() + Number(promesa.dias_plazo || 0));
  return d.toISOString().split("T")[0];
 })() : null;
 const fuenteRiesgo = fechaLimitePromesa ? "Promesa de servicio" : "Fecha estimada";
 const tieneSoportes = (soportesData.length > 0) || ((pedido.soportes||[]).length > 0) || (fotosPendientes.length > 0);
 const pedidoCerrado = ["entregado","novedad"].includes(pedido.estado);
 const pedidoEnTransito = pedido.estado === "en_transito";
 const pedidoBloqueadoEdicion = pedidoCerrado || pedidoEnTransito;
 const puedeMarcarNovedadEntrega = !pedidoCerrado && (!pedidoEnTransito || canDeliver);
 // Cliente Recoge y Solo Facturar no se despachan: no hay conductor ni transportadora
 // que asignar. El formulario oculta esos campos y el guardado los deja en null, para
 // que ningun conductor figure moviendo un pedido que nunca salio con el.
 const sinTransporte = ESTADOS_SIN_DESPACHO.includes(estadoDesp);
 const conductoresActivos = conductores.filter(c=>c.activo!==false);
 const conductorHistorico = cond && !conductoresActivos.some(c=>String(c.id)===String(cond.id)) ? cond : null;
 const conductoresOpciones = conductorHistorico ? [conductorHistorico, ...conductoresActivos] : conductoresActivos;

 const guardar = async () => {
  if (pedidoBloqueadoEdicion) {
   showToast(pedidoCerrado ? "No se puede modificar un pedido que ya fue entregado" : "No se puede editar un pedido en transito","error");
   return;
  }
  // Cliente Recoge saca el pedido de los despachos pendientes, de los vencidos y de los
  // que estan en riesgo, asi que no se guarda sin la prueba de que el cliente se llevo la
  // mercancia. La excepcion es un pedido que YA estaba en ese estado: a ese hay que poder
  // corregirle las cajas o la factura sin obligarlo a tener soporte todavia.
  const marcandoClienteRecoge = estadoDesp === "cliente_recoge" && pedido.estado !== "cliente_recoge";
  if (marcandoClienteRecoge && !tieneSoportes) {
   showToast("Para marcar Cliente Recoge adjunta el soporte de entrega: al subirlo se guardan tambien los datos del formulario","error");
   return;
  }
  const c = conductores.find(c=>String(c.id)===String(condId));
  let nuevoEstado = pedido.estado;
  if(c && (pedido.estado==="sin_asignar"||pedido.estado==="pendiente")) nuevoEstado="en_transito";
  if(!c && pedido.estado==="en_transito" && tipoModal==="propio") nuevoEstado="sin_asignar";
  if(tipoModal==="empresa_transporte" && empTrans.trim()) nuevoEstado="en_transito";
  if(tipoModal==="paqueteria") nuevoEstado="paqueteria";
  // "Solo Facturar" y "Cliente Recoge" se eligen en el desplegable de despacho, pero se
  // guardan como estado del pedido para que los reconozcan el badge, el filtro y el dashboard.
  if (ESTADOS_SIN_DESPACHO.includes(estadoDesp)) {
   nuevoEstado = estadoDesp;
  } else if (ESTADOS_SIN_DESPACHO.includes(pedido.estado)) {
   // Se quita: el pedido vuelve al estado que le corresponde.
   const conTransporte = c || (tipoModal === "empresa_transporte" && empTrans.trim());
   nuevoEstado = tipoModal === "paqueteria" ? "paqueteria" : conTransporte ? "en_transito" : "sin_asignar";
  }
  const fechaDespacho = new Date().toISOString().split("T")[0];
  const debeMarcarDespacho = nuevoEstado === "en_transito" && pedido.estado !== "en_transito" && !pedido.fecha_despacho;
  const ciudad = (ciudades||[]).find(c => c.code === ciudadEdit);
  const cambiosBase = {
   direccion: direccion.trim()||pedido.direccion,
   cajas: parseInt(cajas)||pedido.cajas,
   factura: facturaEdit.trim()||pedido.factura,
   ciudad_codigo: ciudadEdit||pedido.ciudad_codigo,
   ciudad_nombre: ciudad?.name||pedido.ciudad_nombre||"",
   fecha_estimada: fechaEdit||pedido.fecha_estimada||null,
  };
  if (canBasicEdit && pedidoCerrado && tieneSoportes) {
   cambiosBase.estado = novedad ? "novedad" : "entregado";
   cambiosBase.novedad = novedad;
  }
  // Con fotos adjuntas, este guardado ES la entrega: escribe los soportes, cierra el
  // pedido y conserva la modalidad (Cliente Recoge / Solo Facturar) en estado_despacho,
  // porque la columna estado pasa a "entregado".
  const hoyEntrega = new Date().toISOString().split("T")[0];
  const conNovedadEntrega = Boolean(novedadEntrega);
  const modalidad = ESTADOS_SIN_DESPACHO.includes(estadoDesp) ? estadoDesp
   : ESTADOS_SIN_DESPACHO.includes(pedido.estado) ? pedido.estado : null;
  const entrega = fotosPendientes.length > 0 ? {
   soportes: [...(pedido.soportes||[]), ...fotosPendientes.map((_,i)=>`soporte_${pedido.id}_${(pedido.soportes||[]).length+i+1}.jpg`)],
   soportes_data: [...soportesData, ...fotosPendientes],
   estado: conNovedadEntrega ? "novedad" : "entregado",
   fecha_real: hoyEntrega,
   novedad: conNovedadEntrega,
   ...(modalidad ? { estado_despacho: modalidad } : {}),
  } : {};

  // Quien solo puede registrar la entrega (el conductor) no manda el formulario
  // completo: el trigger de la base exige que cierre el pedido sin tocar nada mas.
  const soloEntrega = fotosPendientes.length > 0 && !canEdit && !canBasicEdit && !canAssign;
  if (soloEntrega) {
   const cambiosEntrega = { ...cambiosPendientesDelFormulario(), ...entrega };
   setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambiosEntrega}:p));
   showToast("Guardando...","info");
   const { error: errEntrega } = await supabase.from("pedidos").update(cambiosEntrega).eq("id", pedido.id).select("id").single();
   if (errEntrega) { showToast(mensajeError(errEntrega, "el registro de la entrega"),"error"); return; }
   showToast("Entrega registrada","success");
   if (window._recargarPedidos) await window._recargarPedidos();
   onClose();
   return;
  }

  const cambios = canBasicEdit && !canEdit && !canAssign ? { ...cambiosBase, ...entrega } : {
   ...cambiosBase,
   ...(canEdit || canAssign ? {
    conductor_id: (tipoModal==="paqueteria" || sinTransporte) ? null : (c?.id||null),
    placa: (tipoModal==="paqueteria" || sinTransporte) ? null : (c?.placa||null),
    nit_proveedor: (tipoModal==="paqueteria" || sinTransporte) ? null : (c?.nit_proveedor||null),
    estado: nuevoEstado,
    ...(debeMarcarDespacho ? { fecha_despacho: fechaDespacho } : {}),
   } : {}),
   ...(canEdit ? {
    estado_despacho: ESTADOS_SIN_DESPACHO.includes(estadoDesp) ? (pedido.estado_despacho || "despachado") : estadoDesp,
    novedad,
    tipo: tipoModal,
    empresa_transporte: tipoModal==="empresa_transporte" ? (empTrans||c?.empresa||null) : null,
    paqueteria: tipoModal==="paqueteria" ? paqModal : null,
    guia_paqueteria: tipoModal==="paqueteria" ? guiaPaq : null,
   } : {}),
   // Va de ultimo a proposito: si hay soportes adjuntos, el pedido se cierra.
   ...entrega,
  };
  setPedidos(prev=>prev.map(p=>p.id===pedido.id?{...p,...cambios}:p));

  showToast("Guardando...","info");
  // select("id") confirma que la fila existe y que RLS permitio el update, sin
  // descargar soportes_data. La actualizacion optimista ya dejo la interfaz al dia,
  // asi que no hace falta recargar las diez tablas ni desmontar la pantalla.
  const { error } = await supabase.from("pedidos").update(cambios).eq("id", pedido.id).select("id").single();
  if (error) { showToast(mensajeError(error, "los cambios del pedido"),"error"); return; }
  const estadoFinal = entrega.estado || nuevoEstado;
  showToast(" Cambios guardados Estado: "+(ESTADOS_PEDIDO[estadoFinal]?.label || estadoFinal),"success");
  if (fotosPendientes.length > 0 && window._recargarPedidos) await window._recargarPedidos();
  onClose();
 };


 // Lo que el usuario escribio en el formulario y aun no ha guardado. Solo incluye
 // los campos que de verdad cambiaron: el trigger de la base exige que el conductor
 // cierre un pedido en transito sin tocar ningun otro dato, asi que mandar un campo
 // con su mismo valor esta bien, pero mandarlo cambiado haria fallar la entrega.
 const cambiosPendientesDelFormulario = () => {
  const cambios = {};
  const dir = direccion.trim();
  if (dir && dir !== (pedido.direccion || "")) cambios.direccion = dir;
  const nCajas = parseInt(cajas);
  if (!Number.isNaN(nCajas) && nCajas !== Number(pedido.cajas || 0)) cambios.cajas = nCajas;
  const fac = facturaEdit.trim();
  if (fac && fac !== (pedido.factura || "")) cambios.factura = fac;
  if (ciudadEdit && ciudadEdit !== (pedido.ciudad_codigo || "")) {
   cambios.ciudad_codigo = ciudadEdit;
   const ciu = (ciudades || []).find(c => c.code === ciudadEdit);
   if (ciu) cambios.ciudad_nombre = ciu.name;
  }
  if (fechaEdit && fechaEdit !== (pedido.fecha_estimada || "")) cambios.fecha_estimada = fechaEdit;
  return cambios;
 };

 const adjuntarFotos = (fotos) => {
  if (pedidoCerrado) {
   showToast("No se puede modificar un pedido que ya fue entregado","error");
   return;
  }
  if (pedidoEnTransito && !canDeliver) {
   showToast("Solo el conductor puede registrar la entrega de un pedido en transito","error");
   return;
  }
  setFotosPendientes(prev => [...prev, ...fotos]);
  setVerCamara(false);
  showToast(`${fotos.length} soporte(s) adjuntos. Presiona Guardar Cambios para registrar la entrega.`,"info");
 };


 const caPrev = condId!==(pedido.conductor_id?.toString()||"") && condId!=="";

 return (
  <ModalGestion
   titulo="Pedido"
   id={pedido.guia_interna || pedido.id}
   estado={<ChipEstado estado={pedido.estado} novedad={pedido.novedad} />}
   descripcion={`${pedido.id} · estado calculado automaticamente`}
   onClose={onClose}
   onGuardar={(canEdit || canBasicEdit || fotosPendientes.length > 0) && !pedidoBloqueadoEdicion ? guardar : null}
   textoGuardar={fotosPendientes.length > 0 ? "Guardar y registrar entrega" : "Guardar"}
   enlaces={<>
    <EnlacePie icono={<FileText size={15} />} onClick={()=>setVerGuia(true)}>Guia</EnlacePie>
    <EnlacePie icono={<MapPin size={15} />} onClick={()=>setVerMapa(!verMapa)}>
     {verMapa ? "Ocultar mapa" : "Mapa"}
    </EnlacePie>
    {tieneSoportes && (
     <EnlacePie icono={<FileText size={15} />}
      onClick={()=>verPDFSoportes({ ...pedido, soportes_data:soportesData }, showToast)}>
      Soportes
     </EnlacePie>
    )}
   </>}
  >
   <Resumen titulo={pedido.cliente} datos={[
    { label:"Ciudad destino", valor:ciudad?.name || pedido.ciudad_nombre || "Sin definir", falta:!pedido.ciudad_codigo },
    { label:"Factura", valor:pedido.factura || "Sin registrar", falta:!pedido.factura, mono:!!pedido.factura },
    { label:"Estimado", valor:pedido.fecha_estimada || "Sin fecha", falta:!pedido.fecha_estimada },
    { label:"Real", valor:pedido.fecha_real || "Pendiente", falta:!pedido.fecha_real },
    { label:"Fuente de riesgo", valor:fuenteRiesgo },
    { label:"Cajas", valor:pedido.cajas || 0 },
   ]}>
    {(pedido.fecha_pedido || pedido.hora_pedido) && (
     <div style={{ fontSize:12.5, color:T.color.tinta3 }}>
      Pedido generado: <strong style={{ color:T.color.tinta2 }}>
       {pedido.fecha_pedido || "sin fecha"}{pedido.hora_pedido ? " " + pedido.hora_pedido : ""}
      </strong>
     </div>
    )}
    {fechaLimitePromesa && (
     <div style={{ fontSize:12.5, color:T.color.tinta3 }}>
      Limite de promesa: <strong style={{ color:T.color.tinta2 }}>{fechaLimitePromesa}</strong>
      {" "}({promesa.dias_plazo} dia(s))
     </div>
    )}
    {pedido.notas && <FranjaAviso etiqueta="Notas">{pedido.notas}</FranjaAviso>}
    {pedido.tipo === "paqueteria" && pedido.guia_paqueteria && (
     <FranjaInfo>{pedido.paqueteria} · guia {pedido.guia_paqueteria}</FranjaInfo>
    )}
   </Resumen>

   {pedidoCerrado && (
    <FranjaInfo>Pedido cerrado: no se permiten modificaciones despues de la entrega.</FranjaInfo>
   )}
   {!pedidoCerrado && pedidoEnTransito && !canDeliver && (
    <FranjaInfo>En transito: solo el conductor asignado puede registrar la entrega.</FranjaInfo>
   )}

   {(canEdit || canBasicEdit) && (
    <>
     <Seccion titulo="Datos del pedido" />
     <Fila>
      <Texto label="Direccion de entrega" valor={direccion} onChange={setDireccion}
       placeholder="Cra 15 #93-47" deshabilitado={pedidoBloqueadoEdicion} />
      <Selector label="Ciudad destino (DANE)" valor={ciudadEdit} onChange={setCiudadEdit}
       placeholder="Seleccione" deshabilitado={pedidoBloqueadoEdicion}
       opciones={(ciudades||[]).map(c=>({ value:c.code, label:`${c.name} - ${c.code}` }))} />
     </Fila>
     <Fila>
      <Texto label="Cajas" tipo="number" valor={cajas} onChange={setCajas} deshabilitado={pedidoBloqueadoEdicion} />
      <Texto label="N de factura" mono valor={facturaEdit} onChange={setFacturaEdit}
       placeholder="FAC-3000" deshabilitado={pedidoBloqueadoEdicion} />
     </Fila>
     <Texto label="Fecha estimada" tipo="date" valor={fechaEdit} onChange={setFechaEdit}
      deshabilitado={pedidoBloqueadoEdicion} style={{ maxWidth:"50%" }} />
    </>
   )}

   {canEdit && (
    <>
     <Seccion titulo="Transporte" />
     {sinTransporte ? (
      <FranjaInfo>
       {estadoDesp === "cliente_recoge" ? "Recoge el cliente:" : "Solo se factura:"} este pedido no lleva
       conductor ni transportadora. Si tenia uno asignado, se quita al guardar.
      </FranjaInfo>
     ) : (
      <Fila>
       <Selector label="Tipo de transporte" valor={tipoModal} onChange={setTipoModal}
        deshabilitado={pedidoBloqueadoEdicion}
        opciones={[
         { value:"propio", label:"Transporte propio" },
         { value:"empresa_transporte", label:"Empresa transportista" },
         { value:"mensajeria", label:"Mensajeria" },
         { value:"paqueteria", label:"Paqueteria tercero" },
        ]} />
       {tipoModal === "paqueteria" ? (
        <Selector label="Paqueteria" valor={paqModal} onChange={setPaqModal}
         placeholder="Seleccione" deshabilitado={pedidoBloqueadoEdicion}
         opciones={(paqueterias||[]).filter(x=>typeof x==="string"&&x).map(x=>({ value:x, label:x }))} />
       ) : (
        <Selector label="Asignar conductor" valor={condId}
         onChange={v => {
          setCondId(v);
          const c = conductores.find(cx => String(cx.id) === String(v));
          if (c && tipoModal === "empresa_transporte") setEmpTrans(c.empresa || c.nit_proveedor || "");
         }}
         placeholder="Sin asignar" deshabilitado={pedidoBloqueadoEdicion}
         opciones={conductoresOpciones.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
       )}
      </Fila>
     )}
     {tipoModal === "paqueteria" && !sinTransporte && (
      <Texto label="No. guia de paqueteria" mono valor={guiaPaq} onChange={setGuiaPaq}
       placeholder="SRV-2026-0001" deshabilitado={pedidoBloqueadoEdicion} />
     )}
     {caPrev && !sinTransporte && (
      <FranjaInfo>Al guardar, el pedido pasa a En transito.</FranjaInfo>
     )}
     <Selector label="Estado de despacho" valor={estadoDesp} onChange={setEstadoDesp}
      deshabilitado={pedidoBloqueadoEdicion}
      opciones={[
       { value:"despachado", label:"Despachado" },
       { value:"bloqueado", label:"Bloqueado cartera" },
       { value:"novedad_despacho", label:"Despachado con novedad" },
       { value:"solo_facturar", label:"Solo facturar (no se despacha)" },
       { value:"cliente_recoge", label:"Cliente recoge (no se despacha)" },
      ]} />
    </>
   )}

   {canAssign && !canEdit && !sinTransporte && tipoModal !== "paqueteria" && (
    <>
     <Seccion titulo="Transporte" />
     <Selector label="Asignar conductor" valor={condId} onChange={setCondId}
      placeholder="Sin asignar" deshabilitado={pedidoBloqueadoEdicion}
      opciones={conductoresOpciones.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
    </>
   )}

   <Seccion titulo="Entrega" />
   {(soportesData.length > 0 || fotosPendientes.length > 0) && (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10 }}>
     {[...soportesData, ...fotosPendientes].map((f, i) => (
      <div key={i} style={{ borderRadius:T.radio.chico, overflow:"hidden", border:`1px solid ${T.color.borde}` }}>
       <img src={f.data || f} alt={"soporte " + (i+1)} style={{ width:"100%", height:78, objectFit:"cover", display:"block" }} />
      </div>
     ))}
    </div>
   )}
   {fotosPendientes.length > 0 && (
    <FranjaAviso>
     {fotosPendientes.length} soporte(s) adjuntos sin guardar. Presiona
     <strong> Guardar y registrar entrega</strong> para cerrar el pedido.
    </FranjaAviso>
   )}
   <ZonaFotos
    actuales={(pedido.soportes||[]).length + fotosPendientes.length}
    maximo={3}
    deshabilitada={pedidoCerrado || (pedidoEnTransito && !canDeliver) || (pedido.soportes||[]).length >= 3}
    onClick={()=>{ setNovedadEntrega(novedad); setVerCamara(true); }}
   />
   <CasillaNovedad marcada={novedadEntrega} onChange={setNovedadEntrega}
    deshabilitada={!puedeMarcarNovedadEntrega}>
    Entregar con novedad al cargar soporte
   </CasillaNovedad>

   {verMapa && (
    <iframe
     title="Mapa del destino"
     src={`https://maps.google.com/maps?q=${encodeURIComponent((pedido.direccion||"") + ", " + (ciudad?.name||"") + ", Colombia")}&output=embed`}
     style={{ width:"100%", height:240, border:"none", borderRadius:T.radio.control }}
     loading="lazy" />
   )}

   {verGuia && <GuiaImprimible pedido={pedido} conductores={conductores} ciudades={ciudades} onClose={()=>setVerGuia(false)} />}
   {verCamara && <CargadorFotos pedido={pedido} onGuardar={adjuntarFotos} onClose={()=>setVerCamara(false)} showToast={showToast} />}
  </ModalGestion>
 );
}

// ModalCSVGuias

// Fecha de elaboracion del CSV. Acepta AAAA-MM-DD, DD/MM/AAAA (formato colombiano),
// DD-MM-AAAA con hora opcional y el numero serial que exporta Excel.
// Devuelve NaN si no se puede interpretar.
// "12/05/2026", "2026-05-12" o un serial de Excel -> "2026-05-12".
// Devuelve null si la columna viene vacia o no se entiende: es un dato opcional.
function fechaIsoCsv(valor) {
 const ts = parsearFechaCsv(valor);
 if (Number.isNaN(ts)) return null;
 return new Date(ts).toISOString().split("T")[0];
}

// "8:5", "08:05:30", "8:05 p. m." o la fraccion de dia de Excel -> "08:05".
function horaCsv(valor) {
 const txt = String(valor || "").trim();
 if (!txt) return null;
 // Excel exporta la hora suelta como fraccion de dia: 0.5 = 12:00.
 if (/^0?[.,]\d+$/.test(txt)) {
  const minutos = Math.round(parseFloat(txt.replace(",", ".")) * 1440);
  return String(Math.floor(minutos / 60) % 24).padStart(2, "0") + ":" + String(minutos % 60).padStart(2, "0");
 }
 const m = txt.match(/^(\d{1,2})[:.](\d{1,2})/);
 if (!m) return null;
 let hh = parseInt(m[1], 10);
 const mm = parseInt(m[2], 10);
 if (Number.isNaN(hh) || Number.isNaN(mm) || mm > 59) return null;
 const sufijo = txt.toLowerCase().replace(/[.\s]/g, "");
 if (sufijo.includes("pm") && hh < 12) hh += 12;
 if (sufijo.includes("am") && hh === 12) hh = 0;
 if (hh > 23) return null;
 return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

function parsearFechaCsv(valor) {
 const txt = String(valor || "").trim();
 if (!txt) return NaN;

 if (/^\d{5}(\.\d+)?$/.test(txt)) {           // serial de Excel (dias desde 1899-12-30)
  return Date.UTC(1899, 11, 30) + parseFloat(txt) * 86400000;
 }

 const [fechaTxt, horaTxt] = txt.split(/[ T]/);
 const partes = fechaTxt.split(/[/-]/).map(p => p.trim());
 if (partes.length !== 3 || partes.some(p => !p || !/^\d+$/.test(p))) {
  const nativo = Date.parse(txt);
  return Number.isNaN(nativo) ? NaN : nativo;
 }

 let anio, mes, dia;
 if (partes[0].length === 4) {
  [anio, mes, dia] = partes.map(Number);       // AAAA-MM-DD
 } else {
  const [p0, p1] = partes.map(Number);
  if (p1 > 12 && p0 <= 12) { mes = p0; dia = p1; }  // MM/DD/AAAA inequivoco
  else { dia = p0; mes = p1; }                      // DD/MM/AAAA (por defecto)
  anio = Number(partes[2]);
 }
 if (!anio || !mes || !dia || mes > 12 || dia > 31) return NaN;
 if (anio < 100) anio += 2000;

 let ts = Date.UTC(anio, mes - 1, dia);
 if (horaTxt) {
  const [hh, mm, ss] = horaTxt.split(":").map(n => parseInt(n, 10) || 0);
  ts += ((hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0)) * 1000;
 }
 return ts;
}

function ModalCSVGuias({ onClose, pedidos, ciudades = [], showToast, recargar }) {
 const [archivo,  setArchivo]  = useState("");
 const [matches,  setMatches]  = useState([]);
 const [errores,  setErrores]  = useState([]); // duplicados sin fecha para resolver
 const [resueltos, setResueltos] = useState([]); // duplicados resueltos por fecha
 const [err,    setErr]    = useState("");
 const [cargando,  setCargando] = useState(false);
 const [aplicando, setAplicando] = useState(false);
 const [resultado, setResultado] = useState(null);
 const [sobrescribir, setSobrescribir] = useState(false);
 const fileRef = useRef(null);

 // Parsear CSV 
 const parsear = (texto) => {
  const filas = filasCsv(texto);
  if (filas.length < 2) throw new Error("El archivo esta vacio o solo tiene encabezado.");
  const hdrsRaw = filas[0];
  // Normaliza encabezados para que "Fecha Elaboracion", "Fecha_Elaboracion" y
  // "Fecha Elaboración" se detecten igual: minusculas, sin tildes y sin separadores.
  const norm = (s) => s.toLowerCase().replace(/\.\d+$/,"")
   .normalize("NFD").split("").filter(ch => ch.charCodeAt(0) < 768 || ch.charCodeAt(0) > 879).join("")
   .replace(/[^a-z0-9]/g,"");
  const hdrs = hdrsRaw.map(norm);

  const col = (...names) => {
   for (const n of names) {
    const objetivo = norm(n);
    const i = hdrs.findIndex(h => h.includes(objetivo));
    if (i !== -1) return i;
   }
   return -1;
  };

  const iGuia  = col("guia");
  const iEstado = col("estado_pro","estado");
  const iPedido = col("pedido_pro","pedido");
  const iFactura = col("factura_pro","factura");
  const iPaq   = col("paqueteria","paqueteria","carrier");
  const iDestino = col("dane_destino","destino");
  const iCajas  = col("total_cajas","cajas");
  const iDireccion = col("direccion_destino","direccion");
  const iFecha  = col("fecha_elaboracion","elaboracion","fecha_documento","fecha_doc","fecha");

  if (iGuia === -1 || iEstado === -1 || iPedido === -1)
   throw new Error(`Columnas requeridias no encontradias. Necesitas: Guia, Estado_Pro, Pedido_Pro. Detectadias: ${hdrsRaw.join(", ")}`);

  return filas.slice(1).map(c => {
   const fechaRaw = iFecha !== -1 ? c[iFecha] || "" : "";
   return {
    guia:    c[iGuia]  || "",
    estadoRaw: c[iEstado] || "",
    pedidoId:  (c[iPedido] || "").trim(),
    factura:  iFactura !== -1 ? c[iFactura] || "" : "",
    paqueteria: iPaq   !== -1 ? c[iPaq]   || "" : "",
    destino:  iDestino !== -1 ? c[iDestino] || "" : "",
    cajas:   iCajas  !== -1 ? parseInt(c[iCajas])||0 : 0,
    direccion: iDireccion !== -1 ? c[iDireccion] || "" : "",
    fechaRaw,
    fechaTs:  parsearFechaCsv(fechaRaw),
   };
  }).filter(r => r.guia && r.pedidoId);
 };

 // Procesar filas
 const procesar = (rows, pedidosPorId) => {
  const hoy = new Date().toISOString().split("T")[0];

  // Duplicados dentro del CSV (mismo Pedido_Pro en varias filas):
  // - Si las filas repiten la MISMA guia es un error del archivo: se bloquea.
  // - Si traen guias DIFERENTES (guia reexpedida) se toma la fila con la fecha de
  //   elaboracion mas reciente; se bloquea solo si no hay fecha para decidir o si
  //   dos guias distintas empatan en esa fecha.
  const grupos = new Map();
  for (const r of rows) {
   if (!grupos.has(r.pedidoId)) grupos.set(r.pedidoId, []);
   grupos.get(r.pedidoId).push(r);
  }

  const conflictos = [];
  const resueltos = [];
  const lista = [];

  for (const [pedidoId, filas] of grupos) {
   let r = filas[0];
   let resueltoPorFecha = null;

   if (filas.length > 1) {
    const guiasUnicas = [...new Set(filas.map(f => f.guia))];
    if (guiasUnicas.length === 1) {
     conflictos.push({ pedidoId, filas: filas.length,
      motivo: `repetido con la misma guia ${guiasUnicas[0]}` });
     continue;
    }
    const conFecha = filas.filter(f => !Number.isNaN(f.fechaTs));
    if (conFecha.length === 0) {
     conflictos.push({ pedidoId, filas: filas.length,
      motivo: `${guiasUnicas.length} guias distintas sin fecha de elaboracion para decidir` });
     continue;
    }
    const maxTs = Math.max(...conFecha.map(f => f.fechaTs));
    const masRecientes = conFecha.filter(f => f.fechaTs === maxTs);
    const guiasEmpatadas = [...new Set(masRecientes.map(f => f.guia))];
    if (guiasEmpatadas.length > 1) {
     conflictos.push({ pedidoId, filas: filas.length,
      motivo: `${guiasEmpatadas.length} guias distintas con la misma fecha (${masRecientes[0].fechaRaw})` });
     continue;
    }
    r = masRecientes[0];
    resueltoPorFecha = {
     pedidoId,
     filas: filas.length,
     fecha: r.fechaRaw,
     guia: r.guia,
     descartadas: [...new Set(filas.map(f => f.guia))].filter(g => g !== r.guia),
    };
    resueltos.push(resueltoPorFecha);
   }

   const pedido  = pedidosPorId.get(r.pedidoId);
   const estadoN  = r.estadoRaw.toLowerCase().includes("entregado") ? "entregado" : "en_transito";
   // Se comparan como texto sin espacios: "205022008549" y "205022008549 " son la misma guia.
   const mismaGuia = !!pedido && String(pedido.guia_paqueteria ?? "").trim() === String(r.guia ?? "").trim();
   const estadoCambio = mismaGuia && pedido?.estado !== estadoN;
   // El plano completa datos solo si trae un valor para un campo que el pedido tiene vacio.
   const completaDatos = !!pedido && !!(
    (r.destino && esVacio(pedido.ciudad_codigo)) ||
    (r.direccion && esVacio(pedido.direccion)) ||
    (r.cajas > 0 && !(Number(pedido.cajas) > 0)) ||
    (r.factura && esVacio(pedido.factura))
   );
   lista.push({
    pedidoId:   r.pedidoId,
    guia:     r.guia,
    pedido,
    encontrado:  !!pedido,
    estadoNuevo: estadoN,
    estadoActual: pedido?.estado || "",
    paqueteria:  r.paqueteria || pedido?.paqueteria || "",
    destino:   r.destino,
    direccion:  r.direccion,
    factura:   r.factura,
    cajasCsv:   r.cajas,
    yaConGuia:  !!(pedido?.guia_paqueteria),
    guiaActual:  pedido?.guia_paqueteria || "",
    mismaGuia,
    estadoCambio,
    fechaReal:  estadoN === "entregado" ? hoy : null,
    fechaCsv:   r.fechaRaw,
    completaDatos,
    resueltoPorFecha,
   });
  }

  return { lista, conflictos, resueltos };
 };

 // Leer archivo 
 const leerArchivo = async (file) => {
  if (!file) return;
  setArchivo(file.name); setErr(""); setMatches([]); setErrores([]); setResueltos([]); setResultado(null);
  setCargando(true);
  try {
   const rows = parsear(await leerTextoCsv(file));
   // Se consulta la base directamente: la lista en memoria puede no incluir los
   // pedidos antiguos y los reportaria como "No encontrados" sin serlo.
   const pedidosPorId = await buscarPedidosPorId(
    rows.map(r => r.pedidoId),
    "id,cliente,estado,tipo,paqueteria,guia_paqueteria,fecha_estimada,fecha_real,ciudad_codigo,ciudad_nombre,direccion,cajas,factura"
   );
   const { lista, conflictos, resueltos: resueltosCsv } = procesar(rows, pedidosPorId);
   setMatches(lista);
   setErrores(conflictos);
   setResueltos(resueltosCsv);
  } catch(ex) { setErr(ex.message); }
  setCargando(false);
 };

 // Aplicar 
 const aplicar = async () => {
  const paraActualizar = matches.filter(seActualiza);
  if (!paraActualizar.length) { showToast("No hay pedidos para actualizar.","error"); return; }
  setAplicando(true);
  let ok = 0; const fallosDetalle = [];

  // Fecha estimada = hoy + 2 dias
  const fechaEst = new Date();
  fechaEst.setDate(fechaEst.getDate() + 2);
  const fechaEstStr = fechaEst.toISOString().split("T")[0];

  for (const m of paraActualizar) {
   const actual = m.pedido || {};
   // Si no cambia la guia ni el estado, solo se completan los datos vacios del pedido.
   const soloDatos = m.yaConGuia && !m.estadoCambio && !(sobrescribir && !m.mismaGuia);
   const cambios = soloDatos ? {} : {
    guia_paqueteria: m.guia,
    estado:     m.estadoNuevo,
    tipo:      "paqueteria",
    paqueteria:   m.paqueteria || null,
    fecha_estimada: actual.fecha_estimada || fechaEstStr,
   };
   // Datos del pedido: el plano solo llena lo que esta vacio. Nunca reemplaza ciudad,
   // direccion, cajas, factura ni fecha de entrega ya registrados.
   if (m.cajasCsv > 0 && !(Number(actual.cajas) > 0)) cambios.cajas = m.cajasCsv;
   if (m.destino && esVacio(actual.ciudad_codigo)) {
    cambios.ciudad_codigo = m.destino;
    const ciudad = (ciudades||[]).find(c => c.code === m.destino);
    if (ciudad) cambios.ciudad_nombre = ciudad.name;
   }
   if (m.direccion && esVacio(actual.direccion)) cambios.direccion = m.direccion;
   if (m.factura && esVacio(actual.factura)) cambios.factura = m.factura;
   if (!soloDatos && m.fechaReal && esVacio(actual.fecha_real)) cambios.fecha_real = m.fechaReal;
   if (Object.keys(cambios).length === 0) continue;

   const { error } = await supabase.from("pedidos").update(cambios).eq("id", m.pedidoId);
   if (error) { fallosDetalle.push({ id: m.pedidoId, mensaje: error.message }); console.error(m.pedidoId, error.message); }
   else ok++;
  }

  setAplicando(false);
  setResultado({ ok, fallos: fallosDetalle.length, fallosDetalle,
   noMatch: matches.filter(m=>!m.encontrado).length,
   sinCambios: matches.filter(m=>m.encontrado&&m.yaConGuia&&m.mismaGuia&&!m.estadoCambio&&!m.completaDatos).length,
   omitidos: matches.filter(m=>m.encontrado&&m.yaConGuia&&!m.mismaGuia&&!sobrescribir).length });
  showToast(` ${ok} actualizado(s)${fallosDetalle.length?" "+fallosDetalle.length+" error(es)":""}`, ok>0?"success":"error");
  if (ok > 0 && recargar) await recargar();
 };

 // Contadores 
 const encontrados = matches.filter(m => m.encontrado);
 const noEncontrados= matches.filter(m => !m.encontrado);
 const conGuiaYa  = encontrados.filter(m => m.yaConGuia);
 const autoUpdate = encontrados.filter(m => m.estadoCambio); // misma guia, cambia el estado
 // Antes "guia diferente" era todo pedido con guia que no cambiaba de estado, aunque la
 // guia fuera identica: el recuadro de sobrescribir listaba cientos de pedidos ya correctos.
 const sinCambios = encontrados.filter(m => m.yaConGuia && m.mismaGuia && !m.estadoCambio && !m.completaDatos);
 const completanDatos = encontrados.filter(m => m.yaConGuia && !m.estadoCambio && m.completaDatos && !(sobrescribir && !m.mismaGuia));
 const guiaDiferente = encontrados.filter(m => m.yaConGuia && !m.mismaGuia);
 const sinGuia   = encontrados.filter(m => !m.yaConGuia);
 // Unica regla de que se actualiza, compartida por la tabla, el boton y aplicar().
 function seActualiza(m) {
  return m.encontrado && (!m.yaConGuia || m.estadoCambio || m.completaDatos || (sobrescribir && !m.mismaGuia));
 }
 const totalAplicar = matches.filter(seActualiza).length;

 return (
  <ModalForm
   titulo="Cargar guias de paqueteria"
   descripcion={resultado ? "Resultado de la carga" : "Asocia una guia a cada pedido existente"}
   ancho="M"
   onClose={onClose}
   onPrimario={matches.length > 0 && !resultado ? aplicar : null}
   guardando={aplicando}
   primarioDeshabilitado={totalAplicar === 0}
   textoPrimario={`Cargar ${totalAplicar > 0 ? totalAplicar + " guias" : "guias"}`}
  >
   {!matches.length && !resultado && (
    <>
     <button onClick={()=>fileRef.current?.click()}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();leerArchivo(e.dataTransfer.files[0]);}}
      style={{
       width:"100%", padding:"32px 20px", borderRadius:T.radio.tarjeta,
       border:`1px dashed ${T.color.borde2}`, background:T.color.superficie2,
       cursor:"pointer", fontFamily:"inherit", textAlign:"center",
      }}>
      <span style={{
       width:44, height:44, borderRadius:T.radio.control, margin:"0 auto 12px",
       background:T.color.marcaSuave, color:T.color.marca, display:"grid", placeItems:"center",
      }}><Upload size={20} /></span>
      <span style={{ display:"block", fontSize:14, fontWeight:700, color:T.color.tinta }}>
       {cargando ? "Procesando el archivo..." : "Arrastra el archivo CSV o haz clic para seleccionarlo"}
      </span>
      <span style={{ display:"block", fontSize:12.5, color:T.color.tinta3, marginTop:4 }}>
       Solo archivos .csv · separador coma o punto y coma
      </span>
     </button>

     <EnlacePie icono={<Download size={15} />}
      onClick={()=>descargarCSV("plantilla_guias.csv", "Guia,Estado_Pro,Pedido_Pro,Fecha_Elaboracion",
       "205022008549,ENTREGADO,PX000117858,15/07/2026")}>
      Descargar plantilla CSV
     </EnlacePie>

     <div style={{ ...tarjeta, padding:14, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
       <FileText size={15} style={{ color:T.color.tinta3 }} />
       <span style={{ fontSize:13.5, fontWeight:700, color:T.color.tinta }}>Formato del archivo</span>
       <span style={{ fontSize:12.5, color:T.color.tinta3 }}>· 1 pedido = 1 guia</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:10, alignItems:"start" }}>
       <span style={{ fontSize:12.5, color:T.color.tinta3, paddingTop:3 }}>Requeridas</span>
       <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {["Guia","Estado_Pro","Pedido_Pro"].map(x => (
         <span key={x} style={{
          fontFamily:T.fuente.mono, fontSize:11.5, padding:"3px 8px",
          borderRadius:T.radio.chico, background:T.color.superficie2,
          border:`1px solid ${T.color.borde}`, color:T.color.tinta2,
         }}>{x}</span>
        ))}
       </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:10, alignItems:"start" }}>
       <span style={{ fontSize:12.5, color:T.color.tinta3 }}>Cruce</span>
       <span style={{ fontSize:12.5, color:T.color.tinta2 }}>
        Pedido_Pro = N de pedido en el sistema
       </span>
      </div>
     </div>

     <FranjaInfo>
      Si un pedido se repite con <strong>guias diferentes</strong>, se toma la de fecha de elaboracion
      mas reciente (DD/MM/AAAA o AAAA-MM-DD).
     </FranjaInfo>
     <FranjaAviso>
      Si se repite con la <strong>misma guia</strong>, es error del archivo y esa fila no se carga.
     </FranjaAviso>
    </>
   )}
   <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}}
    onChange={e=>leerArchivo(e.target.files[0])}/>

    {/* Error de parseo */}
    {err && <div style={{background:"#fef2f2",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",fontWeight:600}}> {err}</div>}

    {/* Duplicados resueltos con la fecha de elaboracion mas reciente */}
    {resueltos.length > 0 && (
     <div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:10,padding:"12px 16px"}}>
      <div style={{fontWeight:800,color:"#059669",marginBottom:6}}>
       {resueltos.length} pedido(s) duplicados resueltos con la fecha de elaboracion mas reciente
      </div>
      <div style={{maxHeight:120,overflowY:"auto",fontSize:11,color:"#065f46",fontFamily:"monospace",lineHeight:1.6}}>
       {resueltos.map(r => (
        <div key={r.pedidoId}>
         <strong>{r.pedidoId}</strong> ({r.filas} filas) usa guia {r.guia} del {r.fecha}
         {r.descartadas.length > 0 && <span style={{color:"#78716c"}}> · descarta {r.descartadas.join(", ")}</span>}
        </div>
       ))}
      </div>
     </div>
    )}

    {/* Duplicados que no se pueden decidir por fecha: se bloquean */}
    {errores.length > 0 && (
     <div style={{background:"#fef2f2",border:"2px solid #fca5a5",borderRadius:10,padding:"12px 16px"}}>
      <div style={{fontWeight:800,color:"#dc2626",marginBottom:6}}>
       {errores.length} pedido(s) duplicados en el CSV no se cargaran
      </div>
      <div style={{maxHeight:120,overflowY:"auto",fontSize:11,color:"#991b1b",fontFamily:"monospace",lineHeight:1.6}}>
       {errores.map(c => (
        <div key={c.pedidoId}><strong>{c.pedidoId}</strong> ({c.filas} filas): {c.motivo}</div>
       ))}
      </div>
      <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
       Deja una sola fila por Pedido_Pro (o completa la fecha de elaboracion) y vuelve a cargar.
      </div>
     </div>
    )}

    {/* Resultado final */}
    {resultado && (
     <div style={{background:resultado.ok>0?"#ecfdf5":"#fef2f2",borderRadius:12,padding:16,
      border:`2px solid ${resultado.ok>0?"#86efac":"#fca5a5"}`}}>
      <div style={{fontWeight:800,fontSize:15,color:resultado.ok>0?"#059669":"#dc2626",marginBottom:10}}>
       {resultado.ok>0?" Actualizacin completada":" Sin actualizaciones"}
      </div>
      <div style={{fontSize:13,color:"#334155",display:"flex",flexDirection:"column",gap:4}}>
       <span> <strong>{resultado.ok}</strong> pedido(s) actualizados con guia y estado</span>
       {resultado.sinCambios>0&&<span> <strong>{resultado.sinCambios}</strong> sin cambios (ya tenian la misma guia y el mismo estado)</span>}
       {resultado.omitidos>0&&<span> <strong>{resultado.omitidos}</strong> con guia diferente no reemplazados (no se marco sobrescribir)</span>}
       {resultado.noMatch>0&&<span> <strong>{resultado.noMatch}</strong> no encontrados en el sistema</span>}
       {resultado.fallos>0&&<span> <strong>{resultado.fallos}</strong> error(es) en Supabase</span>}
      </div>
      {resultado.fallosDetalle?.length>0&&(
       <div style={{marginTop:10,maxHeight:160,overflowY:"auto",background:"#fff",border:"1px solid #fca5a5",
        borderRadius:8,padding:"8px 10px",fontSize:11,fontFamily:"monospace",color:"#991b1b"}}>
        {resultado.fallosDetalle.map(f=>(
         <div key={f.id}><strong>{f.id}</strong>: {f.mensaje}</div>
        ))}
       </div>
      )}
     </div>
    )}

    {/* Preview */}
    {matches.length>0 && !resultado && (
     <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
       {[
        {l:"En CSV",     v:matches.length,    c:"#7c3aed",bg:"#f5f3ff"},
        {l:"Encontrados",  v:encontrados.length,  c:"#059669",bg:"#ecfdf5"},
        {l:"No encontrados", v:noEncontrados.length, c:"#dc2626",bg:"#fef2f2"},
        {l:"Ya con guia",  v:conGuiaYa.length,   c:"#d97706",bg:"#fffbeb"},
       ].map(s=>(
        <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"10px 14px",textAlign:"center",border:`1px solid ${s.c}30`}}>
         <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
         <div style={{fontSize:11,color:"#64748b",fontWeight:700,marginTop:3}}>{s.l}</div>
        </div>
       ))}
      </div>

      {/* Opcin sobreescribir */}
      {autoUpdate.length>0&&(
       <div style={{background:"#ecfdf5",border:"1px solid #86efac",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:"#059669",fontSize:13}}>
          {autoUpdate.length} pedido(s) se actualizarn automaticamente
        </div>
        <div style={{fontSize:11,color:"#065f46",marginTop:3}}>
         Misma guia, estado cambia de {autoUpdate[0]?.estadoActual} {autoUpdate[0]?.estadoNuevo}. No requiere confirmacin.
        </div>
       </div>
      )}
      {completanDatos.length>0&&(
       <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:"#1d4ed8",fontSize:13}}>
         {completanDatos.length} pedido(s) completan datos vacios
        </div>
        <div style={{fontSize:11,color:"#1e40af",marginTop:3}}>
         Se llenan solo ciudad, direccion, cajas o factura que esten vacios. No cambia la guia ni el estado.
        </div>
       </div>
      )}
      {sinCambios.length>0&&(
       <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:"#475569",fontSize:13}}>
         {sinCambios.length} pedido(s) sin cambios
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:3}}>
         Ya tienen la misma guia y el mismo estado. No se actualizan.
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
         {sobrescribir&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}></span>}
        </div>
        <div>
         <div style={{fontWeight:700,color:"#92400e",fontSize:13}}>Sobreescribir guias diferentes ({guiaDiferente.length} pedido(s))</div>
         <div style={{fontSize:11,color:"#78716c"}}>Estos pedidos ya tienen otra guia asignada. Marca para reemplazarla.</div>
        </div>
       </div>
      )}

      {/* Tabla preview */}
      <div style={{maxHeight:300,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,fontSize:12}}>
       <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead style={{position:"sticky",top:0,background:"#f8fafc",zIndex:1}}>
         <tr>
          {["","No. Pedido","Cliente","Guia nueva","Guia actual","Estado nuevo","Paqueteria"].map(h=>(
           <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:"#475569",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
          ))}
         </tr>
        </thead>
        <tbody>
         {matches.map((m,i)=>{
          const omitir = m.encontrado && !seActualiza(m);
          const igual = omitir && m.mismaGuia;
          const bg = !m.encontrado?"#fef2f2":igual?"#f8fafc":omitir?"#fffbeb":i%2?"#fafafa":"#fff";
          return (
           <tr key={m.pedidoId} style={{borderTop:"1px solid #f1f5f9",background:bg}}>
            <td style={{padding:"8px 12px",fontSize:15}}>
             {!m.encontrado?"":omitir?"":""}
            </td>
            <td style={{padding:"8px 12px",fontWeight:700,
             color:!m.encontrado?"#dc2626":igual?"#94a3b8":omitir?"#d97706":"#7c3aed",fontFamily:"monospace"}}>
             {m.pedidoId}
             {m.resueltoPorFecha&&(
              <div style={{fontSize:10,fontWeight:600,color:"#059669",fontFamily:"inherit",marginTop:2}}>
               mas reciente ({m.resueltoPorFecha.fecha})
              </div>
             )}
            </td>
            <td style={{padding:"8px 12px",color:"#334155",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
             {m.pedido?.cliente||<span style={{color:"#dc2626",fontSize:11}}>No encontrado</span>}
            </td>
            <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#0891b2",fontSize:11}}>{m.guia}</td>
            <td style={{padding:"8px 12px",fontFamily:"monospace",color:"#94a3b8",fontSize:11}}>
             {m.guiaActual||<span style={{color:"#cbd5e1"}}></span>}
            </td>
            <td style={{padding:"8px 12px"}}>
             <span style={{background:m.estadoNuevo==="entregado"?"#ecfdf5":"#eff6ff",
              color:m.estadoNuevo==="entregado"?"#059669":"#2563eb",
              borderRadius:12,padding:"2px 8px",fontWeight:700,fontSize:11}}>
              {m.estadoNuevo==="entregado"?" Entregado":" En Transito"}
             </span>
            </td>
            <td style={{padding:"8px 12px",color:"#64748b"}}>{m.paqueteria||""}</td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>

      {noEncontrados.length>0&&(
       <div style={{background:"#fffbeb",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e"}}>
        <strong> No encontrados en sistema:</strong> {noEncontrados.map(m=>m.pedidoId).join(", ")}
        <br/><span style={{color:"#78716c",fontSize:11}}>Verifica que el Pedido_Pro coincida exactamente con el N de pedido del sistema.</span>
       </div>
      )}

      <EnlacePie onClick={()=>{setMatches([]);setArchivo("");setErrores([]);setResueltos([]);setResultado(null);}}>Cambiar archivo</EnlacePie>
     </>
    )}
  </ModalForm>
 );
}


// Importador de pedidos: valida el archivo antes de escribir nada, para que los
// errores se vean y se corrijan sin dejar la base a medias. Lo que la base decide
// (RLS, triggers, choques) se sigue reportando durante la importacion.
const MODOS_IMPORTACION = [
 { id: "crear", titulo: "Crear pedidos nuevos",
   detalle: "Importa todas las filas como pedidos nuevos. Las que ya existan se omiten." },
 { id: "completar", titulo: "Completar datos de pedidos existentes",
   detalle: "Llena solo ciudad, direccion, cajas, factura y fecha/hora que esten vacias. No cambia estado, conductor ni guia." },
 { id: "fechahora", titulo: "Cargar unicamente fecha y hora",
   detalle: "Escribe solo la fecha y hora vacias en pedidos existentes. No crea pedidos ni toca otras columnas." },
 { id: "notas", titulo: "Actualizar notas desde el plano",
   detalle: "Reemplaza el texto de las notas aunque ya tengan contenido. No escribe ninguna otra columna." },
];

const COLUMNAS_REQUERIDAS = ["id","cliente","ciudad_codigo","direccion","cajas","factura","fecha_estimada","tipo"];
const COLUMNAS_ALIAS = ["Pedido_Pro","DANE_Destino","Total_Cajas","Factura_Pro","Paqueteria","Guia"];
const COLUMNAS_OPCIONALES = ["empresa_transporte","paqueteria","guia_paqueteria","notas","ciudad_origen_codigo","ciudad_origen_nombre","direccion_origen","fecha","hora"];

function Chips({ items, color }) {
 return (
  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
   {items.map(x => (
    <span key={x} style={{
     fontFamily:T.fuente.mono, fontSize:11.5, padding:"3px 8px",
     borderRadius:T.radio.chico, background:color || T.color.superficie2,
     border:`1px solid ${T.color.borde}`, color:T.color.tinta2,
    }}>{x}</span>
   ))}
  </div>
 );
}

function ModalCSVPedidos({ onClose, onImportar, ciudades }) {
 const [txt, setTxt] = useState("");
 const [prev, setPrev] = useState([]);
 const [err, setErr] = useState("");
 const [cargando, setCargando] = useState(false);
 const [validando, setValidando] = useState(false);
 const [archivo, setArchivo] = useState(null);   // { nombre, filas, tam, sep }
 const [validacion, setValidacion] = useState(null);
 const [modo, setModo] = useState("crear");
 const [verFormato, setVerFormato] = useState(true);
 const [verPegar, setVerPegar] = useState(false);
 const [aviso, setAviso] = useState("");
 const fileRef = useRef(null);

 const CABECERA = "id,cliente,ciudad_codigo,direccion,cajas,factura,fecha_estimada,tipo,empresa_transporte,paqueteria,guia_paqueteria,notas,ciudad_origen_codigo,ciudad_origen_nombre,direccion_origen,fecha_pedido,hora_pedido";
 const EJEMPLO = "PT000001,Empresa Ejemplo S.A.S,11001,Cra 10 #20-30 Of 201,5,FAC-3000,2026-05-10,propio,,,,Fragil,05001,Medellin,Bodega Principal,2026-05-08,08:30\nPT000002,Comercio del Norte,76001,Av 6N #23-10,12,FAC-3001,2026-05-12,paqueteria,,Servientrega,SRV-001,,,,,2026-05-11,14:05";

 const parsear = (texto) => {
  // Acepta coma, punto y coma o tabulador, y respeta los campos entre comillas.
  const filas = filasCsv(texto);
  if (filas.length < 2) throw new Error("Se necesita encabezado y al menos una fila de datos.");
  const hdrs = filas[0];
  setAviso("");
  // Acepta la plantilla (ciudad_codigo, cajas...) y tambien los nombres del plano
  // (Pedido_Pro, DANE_Destino, Total_Cajas, Factura_Pro...). Antes una columna con
  // otro nombre se ignoraba en silencio y el pedido se creaba sin ciudad ni cajas.
  const norm = (v) => String(v).toLowerCase()
   .normalize("NFD").split("").filter(ch => ch.charCodeAt(0) < 768 || ch.charCodeAt(0) > 879).join("")
   .replace(/[^a-z0-9]/g, "");
  const ALIAS = {
   id: ["id", "pedidopro", "pedido", "nopedido", "numeropedido"],
   cliente: ["cliente", "nombrecliente", "razonsocial"],
   ciudad_codigo: ["ciudadcodigo", "danedestino", "dane", "codigodane", "codigociudad"],
   ciudad_nombre: ["ciudadnombre", "ciudaddestino", "ciudad"],
   direccion: ["direccion", "direccionentrega", "direcciondestino"],
   cajas: ["cajas", "totalcajas", "cantidadcajas"],
   factura: ["factura", "facturapro", "nofactura", "numerofactura"],
   fecha_estimada: ["fechaestimada"],
   tipo: ["tipo", "tipotransporte"],
   empresa_transporte: ["empresatransporte"],
   paqueteria: ["paqueteria", "transportadora", "carrier"],
   guia_paqueteria: ["guiapaqueteria", "guia", "noguia"],
   notas: ["notas", "observaciones"],
   // Columnas opcionales del plano: cuando se genero el pedido en el ERP. No se
   // confunden con fecha_estimada porque el encabezado se compara completo.
   fecha_pedido: ["fecha", "fechapedido", "fechacreacion", "fechaelaboracion", "fechadocumento", "fechadoc"],
   hora_pedido: ["hora", "horapedido", "horacreacion"],
   ciudad_origen_codigo: ["ciudadorigencodigo", "daneorigen"],
   ciudad_origen_nombre: ["ciudadorigennombre", "ciudadorigen"],
   direccion_origen: ["direccionorigen"],
  };
  const indice = {};
  hdrs.forEach((h, i) => {
   const n = norm(h);
   const campo = Object.keys(ALIAS).find(k => ALIAS[k].includes(n));
   if (campo && indice[campo] === undefined) indice[campo] = i;
  });
  if (indice.id === undefined || indice.cliente === undefined) {
   throw new Error(`No se encontraron las columnas de numero de pedido y cliente. Columnas del archivo: ${hdrs.join(", ")}`);
  }
  const faltantes = ["ciudad_codigo", "direccion", "cajas", "factura"].filter(c => indice[c] === undefined);
  if (faltantes.length) {
   setAviso(`El archivo no trae estas columnas y los pedidos quedarian sin ese dato: ${faltantes.join(", ")}. Columnas detectadas: ${hdrs.join(", ")}`);
  }
  return filas.slice(1).map((cols, idx) => {
   const original = {};
   hdrs.forEach((h, i) => { original[h] = cols[i] || ""; });
   const obj = {};
   Object.entries(indice).forEach(([campo, i]) => { obj[campo] = cols[i] || ""; });
   const codigoCiudad = (obj.ciudad_codigo||'').trim();
   const ciudad = codigoCiudad ? (ciudades||[]).find(c => c.code === codigoCiudad) : null;
   const ciudadOrigen = (ciudades||[]).find(c => c.code === obj.ciudad_origen_codigo);
   const esPaq = obj.tipo === "paqueteria";
   return {
    id:      obj.id || `IMP-${Date.now()}-${idx}`,
    guia_interna: null,
    cliente:    obj.cliente || "Sin nombre",
    ciudad_codigo: ciudad?.code || codigoCiudad || "",
    ciudad_nombre: ciudad?.name || obj.ciudad_nombre || "",
    direccion:   obj.direccion || "",
    cajas:     parseInt((obj.cajas||'').trim()) || 0,
    factura:    obj.factura || "",
    fecha_estimada:obj.fecha_estimada || null,
    fecha_pedido:  fechaIsoCsv(obj.fecha_pedido),
    // Si el plano trae la hora dentro de la columna Fecha ("12/05/2026 14:30") y no
    // hay columna Hora aparte, se aprovecha esa.
    hora_pedido:   horaCsv(obj.hora_pedido) || horaCsv(String(obj.fecha_pedido || "").split(/[ T]/)[1] || ""),
    notas:     obj.notas || "",
    tipo:     esPaq?"paqueteria":obj.tipo==="empresa_transporte"?"empresa_transporte":obj.tipo==="mensajeria"?"mensajeria":"propio",
    empresa_transporte: esTextoSoloFacturar(obj.empresa_transporte) ? null : (obj.empresa_transporte || null),
    paqueteria:  esPaq && !esTextoSoloFacturar(obj.paqueteria) ? obj.paqueteria : null,
    guia_paqueteria: esPaq && !esTextoSoloFacturar(obj.guia_paqueteria) ? obj.guia_paqueteria : null,
    ciudad_origen_codigo: obj.ciudad_origen_codigo || null,
    ciudad_origen_nombre: ciudadOrigen?.name || obj.ciudad_origen_nombre || null,
    direccion_origen: obj.direccion_origen || null,
    conductor_id: null, placa: null, nit_proveedor: null,
   estado:    esPaq ? "paqueteria" : "sin_asignar",
   estado_despacho: "despachado", novedad: false,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, soportes: [], soportes_data: [],
   _csvOriginal: original,
   _csvHeaders: hdrs,
   };
  });
 };

 // Valida sin escribir: formato, tipos, catalogo DANE, duplicados del archivo y
 // cuales ids existen. Lo que decide la base se comprueba despues, al importar.
 const validar = async (filas) => {
  setValidando(true);
  const errores = [];
  const vistos = new Set();
  const codigosValidos = new Set((ciudades || []).map(c => c.code));

  filas.forEach((r, i) => {
   const fila = i + 2; // +1 por el encabezado, +1 porque las filas se cuentan desde 1
   const id = String(r.id || "").trim();
   if (!id || id.startsWith("IMP-")) {
    errores.push({ fila, campo:"id", mensaje:"La fila no trae numero de pedido" });
    return;
   }
   if (vistos.has(id)) {
    errores.push({ fila, campo:"id", mensaje:`Pedido ${id} repetido dentro del archivo` });
    return;
   }
   vistos.add(id);
   const codigo = String(r.ciudad_codigo || "").trim();
   if (codigo && codigosValidos.size > 0 && !codigosValidos.has(codigo)) {
    errores.push({ fila, campo:"ciudad_codigo", mensaje:`Codigo DANE ${codigo} no existe en el catalogo` });
   }
   const cajasOriginal = r._csvOriginal ? Object.entries(r._csvOriginal).find(([k]) => /cajas/i.test(k))?.[1] : null;
   if (cajasOriginal && String(cajasOriginal).trim() && Number.isNaN(Number(String(cajasOriginal).replace(",", ".")))) {
    errores.push({ fila, campo:"cajas", mensaje:`Valor "${cajasOriginal}" no es numerico` });
   }
  });

  const ids = [...vistos];
  let existentes = new Set();
  try {
   const mapa = await buscarPedidosPorId(ids, "id");
   existentes = new Set([...mapa.keys()].map(String));
  } catch (e) {
   setErr("No se pudo comprobar cuales pedidos ya existen: " + e.message);
  }

  const nuevos = ids.filter(id => !existentes.has(id));
  setValidacion({
   total: filas.length,
   existentes: ids.length - nuevos.length,
   nuevos: nuevos.length,
   errores,
  });
  setValidando(false);
 };

 const leerArchivo = async (file) => {
  if (!file) return;
  if (!/\.(csv|txt)$/i.test(file.name)) {
   setErr("Solo se aceptan archivos .CSV. Si tienes un Excel, guardalo como CSV.");
   return;
  }
  setErr(""); setValidacion(null);
  try {
   const texto = await leerTextoCsv(file);
   const filas = parsear(texto);
   const primeraLinea = texto.split(/\r?\n/)[0] || "";
   setTxt(texto);
   setPrev(filas);
   setArchivo({
    nombre: file.name,
    filas: filas.length,
    tam: (file.size / 1024).toFixed(0) + " KB",
    sep: primeraLinea.includes(";") ? ";" : primeraLinea.includes("\t") ? "tabulador" : ",",
   });
   await validar(filas);
  } catch (ex) { setErr(ex.message); setPrev([]); setArchivo(null); }
 };

 const filasConError = new Set((validacion?.errores || []).map(e => e.fila));
 const filasValidas = prev.filter((_, i) => !filasConError.has(i + 2));
 const aImportar = modo === "crear"
  ? filasValidas.length - (validacion?.existentes || 0)
  : (validacion?.existentes || 0);

 const descargarErrores = () => {
  const filas = (validacion?.errores || []).map(e =>
   [e.fila, e.campo, `"${e.mensaje.replace(/"/g, '""')}"`].join(","));
  descargarCSV("errores_validacion.csv", "fila,columna,error", filas.join("\n"));
 };

 const importar = async () => {
  if (filasValidas.length === 0) { setErr("No hay filas validas para importar."); return; }
  setCargando(true);
  try {
   await onImportar(filasValidas, {
    completarExistentes: modo !== "crear",
    soloFechaHora: modo === "fechahora",
    actualizarNotas: modo === "notas",
   });
  } catch (e) { setErr("Error importando: " + e.message); }
  setCargando(false);
 };

 const modoActual = MODOS_IMPORTACION.find(m => m.id === modo);

 return (
  <ModalForm
   titulo="Importar pedidos desde CSV"
   descripcion={archivo ? "Revisa el resultado de la validacion antes de importar" : "Crea pedidos en lote o completa los existentes"}
   ancho="M"
   onClose={onClose}
   onPrimario={archivo && !validando ? importar : null}
   guardando={cargando}
   primarioDeshabilitado={!archivo || validando || filasValidas.length === 0}
   textoPrimario={archivo ? `Importar ${aImportar > 0 ? aImportar + " pedidos" : "pedidos"}` : "Importar"}
  >
   {!archivo ? (
    <>
     <button onClick={() => fileRef.current && fileRef.current.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); }}
      style={{
       width:"100%", padding:"32px 20px", borderRadius:T.radio.tarjeta,
       border:`1px dashed ${T.color.borde2}`, background:T.color.superficie2,
       cursor:"pointer", fontFamily:"inherit", textAlign:"center",
      }}>
      <span style={{
       width:44, height:44, borderRadius:T.radio.control, margin:"0 auto 12px",
       background:T.color.marcaSuave, color:T.color.marca, display:"grid", placeItems:"center",
      }}><FileText size={20} /></span>
      <span style={{ display:"block", fontSize:14, fontWeight:700, color:T.color.tinta }}>
       Arrastra el archivo CSV o haz clic para seleccionarlo
      </span>
      <span style={{ display:"block", fontSize:12.5, color:T.color.tinta3, marginTop:4 }}>
       Solo archivos .csv · separador coma o punto y coma
      </span>
     </button>
     <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }}
      onChange={e => leerArchivo(e.target.files[0])} />

     <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
      <EnlacePie icono={<Download size={15} />}
       onClick={() => descargarCSV("plantilla_pedidos.csv", CABECERA, EJEMPLO)}>
       Descargar plantilla CSV
      </EnlacePie>
      <EnlacePie icono={<ClipboardList size={15} />} onClick={() => setVerPegar(!verPegar)}>
       Pegar texto directamente
      </EnlacePie>
     </div>

     {verPegar && (
      <>
       <AreaTexto label="Contenido del CSV" filas={5} valor={txt} onChange={setTxt}
        placeholder="Pega aqui el contenido del archivo..." />
       <button style={botonBarra} onClick={() => {
        try {
         const filas = parsear(txt);
         setPrev(filas);
         setArchivo({ nombre:"texto pegado", filas:filas.length, tam:"-", sep:txt.includes(";") ? ";" : "," });
         validar(filas);
        } catch (e) { setErr(e.message); }
       }}>Validar texto</button>
      </>
     )}

     <div style={{ ...tarjeta, overflow:"hidden" }}>
      <button onClick={() => setVerFormato(!verFormato)} style={{
       display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 14px",
       border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit", textAlign:"left",
      }}>
       <FileText size={15} style={{ color:T.color.tinta3 }} />
       <span style={{ fontSize:13.5, fontWeight:700, color:T.color.tinta }}>Formato del archivo</span>
       <span style={{ fontSize:12.5, color:T.color.tinta3 }}>· {COLUMNAS_REQUERIDAS.length} columnas requeridas</span>
       <span style={{ marginLeft:"auto", color:T.color.tinta3, display:"grid", placeItems:"center" }}>
        {verFormato ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
       </span>
      </button>
      {verFormato && (
       <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:12 }}>
        {[["Requeridas", COLUMNAS_REQUERIDAS], ["Alias del plano", COLUMNAS_ALIAS], ["Opcionales", COLUMNAS_OPCIONALES]].map(([titulo, items]) => (
         <div key={titulo} style={{ display:"grid", gridTemplateColumns:"120px 1fr", gap:10, alignItems:"start" }}>
          <span style={{ fontSize:12.5, color:T.color.tinta3, paddingTop:3 }}>{titulo}</span>
          <Chips items={items} />
         </div>
        ))}
        <FranjaInfo>
         <strong>Fecha y hora</strong> (cuando se genero el pedido) son opcionales: si el plano las trae se guardan;
         si no, el pedido se importa igual.
        </FranjaInfo>
       </div>
      )}
     </div>

     <Seccion titulo="Modo de importacion" />
     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
      {MODOS_IMPORTACION.map(m => (
       <button key={m.id} onClick={() => setModo(m.id)} style={{
        display:"flex", gap:10, alignItems:"flex-start", textAlign:"left",
        padding:"12px 14px", borderRadius:T.radio.control, cursor:"pointer", fontFamily:"inherit",
        border:`1px solid ${modo === m.id ? T.color.marca : T.color.borde2}`,
        background: modo === m.id ? T.color.marcaSuave : T.color.superficie,
       }}>
        <span style={{
         width:16, height:16, borderRadius:8, marginTop:1, flexShrink:0,
         border:`2px solid ${modo === m.id ? T.color.marca : T.color.borde2}`,
         display:"grid", placeItems:"center",
        }}>
         {modo === m.id && <span style={{ width:7, height:7, borderRadius:4, background:T.color.marca }} />}
        </span>
        <span style={{ minWidth:0 }}>
         <span style={{ display:"block", fontSize:13, fontWeight:600, color:T.color.tinta }}>{m.titulo}</span>
         <span style={{ display:"block", fontSize:12, color:T.color.tinta3, marginTop:3, lineHeight:1.45 }}>{m.detalle}</span>
        </span>
       </button>
      ))}
     </div>
    </>
   ) : (
    <>
     <div style={{ ...tarjeta, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
      <span style={{
       width:34, height:34, borderRadius:T.radio.chico, flexShrink:0,
       background:T.color.bienSuave, color:T.color.bien, display:"grid", placeItems:"center",
      }}><FileText size={16} /></span>
      <span style={{ flex:1, minWidth:0 }}>
       <span style={{ display:"block", fontSize:13.5, fontWeight:700, color:T.color.tinta }}>{archivo.nombre}</span>
       <span style={{ display:"block", fontSize:12, color:T.color.tinta3 }}>
        {archivo.filas} filas · {archivo.tam} · separador {archivo.sep}
       </span>
      </span>
      <EnlacePie onClick={() => { setArchivo(null); setValidacion(null); setPrev([]); setErr(""); }}>
       Cambiar archivo
      </EnlacePie>
     </div>

     {validando ? (
      <div style={{ padding:24, textAlign:"center", color:T.color.tinta3, fontSize:13.5 }}>
       Validando el archivo...
      </div>
     ) : validacion && (
      <>
       <div style={{ ...tarjeta, display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
        {[
         { label:"Filas leidas", valor:validacion.total, color:T.color.neutroPunto },
         { label:"Pedidos existentes", valor:validacion.existentes, color:T.color.marca, destacado:true },
         { label: modo === "crear" ? "Nuevos" : "Nuevos (se omiten)", valor:validacion.nuevos, color:T.color.tinta3 },
         { label:"Con errores", valor:validacion.errores.length, color:T.color.malPunto, malo:true },
        ].map((k, i) => (
         <div key={k.label} style={{ padding:"14px 16px", borderLeft: i === 0 ? "none" : `1px solid ${T.color.borde}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
           <span style={{ width:6, height:6, borderRadius:3, background:k.color, flexShrink:0 }} />
           <span style={{ fontSize:12, color:T.color.tinta3, whiteSpace:"nowrap" }}>{k.label}</span>
          </div>
          <div style={{
           ...T.texto.cifra, fontSize:24,
           color: k.malo && k.valor > 0 ? T.color.mal : k.destacado ? T.color.marca : T.color.tinta,
          }}>{k.valor}</div>
         </div>
        ))}
       </div>

       {validacion.errores.length > 0 && (
        <div style={{ border:`1px solid ${T.color.malBorde}`, borderRadius:T.radio.tarjeta, overflow:"hidden" }}>
         <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
          background:T.color.malSuave, color:T.color.mal, fontSize:13, fontWeight:700,
         }}>
          <AlertTriangle size={15} />
          {validacion.errores.length} fila(s) con errores no se importaran
          <span style={{ marginLeft:"auto" }}>
           <EnlacePie onClick={descargarErrores}>Descargar detalle</EnlacePie>
          </span>
         </div>
         <div style={{ maxHeight:200, overflowY:"auto" }}>
          {validacion.errores.slice(0, 50).map((e, i) => (
           <div key={i} style={{
            display:"grid", gridTemplateColumns:"70px 130px 1fr", gap:10,
            padding:"9px 14px", borderTop:`1px solid ${T.color.divisor}`, fontSize:12.5,
           }}>
            <span style={{ color:T.color.tinta3 }}>Fila {e.fila}</span>
            <span style={{ fontFamily:T.fuente.mono, color:T.color.tinta2 }}>{e.campo}</span>
            <span style={{ color:T.color.mal }}>{e.mensaje}</span>
           </div>
          ))}
         </div>
        </div>
       )}

       <FranjaInfo>
        <strong>Modo:</strong> {modoActual.titulo}. {modoActual.detalle}
        <span style={{ marginLeft:8 }}>
         <EnlacePie onClick={() => setArchivo(null)}>Cambiar</EnlacePie>
        </span>
       </FranjaInfo>
      </>
     )}
    </>
   )}

   {err && (
    <div style={{
     background:T.color.malSuave, border:`1px solid ${T.color.malBorde}`,
     color:T.color.mal, borderRadius:T.radio.control, padding:"10px 12px", fontSize:13,
    }}>{err}</div>
   )}
   {aviso && <FranjaInfo>{aviso}</FranjaInfo>}
  </ModalForm>
 );
}


function Pedidos({ pedidos, setPedidos, conductores, ciudades, showToast, paqueterias, transportistas, promesas = [], busquedaInicial = "", estadoInicial = "", recargar, user }) {
 const [filtro, setFiltro] = useState(estadoInicial || "todos");
 // Al llegar desde la barra del dashboard, se filtra por el estado que se toco.
 useEffect(() => { if (estadoInicial) setFiltro(estadoInicial); }, [estadoInicial]);
 const [busq, setBusq] = useState(busquedaInicial || "");
 // Cuando el dashboard manda una consulta, se aplica aunque el modulo ya estuviera montado.
 useEffect(() => { if (busquedaInicial) setBusq(busquedaInicial); }, [busquedaInicial]);
 const [modNuevo, setModNuevo] = useState(false);
 const [modDet, setModDet] = useState(null);
 const [modGuia, setModGuia] = useState(null);
 const [modCSV, setModCSV] = useState(false);
 const [modGuias, setModGuias] = useState(false);
 const [reporteImportacion, setReporteImportacion] = useState(null);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(100);
 const [rango, setRango] = useState("todo");
 const [ciudadF, setCiudadF] = useState("");
 const [conductorF, setConductorF] = useState("");
 // Transporte propio o paqueteria. Es filtro propio y no una pestana mas:
 // se cruza con el estado en vez de reemplazarlo.
 const [tipoF, setTipoF] = useState("");
 const esMovil = useEsMovil();
 // Pedidos marcados con la casilla. Sirven para imprimir una planilla parcial:
 // sin seleccion, la planilla sale con todo lo que este filtrado.
 const [seleccion, setSeleccion] = useState(() => new Set());

 const vacio = { id: "", cliente: "", ciudad_codigo: "", direccion: "", cajas: "", factura: "", fecha_estimada: "", notas: "", conductor_id: "", tipo: "propio", paqueteria: "", guia_paqueteria: "" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p => ({ ...p, [k]: v }));
 const conductoresActivos = conductores.filter(c => c.activo !== false);

 const desdeRango = (() => {
  const r = RANGOS_PEDIDOS.find(x => x.id === rango);
  if (!r || !r.dias) return null;
  const d = new Date();
  d.setDate(d.getDate() - r.dias);
  return d.toISOString().split("T")[0];
 })();

 const filtrados = pedidos.filter(p => {
  const okF = filtro === "todos" || p.estado === filtro || (filtro === "paqueteria_tipo" && p.tipo === "paqueteria");
  const okFecha = !desdeRango || (p.fecha_creacion || p.created_at || "").slice(0, 10) >= desdeRango;
  const okCiudad = !ciudadF || p.ciudad_codigo === ciudadF;
  const okCond = !conductorF
   || (conductorF === "sin" ? !p.conductor_id : String(p.conductor_id) === conductorF);
  const okTipo = !tipoF
   || (tipoF === "paqueteria" ? p.tipo === "paqueteria" : p.tipo !== "paqueteria");
  if (!okFecha || !okCiudad || !okCond || !okTipo) return false;
  const q = busq.toLowerCase();
  const okB = !busq ||
   (p.id || "").toLowerCase().includes(q) ||
   (p.guia_interna || "").toLowerCase().includes(q) ||
   (p.cliente || "").toLowerCase().includes(q) ||
   (p.factura || "").toLowerCase().includes(q) ||
   (p.ciudad_nombre || "").toLowerCase().includes(q) ||
   (p.guia_paqueteria || "").toLowerCase().includes(q) ||
   (p.placa || "").toLowerCase().includes(q);
  return okF && okB;
 });
 const totalCajas = filtrados.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0);
 const pageItems = filtrados.slice((page - 1) * pageSize, page * pageSize);
 const pageStart = filtrados.length === 0 ? 0 : (page - 1) * pageSize + 1;
 const pageEnd = Math.min(filtrados.length, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, filtro, pageSize]);

 const guardar = async () => {
  if (!form.id.trim() || !form.cliente.trim() || !form.ciudad_codigo || !form.factura.trim()) {
   showToast("No. Pedido, Factura, Cliente y Ciudad son obligatorios", "error"); return;
  }
  if (pedidos.find(p => p.id === form.id.trim())) {
   showToast("Ya existe un pedido con ese numero", "error"); return;
  }
  const ciudad = (ciudades || []).find(c => c.code === form.ciudad_codigo);
  const ciudadOrigen = (ciudades || []).find(c => c.code === form.ciudad_origen_codigo);
  const cond = conductoresActivos.find(c => String(c.id) === String(form.conductor_id));
  const esPaq = form.tipo === "paqueteria";
  const guia_interna = !esPaq ? generarGuia(pedidos) : null;
  const nuevo = {
   id: form.id.trim(), guia_interna,
   cliente: form.cliente.trim(),
   ciudad_codigo: form.ciudad_codigo, ciudad_nombre: ciudad?.name || "",
   direccion: form.direccion.trim(), cajas: parseInt(form.cajas) || 0,
   factura: form.factura.trim(), fecha_estimada: form.fecha_estimada || null,
   notas: form.notas.trim(), tipo: form.tipo,
   empresa_transporte: form.tipo === "empresa_transporte" ? form.empresa_transporte : null,
   paqueteria: esPaq ? form.paqueteria : null,
   guia_paqueteria: esPaq ? form.guia_paqueteria.trim() : null,
   conductor_id: cond ? cond.id : null,
   placa: cond ? cond.placa : null,
   nit_proveedor: cond ? cond.nit_proveedor : null,
   estado: esPaq ? "paqueteria" : (cond ? "en_transito" : "sin_asignar"),
   fecha_despacho: cond ? new Date().toISOString().split("T")[0] : null,
   estado_despacho: form.estado_despacho || "despachado",
   ciudad_origen_codigo: form.ciudad_origen_codigo || null,
   ciudad_origen_nombre: ciudadOrigen?.name || null,
   direccion_origen: form.direccion_origen || null,
   novedad: false,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, soportes: [], soportes_data: [],
  };
  if (supabase) {
   const { error } = await supabase.from("pedidos").insert(nuevo);
   if (error) { showToast(mensajeError(error, "el pedido"), "error"); return; }
   if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  } else {
   setPedidos(prev => [nuevo, ...prev]);
  }
  setModNuevo(false);
  setForm(vacio);
  showToast(`Pedido ${form.id} creado. Guia: ${guia_interna || "N/A"}`, "success");
 };

 const imprimirPlanilla = () => {
  // Con casillas marcadas se imprime solo eso; sin ellas, todo lo filtrado.
  const paraPlanilla = seleccion.size > 0 ? filtrados.filter(x => seleccion.has(x.id)) : filtrados;
  const win = window.open('', '_blank');
  if (!win) { showToast("Permite ventanas emergentes para imprimir", "error"); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Planilla Somos PRO Tracking</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#111827;margin-bottom:4px}p{color:#64748b;margin:0 0 20px}
  table{width:100%;border-collapse:collapse}th{background:#f8fafc;color:#374151;padding:10px 12px;text-align:left;font-size:12px;border-bottom:1px solid #e5e7eb}
  td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.footer{margin-top:30px;font-size:10px;color:#94a3b8;text-align:center}</style></head>
  <body><h1>Planilla de Despachos Somos PRO Tracking</h1>
  <p>Fecha de impresion: ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })} Total pedidos: ${paraPlanilla.length}</p>
  <table><thead><tr><th>#</th><th>No. Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad / DANE</th><th>Direccion</th><th>Cajas</th><th>Estado</th><th>Conductor / Paqueteria</th><th>Firma Recibido</th></tr></thead>
  <tbody>${paraPlanilla.map((p, i) => {
   const cond = conductores.find(c => c.id === p.conductor_id);
   const tr = transportePedido(p, cond);
   const trans = tr.principal ? `${tr.principal} ${tr.detalle || ""}`.trim() : "Sin asignar";
   return `<tr><td>${i+1}</td><td><strong>${p.guia_interna || p.id}</strong></td><td>${p.factura || ""}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}<br/><small>${p.ciudad_codigo}</small></td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${trans}</td><td></td></tr>`;
  }).join("")}</tbody></table>
  <div class="footer">Somos PRO Tracking Documento generado automaticamente</div></body></html>`);
 win.print();
};

 const limpiarFilaPedidoCSV = (row) => {
  const { _csvOriginal, _csvHeaders, ...pedido } = row;
  return pedido;
 };

 const descargarErroresImportacion = () => {
  if (!reporteImportacion?.errores?.length) return;
  const headersBase = reporteImportacion.headers || [];
  const headersExtra = reporteImportacion.errores.flatMap(e => Object.keys(e.original || {}));
  const headers = [...new Set([...headersBase, ...headersExtra])].filter(h => h && h !== "error");
  const escapeCsv = (value) => {
   const text = String(value ?? "");
   return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lineas = [
   [...headers, "error"].map(escapeCsv).join(","),
   ...reporteImportacion.errores.map(e => [
    ...headers.map(h => escapeCsv(e.original?.[h] ?? "")),
    escapeCsv(e.error),
   ].join(",")),
  ];
  const blob = new Blob([lineas.join("\n")], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `errores_importacion_pedidos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
 };

 const handleImportarCSV = async (rows, { completarExistentes = false, soloFechaHora = false, actualizarNotas = false } = {}) => {
  const csvHeaders = rows[0]?._csvHeaders || [];
  const erroresImportacion = [];
  const registrarError = (row, id, error) => {
   erroresImportacion.push({
    id,
    error,
    original: row?._csvOriginal || limpiarFilaPedidoCSV(row || {}),
   });
  };
  const ids = rows.map(r => String(r.id || "").trim()).filter(Boolean);
  const duplicadosCsv = ids.filter((id, index) => ids.indexOf(id) !== index);
  const duplicadosUnicos = [...new Set(duplicadosCsv)];

  const existentes = [];
  const existentesPorId = new Map();
  for (let i = 0; i < ids.length; i += 100) {
   const chunk = ids.slice(i, i + 100);
   const { data, error } = await supabase
    .from("pedidos")
    .select(completarExistentes ? "id,estado,tipo,ciudad_codigo,ciudad_nombre,direccion,cajas,factura,fecha_pedido,hora_pedido,notas" : "id")
    .in("id", chunk);
   if (error) {
    const msg = `No se pudo validar si los pedidos ya existen: ${error.message}`;
    showToast(msg, "error");
    throw new Error(msg);
   }
   (data || []).forEach(p => { existentes.push(p.id); existentesPorId.set(String(p.id), p); });
  }

  const idsProcesadosCsv = new Set();
  const existentesSet = new Set(existentes.map(String));
  const duplicadosSet = new Set(duplicadosUnicos.map(String));
  const paraCompletar = [];

  const baseGuias = [...pedidos];
  const conGuias = rows.map((r) => {
   const pedidoId = String(r.id || "").trim();
   if (!pedidoId) {
    registrarError(r, "Sin ID", "El pedido no tiene numero de pedido.");
    return null;
   }
   if (idsProcesadosCsv.has(pedidoId)) {
    registrarError(r, pedidoId, "Esta repetido dentro del CSV.");
    return null;
   }
   idsProcesadosCsv.add(pedidoId);
   if (duplicadosSet.has(pedidoId)) {
    registrarError(r, pedidoId, "Tiene mas de una fila en el CSV; se omitio para evitar inconsistencias.");
    return null;
   }
   if (existentesSet.has(pedidoId)) {
    if (completarExistentes) paraCompletar.push({ r, actual: existentesPorId.get(pedidoId) });
    else registrarError(r, pedidoId, "Ya existe en la base de datos. Marca \"Completar datos de pedidos existentes\" para rellenar sus campos vacios.");
    return null;
   }
   // Modos acotados: el plano no puede crear pedidos.
   if (soloFechaHora || actualizarNotas) {
    registrarError(r, pedidoId, actualizarNotas
     ? "No existe en la base de datos y la carga es solo de notas: no se creo nada."
     : "No existe en la base de datos y la carga es solo de fecha y hora: no se creo nada.");
    return null;
   }
   const guiaInterna = r.tipo !== "paqueteria" ? generarGuia(baseGuias) : null;
   const pedidoConGuia = {
    ...limpiarFilaPedidoCSV(r),
    guia_interna: guiaInterna,
    estado_despacho: r.estado_despacho || "despachado",
    novedad: false,
    soportes_data: [],
   };
   baseGuias.push(pedidoConGuia);
   return pedidoConGuia;
  }).filter(Boolean);

  let insertados = 0;
  const pedidosInsertados = [];
  for (const p of conGuias) {
   const { error } = await supabase.from("pedidos").insert(p);
   if (error) {
    const rowOriginal = rows.find(r => String(r.id || "").trim() === String(p.id));
    registrarError(rowOriginal || p, p.id, error.message);
   } else {
    insertados += 1;
    pedidosInsertados.push(p);
   }
  }

  // Completar pedidos existentes: solo llena campos vacios. Nunca sobrescribe un
  // dato ya cargado ni toca estado, conductor, guia o soportes.
  let completados = 0;
  let sinCambios = 0;
  const vacio = (v) => v === null || v === undefined || String(v).trim() === "";
  for (const { r, actual } of paraCompletar) {
   const cambios = {};
   if (actualizarNotas) {
    // Reparacion: aqui SI se reemplaza el texto existente, porque lo que hay quedo
    // cortado por el parser viejo. Es el unico campo que se toca.
    if (!vacio(r.notas) && String(r.notas) !== String(actual.notas ?? "")) cambios.notas = r.notas;
   } else {
    // En modo estricto se escriben unicamente las dos columnas del plano.
    if (!soloFechaHora) {
     if (vacio(actual.ciudad_codigo) && !vacio(r.ciudad_codigo)) cambios.ciudad_codigo = r.ciudad_codigo;
     if (vacio(actual.ciudad_nombre) && !vacio(r.ciudad_nombre)) cambios.ciudad_nombre = r.ciudad_nombre;
     if (vacio(actual.direccion) && !vacio(r.direccion)) cambios.direccion = r.direccion;
     if (!(Number(actual.cajas) > 0) && Number(r.cajas) > 0) cambios.cajas = Number(r.cajas);
     if (vacio(actual.factura) && !vacio(r.factura)) cambios.factura = r.factura;
    }
    if (vacio(actual.fecha_pedido) && !vacio(r.fecha_pedido)) cambios.fecha_pedido = r.fecha_pedido;
    if (vacio(actual.hora_pedido) && !vacio(r.hora_pedido)) cambios.hora_pedido = r.hora_pedido;
   }
   if (Object.keys(cambios).length === 0) { sinCambios += 1; continue; }
   const { error } = await supabase.from("pedidos").update(cambios).eq("id", actual.id).select("id").single();
   if (error) registrarError(r, actual.id, mensajeError(error, "la actualizacion del pedido"));
   else completados += 1;
  }

  setModCSV(false);
  const resumen = actualizarNotas
   ? `${completados} nota(s) actualizadas, ${sinCambios} sin cambios`
   : soloFechaHora
   ? `${completados} pedido(s) con fecha y hora, ${sinCambios} sin cambios`
   : `${insertados} pedido(s) creados` + (completarExistentes ? `, ${completados} completados, ${sinCambios} sin cambios` : "");
  if (erroresImportacion.length > 0) {
   setReporteImportacion({ insertados, completados, sinCambios, completar: completarExistentes, errores: erroresImportacion, headers: csvHeaders });
   showToast(`${resumen}. ${erroresImportacion.length} con error.`, insertados + completados > 0 ? "info" : "error");
  } else {
   setReporteImportacion(null);
   showToast(resumen, "success");
  }
  if ((insertados > 0 || completados > 0) && recargar) await recargar();
 };

 const pageBg = "#fafafa";
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };

 const conteoPorEstado = (clave) => clave === "todos"
  ? pedidos.length
  : pedidos.filter(x => x.estado === clave).length;

 const alternarSeleccion = (id) => setSeleccion(prev => {
  const s = new Set(prev);
  if (s.has(id)) s.delete(id); else s.add(id);
  return s;
 });
 const todosVisiblesMarcados = pageItems.length > 0 && pageItems.every(x => seleccion.has(x.id));
 const alternarPagina = () => setSeleccion(prev => {
  const s = new Set(prev);
  if (todosVisiblesMarcados) pageItems.forEach(x => s.delete(x.id));
  else pageItems.forEach(x => s.add(x.id));
  return s;
 });

 const th2 = { ...T.texto.seccion, color: T.color.tinta3, textAlign: "left", padding: "12px 16px", whiteSpace: "nowrap", fontSize: 10.5 };
 const td2 = { padding: "13px 16px", fontSize: 13.5, color: T.color.tinta2, verticalAlign: "middle" };
 const botonBarra = {
  display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px",
  border: `1px solid ${T.color.borde2}`, borderRadius: T.radio.control,
  background: T.color.superficie, cursor: "pointer", fontFamily: "inherit",
  fontSize: 13.5, fontWeight: 600, color: T.color.tinta, whiteSpace: "nowrap",
 };

 return (
  <div style={esMovil
   ? { color:T.color.tinta }
   : { minHeight:"100%", background:T.color.fondo, margin:"-28px -24px", padding:"24px 28px 40px", color:T.color.tinta }}>

   {esMovil ? (
    <PedidosMovil
     pedidos={pedidos}
     filtrados={filtrados}
     conductores={conductores}
     ciudades={ciudades}
     conductoresActivos={conductoresActivos}
     busq={busq} setBusq={setBusq}
     filtro={filtro} setFiltro={setFiltro}
     conteoPorEstado={conteoPorEstado}
     estadosOrden={ORDEN_ESTADOS_PEDIDO}
     rango={rango} setRango={setRango}
     ciudadF={ciudadF} setCiudadF={setCiudadF}
     conductorF={conductorF} setConductorF={setConductorF}
     tipoF={tipoF} setTipoF={setTipoF}
     onAbrir={setModDet}
     onNuevo={() => setModNuevo(true)}
     onPlanilla={imprimirPlanilla}
     onCSV={() => setModCSV(true)}
     onCargarGuias={() => setModGuias(true)}
     avisos={pedidos.filter(x => x.novedad).length}
    />
   ) : (
   <div style={{ maxWidth:1320, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>

    <header style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap" }}>
     <div>
      <h1 style={{ margin:0, ...T.texto.titulo }}>Pedidos</h1>
      <p style={{ margin:"4px 0 0", color:T.color.tinta3, fontSize:13.5 }}>Gestion y seguimiento de todos los pedidos</p>
     </div>
     <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      <button style={botonBarra} onClick={imprimirPlanilla}>
       <ClipboardList size={15} style={{ color:T.color.tinta3 }} />
       Planilla{seleccion.size > 0 ? ` (${seleccion.size})` : ""}
      </button>
      <button style={botonBarra} onClick={() => setModCSV(true)}>
       <Download size={15} style={{ color:T.color.tinta3 }} /> CSV pedidos
      </button>
      <button style={botonBarra} onClick={() => setModGuias(true)}>
       <Upload size={15} style={{ color:T.color.tinta3 }} /> Cargar guias paqueteria
      </button>
      <button onClick={() => setModNuevo(true)} style={{
       ...botonBarra, background:T.color.marca, border:"none", color:"#fff", fontWeight:700,
      }}><Plus size={16} /> Nuevo pedido</button>
     </div>
    </header>

    {/* Pestanas por estado: el conteo es sobre todos los pedidos, no sobre lo filtrado,
        para que sirvan de panorama y no cambien de numero al escribir en la busqueda. */}
    <div style={{ display:"flex", gap:4, flexWrap:"wrap", borderBottom:`1px solid ${T.color.borde}` }}>
     {[["todos","Todos"], ...ORDEN_ESTADOS_PEDIDO.map(k => [k, ESTADOS_PEDIDO[k]?.label || k])].map(([clave,label]) => {
      const activo = filtro === clave;
      const n = conteoPorEstado(clave);
      return (
       <button key={clave} onClick={() => { setFiltro(clave); setPage(1); }} style={{
        display:"inline-flex", alignItems:"center", gap:8, padding:"10px 12px",
        border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
        fontSize:13.5, fontWeight: activo ? 700 : 500,
        color: activo ? T.color.marca : T.color.tinta2,
        borderBottom: `2px solid ${activo ? T.color.marca : "transparent"}`,
        marginBottom:-1,
       }}>
        {label}
        <span style={{
         fontSize:11.5, fontWeight:700, padding:"1px 7px", borderRadius:T.radio.pastilla,
         background: activo ? T.color.marcaSuave : T.color.superficie2,
         color: activo ? T.color.marca : T.color.tinta3,
        }}>{n}</span>
       </button>
      );
     })}
    </div>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", padding:14, borderBottom:`1px solid ${T.color.borde}` }}>
      <div style={{ position:"relative", flex:"1 1 260px", minWidth:220 }}>
       <Search size={15} style={{ position:"absolute", left:12, top:11, color:T.color.tinta3 }} />
       <input value={busq} onChange={e => { setBusq(e.target.value); setPage(1); }}
        placeholder="Buscar por N pedido, factura, cliente o ciudad"
        style={{
         width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 34px",
         border:`1px solid ${T.color.borde2}`, borderRadius:T.radio.control,
         fontSize:13, fontFamily:"inherit", color:T.color.tinta, outline:"none",
        }}/>
      </div>

      <select value={rango} onChange={e => { setRango(e.target.value); setPage(1); }} style={selectFiltro}>
       {RANGOS_PEDIDOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>

      <select value={ciudadF} onChange={e => { setCiudadF(e.target.value); setPage(1); }} style={selectFiltro}>
       <option value="">Todas las ciudades</option>
       {[...new Set(pedidos.map(x => x.ciudad_codigo).filter(Boolean))]
        .map(code => [code, (ciudades || []).find(c => c.code === code)?.name || code])
        .sort((a,b) => a[1].localeCompare(b[1], "es"))
        .map(([code,nombre]) => <option key={code} value={code}>{nombre}</option>)}
      </select>

      <select value={conductorF} onChange={e => { setConductorF(e.target.value); setPage(1); }} style={selectFiltro}>
       <option value="">Todos los conductores</option>
       <option value="sin">Sin asignar</option>
       {conductoresActivos.slice().sort((a,b) => (a.nombre||"").localeCompare(b.nombre||"", "es"))
        .map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
      </select>

      <div style={{ marginLeft:"auto", fontSize:12.5, color:T.color.tinta3, whiteSpace:"nowrap" }}>
       {seleccion.size > 0 ? `${seleccion.size} seleccionados` : `${pageItems.length} en esta pagina`}
      </div>
     </div>

     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
         <th style={{ ...th2, width:42 }}>
          <input type="checkbox" checked={todosVisiblesMarcados} onChange={alternarPagina}
           title="Seleccionar los de esta pagina" style={{ cursor:"pointer" }}/>
         </th>
         <th style={th2}>N pedido</th>
         <th style={th2}>Factura</th>
         <th style={th2}>Cliente</th>
         <th style={th2}>Ciudad / DANE</th>
         <th style={{ ...th2, textAlign:"right" }}>Cajas</th>
         <th style={th2}>Estado</th>
         <th style={th2}>Conductor</th>
         <th style={{ ...th2, textAlign:"right" }}>Acciones</th>
        </tr>
       </thead>
       <tbody>
        {filtrados.length === 0 && (
         <tr><td colSpan={9} style={{ ...td2, padding:42, textAlign:"center", color:T.color.tinta3 }}>
          Ningun pedido coincide con los filtros.
         </td></tr>
        )}
        {pageItems.map(p => {
         const cond = conductores.find(c => String(c.id) === String(p.conductor_id));
         const tr = transportePedido(p, cond);
         const marcado = seleccion.has(p.id);
         return (
          <tr key={p.id} style={{ borderBottom:`1px solid ${T.color.borde}`, background: marcado ? T.color.marcaSuave : "transparent" }}>
           <td style={td2}>
            <input type="checkbox" checked={marcado} onChange={() => alternarSeleccion(p.id)} style={{ cursor:"pointer" }}/>
           </td>
           <td style={td2}>
            <button onClick={() => setModDet(p)} style={{
             border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
             padding:0, textAlign:"left", color:T.color.marca, fontWeight:700, fontSize:13.5,
            }}>{p.guia_interna || p.id}</button>
            {p.guia_interna && p.guia_interna !== p.id && (
             <div style={{ color:T.color.tinta3, fontSize:12, fontFamily:"ui-monospace, Menlo, monospace" }}>{p.id}</div>
            )}
           </td>
           <td style={{ ...td2, fontFamily:"ui-monospace, Menlo, monospace", fontSize:12.5 }}>
            {p.factura || <span style={{ color:T.color.tinta3 }}>-</span>}
           </td>
           <td style={{ ...td2, maxWidth:210, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.cliente}</td>
           <td style={td2}>
            {p.ciudad_nombre
             ? <><div>{p.ciudad_nombre}</div><div style={{ color:T.color.tinta3, fontSize:12, fontFamily:"ui-monospace, Menlo, monospace" }}>{p.ciudad_codigo}</div></>
             : <span style={{ color:T.color.tinta3 }}>-</span>}
           </td>
           <td style={{ ...td2, textAlign:"right", fontWeight:700, color:T.color.tinta }}>{p.cajas || 0}</td>
           <td style={td2}>
            <span style={{
             display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
             borderRadius:T.radio.pastilla, background:T.color.superficie2,
             fontSize:12, fontWeight:600, color:T.color.tinta2, whiteSpace:"nowrap",
            }}>
             <span style={{ width:7, height:7, borderRadius:4, background:T.estado[p.estado] || T.color.tinta3 }} />
             {ESTADOS_PEDIDO[p.estado]?.label || p.estado}
            </span>
           </td>
           <td style={td2}>
            {tr.noAplica ? <span style={{ color:T.color.tinta3 }}>No aplica</span>
             : !tr.principal ? (
              <button onClick={() => setModDet(p)} style={{
               border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
               padding:0, color:T.color.ojo, fontWeight:600, fontSize:13.5,
              }}>Asignar</button>
             ) : (
              <><div>{tr.principal}</div>
               {tr.detalle && <div style={{ color:T.color.tinta3, fontSize:12, fontFamily:"ui-monospace, Menlo, monospace" }}>{tr.detalle}</div>}</>
             )}
           </td>
           <td style={{ ...td2, textAlign:"right" }}>
            <div style={{ display:"inline-flex", gap:6 }}>
             <button onClick={() => setModDet(p)} style={{ ...botonBarra, padding:"6px 12px", fontSize:13 }}>Ver</button>
             <button onClick={() => setModGuia(p)} style={{ ...botonBarra, padding:"6px 12px", fontSize:13 }}>Guia</button>
            </div>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>

     <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"12px 16px", borderTop:`1px solid ${T.color.borde}` }}>
      <span style={{ fontSize:12.5, color:T.color.tinta3 }}>
       Mostrando {pageStart}-{pageEnd} de {filtrados.length} pedidos · {totalCajas} cajas
      </span>
      <Paginador total={filtrados.length} page={page} setPage={setPage} pageSize={pageSize} />
     </div>
    </section>
   </div>
   )}

   {modNuevo && (
    <ModalForm
     titulo="Nuevo pedido"
     descripcion="Registra un pedido y su destino de entrega"
     ancho="M"
     onClose={() => setModNuevo(false)}
     onPrimario={guardar}
     textoPrimario="Crear pedido"
    >
     <Seccion titulo="Identificacion" />
     <Fila>
      <Texto label="N de pedido" obligatorio valor={form.id} onChange={f("id")} placeholder="PED-012" mono />
      <Texto label="N de factura" obligatorio valor={form.factura} onChange={f("factura")} placeholder="FAC-3000" mono />
     </Fila>
     <Fila>
      <Texto label="Cantidad de cajas" valor={form.cajas} onChange={f("cajas")} tipo="number" placeholder="10" />
      <Texto label="Fecha estimada de entrega" valor={form.fecha_estimada} onChange={f("fecha_estimada")} tipo="date" />
     </Fila>

     <Seccion titulo="Destino" />
     <Texto label="Cliente / destinatario" obligatorio valor={form.cliente} onChange={f("cliente")} placeholder="Empresa Destino S.A.S" />
     <Fila>
      <Selector label="Ciudad de entrega (DANE)" obligatorio valor={form.ciudad_codigo} onChange={f("ciudad_codigo")}
       placeholder="Seleccione ciudad"
       opciones={(ciudades || []).map(c => ({ value:c.code, label:`${c.name} - ${c.code}` }))} />
      <Texto label="Direccion de entrega" valor={form.direccion} onChange={f("direccion")} placeholder="Cra 15 #93-47 Of 302" />
     </Fila>

     <Seccion titulo="Origen / CEDI de despacho" />
     <Fila>
      <Selector label="Ciudad origen (DANE)" valor={form.ciudad_origen_codigo} onChange={f("ciudad_origen_codigo")}
       placeholder="Sin especificar"
       opciones={(ciudades || []).map(c => ({ value:c.code, label:`${c.name} - ${c.code}` }))} />
      <Texto label="Direccion origen / CEDI" valor={form.direccion_origen} onChange={f("direccion_origen")} placeholder="Bodega principal" />
     </Fila>

     <Seccion titulo="Transporte" />
     <Fila>
      <Selector label="Tipo de envio" valor={form.tipo} onChange={f("tipo")}
       opciones={[
        { value:"propio", label:"Transporte propio" },
        { value:"empresa_transporte", label:"Empresa transportista" },
        { value:"mensajeria", label:"Mensajeria" },
        { value:"paqueteria", label:"Paqueteria tercero" },
       ]} />
      {form.tipo === "paqueteria" ? (
       <Selector label="Paqueteria" valor={form.paqueteria} onChange={f("paqueteria")}
        placeholder="Seleccione"
        opciones={(paqueterias || []).filter(x => typeof x === "string" && x).map(x => ({ value:x, label:x }))} />
      ) : (
       <Selector label="Conductor" opcional valor={form.conductor_id}
        onChange={v => {
         f("conductor_id")(v);
         const c = conductoresActivos.find(cx => String(cx.id) === String(v));
         if (c) setForm(pp => ({ ...pp, placa:c.placa || "", nit_proveedor:c.nit_proveedor || "" }));
        }}
        placeholder="Sin asignar"
        opciones={conductoresActivos.map(c => ({ value:c.id, label:`${c.nombre} - ${c.placa || ""}` }))} />
      )}
     </Fila>
     {form.tipo === "paqueteria" && (
      <Texto label="No. guia de paqueteria" valor={form.guia_paqueteria} onChange={f("guia_paqueteria")} placeholder="SRV-2026-0001" mono />
     )}

     <AreaTexto label="Notas / observaciones" opcional valor={form.notas} onChange={f("notas")} placeholder="Instrucciones especiales..." />
    </ModalForm>
   )}

   {modDet && <ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={transportistas} paqueterias={paqueterias} promesas={promesas} onClose={() => setModDet(null)} setPedidos={setPedidos} showToast={showToast} canEdit={user?.rol !== "operador"} canBasicEdit={user?.rol === "operador"} canAssign={user?.rol === "operador"} />}
   {modGuia && <GuiaImprimible pedido={modGuia} conductores={conductores} ciudades={ciudades} onClose={() => setModGuia(null)} />}
   {modCSV && <ModalCSVPedidos onClose={() => setModCSV(false)} ciudades={ciudades} onImportar={handleImportarCSV} />}
   {reporteImportacion && (
    <Modal title="Resultado de importacion CSV" onClose={async () => { setReporteImportacion(null); if (recargar) await recargar(); }} wide>
     <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"#fffbeb", border:"1px solid #fde68a", color:"#92400e", borderRadius:12, padding:14, fontSize:14 }}>
       <strong>{reporteImportacion.insertados}</strong> pedido(s) creados.{" "}
       {reporteImportacion.completar && <><strong>{reporteImportacion.completados}</strong> completados, <strong>{reporteImportacion.sinCambios}</strong> sin cambios.{" "}</>}
       <strong>{reporteImportacion.errores.length}</strong> pedido(s) quedaron con error.
      </div>
      <div style={{ maxHeight:280, overflow:"auto", border:"1px solid #e5e7eb", borderRadius:12 }}>
       <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
         <tr style={{ background:"#fafafa", color:"#6b7280", textTransform:"uppercase", fontSize:12 }}>
          <th style={{ padding:"12px", textAlign:"left", borderBottom:"1px solid #e5e7eb" }}>No. Pedido</th>
          <th style={{ padding:"12px", textAlign:"left", borderBottom:"1px solid #e5e7eb" }}>Error</th>
         </tr>
        </thead>
        <tbody>
         {reporteImportacion.errores.map((e, i) => (
          <tr key={`${e.id}-${i}`}>
           <td style={{ padding:"12px", borderBottom:"1px solid #e5e7eb", fontWeight:800, color:"#5b33d6" }}>{e.id}</td>
           <td style={{ padding:"12px", borderBottom:"1px solid #e5e7eb", color:"#dc2626" }}>{e.error}</td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
       <Btn variant="secondary" onClick={async () => { setReporteImportacion(null); if (recargar) await recargar(); }}>Cerrar</Btn>
       <Btn onClick={descargarErroresImportacion}>Descargar errores CSV</Btn>
      </div>
     </div>
    </Modal>
   )}
   {modGuias && <ModalCSVGuias onClose={() => setModGuias(false)} pedidos={pedidos} ciudades={ciudades} showToast={showToast} recargar={recargar} />}
  </div>
 );
}
function RastreoGPS({ pedidos, conductores, ciudades }) {
 const conCond = pedidos.filter(p => p.conductor_id);
 const [sel, setSel] = useState(conCond[0] || null);
 const cond = conductores.find(c => String(c.id) === String(sel?.conductor_id));
 const ciudad = (ciudades || []).find(c => c.code === sel?.ciudad_codigo);
 const mapUrl = sel ? `https://maps.google.com/maps?q=${encodeURIComponent((sel.direccion || "") + ", " + (ciudad?.name || "") + ", Colombia")}&output=embed&z=14` : null;
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };

 return (
  <Pagina>
   <Encabezado
    titulo="Rastreo GPS"
    descripcion="Seguimiento geografico de pedidos con conductor asignado"
   />

   <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:16, alignItems:"start" }}>
    <section style={{ ...tarjeta, overflow:"hidden", maxHeight:"72vh", display:"flex", flexDirection:"column" }}>
     <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.color.borde}` }}>
      <div style={{ ...T.texto.tarjeta }}>En ruta</div>
      <div style={{ ...T.texto.meta, color:T.color.tinta3, marginTop:2 }}>
       {conCond.length} {conCond.length===1 ? "pedido con conductor" : "pedidos con conductor"}
      </div>
     </div>
     <div style={{ overflowY:"auto" }}>
      {conCond.length===0 && (
       <div style={{ padding:40, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
        Ningun pedido tiene conductor asignado.
       </div>
      )}
      {conCond.map(p=>{
       const c = conductores.find(x=>String(x.id)===String(p.conductor_id));
       const activo = sel?.id === p.id;
       return (
        <button key={p.id} onClick={()=>setSel(p)} style={{
         width:"100%", textAlign:"left", border:"none", cursor:"pointer", fontFamily:"inherit",
         padding:"12px 16px", borderBottom:`1px solid ${T.color.divisor}`,
         background: activo ? T.color.marcaSuave : "transparent",
        }}>
         <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:700, color: activo ? T.color.marca : T.color.tinta }}>
           {p.guia_interna || p.id}
          </span>
          <ChipEstado estado={p.estado}/>
         </div>
         <div style={{ ...T.texto.meta, color:T.color.tinta3, marginTop:4 }}>
          {p.cliente} · {p.ciudad_nombre || "sin ciudad"}
         </div>
         <div style={{ ...T.texto.meta, color:T.color.tinta4, marginTop:2 }}>
          {c ? `${c.nombre} · ${c.placa || "sin placa"}` : "conductor no encontrado"}
         </div>
        </button>
       );
      })}
     </div>
    </section>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     {!sel ? (
      <div style={{ padding:60, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
       Selecciona un pedido para ver su destino en el mapa.
      </div>
     ) : (
      <>
       <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.color.borde}`, display:"flex", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div>
         <div style={{ ...T.texto.tarjeta }}>{sel.cliente}</div>
         <div style={{ ...T.texto.meta, color:T.color.tinta3, marginTop:2 }}>
          {sel.direccion || "Sin direccion"}{ciudad ? ` · ${ciudad.name}` : ""}
         </div>
        </div>
        <div style={{ textAlign:"right" }}>
         <div style={{ fontSize:13, fontWeight:600, color:T.color.tinta }}>{cond?.nombre || "Sin conductor"}</div>
         {cond?.placa && <div style={{ ...mono, marginTop:2 }}>{cond.placa}</div>}
        </div>
       </div>
       <iframe title="Mapa del destino" src={mapUrl} style={{ width:"100%", height:"62vh", border:"none", display:"block" }} loading="lazy"/>
      </>
     )}
    </section>
   </div>

  </Pagina>
 );
}

function Transportistas({ transportistas, conductores, pedidos = [], showToast, user, recargar, setActiveTabExterno }) {
 const [modEmpresa, setModEmpresa] = useState(false);
 const [modEditEmp, setModEditEmp] = useState(null);
 const [modCond, setModCond] = useState(null);
 const [modEdit, setModEdit] = useState(null);
 const [modSoportes, setModSoportes] = useState(null);
 const [busqEmp, setBusqEmp] = useState("");
 const [vistaEmp, setVistaEmp] = useState("todas");
 // Empresas con su lista de conductores desplegada.
 const [abiertas, setAbiertas] = useState(() => new Set());
 const [guardando, setGuardando] = useState(false);
 const [formE, setFormE] = useState({ nombre:"", nit:"", contacto:"", tel:"", user_login:"", pass_login:"" });
 const [formC, setFormC] = useState({ nombre:"", cedula:"", placa:"", celular:"", user_login:"", pass_login:"" });
 const [formEdit, setFormEdit] = useState({ nombre:"", cedula:"", placa:"", celular:"", nit_proveedor:"", empresa:"" });
 const fe = k => v => setFormE(p => ({ ...p, [k]: v }));
 const fc = k => v => setFormC(p => ({ ...p, [k]: v }));
 const esMia = user.rol === "transportista";
 const miNit = user.nit || "";
 const conductoresActivos = conductores.filter(c => c.activo !== false);
 const misEmp = esMia ? transportistas.filter(t => t.nit === miNit) : transportistas;
 const misCon = esMia ? conductoresActivos.filter(c => c.nit_proveedor === miNit) : conductoresActivos;
 const misConIds = new Set(misCon.map(c => String(c.id)));
 const pedidosMisConductores = esMia ? pedidos.filter(p => misConIds.has(String(p.conductor_id))) : [];
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };

 const crearEmpresa = async () => {
  if (!formE.nombre.trim() || !formE.nit.trim()) { showToast("Nombre y NIT son obligatorios", "error"); return; }
  if (!formE.user_login.trim() || !formE.pass_login.trim()) { showToast("Usuario y contrasena son obligatorios", "error"); return; }
  setGuardando(true);
  try {
   const { data, error } = await supabase.functions.invoke('create-system-user', { body: { type:'system_user', nombre:formE.nombre.trim(), rol:'transportista', user_login:formE.user_login.trim(), pass_login:formE.pass_login.trim(), nit:formE.nit.trim(), empresa:formE.nombre.trim() } });
   if (error) { showToast(await mensajeErrorFuncion(error, "la empresa transportista"), "error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: " + data.error, "error"); setGuardando(false); return; }
   const { error: tErr } = await supabase.from('transportistas').update({ contacto:formE.contacto.trim(), tel:formE.tel.trim() }).eq('nit', formE.nit.trim());
   if (tErr) { showToast("Empresa creada, pero fallo contacto: " + tErr.message, "warning"); setGuardando(false); return; }
   setModEmpresa(false); setFormE({ nombre:"", nit:"", contacto:"", tel:"", user_login:"", pass_login:"" });
   showToast("Empresa y usuario creados", "success");
   if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  } catch(e) { showToast(mensajeError(e, "la empresa transportista"), "error"); }
  setGuardando(false);
 };

 const guardarEdicionEmpresa = async () => {
  if (!formE.nombre.trim()) { showToast("Nombre es obligatorio", "error"); return; }
  setGuardando(true);
  const { error: tErr } = await supabase.from('transportistas').update({ nombre:formE.nombre.trim(), contacto:formE.contacto.trim(), tel:formE.tel.trim() }).eq('id', modEditEmp.id);
  if (tErr) { showToast(mensajeError(tErr, "la empresa transportista"), "error"); setGuardando(false); return; }
  if (modEditEmp.usuario_id) {
   const { data: usuarioEmp, error: uLoadErr } = await supabase.from('usuarios').select('*').eq('id', modEditEmp.usuario_id).single();
   if (uLoadErr) { showToast(mensajeError(uLoadErr, "el usuario transportista"), "error"); setGuardando(false); return; }
   if (usuarioEmp.auth_user_id || formE.pass_login.trim()) {
    const { data, error } = await supabase.functions.invoke('create-system-user', { body: { type:'update_system_user', user_id:modEditEmp.usuario_id, nombre:formE.nombre.trim(), rol:'transportista', user_login:usuarioEmp.user, pass_login:formE.pass_login.trim(), nit:modEditEmp.nit, empresa:formE.nombre.trim() } });
    if (error) { showToast(await mensajeErrorFuncion(error, "el acceso transportista"), "error"); setGuardando(false); return; }
    if (data?.error) { showToast("Error actualizando acceso: " + data.error, "error"); setGuardando(false); return; }
   }
  }
  setModEditEmp(null); showToast("Empresa actualizada", "success");
  if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  setGuardando(false);
 };

 const abrirEditarEmpresa = (t) => { setFormE({ nombre:t.nombre, nit:t.nit, contacto:t.contacto || "", tel:t.tel || "", user_login:"", pass_login:"" }); setModEditEmp(t); };

 const inscribirConductor = async () => {
  if (!formC.nombre.trim() || !formC.placa.trim() || !formC.cedula.trim()) { showToast("Nombre, cedula y placa son obligatorios", "error"); return; }
  if (!formC.user_login.trim() || !formC.pass_login.trim()) { showToast("Usuario y contrasena son obligatorios", "error"); return; }
  const emp = modCond;
  setGuardando(true);
  try {
   const { data, error } = await supabase.functions.invoke('create-system-user', { body: { type:'conductor', nombre:formC.nombre.trim(), cedula:formC.cedula.trim(), placa:formC.placa.trim(), celular:formC.celular.trim(), user_login:formC.user_login.trim(), pass_login:formC.pass_login.trim(), nit_proveedor:emp.nit, empresa:emp.nombre } });
   if (error) { showToast(await mensajeErrorFuncion(error, "el acceso del conductor"), "error"); setGuardando(false); return; }
   if (data?.error) { showToast("Error creando acceso: " + data.error, "error"); setGuardando(false); return; }
   setModCond(null); setFormC({ nombre:"", cedula:"", placa:"", celular:"", user_login:"", pass_login:"" });
   showToast(`Conductor inscrito en ${emp.nombre}`, "success");
   if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  } catch(e) { showToast(mensajeError(e, "el conductor"), "error"); }
  setGuardando(false);
 };

 const guardarEdicionConductor = async () => {
  if (!formEdit.nombre.trim() || !formEdit.placa.trim()) { showToast("Nombre y placa son obligatorios", "error"); return; }
  setGuardando(true);
  const nitProveedor = esMia ? (modEdit.nit_proveedor || miNit) : formEdit.nit_proveedor.trim();
  const empresaProveedor = esMia ? (modEdit.empresa || user.empresa || user.nombre) : formEdit.empresa.trim();
  const { error: cErr } = await supabase.from('conductores').update({ nombre:formEdit.nombre.trim(), cedula:formEdit.cedula.trim(), placa:formEdit.placa.trim(), celular:formEdit.celular.trim(), nit_proveedor:nitProveedor, empresa:empresaProveedor }).eq('id', modEdit.id);
  if (cErr) { showToast("Error actualizando conductor: " + cErr.message, "error"); setGuardando(false); return; }
  if (modEdit.usuario_id) {
   const { error: uErr } = await supabase.from('usuarios').update({ nombre:formEdit.nombre.trim(), placa:formEdit.placa.trim(), celular:formEdit.celular.trim() }).eq('id', modEdit.usuario_id);
   if (uErr) { showToast("Conductor actualizado, pero fallo usuario: " + uErr.message, "warning"); setGuardando(false); return; }
  }
  setModEdit(null); showToast("Conductor actualizado", "success");
  if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  setGuardando(false);
 };

 const reemplazarSoportesPedido = async (files) => {
  const selected = Array.from(files || []).slice(0, 3);
  if (!modSoportes || selected.length === 0) return;
  setGuardando(true);
  try {
   const soportesData = await Promise.all(selected.map(async (file) => ({
    nombre:file.name,
    data: await fileToBase64(file),
   })));
   const soportes = soportesData.map((s, i) => `soporte_${modSoportes.id}_${i + 1}.jpg`);
   const { error } = await supabase
    .from("pedidos")
    .update({ soportes, soportes_data: soportesData })
    .eq("id", modSoportes.id);
   if (error) { showToast(mensajeError(error, "los soportes del pedido"), "error"); setGuardando(false); return; }
   setModSoportes(null);
   showToast("Soportes reemplazados", "success");
   if (recargar) await recargar(); else if (window._recargar) await window._recargar();
  } catch(e) {
   showToast("Error reemplazando soportes: " + e.message, "error");
  }
  setGuardando(false);
 };

 // Empresas con sus conductores y sus conteos, en orden alfabetico.
 const empresas = useMemo(() => misEmp
  .map(t => {
   const suyos = conductoresActivos.filter(c => c.nit_proveedor === t.nit);
   const enTransito = pedidos.filter(p =>
    p.estado === "en_transito" && suyos.some(c => String(c.id) === String(p.conductor_id))).length;
   return { ...t, conductores: suyos, enTransito };
  })
  .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" })),
  [misEmp, conductoresActivos, pedidos]);

 const empresasFiltradas = useMemo(() => {
  const q = busqEmp.trim().toLowerCase();
  return empresas.filter(e => {
   const okVista = vistaEmp === "todas"
    || (vistaEmp === "con" && e.conductores.length > 0)
    || (vistaEmp === "sin" && e.conductores.length === 0);
   const okBusq = !q ||
    (e.nombre || "").toLowerCase().includes(q) ||
    (e.nit || "").toLowerCase().includes(q) ||
    (e.contacto || "").toLowerCase().includes(q) ||
    e.conductores.some(c =>
     (c.nombre || "").toLowerCase().includes(q) || (c.placa || "").toLowerCase().includes(q));
   return okVista && okBusq;
  });
 }, [empresas, busqEmp, vistaEmp]);

 const alternarFila = (nit) => setAbiertas(prev => {
  const s = new Set(prev);
  if (s.has(nit)) s.delete(nit); else s.add(nit);
  return s;
 });
 const todasAbiertas = empresasFiltradas.length > 0 && empresasFiltradas.every(e => abiertas.has(e.nit));
 const alternarTodas = () => setAbiertas(todasAbiertas ? new Set() : new Set(empresasFiltradas.map(e => e.nit)));

 const exportarEmpresas = () => {
  const esc = (v) => { const x = String(v ?? ""); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
  const filas = empresasFiltradas.flatMap(e => e.conductores.length === 0
   ? [[e.nombre, e.nit, e.contacto, e.tel, "", "", ""].map(esc).join(",")]
   : e.conductores.map(c => [e.nombre, e.nit, e.contacto, e.tel, c.nombre, c.cedula, c.placa].map(esc).join(",")));
  descargarCSV(
   `transportistas_${new Date().toISOString().slice(0, 10)}.csv`,
   "empresa,nit,contacto,telefono,conductor,cedula,placa",
   filas.join("\n"),
  );
  showToast(`${empresasFiltradas.length} empresa(s) exportadas`, "success");
 };

 const modales = (<>

   {modEmpresa && (
    <ModalForm
     titulo="Nueva empresa transportista"
     descripcion="Crea la empresa y su usuario de acceso"
     ancho="M"
     onClose={() => setModEmpresa(false)}
     onPrimario={crearEmpresa}
     guardando={guardando}
     textoPrimario="Crear empresa y usuario"
    >
     <Texto label="Razon social" obligatorio valor={formE.nombre} onChange={fe("nombre")} placeholder="Transportes XYZ S.A.S" />
     <Fila>
      <Texto label="NIT" obligatorio mono valor={formE.nit} onChange={fe("nit")} placeholder="900123456-1" />
      <Texto label="Telefono" valor={formE.tel} onChange={fe("tel")} placeholder="300 123 4567" />
     </Fila>
     <Texto label="Persona de contacto" valor={formE.contacto} onChange={fe("contacto")} placeholder="Carlos Ruiz" />
     <Seccion titulo="Acceso al sistema" />
     <Fila>
      <Texto label="Usuario" obligatorio mono valor={formE.user_login} onChange={fe("user_login")} placeholder="trans.xyz" />
      <Clave label="Contrasena" obligatorio valor={formE.pass_login} onChange={fe("pass_login")} />
     </Fila>
    </ModalForm>
   )}
   {modEditEmp && (
    <ModalForm
     titulo={`Editar ${modEditEmp.nombre}`}
     descripcion="Datos de contacto de la empresa"
     onClose={() => setModEditEmp(null)}
     onPrimario={guardarEdicionEmpresa}
     guardando={guardando}
     textoPrimario="Guardar cambios"
    >
     <Texto label="Razon social" obligatorio valor={formE.nombre} onChange={fe("nombre")} />
     <FranjaInfo>El NIT no se puede cambiar: es la llave con la que se vinculan los conductores.</FranjaInfo>
     <Fila>
      <Texto label="Persona de contacto" valor={formE.contacto} onChange={fe("contacto")} />
      <Texto label="Telefono" valor={formE.tel} onChange={fe("tel")} />
     </Fila>
    </ModalForm>
   )}
   {modCond && (
    <ModalForm
     titulo="Inscribir conductor"
     descripcion="Quedara vinculado a la empresa indicada"
     ancho="M"
     onClose={() => setModCond(null)}
     onPrimario={inscribirConductor}
     guardando={guardando}
     textoPrimario="Inscribir y crear usuario"
    >
     <FranjaInfo icono={<Truck size={15} />}>
      Empresa: <strong>{modCond.nombre}</strong> · NIT {modCond.nit}
     </FranjaInfo>
     <Texto label="Nombre" obligatorio valor={formC.nombre} onChange={fc("nombre")} placeholder="Juan Perez" />
     <Fila>
      <Texto label="Cedula" obligatorio mono valor={formC.cedula} onChange={fc("cedula")} placeholder="1012345678" />
      <Texto label="Celular" valor={formC.celular} onChange={fc("celular")} placeholder="300 123 4567" />
     </Fila>
     <Texto label="Placa" obligatorio mono valor={formC.placa} onChange={fc("placa")} placeholder="XYZ-456" style={{ maxWidth:"50%" }} />
     <Seccion titulo="Acceso del conductor" />
     <Fila>
      <Texto label="Usuario" obligatorio mono valor={formC.user_login} onChange={fc("user_login")} placeholder="juan.perez" />
      <Clave label="Contrasena" obligatorio valor={formC.pass_login} onChange={fc("pass_login")} />
     </Fila>
    </ModalForm>
   )}
   {modEdit && (
    <ModalForm
     titulo={`Editar ${modEdit.nombre}`}
     descripcion="Datos del conductor"
     ancho="M"
     onClose={() => setModEdit(null)}
     onPrimario={guardarEdicionConductor}
     guardando={guardando}
     textoPrimario="Guardar cambios"
    >
     <Texto label="Nombre" obligatorio valor={formEdit.nombre} onChange={v => setFormEdit(pp => ({ ...pp, nombre:v }))} />
     <Fila>
      <Texto label="Cedula" obligatorio mono valor={formEdit.cedula} onChange={v => setFormEdit(pp => ({ ...pp, cedula:v }))} />
      <Texto label="Celular" valor={formEdit.celular} onChange={v => setFormEdit(pp => ({ ...pp, celular:v }))} />
     </Fila>
     <Fila>
      <Texto label="Placa" obligatorio mono valor={formEdit.placa} onChange={v => setFormEdit(pp => ({ ...pp, placa:v }))} />
      {!esMia && (
       <Selector label="Empresa" valor={formEdit.nit_proveedor}
        onChange={v => {
         const emp = (transportistas || []).find(x => x.nit === v);
         setFormEdit(pp => ({ ...pp, nit_proveedor:v, empresa:emp?.nombre || emp?.empresa || "" }));
        }}
        placeholder="Sin asignar"
        opciones={(transportistas || []).filter(x => x?.nit).map(x => ({ value:x.nit, label:x.nombre || x.empresa || x.nit }))} />
      )}
     </Fila>
    </ModalForm>
   )}
   {modSoportes && (
    <Modal title={`Reemplazar soportes ${modSoportes.guia_interna || modSoportes.id}`} onClose={() => setModSoportes(null)}>
     <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", color:"#9a3412", borderRadius:12, padding:12, fontSize:13, fontWeight:700 }}>
       Esta accion reemplaza todos los soportes actuales del pedido. El historico del pedido no cambia.
      </div>
      <div style={{ ...cardStyle, padding:14 }}>
       <div style={{ fontWeight:850, color:"#111827" }}>{modSoportes.cliente}</div>
       <div style={{ color:"#6b7280", fontSize:13, marginTop:4 }}>Factura: {modSoportes.factura} · Estado: {ESTADOS_PEDIDO[modSoportes.estado]?.label || modSoportes.estado}</div>
       <div style={{ color:"#6b7280", fontSize:13, marginTop:4 }}>Soportes actuales: {(modSoportes.soportes || modSoportes.soportes_data || []).length}</div>
      </div>
      <label style={{ border:`1px dashed ${P[300]}`, borderRadius:12, padding:"18px", textAlign:"center", cursor:guardando?"not-allowed":"pointer", color:P[600], fontWeight:800 }}>
       <input type="file" accept="image/*" multiple disabled={guardando} style={{display:"none"}} onChange={e=>reemplazarSoportesPedido(e.target.files)}/>
       {guardando ? "Reemplazando..." : "Seleccionar nuevas fotos (max 3)"}
      </label>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
       <Btn variant="secondary" onClick={() => setModSoportes(null)} disabled={guardando}>Cancelar</Btn>
      </div>
     </div>
    </Modal>
   )}
 </>);

 const abrirInscribir = (t) => {
  setModCond(t);
  setFormC({ nombre:"", cedula:"", placa:"", celular:"", user_login:"", pass_login:"" });
 };

 // ── Vista del propio transportista ────────────────────────────────────────
 if (esMia) {
  const miEmpresa = empresas[0];
  return (
   <Pagina>
    <Encabezado
     titulo="Mi empresa"
     descripcion="Conductores asociados a tu empresa y sus pedidos"
     acciones={
      <button onClick={() => abrirInscribir({ nit: miNit, nombre: user.empresa || user.nombre })} style={botonPrincipal}>
       <Plus size={16} /> Inscribir conductor
      </button>
     }
    />

    <Indicadores items={[
     { label: "Conductores", valor: misCon.length, color: T.color.marca, destacado: true },
     { label: "Pedidos asignados", valor: pedidosMisConductores.length, color: T.color.bien },
     { label: "En transito", valor: pedidosMisConductores.filter(p => p.estado === "en_transito").length, color: T.color.ojo },
     { label: "Entregados", valor: pedidosMisConductores.filter(p => p.estado === "entregado").length },
    ]}/>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.color.borde}` }}>
      <div style={{ fontSize:15, fontWeight:700, color:T.color.tinta }}>{user.empresa || user.nombre}</div>
      <div style={{ ...mono, marginTop:2 }}>NIT {miNit}</div>
     </div>
     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
         <th style={th}>Conductor</th>
         <th style={th}>Placa</th>
         <th style={th}>Cedula</th>
         <th style={th}>Telefono</th>
         <th style={{ ...th, textAlign:"right" }}>Acciones</th>
        </tr>
       </thead>
       <tbody>
        {misCon.length === 0 && (
         <tr><td colSpan={5} style={{ ...td, textAlign:"center", padding:36, color:T.color.tinta3 }}>
          Aun no tienes conductores inscritos.
         </td></tr>
        )}
        {misCon.map(c => (
         <tr key={c.id} style={{ borderBottom:`1px solid ${T.color.borde}` }}>
          <td style={{ ...td, fontWeight:700, color:T.color.tinta }}>{c.nombre}</td>
          <td style={td}><span style={{ ...mono, background:T.color.superficie2, padding:"3px 9px", borderRadius:T.radio.chico }}>{c.placa}</span></td>
          <td style={td}>{c.cedula || "-"}</td>
          <td style={td}>{c.celular || "-"}</td>
          <td style={{ ...td, textAlign:"right" }}>
           <button style={{ ...botonBarra, padding:"6px 12px", fontSize:13 }}
            onClick={() => { setFormEdit({ nombre:c.nombre, cedula:c.cedula || "", placa:c.placa || "", celular:c.celular || "", nit_proveedor:c.nit_proveedor || "", empresa:c.empresa || "" }); setModEdit(c); }}>
            Editar
           </button>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </section>

    <section style={{ ...tarjeta, overflow:"hidden" }}>
     <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.color.borde}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
      <div>
       <div style={{ fontSize:15, fontWeight:700, color:T.color.tinta }}>Pedidos de mis conductores</div>
       <div style={{ fontSize:12.5, color:T.color.tinta3, marginTop:2 }}>
        Puedes reemplazar el soporte de entrega si hubo un error de carga.
       </div>
      </div>
     </div>
     {pedidosMisConductores.length === 0 ? (
      <div style={{ padding:36, textAlign:"center", color:T.color.tinta3, fontSize:13.5 }}>
       Aun no hay pedidos asociados a tus conductores.
      </div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
         <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
          <th style={th}>Pedido</th>
          <th style={th}>Cliente</th>
          <th style={th}>Destino</th>
          <th style={th}>Conductor</th>
          <th style={th}>Estado</th>
          <th style={{ ...th, textAlign:"right" }}>Soportes</th>
         </tr>
        </thead>
        <tbody>
         {pedidosMisConductores.map(p => {
          const cond = conductores.find(c => String(c.id) === String(p.conductor_id));
          return (
           <tr key={p.id} style={{ borderBottom:`1px solid ${T.color.borde}` }}>
            <td style={{ ...td, fontWeight:700, color:T.color.tinta }}>{p.guia_interna || p.id}</td>
            <td style={td}>{p.cliente}</td>
            <td style={td}>{p.ciudad_nombre || "-"}</td>
            <td style={td}>{cond?.nombre || "-"}</td>
            <td style={td}>
             <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12.5 }}>
              <span style={{ width:7, height:7, borderRadius:4, background:T.estado[p.estado] || T.color.tinta3 }} />
              {ESTADOS_PEDIDO[p.estado]?.label || p.estado}
             </span>
            </td>
            <td style={{ ...td, textAlign:"right" }}>
             <button style={{ ...botonBarra, padding:"6px 12px", fontSize:13 }} onClick={() => setModSoportes(p)}>
              Reemplazar
             </button>
            </td>
           </tr>
          );
         })}
        </tbody>
       </table>
      </div>
     )}
    </section>

    {modales}
   </Pagina>
  );
 }

 // ── Vista de administracion ───────────────────────────────────────────────
 return (
  <Pagina>
   <Encabezado
    titulo="Transportistas"
    descripcion="Gestion de empresas transportistas y sus conductores"
    acciones={<>
     <button onClick={exportarEmpresas} style={botonBarra}><Download size={15} /> Exportar</button>
     <button onClick={() => setModEmpresa(true)} style={botonPrincipal}><Plus size={16} /> Nueva empresa</button>
    </>}
   />

   <Indicadores items={[
    { label: "Empresas", valor: empresas.length },
    { label: "Con conductores", valor: empresas.filter(e => e.conductores.length > 0).length, color: T.color.marca, destacado: true },
    { label: "Sin conductores", valor: empresas.filter(e => e.conductores.length === 0).length, color: T.color.ojo },
    { label: "Conductores vinculados", valor: conductoresActivos.filter(c => c.nit_proveedor).length, color: T.color.bien },
   ]}/>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={
     <span style={{ display:"inline-flex", alignItems:"center", gap:14 }}>
      <button onClick={alternarTodas} style={{
       border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
       color:T.color.marca, fontSize:12.5, fontWeight:600, padding:0,
      }}>{todasAbiertas ? "Contraer todo" : "Expandir todo"}</button>
      <span>{empresasFiltradas.length} {empresasFiltradas.length === 1 ? "empresa" : "empresas"} · orden A-Z</span>
     </span>
    }>
     <Buscador valor={busqEmp} onChange={setBusqEmp} placeholder="Buscar empresa, NIT, conductor o placa" ancho={300} />
     <Segmentado valor={vistaEmp} onChange={setVistaEmp}
      opciones={[["todas","Todas"], ["con","Con conductores"], ["sin","Sin conductores"]]} />
    </BarraFiltros>

    <div style={{ overflowX:"auto" }}>
     <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <thead>
       <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
        <th style={{ ...th, width:44 }} />
        <th style={th}>Empresa</th>
        <th style={th}>NIT</th>
        <th style={th}>Contacto</th>
        <th style={th}>Telefono</th>
        <th style={{ ...th, textAlign:"right" }}>Conductores</th>
        <th style={{ ...th, width:200 }} />
       </tr>
      </thead>
      <tbody>
       {empresasFiltradas.length === 0 && (
        <tr><td colSpan={7} style={{ ...td, textAlign:"center", padding:40, color:T.color.tinta3 }}>
         {empresas.length === 0 ? "Sin empresas registradas." : "Ninguna empresa coincide con el filtro."}
        </td></tr>
       )}
       {empresasFiltradas.map(e => {
        const abierta = abiertas.has(e.nit);
        return (
         <React.Fragment key={e.nit || e.id}>
          <tr style={{ borderBottom:`1px solid ${T.color.borde}` }}>
           <td style={td}>
            <button onClick={() => alternarFila(e.nit)} title={abierta ? "Contraer" : "Ver conductores"} style={{
             ...iconoAccion, border:`1px solid ${T.color.borde2}`, background:T.color.superficie,
            }}>{abierta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
           </td>
           <td style={td}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
             <span style={{
              width:34, height:34, borderRadius:T.radio.chico, flexShrink:0,
              background:T.color.marcaSuave, color:T.color.marca, display:"grid", placeItems:"center",
             }}><Truck size={16} /></span>
             <span style={{ fontSize:13.5, fontWeight:700, color:T.color.tinta }}>{e.nombre}</span>
            </div>
           </td>
           <td style={{ ...td, ...mono }}>{e.nit}</td>
           <td style={td}>{e.contacto || <span style={{ color:T.color.tinta3 }}>-</span>}</td>
           <td style={td}>{e.tel || <span style={{ color:T.color.tinta3 }}>-</span>}</td>
           <td style={{ ...td, textAlign:"right" }}>
            <span style={{
             display:"inline-flex", minWidth:26, justifyContent:"center", padding:"3px 9px",
             borderRadius:T.radio.chico, fontSize:12, fontWeight:700,
             background: e.conductores.length ? T.color.marcaSuave : T.color.superficie2,
             color: e.conductores.length ? T.color.marca : T.color.tinta3,
            }}>{e.conductores.length}</span>
           </td>
           <td style={{ ...td, textAlign:"right" }}>
            <div style={{ display:"inline-flex", gap:6, alignItems:"center" }}>
             <button onClick={() => abrirInscribir(e)} style={{ ...botonBarra, padding:"6px 12px", fontSize:13 }}>
              <UserPlus size={14} /> Conductor
             </button>
             <MenuFila opciones={[
              { texto: "Editar empresa", accion: () => abrirEditarEmpresa(e) },
              { texto: abierta ? "Contraer conductores" : "Ver conductores", accion: () => alternarFila(e.nit) },
             ]}/>
            </div>
           </td>
          </tr>

          {abierta && (
           <tr style={{ borderBottom:`1px solid ${T.color.borde}`, background:T.color.superficie2 }}>
            <td colSpan={7} style={{ padding:0 }}>
             {e.conductores.length === 0 ? (
              <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:T.color.tinta3 }}>
               Esta empresa aun no tiene conductores.
               <button onClick={() => abrirInscribir(e)} style={{
                border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
                color:T.color.marca, fontSize:13, fontWeight:600, padding:0,
               }}>Agregar el primero</button>
              </div>
             ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
               <thead>
                <tr>
                 <th style={{ ...th, paddingLeft:74 }}>Conductor</th>
                 <th style={th}>Placa</th>
                 <th style={th}>Cedula</th>
                 <th style={th}>Telefono</th>
                 <th style={{ ...th, textAlign:"right" }}>En transito</th>
                 <th style={{ ...th, width:120 }} />
                </tr>
               </thead>
               <tbody>
                {e.conductores.map(c => {
                 const transito = pedidos.filter(p =>
                  String(p.conductor_id) === String(c.id) && p.estado === "en_transito").length;
                 return (
                  <tr key={c.id}>
                   <td style={{ ...td, paddingLeft:74, fontWeight:600, color:T.color.tinta }}>{c.nombre}</td>
                   <td style={td}>
                    <span style={{ ...mono, background:T.color.superficie, padding:"3px 9px", borderRadius:T.radio.chico, border:`1px solid ${T.color.borde}` }}>{c.placa}</span>
                   </td>
                   <td style={td}>{c.cedula || "-"}</td>
                   <td style={td}>{c.celular || "-"}</td>
                   <td style={{ ...td, textAlign:"right", fontWeight:700, color: transito ? T.color.marca : T.color.tinta3 }}>{transito}</td>
                   <td style={{ ...td, textAlign:"right" }}>
                    <button style={{ ...botonBarra, padding:"5px 11px", fontSize:12.5 }}
                     onClick={() => { setFormEdit({ nombre:c.nombre, cedula:c.cedula || "", placa:c.placa || "", celular:c.celular || "", nit_proveedor:c.nit_proveedor || "", empresa:c.empresa || "" }); setModEdit(c); }}>
                     Editar
                    </button>
                   </td>
                  </tr>
                 );
                })}
               </tbody>
              </table>
             )}
            </td>
           </tr>
          )}
         </React.Fragment>
        );
       })}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${empresasFiltradas.length} ${empresasFiltradas.length === 1 ? "empresa" : "empresas"}`}
     derecha={
      <button onClick={() => setActiveTabExterno && setActiveTabExterno("conductores")} style={{
       border:"none", background:"transparent", cursor:"pointer", fontFamily:"inherit",
       color:T.color.marca, fontSize:13, fontWeight:600, padding:0,
      }}>Ver todos los conductores &rarr;</button>
     }
    />
   </section>

   {modales}
  </Pagina>
 );
}

function ResumenTransportador({ pedidos, conductores, devoluciones = [], recogidas = [] }) {
 const [gpsTick, setGpsTick] = useState(0);
 useEffect(() => { const t = setInterval(() => setGpsTick(n => n + 1), 10000); return () => clearInterval(t); }, []);
 const [selCond, setSelCond] = useState("");
 const condIds = [...new Set(pedidos.filter(p => p.conductor_id).map(p => p.conductor_id))];
 const condOpts = condIds.map(id => conductores.find(c => c.id === id)).filter(Boolean);
 const cond = conductores.find(c => String(c.id) === String(selCond));
 const misPeds = selCond ? pedidos.filter(p => String(p.conductor_id) === String(selCond) && p.estado === "en_transito") : [];
 const misDV = selCond ? devoluciones.filter(d => String(d.conductor_id) === String(selCond) && d.estado === "en_transito") : [];
 const misRC = selCond ? recogidas.filter(r => String(r.conductor_id) === String(selCond) && r.estado === "en_transito") : [];
 const totalCajas = misPeds.reduce((a, p) => a + (parseInt(p.cajas) || 0), 0);
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };

 const imprimir = () => {
  if (!cond) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Resumen ${cond.nombre}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111827}h1{margin:0 0 6px}p{color:#6b7280}table{width:100%;border-collapse:collapse}th{background:#f8fafc;color:#374151;padding:10px 12px;text-align:left;font-size:12px;border-bottom:1px solid #e5e7eb}td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.total{font-size:16px;font-weight:bold}</style></head><body><h1>Somos PRO Tracking Resumen de Despachos</h1><h2>Conductor: ${cond.nombre} Placa: ${cond.placa}${cond.celular ? " Tel: " + cond.celular : ""}</h2><p>Empresa: ${cond.empresa || ""} NIT: ${cond.nit_proveedor || ""}</p><p>Fecha: ${new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"long", year:"numeric" })}</p><table><thead><tr><th>#</th><th>Guia Interna</th><th>No. Pedido</th><th>Factura</th><th>Cliente</th><th>Ciudad</th><th>Direccion</th><th>Cajas</th><th>Estado</th><th>Fecha Est.</th></tr></thead><tbody>${misPeds.map((p,i) => `<tr><td>${i+1}</td><td><strong>${p.guia_interna || ""}</strong></td><td>${p.id}</td><td>${p.factura || ""}</td><td>${p.cliente}</td><td>${p.ciudad_nombre}</td><td>${p.direccion}</td><td style="text-align:center"><strong>${p.cajas}</strong></td><td>${p.estado}</td><td>${p.fecha_estimada || ""}</td></tr>`).join("")}</tbody></table><p class="total" style="margin-top:20px">Total pedidos: ${misPeds.length} Total cajas: <strong>${totalCajas}</strong></p></body></html>`);
  win.print();
 };

 const gpsCond = cond && window._gpsData ? window._gpsData[String(cond.id)] : null;
 const gpsFresco = gpsCond && (Date.now() - gpsCond.ts) < 300000;

 return (
  <Pagina>
   <Encabezado
    titulo="Resumen transportador"
    descripcion="Pedidos, devoluciones y recogidas activas por conductor"
    acciones={
     <button onClick={imprimir} disabled={!cond} style={{ ...botonBarra, opacity: cond ? 1 : 0.5, cursor: cond ? "pointer" : "not-allowed" }}>
      <ClipboardList size={15} /> Imprimir resumen
     </button>
    }
   />

   <section style={{ ...tarjeta, padding:14 }}>
    <SelectFiltro valor={selCond} onChange={setSelCond} ancho={420}>
     <option value="">Seleccione un conductor</option>
     {condOpts.slice().sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"))
      .map(c=><option key={c.id} value={c.id}>{c.nombre} - {c.placa || "sin placa"}</option>)}
    </SelectFiltro>
   </section>

   {!cond ? (
    <section style={{ ...tarjeta, padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
     {condOpts.length === 0
      ? "No hay pedidos con conductor asignado."
      : "Selecciona un conductor para ver lo que lleva en ruta."}
    </section>
   ) : (
    <>
     <Indicadores items={[
      { label:"Pedidos en transito", valor:misPeds.length, color:T.color.marca, destacado:true },
      { label:"Cajas", valor:totalCajas, color:T.color.neutroPunto },
      { label:"Devoluciones", valor:misDV.length, color:T.color.infoPunto },
      { label:"Recogidas", valor:misRC.length, color:T.color.bienPunto },
     ]}/>

     <section style={{ ...tarjeta, padding:16, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
      <span style={{
       width:40, height:40, borderRadius:T.radio.pastilla, flexShrink:0,
       background:T.color.marcaAvatar, color:T.color.marca,
       display:"grid", placeItems:"center", fontSize:13, fontWeight:800,
      }}>
       {(cond.nombre||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
      </span>
      <div style={{ minWidth:0 }}>
       <div style={{ fontSize:15, fontWeight:700, color:T.color.tinta }}>{cond.nombre}</div>
       <div style={{ ...mono, marginTop:2 }}>
        {cond.placa || "sin placa"}{cond.cedula ? `  ·  CC ${cond.cedula}` : ""}
       </div>
      </div>
      <span style={{
       marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:7,
       padding:"4px 11px", borderRadius:T.radio.pastilla,
       background: gpsFresco ? T.color.bienSuave : T.color.neutroSuave,
       color: gpsFresco ? T.color.bien : T.color.tinta3, fontSize:12, fontWeight:600,
      }}>
       <span style={{ width:6, height:6, borderRadius:3, background: gpsFresco ? T.color.bienPunto : T.color.neutroPunto }}/>
       {gpsFresco ? "GPS activo" : "Sin reporte GPS"}
      </span>
     </section>

     {[
      { titulo:"Pedidos en transito", filas:misPeds, tipo:"pedido" },
      { titulo:"Devoluciones asignadas", filas:misDV, tipo:"devolucion" },
      { titulo:"Recogidas asignadas", filas:misRC, tipo:"recogida" },
     ].map(bloque => (
      <section key={bloque.titulo} style={{ ...tarjeta, overflow:"hidden" }}>
       <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"13px 18px", borderBottom:`1px solid ${T.color.borde}`,
       }}>
        <span style={{ ...T.texto.tarjeta }}>{bloque.titulo}</span>
        <span style={{
         fontSize:12, fontWeight:700, padding:"2px 9px", borderRadius:T.radio.pastilla,
         background: bloque.filas.length ? T.color.marcaSuave : T.color.neutroSuave,
         color: bloque.filas.length ? T.color.marca : T.color.tinta4,
        }}>{bloque.filas.length}</span>
       </div>
       {bloque.filas.length === 0 ? (
        <div style={{ padding:28, textAlign:"center", color:T.color.tinta3, fontSize:13.5 }}>
         Nada asignado en este momento.
        </div>
       ) : (
        <div style={{ overflowX:"auto" }}>
         <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
           <tr>
            <th style={th}>{bloque.tipo === "pedido" ? "Pedido" : "Guia"}</th>
            <th style={th}>{bloque.tipo === "pedido" ? "Cliente" : "Ciudad"}</th>
            <th style={th}>Destino</th>
            <th style={{...th, textAlign:"right"}}>{bloque.tipo === "pedido" ? "Cajas" : "Unidades"}</th>
           </tr>
          </thead>
          <tbody>
           {bloque.filas.map(x => (
            <tr key={x.id}>
             <td style={td}><span style={chipMono}>{x.guia_interna || x.guia || x.id}</span></td>
             <td style={td}>{x.cliente || x.ciudad_nombre || x.ciudad_recogida_nombre || "-"}</td>
             <td style={td}>
              <div>{x.ciudad_nombre || x.ciudad_entrega_nombre || "-"}</div>
              <div style={{ ...T.texto.meta, color:T.color.tinta3 }}>
               {x.direccion || x.dir_entrega || x.dir_recogida || ""}
              </div>
             </td>
             <td style={tdCifra}>{x.cajas || x.unidades || 0}</td>
            </tr>
           ))}
          </tbody>
         </table>
        </div>
       )}
      </section>
     ))}
    </>
   )}
  </Pagina>
 );
}
function Ciudades({ ciudades, pedidos = [], showToast, recargar }) {
 const [modNueva,setModNueva]=useState(false);
 const [modCSV,setModCSV]=useState(false);
 const [busq,setBusq]=useState("");
 const [form,setForm]=useState({code:"",name:""});

 const guardar=async()=>{
  if(!form.code.trim()||!form.name.trim()){showToast("Codigo DANE y nombre son obligatorios","error");return;}
  if(ciudades.find(c=>c.code===form.code.trim())){showToast("Ya existe esa ciudad","error");return;}
  if(supabase){ await supabase.from('ciudades').upsert({code:form.code.trim(),name:form.name.trim()},{onConflict:'code'}); if(recargar) await recargar(); }
  setModNueva(false);setForm({code:"",name:""});
  showToast(" Ciudad registrada","success");
 };

 const filt=ciudades.filter(c=>!busq||c.name.toLowerCase().includes(busq.toLowerCase())||c.code.includes(busq));
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };

 const usosCiudad = (code) => (pedidos || []).filter(p => p.ciudad_codigo === code).length;

 return (
  <Pagina>
   <Encabezado
    titulo="Ciudades / DANE"
    descripcion="Catalogo de municipios con su codigo DANE"
    acciones={<>
     <button onClick={()=>setModCSV(true)} style={botonBarra}><Upload size={15}/> Importar CSV</button>
     <button onClick={()=>{setForm({code:"",name:""});setModNueva(true);}} style={botonPrincipal}>
      <Plus size={16}/> Nueva ciudad
     </button>
    </>}
   />

   <Indicadores items={[
    { label:"Ciudades", valor:(ciudades||[]).length, color:T.color.marca, destacado:true },
    { label:"Con pedidos", valor:(ciudades||[]).filter(c=>usosCiudad(c.code)>0).length, color:T.color.bienPunto },
    { label:"Sin usar", valor:(ciudades||[]).filter(c=>usosCiudad(c.code)===0).length, color:T.color.neutroPunto },
   ]}/>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${filt.length} de ${(ciudades||[]).length} · orden A-Z`}>
     <Buscador valor={busq} onChange={setBusq} placeholder="Buscar ciudad o codigo DANE" ancho={300}/>
    </BarraFiltros>

    {filt.length === 0 ? (
     <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
      {(ciudades||[]).length === 0 ? "Sin ciudades registradas." : "Ninguna ciudad coincide con la busqueda."}
     </div>
    ) : (
     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr>
         <th style={th}>Municipio</th>
         <th style={th}>Codigo DANE</th>
         <th style={{...th, textAlign:"right"}}>Pedidos</th>
        </tr>
       </thead>
       <tbody>
        {filt.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","es",{sensitivity:"base"})).map(c => (
         <tr key={c.code}>
          <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{c.name}</td>
          <td style={td}><span style={chipMono}>{c.code}</span></td>
          <td style={tdCifra}>{usosCiudad(c.code)}</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}
   </section>


   {modNueva&&(
    <ModalForm
     titulo="Nueva ciudad / municipio"
     descripcion="Se agrega al catalogo DANE del sistema"
     onClose={()=>setModNueva(false)}
     onPrimario={guardar}
     textoPrimario="Guardar ciudad"
    >
     <Texto label="Codigo DANE" obligatorio mono valor={form.code}
      onChange={v=>setForm(p=>({...p,code:v}))} placeholder="05045" />
     <Texto label="Nombre del municipio" obligatorio valor={form.name}
      onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Apartado" />
    </ModalForm>
   )}
   {modCSV&&(
    <ModalCSVCiudades onClose={()=>setModCSV(false)} onImportar={async (nuevas)=>{
     for(const c of nuevas){
      await supabase.from('ciudades').upsert({code:c.code,name:c.name},{onConflict:'code'});
     }
     setModCSV(false);
     showToast(` ${nuevas.length} ciudad(es) importada(s)`,"success");
     if(recargar) await recargar();
    }} />
   )}
  </Pagina>
 );
}

// Paqueterias (gestin) 

function ModalCSVCiudades({ onClose, onImportar }) {
 const [txt, setTxt]  = useState("");
 const [prev, setPrev] = useState([]);
 const [err, setErr]  = useState("");
 const fileRef = useRef(null);
 const [nombreArchivo, setNombreArchivo] = useState("");

 const CABECERA = "code,name";
 const EJEMPLO = "05001,Medelln\n76001,Cali\n11001,Bogot D.C.";

 const leerArchivo = async (file) => {
  if (!file) return;
  setNombreArchivo(file.name);
  try {
   const texto = await leerTextoCsv(file);
   setTxt(texto);
   setPrev(parsear(texto));
   setErr("");
  } catch(ex) { setErr(ex.message); setPrev([]); }
 };

 const parsear = (texto) => {
  const filas = filasCsv(texto);
  if (filas.length < 2) throw new Error("Se necesitan encabezado y al menos una fila.");
  const hdrs = filas[0].map(h => h.toLowerCase());
  const codeIdx = hdrs.indexOf("code");
  const nameIdx = hdrs.indexOf("name");
  if (codeIdx === -1 || nameIdx === -1) throw new Error("El CSV debe tener columnas 'code' y 'name'.");
  return filas.slice(1).map(cols => {
   return { code: cols[codeIdx]||"", name: cols[nameIdx]||"" };
  }).filter(c => c.code && c.name);
 };

 return (
  <Modal title="Importar Ciudades / Codigos DANE" onClose={onClose} wide>
   <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
    <div style={{ background:"#fffbeb", borderRadius:10, padding:12, fontSize:13, color:"#92400e" }}>
     <strong>Columnas requeridias:</strong> <code>code</code> (cdigo DANE) y <code>name</code> (nombre del municipio)
    </div>
    <Btn size="sm" variant="success" onClick={()=>descargarCSV("plantilla_ciudades.csv", CABECERA, EJEMPLO)}>
      Descargar Plantilla CSV
    </Btn>
    <div
     style={{ border:`2px dashed ${P[300]}`, borderRadius:12, padding:"20px 16px", textAlign:"center", cursor:"pointer", background: nombreArchivo ? "#f0fdf4" : P[50] }}
     onClick={() => fileRef.current && fileRef.current.click()}
     onDragOver={e => e.preventDefault()}
     onDrop={e => { e.preventDefault(); leerArchivo(e.dataTransfer.files[0]); }}
    >
     <div style={{ fontSize:32, marginBottom:8 }}></div>
     {nombreArchivo
      ? <div style={{ color:"#059669", fontWeight:700, fontSize:14 }}> {nombreArchivo}</div>
      : <div style={{ fontWeight:700, color:P[700] }}>Haz clic para seleccionar el archivo CSV</div>
     }
    </div>
    <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }}
     onChange={e => leerArchivo(e.target.files[0])} />

    <details style={{ fontSize:13 }}>
     <summary style={{ cursor:"pointer", color:P[600], fontWeight:600 }}>Tambin puedes pegar el texto</summary>
     <textarea value={txt} onChange={e=>{setTxt(e.target.value);setNombreArchivo("");}} rows={4}
      style={{ ...iSt, fontFamily:"monospace", fontSize:11, resize:"vertical", marginTop:8 }}
      placeholder="code,name&#10;05001,Medelln&#10;76001,Cali"/>
     <Btn size="sm" variant="secondary" style={{marginTop:6}}
      onClick={()=>{try{setPrev(parsear(txt));setErr("");}catch(e){setErr(e.message);setPrev([]);}}}>
       Previsualizar
     </Btn>
    </details>

    {err && <p style={{ color:"#dc2626", background:"#fef2f2", padding:"8px 12px", borderRadius:8, fontSize:13, margin:0 }}> {err}</p>}

    {prev.length > 0 && (
     <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, border:"1px solid #86efac", maxHeight:160, overflowY:"auto" }}>
      <p style={{ margin:"0 0 8px", fontWeight:700, color:"#15803d", fontSize:13 }}> {prev.length} ciudad(es) lista(s):</p>
      {prev.slice(0,10).map((c,i) => (
       <div key={i} style={{ fontSize:12, color:"#334155" }}> <strong>{c.code}</strong> {c.name}</div>
      ))}
      {prev.length > 10 && <div style={{fontSize:11,color:"#94a3b8"}}>...y {prev.length-10} ms</div>}
     </div>
    )}

    <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
     <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
     <Btn disabled={prev.length===0} onClick={()=>onImportar(prev)}> Importar ({prev.length})</Btn>
    </div>
   </div>
  </Modal>
 );
}

function MisPedidosConductor({ pedidos, user, conductores, ciudades, showToast, recargar }) {
 const [modDet,  setModDet]  = useState(null);
 const [modFotos, setModFotos] = useState(null); // pedido para cargar soportes
 const [novedad,  setNovedad]  = useState(false);
 const condId = user.conductor_db_id || user.id;
 const misPeds = pedidos.filter(p => String(p.conductor_id) === String(condId));
 const activos = misPeds.filter(p => ["pendiente","en_transito","sin_asignar"].includes(p.estado));
 const completados = misPeds.filter(p => ["entregado","novedad"].includes(p.estado));
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const thStyle = { padding:"14px 16px", textAlign:"left", borderBottom:`1px solid ${border}`, color:"#6b7280", fontSize:12, textTransform:"uppercase", whiteSpace:"nowrap" };
 const tdStyle = { padding:"16px", borderBottom:`1px solid ${border}`, verticalAlign:"middle" };

 const marcarEntregado = async (pedido, fotos, conNovedad) => {
  if (["entregado","novedad"].includes(pedido.estado)) {
   showToast("No se puede modificar un pedido que ya fue entregado", "error");
   setModFotos(null);
   return;
  }
  const hoy = new Date().toISOString().split("T")[0];
  const nombres = fotos.map((_,i)=>`soporte_${pedido.id}_${i+1}.jpg`);
  const estadoFinal = conNovedad ? "novedad" : "entregado";
  let soportesPrevios = Array.isArray(pedido.soportes_data) ? pedido.soportes_data : [];
  if (soportesPrevios.length === 0 && (pedido.soportes||[]).length > 0) {
   try { soportesPrevios = await cargarSoportesPedido(pedido.id); } catch(e) { soportesPrevios = []; }
  }
  const cambios = {
   soportes: [...(pedido.soportes||[]),...nombres],
   soportes_data: [...soportesPrevios,...fotos],
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
    showToast("Estado guardado pero fotos muy pesadas - usa imagenes mas pequenas", "warning");
   } else if (e1) {
    showToast("Error guardando: "+e1.message, "error"); return;
   } else {
    showToast(`Entrega registrada - ${fotos.length} soporte(s) - Estado: ${estadoFinal==="entregado"?"Entregado":"Con Novedad"}`, "success");
   }
  } catch(e) {
   showToast("Error de conexion. Revisa tu internet e intenta de nuevo.", "error"); return;
  }
  setModFotos(null);
  if (recargar) await recargar();
 };

 return (
  <div style={{ minHeight:"100%", background:"#fafafa", margin:"-28px -24px", color:"#111827" }}>
   <header style={{ background:"#fff", borderBottom:`1px solid ${border}`, padding:"16px 32px" }}>
    <h1 style={{ margin:0, fontSize:22, lineHeight:1.2, fontWeight:850 }}>Mis Pedidos</h1>
    <p style={{ margin:"5px 0 0", color:"#6b7280", fontSize:14 }}>Pedidos asignados para entrega</p>
   </header>

   <main style={{ maxWidth:1216, margin:"0 auto", padding:"24px 24px 42px", display:"flex", flexDirection:"column", gap:18 }}>
    <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
     <div style={{ ...cardStyle, padding:18 }}>
      <div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Total asignados</div>
      <div style={{ fontSize:30, fontWeight:900, marginTop:8 }}>{misPeds.length}</div>
     </div>
     <div style={{ ...cardStyle, padding:18 }}>
      <div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Activos</div>
      <div style={{ fontSize:30, fontWeight:900, color:"#6d42d8", marginTop:8 }}>{activos.length}</div>
     </div>
     <div style={{ ...cardStyle, padding:18 }}>
      <div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Entregados</div>
      <div style={{ fontSize:30, fontWeight:900, color:"#059669", marginTop:8 }}>{completados.length}</div>
     </div>
     <div style={{ ...cardStyle, padding:18 }}>
      <div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Vehiculo</div>
      <div style={{ fontSize:18, fontWeight:850, marginTop:10 }}>{user.placa || "Sin placa"}</div>
      <div style={{ color:"#6b7280", fontSize:12, marginTop:3 }}>{user.nombre}</div>
     </div>
    </section>

    <section style={{ ...cardStyle, padding:0, overflow:"hidden" }}>
     <div style={{ padding:"16px 18px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <div>
       <h2 style={{ margin:0, fontSize:16, fontWeight:850 }}>Pedidos activos</h2>
       <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:13 }}>Registra la entrega desde esta lista.</p>
      </div>
      <span style={{ background:"#f0eef9", color:"#4f2ca8", borderRadius:999, padding:"5px 10px", fontSize:12, fontWeight:800 }}>{activos.length} activos</span>
     </div>

     {activos.length===0 ? (
      <div style={{ padding:42, textAlign:"center", color:"#9ca3af" }}>No tienes pedidos activos por el momento.</div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
         <tr>
          <th style={thStyle}>No. pedido</th>
          <th style={thStyle}>Cliente</th>
          <th style={thStyle}>Ciudad / direccion</th>
          <th style={thStyle}>Cajas</th>
          <th style={thStyle}>Fecha estimada</th>
          <th style={thStyle}>Estado</th>
          <th style={{ ...thStyle, textAlign:"right" }}>Acciones</th>
         </tr>
        </thead>
        <tbody>
         {activos.map(p=>(
          <tr key={p.id}>
           <td style={tdStyle}>
            <div style={{ fontWeight:900, color:"#4f2ca8", fontFamily:"monospace" }}>{p.guia_interna||p.id}</div>
            <div style={{ color:"#6b7280", fontSize:12, fontFamily:"monospace", marginTop:2 }}>{p.factura}</div>
           </td>
           <td style={tdStyle}>{p.cliente}</td>
           <td style={tdStyle}>
            <div>{p.ciudad_nombre}</div>
            <div style={{ color:"#6b7280", fontSize:12, marginTop:2 }}>{p.direccion}</div>
           </td>
           <td style={{ ...tdStyle, fontWeight:850 }}>{p.cajas}</td>
           <td style={tdStyle}>{p.fecha_estimada || "Pendiente"}</td>
           <td style={tdStyle}><Badge estado={p.estado}/></td>
           <td style={{ ...tdStyle, textAlign:"right" }}>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, flexWrap:"wrap" }}>
             <Btn size="sm" variant="secondary" onClick={()=>setModDet(p)}>Ver</Btn>
             <Btn size="sm" variant="success" onClick={()=>{setModFotos(p);setNovedad(false);}}>Registrar Entrega</Btn>
            </div>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </section>

    <section style={{ ...cardStyle, padding:0, overflow:"hidden" }}>
     <div style={{ padding:"16px 18px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <div>
       <h2 style={{ margin:0, fontSize:16, fontWeight:850 }}>Entregados</h2>
       <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:13 }}>Historial de pedidos cerrados.</p>
      </div>
      <span style={{ background:"#ecfdf5", color:"#047857", borderRadius:999, padding:"5px 10px", fontSize:12, fontWeight:800 }}>{completados.length} cerrados</span>
     </div>

     {completados.length===0 ? (
      <div style={{ padding:30, textAlign:"center", color:"#9ca3af" }}>Aun no tienes pedidos entregados.</div>
     ) : (
      <div style={{ overflowX:"auto" }}>
       <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
         <tr>
          <th style={thStyle}>No. pedido</th>
          <th style={thStyle}>Cliente</th>
          <th style={thStyle}>Ciudad</th>
          <th style={thStyle}>Fecha real</th>
          <th style={thStyle}>Estado</th>
          <th style={{ ...thStyle, textAlign:"right" }}>Soportes</th>
         </tr>
        </thead>
        <tbody>
         {completados.map(p=>(
          <tr key={p.id}>
           <td style={tdStyle}>
            <div style={{ fontWeight:900, color:"#059669", fontFamily:"monospace" }}>{p.guia_interna||p.id}</div>
            <div style={{ color:"#6b7280", fontSize:12, fontFamily:"monospace", marginTop:2 }}>{p.factura}</div>
           </td>
           <td style={tdStyle}>{p.cliente}</td>
           <td style={tdStyle}>{p.ciudad_nombre}</td>
           <td style={tdStyle}>{p.fecha_real || "Pendiente"}</td>
           <td style={tdStyle}><Badge estado={p.estado}/></td>
           <td style={{ ...tdStyle, textAlign:"right" }}>
            {(p.soportes||p.soportes_data||[]).length>0 ? (
             <Btn size="sm" variant="success" onClick={()=>verPDFSoportes(p, showToast)}>
              Soportes ({(p.soportes||p.soportes_data||[]).length})
             </Btn>
            ) : (
             <span style={{ color:"#9ca3af", fontSize:13 }}>Sin soportes</span>
            )}
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </section>
   </main>

   {/* Modal detalle (solo lectura) */}
   {modDet&&<ModalDetalle pedido={modDet} conductores={conductores} ciudades={ciudades} transportistas={[]}
    onClose={()=>setModDet(null)} setPedidos={()=>{}} showToast={showToast} canEdit={false} canDeliver/>}

   {/* Modal cargar soportes de entrega */}
   {modFotos&&(
    <Modal title={`Registrar Entrega - ${modFotos.guia_interna||modFotos.id}`} onClose={()=>setModFotos(null)} wide>
     <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Info pedido */}
      <div style={{background:P[50],borderRadius:10,padding:14}}>
       <div style={{fontWeight:700,color:P[800],marginBottom:4}}>{modFotos.cliente}</div>
       <div style={{fontSize:13,color:"#64748b"}}>Direccion: {modFotos.direccion} - {modFotos.ciudad_nombre}</div>
       <div style={{fontSize:13,color:"#64748b"}}>Factura: {modFotos.factura} - {modFotos.cajas} cajas</div>
      </div>

      {/* Checkbox novedad */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:novedad?"#fef2f2":P[50],borderRadius:10,padding:"12px 16px",cursor:"pointer",border:`2px solid ${novedad?"#dc2626":P[200]}`}}
       onClick={()=>setNovedad(!novedad)}>
       <div style={{width:22,height:22,borderRadius:5,border:`2px solid ${novedad?"#dc2626":P[400]}`,background:novedad?"#dc2626":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {novedad&&<span style={{color:"#fff",fontSize:14,fontWeight:900}}></span>}
       </div>
       <div>
        <div style={{fontWeight:700,color:novedad?"#dc2626":P[800],fontSize:14}}>Entrega con Novedad</div>
        <div style={{fontSize:12,color:"#94a3b8"}}>Marca esto si hubo algun inconveniente en la entrega</div>
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

function MisDevolucionesConductor({ devoluciones = [], user }) {
 const condId = user.conductor_db_id || user.id;
 const items = devoluciones.filter(d => String(d.conductor_id) === String(condId));
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 return (
  <div style={{ minHeight:"100%", background:"#fafafa", margin:"-28px -24px", color:"#111827" }}>
   <header style={{ background:"#fff", borderBottom:`1px solid ${border}`, padding:"16px 32px" }}>
    <h1 style={{ margin:0, fontSize:22, lineHeight:1.2, fontWeight:850 }}>Mis Devoluciones</h1>
    <p style={{ margin:"5px 0 0", color:"#6b7280", fontSize:14 }}>Devoluciones asignadas a tu ruta</p>
   </header>
   <main style={{ maxWidth:1216, margin:"0 auto", padding:"24px 24px 42px", display:"flex", flexDirection:"column", gap:14 }}>
    {items.length===0 && <section style={{ ...cardStyle, padding:42, textAlign:"center", color:"#9ca3af" }}>No tienes devoluciones asignadas.</section>}
    {items.map(d=>(
     <section key={d.id} style={{ ...cardStyle, padding:18, borderLeft:"4px solid #dc2626" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
       <div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
         <span style={{ fontFamily:"monospace", fontWeight:900, color:"#dc2626", fontSize:15 }}>{d.guia}</span>
         <Badge estado={d.estado}/>
         {d.novedad&&<span style={{ fontSize:12, color:"#dc2626", fontWeight:800 }}>Con Novedad</span>}
        </div>
        <div style={{ color:"#4b5563", fontSize:13 }}>Factura: <strong>{d.factura}</strong> · Pedido: <strong>{d.pedido_ref}</strong></div>
        <div style={{ color:"#6b7280", fontSize:13, marginTop:5 }}>Recogida: {d.dir_recogida} · {d.ciudad_nombre}</div>
        <div style={{ color:"#6b7280", fontSize:12, marginTop:4 }}>{d.unidades} uds · {d.volumen_m3} m3 · {d.peso_kg} kg</div>
        {d.motivo&&<div style={{ color:"#6b7280", fontSize:12, marginTop:4, whiteSpace:"pre-wrap" }}>Motivo: {d.motivo}</div>}
       </div>
       {(d.soporte_nombre||d.soporte_data)&&(
        <button style={{ border:`1px solid ${border}`, background:"#fff", color:"#059669", borderRadius:12, padding:"8px 12px", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}
         onClick={()=>abrirArchivoRemoto('devoluciones', d.id, 'soporte_data', 'soporte_nombre', `soporte-${d.guia}`)}>
         Ver Soporte
        </button>
       )}
      </div>
     </section>
    ))}
   </main>
  </div>
 );
}

function MisRecogidasConductor({ recogidas = [], user }) {
 const condId = user.conductor_db_id || user.id;
 const items = recogidas.filter(r => String(r.conductor_id) === String(condId));
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 return (
  <div style={{ minHeight:"100%", background:"#fafafa", margin:"-28px -24px", color:"#111827" }}>
   <header style={{ background:"#fff", borderBottom:`1px solid ${border}`, padding:"16px 32px" }}>
    <h1 style={{ margin:0, fontSize:22, lineHeight:1.2, fontWeight:850 }}>Mis Recogidas</h1>
    <p style={{ margin:"5px 0 0", color:"#6b7280", fontSize:14 }}>Recogidas asignadas a tu ruta</p>
   </header>
   <main style={{ maxWidth:1216, margin:"0 auto", padding:"24px 24px 42px", display:"flex", flexDirection:"column", gap:14 }}>
    {items.length===0 && <section style={{ ...cardStyle, padding:42, textAlign:"center", color:"#9ca3af" }}>No tienes recogidas asignadas.</section>}
    {items.map(r=>(
     <section key={r.id} style={{ ...cardStyle, padding:18, borderLeft:"4px solid #0891b2" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
       <div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
         <span style={{ fontFamily:"monospace", fontWeight:900, color:"#0891b2", fontSize:15 }}>{r.guia}</span>
         <Badge estado={r.estado}/>
         {r.novedad&&<span style={{ fontSize:12, color:"#dc2626", fontWeight:800 }}>Con Novedad</span>}
        </div>
        <div style={{ color:"#4b5563", fontSize:13 }}>Recogida: <strong>{r.ciudad_recogida_nombre}</strong> · Entrega: <strong>{r.ciudad_entrega_nombre}</strong></div>
        <div style={{ color:"#6b7280", fontSize:13, marginTop:5 }}>{r.dir_recogida} → {r.dir_entrega}</div>
        <div style={{ color:"#6b7280", fontSize:12, marginTop:4 }}>{r.unidades} uds · {r.volumen_m3} m3 · {r.peso_kg} kg</div>
        {r.observaciones&&<div style={{ color:"#6b7280", fontSize:12, marginTop:4, whiteSpace:"pre-wrap" }}>Obs: {r.observaciones}</div>}
       </div>
       {(r.doc_nombre||r.doc_data)&&(
        <button style={{ border:`1px solid ${border}`, background:"#fff", color:"#059669", borderRadius:12, padding:"8px 12px", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}
         onClick={()=>abrirArchivoRemoto('recogidas', r.id, 'doc_data', 'doc_nombre', `documento-${r.guia}`)}>
         Ver Documento
        </button>
       )}
      </div>
     </section>
    ))}
   </main>
  </div>
 );
}


// GestionPaqueterias 

// GestionPromesas 

// FacturasProveedor 

function GestionPromesas({ promesas, ciudades, showToast, recargar }) {
 const [editando, setEditando] = useState(null); // ciudad_codigo being edited
 const [diasEdit, setDiasEdit] = useState("");
 const [nueva,  setNueva]  = useState({ ciudad_codigo: "", dias_plazo: "" });
 const [guard,  setGuard]  = useState(false);
 const [busq,   setBusq]   = useState("");
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 // Map for quick lookup
 const promMap = Object.fromEntries((promesas||[]).map(p => [p.ciudad_codigo, p.dias_plazo]));

 // Cities without a promise
 const sinPromesa = (ciudades||[]).filter(c => !promMap[c.code]);
 const conPromesa = (ciudades||[]).filter(c => promMap[c.code]).filter(c =>
  !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
 );
 const sinFiltradias = sinPromesa.filter(c =>
  !busq || c.name.toLowerCase().includes(busq.toLowerCase()) || c.code.includes(busq)
 );
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };
 const pageItems = conPromesa.slice((page - 1) * pageSize, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, pageSize]);

 const guardarNueva = async () => {
  if (!nueva.ciudad_codigo || !nueva.dias_plazo) {
   showToast("Selecciona ciudad y escribe los dias", "error"); return;
  }
  const dias = parseInt(nueva.dias_plazo);
  if (isNaN(dias) || dias < 1) { showToast("Los dias deben ser un numero mayor a 0", "error"); return; }
  setGuard(true);
  const { error } = await supabase.from('promesas_servicio')
   .upsert({ ciudad_codigo: nueva.ciudad_codigo, dias_plazo: dias }, { onConflict: 'ciudad_codigo' });
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); setGuard(false); return; }
  setNueva({ ciudad_codigo: "", dias_plazo: "" });
  showToast(" Promesa registrada", "success");
  if (recargar) await recargar();
  setGuard(false);
 };

 const guardarEdit = async (codigo) => {
  const dias = parseInt(diasEdit);
  if (isNaN(dias) || dias < 1) { showToast("Dias invlidos", "error"); return; }
  const { error } = await supabase.from('promesas_servicio')
   .update({ dias_plazo: dias }).eq('ciudad_codigo', codigo);
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); return; }
  setEditando(null);
  showToast(" Promesa actualizada", "success");
  if (recargar) await recargar();
 };

 const eliminar = async (codigo, nombre) => {
  if (!window.confirm(`Eliminar promesa de servicio para ${nombre}?`)) return;
  const { error } = await supabase.from('promesas_servicio').delete().eq('ciudad_codigo', codigo);
  if (error) { showToast(mensajeError(error, "la promesa de servicio"), "error"); return; }
  showToast("Promesa eliminada", "info");
  if (recargar) await recargar();
 };

 return (
  <Pagina>
   <Encabezado
    titulo="Promesas de servicio"
    descripcion="Dias habiles de entrega prometidos por ciudad destino"
   />

   <Indicadores items={[
    { label:"Ciudades con promesa", valor:conPromesa.length, color:T.color.marca, destacado:true },
    { label:"Sin configurar", valor:sinPromesa.length, color:T.color.ojoPunto },
    { label:"Promedio de dias", valor:conPromesa.length
      ? (conPromesa.reduce((a,c)=>a+Number(promMap[c.code]||0),0)/conPromesa.length).toFixed(1)
      : 0, color:T.color.neutroPunto },
   ]}/>

   <section style={{ ...tarjeta, padding:14 }}>
    <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
     <div style={{ flex:"1 1 280px", minWidth:220 }}>
      <Selector label="Ciudad destino" valor={nueva.ciudad_codigo}
       onChange={v=>setNueva(p=>({...p, ciudad_codigo:v}))}
       placeholder="Selecciona una ciudad"
       opciones={(ciudades||[]).slice().sort((a,b)=>(a.name||"").localeCompare(b.name||"","es"))
        .map(c=>({ value:c.code, label:`${c.name} (${c.code})${promMap[c.code] ? " · " + promMap[c.code] + " dias" : ""}` }))}/>
     </div>
     <div style={{ width:130 }}>
      <Texto label="Dias de plazo" tipo="number" valor={nueva.dias_plazo}
       onChange={v=>setNueva(p=>({...p, dias_plazo:v}))} placeholder="2"/>
     </div>
     <button onClick={guardarNueva} disabled={guard} style={{ ...botonPrincipal, marginBottom:0 }}>
      <Plus size={16}/> {guard ? "Guardando..." : "Agregar"}
     </button>
    </div>
   </section>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${conPromesa.length} configuradas · ${sinPromesa.length} sin promesa`}>
     <Buscador valor={busq} onChange={setBusq} placeholder="Buscar ciudad o codigo DANE" ancho={300}/>
    </BarraFiltros>

    {conPromesa.length === 0 ? (
     <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
      Aun no hay promesas configuradas. Sin promesa, el riesgo de un pedido se calcula con su fecha estimada.
     </div>
    ) : (
     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr>
         <th style={th}>Ciudad</th>
         <th style={th}>Codigo DANE</th>
         <th style={{...th, textAlign:"right"}}>Dias de plazo</th>
         <th style={{...th, textAlign:"right", width:130}}>Acciones</th>
        </tr>
       </thead>
       <tbody>
        {conPromesa.slice((page-1)*pageSize, page*pageSize).map(c => (
         <tr key={c.code}>
          <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{c.name}</td>
          <td style={td}><span style={chipMono}>{c.code}</span></td>
          <td style={{ ...tdCifra, width:150 }}>
           {editando === c.code ? (
            <input value={diasEdit} onChange={e=>setDiasEdit(e.target.value)} type="number" autoFocus
             style={{
              width:80, height:32, padding:"0 10px", textAlign:"right",
              border:`1px solid ${T.color.marca}`, borderRadius:T.radio.chico,
              fontSize:13, fontFamily:"inherit", outline:"none",
             }}/>
           ) : (
            <span>{promMap[c.code]} {Number(promMap[c.code]) === 1 ? "dia" : "dias"}</span>
           )}
          </td>
          <td style={{ ...td, textAlign:"right" }}>
           <div style={{ display:"inline-flex", gap:6 }}>
            {editando === c.code ? (
             <>
              <button style={{ ...botonFila, background:T.color.marca, border:"none", color:"#fff" }}
               onClick={()=>guardarEdit(c.code)}>Guardar</button>
              <button style={botonFila} onClick={()=>setEditando(null)}>Cancelar</button>
             </>
            ) : (
             <>
              <button style={botonFila}
               onClick={()=>{ setEditando(c.code); setDiasEdit(String(promMap[c.code])); }}>Editar</button>
              <button title="Quitar promesa" onClick={()=>eliminar(c.code, c.name)}
               style={{ ...iconoAccion, color:T.color.mal }}><Trash2 size={15}/></button>
             </>
            )}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    )}

    <PieTabla
     izquierda={`${conPromesa.length} ${conPromesa.length === 1 ? "ciudad" : "ciudades"} con promesa`}
     derecha={<Paginador total={conPromesa.length} page={page} setPage={setPage} pageSize={pageSize}/>}
    />
   </section>

   {sinPromesa.length > 0 && (
    <section style={{ ...tarjeta, padding:16 }}>
     <div style={{ ...T.texto.tarjeta, marginBottom:4 }}>Ciudades sin promesa</div>
     <div style={{ fontSize:12.5, color:T.color.tinta3, marginBottom:12 }}>
      Sus pedidos calculan el riesgo con la fecha estimada de cada uno.
     </div>
     <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {sinFiltradias.slice(0, 60).map(c => (
       <button key={c.code} onClick={()=>setNueva({ ciudad_codigo:c.code, dias_plazo:"" })} style={{
        border:`1px solid ${T.color.borde}`, background:T.color.superficie2,
        borderRadius:T.radio.chico, padding:"4px 9px", cursor:"pointer",
        fontFamily:"inherit", fontSize:12.5, color:T.color.tinta2,
       }}>{c.name}</button>
      ))}
      {sinFiltradias.length > 60 && (
       <span style={{ fontSize:12.5, color:T.color.tinta3, alignSelf:"center" }}>
        y {sinFiltradias.length - 60} mas
       </span>
      )}
     </div>
    </section>
   )}

  </Pagina>
 );
}


function GestionPaqueterias({ paqueterias, pedidos = [], showToast, recargar }) {
 const [nueva, setNueva] = useState("");
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };
 const agregar = async () => {
  if (!nueva.trim()) { showToast("Escribe el nombre de la empresa","error"); return; }
  if ((paqueterias||[]).includes(nueva.trim())) { showToast("Ya existe esa empresa","error"); return; }
  const { error } = await supabase.from('paqueterias').insert({ nombre: nueva.trim() });
  if (error) { showToast(mensajeError(error, "la empresa de paqueteria"),"error"); return; }
  setNueva("");
  showToast(" Empresa de paqueteria agregada","success");
  if (recargar) await recargar();
 };
 // Solo se puede quitar una empresa que ningun pedido este usando: si no, el
 // pedido quedaria apuntando a una paqueteria que ya no existe en el catalogo.
 const eliminar = async (nombre) => {
  if (!window.confirm(`Quitar "${nombre}" del catalogo de paqueterias?`)) return;
  const { error } = await supabase.from('paqueterias').delete().eq('nombre', nombre);
  if (error) { showToast(mensajeError(error, "la empresa de paqueteria"), "error"); return; }
  showToast("Empresa quitada del catalogo", "info");
  if (recargar) await recargar();
 };

 const lista = (paqueterias || []).slice()
  .sort((a,b)=>String(a).localeCompare(String(b), "es", { sensitivity:"base" }));
 const usos = (nombre) => (pedidos || []).filter(p => p.paqueteria === nombre).length;

 return (
  <Pagina>
   <Encabezado
    titulo="Paqueterias"
    descripcion="Empresas externas usadas para guias de paqueteria"
   />

   <section style={{ ...tarjeta, padding:14, display:"flex", gap:10, flexWrap:"wrap" }}>
    <div style={{ flex:"1 1 280px", minWidth:220 }}>
     <input value={nueva} onChange={e=>setNueva(e.target.value)}
      onKeyDown={e=>e.key==="Enter"&&agregar()}
      placeholder="Nombre de la empresa (Servientrega, TCC, Coordinadora...)"
      style={{
       width:"100%", boxSizing:"border-box", height:38, padding:"0 12px",
       border:`1px solid ${T.color.borde2}`, borderRadius:T.radio.control,
       fontSize:13, fontFamily:"inherit", color:T.color.tinta, outline:"none",
       background:T.color.superficie2,
      }}/>
    </div>
    <button onClick={agregar} style={botonPrincipal}><Plus size={16}/> Agregar</button>
   </section>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${lista.length} ${lista.length === 1 ? "empresa" : "empresas"} · orden A-Z`}>
     <span style={{ fontSize:13, color:T.color.tinta3 }}>
      Estas son las opciones que aparecen al marcar un envio como paqueteria.
     </span>
    </BarraFiltros>

    {lista.length === 0 ? (
     <div style={{ padding:48, textAlign:"center", color:T.color.tinta3, fontSize:14 }}>
      Sin empresas registradas. Agrega la primera arriba.
     </div>
    ) : (
     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
       <thead>
        <tr>
         <th style={th}>Empresa</th>
         <th style={{...th, textAlign:"right"}}>Pedidos con esta paqueteria</th>
         <th style={{...th, width:60}} />
        </tr>
       </thead>
       <tbody>
        {lista.map((nombre, i) => {
         const enUso = usos(nombre);
         return (
          <tr key={i}>
           <td style={td}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
             <span style={{
              width:34, height:34, borderRadius:T.radio.chico, flexShrink:0,
              background:T.color.marcaAvatar, color:T.color.marca,
              display:"grid", placeItems:"center", fontSize:13, fontWeight:800,
             }}>{String(nombre || "?").charAt(0).toUpperCase()}</span>
             <span style={{ fontSize:13.5, fontWeight:600, color:T.color.tinta }}>{nombre}</span>
            </div>
           </td>
           <td style={tdCifra}>{enUso}</td>
           <td style={{ ...td, textAlign:"right" }}>
            <button title={enUso ? `No se puede quitar: ${enUso} pedido(s) la usan` : "Quitar"}
             onClick={()=>enUso === 0 && eliminar(nombre)}
             disabled={enUso > 0}
             style={{
              ...iconoAccion,
              color: enUso > 0 ? T.color.tenue : T.color.mal,
              cursor: enUso > 0 ? "not-allowed" : "pointer",
             }}><Trash2 size={15}/></button>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}
   </section>
  </Pagina>
 );
}

// ModuloDevoluciones 

function ModuloDevoluciones({ devoluciones, conductores, ciudades, transportistas, paqueterias = [], showToast, user, recargar }) {
 const [modNueva, setModNueva] = useState(false);
 const [modEditar,setModEditar]= useState(null);
 const [modDet,  setModDet]  = useState(null);
 const [busq,   setBusq]   = useState("");
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const fileRef = useRef(null);

 const vacio = {
  factura:"", pedido_ref:"", unidades:"", volumen_m3:"", peso_kg:"",
  dir_recogida:"", dir_entrega:"", ciudad_codigo:"", motivo:"",
  tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
  soporte_data:null, soporte_nombre:"",
 };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const esCliente = user.rol==="cliente";
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const abrirEditarCliente = (dev) => {
  setModEditar(dev);
  setForm({
   ...vacio,
   factura: dev.factura||"",
   pedido_ref: dev.pedido_ref||"",
   unidades: numTexto(dev.unidades),
   volumen_m3: numTexto(dev.volumen_m3),
   peso_kg: numTexto(dev.peso_kg),
   dir_recogida: dev.dir_recogida||"",
   dir_entrega: dev.dir_entrega||"",
   ciudad_codigo: dev.ciudad_codigo||"",
   motivo: dev.motivo||"",
   soporte_data: null, // el archivo actual no se descarga; solo se envia si se adjunta uno nuevo
   soporte_nombre: dev.soporte_nombre||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

 const cargarDoc = async (files) => {
  const file = files[0];
  if (!file) return;
  const data = await fileToBase64(file);
  setForm(p=>({...p, soporte_data:data, soporte_nombre:file.name}));
 };

 const crear = async () => {
  const req = ["factura","pedido_ref","unidades","volumen_m3","peso_kg","dir_recogida","dir_entrega","ciudad_codigo","motivo"];
  for (const k of req) {
   if (!form[k].toString().trim()) { showToast("Todos los campos son obligatorios","error"); return; }
  }
  // La guia la asigna la base: el cliente solo ve sus propias solicitudes y
  // calcularla aqui producia numeros repetidos.
  const ciudad = (ciudades||[]).find(c=>c.code===form.ciudad_codigo);
  const cond = user.rol!=="cliente" && form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
  if (modEditar) {
   const cambios = {
    factura: form.factura.trim(), pedido_ref: form.pedido_ref.trim(),
    unidades: parseInt(form.unidades)||0,
    volumen_m3: parseFloat(form.volumen_m3)||0,
    peso_kg: parseFloat(form.peso_kg)||0,
    dir_recogida: form.dir_recogida.trim(),
    dir_entrega: form.dir_entrega.trim(),
    ciudad_codigo: form.ciudad_codigo,
    ciudad_nombre: ciudad?.name||"",
    motivo: form.motivo.trim(),
    ...(form.soporte_data ? { soporte_data: form.soporte_data, soporte_nombre: form.soporte_nombre } : {}),
   };
   const { error } = await supabase.from('devoluciones').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la devolucion"),"error"); return; }
   cerrarFormulario();
   showToast(" Devolucion actualizada","success");
   if (recargar) await recargar();
   return;
  }
  const nueva = {
   factura: form.factura.trim(), pedido_ref: form.pedido_ref.trim(),
   unidades: parseInt(form.unidades)||0,
   volumen_m3: parseFloat(form.volumen_m3)||0,
   peso_kg: parseFloat(form.peso_kg)||0,
   dir_recogida: form.dir_recogida.trim(),
   dir_entrega: form.dir_entrega.trim(),
   ciudad_codigo: form.ciudad_codigo,
   ciudad_nombre: ciudad?.name||"",
   motivo: form.motivo.trim(),
   conductor_id: cond?cond.id:null,
   placa: cond?cond.placa:null,
   nit_proveedor: cond?cond.nit_proveedor:null,
   estado: cond?"en_transito":"sin_asignar",
   tipo: form.tipo_envio==="conductor" ? "propio" : (form.tipo_envio||"propio"),
   paqueteria: form.tipo_envio==="paqueteria" ? form.paqueteria : null,
   guia_paqueteria: form.tipo_envio==="paqueteria" ? form.guia_paqueteria : null,
   soporte_data: form.soporte_data,
   soporte_nombre: form.soporte_nombre,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, novedad: false,
   solicitado_por: user.nombre||user.user,
  };
  const { data: creada, error: devErr } = await supabase.from('devoluciones').insert(nueva).select("id,guia").single();
  if (devErr) { showToast(mensajeError(devErr, "la devolucion"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` Devolucion creada Guia: ${creada?.guia || ""}`,"success");
  if (recargar) await recargar();
 };

 // Acepta conductor de una empresa transportista o asignacion a una paqueteria,
 // igual que el modal de pedidos y el de recogidas.
 const asignar = async (id, datos) => {
  const { tipo = "propio", conductorId = "", paqueteria = "", guiaPaqueteria = "", novedad = false } = datos || {};
  const cond = conductores.find(c=>String(c.id)===String(conductorId));
  const esPaq = Boolean(paqueteria);
  const cambios = {
   conductor_id: esPaq ? null : (cond ? cond.id : null),
   placa: esPaq ? null : (cond ? cond.placa : null),
   nit_proveedor: esPaq ? null : (cond ? cond.nit_proveedor : null),
   tipo: esPaq ? "paqueteria" : tipo,
   paqueteria: esPaq ? paqueteria : null,
   guia_paqueteria: esPaq ? (guiaPaqueteria || null) : null,
   estado: (esPaq || cond) ? "en_transito" : "sin_asignar",
   novedad: Boolean(novedad),
  };
  const { error } = await supabase.from('devoluciones').update(cambios).eq('id',id).select("id").single();
  if (error) { showToast(mensajeError(error, "la devolucion"),"error"); return; }
  if (recargar) await recargar();
 };

 const marcarEntregado = async (id, novedad, condId) => {
  const hoy = new Date().toISOString().split("T")[0];
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = {
   estado:novedad?"novedad":"entregado",
   fecha_real:hoy,
   novedad,
   ...(cond ? { conductor_id:cond.id, placa:cond.placa, nit_proveedor:cond.nit_proveedor } : {}),
  };
  await supabase.from('devoluciones').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const filtradas = devoluciones.filter(d=>{
  if (esCliente && ![user.nombre, user.user].includes(d.solicitado_por)) return false;
  const q=busq.toLowerCase();
  return !busq||d.guia.toLowerCase().includes(q)||d.factura.toLowerCase().includes(q)||d.pedido_ref.toLowerCase().includes(q);
 });
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };
 const totalAbiertas = filtradas.filter(d => d.estado !== "entregado" && d.estado !== "novedad").length;
 const totalCerradas = filtradas.length - totalAbiertas;
 const pageItems = filtradas.slice((page - 1) * pageSize, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, pageSize]);

 return (
  <Pagina>
   <Encabezado
    titulo={esCliente ? "Mis devoluciones" : "Devoluciones"}
    descripcion="Gestion y seguimiento de solicitudes de devolucion"
    acciones={<button onClick={()=>setModNueva(true)} style={botonPrincipal}><Plus size={16}/> Nueva devolucion</button>}
   />

   <Indicadores items={[
    { label:"Abiertas", valor:totalAbiertas, color:T.color.marca, destacado:true },
    { label:"Cerradas", valor:totalCerradas, color:T.color.bienPunto },
    { label:"Con soporte", valor:filtradas.filter(d=>d.soporte_nombre).length, color:T.color.infoPunto },
    { label:"Total", valor:devoluciones.length, color:T.color.neutroPunto },
   ]}/>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${filtradas.length} de ${devoluciones.length}`}>
     <Buscador valor={busq} onChange={setBusq} placeholder="Buscar guia, factura, pedido o ciudad" ancho={300}/>
    </BarraFiltros>

    <div style={{ overflowX:"auto" }}>
     <table style={{ width:"100%", borderCollapse:"collapse", minWidth:940 }}>
      <thead>
       <tr>
        <th style={th}>Guia</th>
        <th style={th}>Factura</th>
        <th style={th}>Pedido</th>
        <th style={th}>Recogida</th>
        <th style={th}>Sede destino</th>
        <th style={{...th, textAlign:"right"}}>Unidades</th>
        <th style={th}>Estado</th>
        <th style={{...th, textAlign:"right"}}>Acciones</th>
       </tr>
      </thead>
      <tbody>
       {pageItems.length===0 && (
        <tr><td colSpan={8} style={{ ...td, textAlign:"center", padding:48, color:T.color.tinta3, fontSize:14 }}>
         {devoluciones.length===0 ? "Sin devoluciones registradas." : "Ninguna devolucion coincide con la busqueda."}
        </td></tr>
       )}
       {pageItems.map(d=>(
        <tr key={d.id} style={{ cursor:"pointer" }} onClick={()=>setModDet(d)}>
         <td style={td}><span style={chipMono}>{d.guia}</span></td>
         <td style={td}><span style={mono}>{d.factura || "-"}</span></td>
         <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{d.pedido_ref || "-"}</td>
         <td style={td}>
          <div style={{ color:T.color.tinta, fontWeight:600 }}>{d.ciudad_nombre || "-"}</div>
          <div style={{ ...T.texto.meta, color:T.color.tinta3 }}>{d.dir_recogida}</div>
         </td>
         <td style={td}>{d.dir_entrega || <span style={{ color:T.color.tinta4 }}>Sin registrar</span>}</td>
         <td style={tdCifra}>{d.unidades}</td>
         <td style={td}><ChipEstado estado={d.estado} novedad={d.novedad}/></td>
         <td style={{ ...td, textAlign:"right" }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:"inline-flex", gap:6 }}>
           {(d.soporte_nombre || d.soporte_data) && (
            <button style={botonFila} onClick={()=>abrirArchivoRemoto("devoluciones", d.id, "soporte_data", "soporte_nombre", d.soporte_nombre || "soporte", showToast)}>Soporte</button>
           )}
           {esCliente && !d.conductor_id && d.estado==="sin_asignar" && (
            <button style={botonFila} onClick={()=>abrirEditarCliente(d)}>Editar</button>
           )}
           <button style={botonFila} onClick={()=>setModDet(d)}>Ver</button>
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${filtradas.length} ${filtradas.length===1 ? "devolucion" : "devoluciones"}`}
     derecha={<Paginador total={filtradas.length} page={page} setPage={setPage} pageSize={pageSize}/>}
    />
   </section>

   {(modNueva||modEditar)&&(
    <ModalForm
     titulo={modEditar ? "Editar solicitud de devolucion" : "Nueva solicitud de devolucion"}
     descripcion="Genera una guia de devolucion para el pedido"
     ancho="M"
     onClose={cerrarFormulario}
     onPrimario={crear}
     textoPrimario={modEditar ? "Guardar cambios" : "Crear devolucion"}
    >
     {!modEditar && (
      <FranjaInfo>Se generara automaticamente la guia DV-{new Date().getFullYear()}-XXXX</FranjaInfo>
     )}

     <Fila>
      <Texto label="N factura" obligatorio mono valor={form.factura} onChange={f("factura")} placeholder="FAC-2200" />
      <Texto label="N pedido de referencia" obligatorio mono valor={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001" />
     </Fila>

     <Seccion titulo="Carga" />
     <Fila columnas={3}>
      <Texto label="Unidades" obligatorio tipo="number" valor={form.unidades} onChange={f("unidades")} placeholder="5" />
      <Texto label="Volumen" obligatorio tipo="number" prefijo="m3" valor={form.volumen_m3} onChange={f("volumen_m3")} placeholder="0.5" />
      <Texto label="Peso" obligatorio tipo="number" prefijo="kg" valor={form.peso_kg} onChange={f("peso_kg")} placeholder="10" />
     </Fila>

     <Seccion titulo="Recogida y destino" />
     <Fila>
      <Texto label="Direccion de recogida" obligatorio valor={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47" />
      <Selector label="Ciudad de recogida" obligatorio valor={form.ciudad_codigo} onChange={f("ciudad_codigo")}
       placeholder="Seleccione"
       opciones={(ciudades||[]).map(c=>({ value:c.code, label:`${c.name} - ${c.code}` }))} />
     </Fila>
     <Selector label="Sede destino" obligatorio valor={form.dir_entrega} onChange={f("dir_entrega")}
      placeholder="Seleccione"
      opciones={[
       ...SEDES_DESTINO.map(x=>({ value:x, label:x })),
       ...(form.dir_entrega && !SEDES_DESTINO.includes(form.dir_entrega)
        ? [{ value:form.dir_entrega, label:form.dir_entrega }] : []),
      ]} />
     <AreaTexto label="Motivo" obligatorio valor={form.motivo} onChange={f("motivo")}
      placeholder="Describe el motivo de la devolucion..." />

     {!esCliente && !modEditar && (
      <>
       <Seccion titulo="Transporte" />
       <Fila>
        <Selector label="Tipo de envio" valor={form.tipo_envio||"conductor"} onChange={f("tipo_envio")}
         opciones={[
          { value:"conductor", label:"Conductor propio" },
          { value:"empresa_transporte", label:"Empresa transportista" },
          { value:"mensajeria", label:"Mensajeria" },
          { value:"paqueteria", label:"Paqueteria tercero" },
         ]} />
        {(form.tipo_envio||"conductor")==="paqueteria" ? (
         <Selector label="Paqueteria" valor={form.paqueteria||""} onChange={f("paqueteria")}
          placeholder="Seleccione"
          opciones={(paqueterias||[]).filter(x=>typeof x==="string"&&x).map(x=>({ value:x, label:x }))} />
        ) : (
         <Selector label="Conductor" opcional valor={form.conductor_id} onChange={f("conductor_id")}
          placeholder="Sin asignar"
          opciones={conductoresActivos.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
        )}
       </Fila>
       {(form.tipo_envio||"conductor")==="paqueteria" && (
        <Texto label="No. guia de paqueteria" mono valor={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-0001" />
       )}
      </>
     )}

     <Adjunto label="Soporte" nombre={form.soporte_nombre} onArchivo={(file)=>cargarDoc([file])} />
    </ModalForm>
   )}
   {modDet&&(
    <ModalDetalleDV dev={modDet} conductores={conductores} ciudades={ciudades}
     transportistas={transportistas} paqueterias={paqueterias}
     onClose={()=>setModDet(null)} onAsignar={asignar} onEntregado={marcarEntregado}
     showToast={showToast} canEdit={user.rol!=="cliente"}/>
   )}
  </Pagina>
 );
}

function ModalDetalleDV({ dev, conductores, ciudades, transportistas = [], paqueterias = [], onClose, onAsignar, onEntregado, showToast, canEdit }) {
 const [tipoEnvio, setTipoEnvio] = useState(dev.tipo || (dev.paqueteria ? "paqueteria" : "propio"));
 const [empresa, setEmpresa] = useState(dev.nit_proveedor||"");
 const [condId, setCondId] = useState(dev.conductor_id||"");
 const [paqSel, setPaqSel] = useState(dev.paqueteria||"");
 const [guiaPaq, setGuiaPaq] = useState(dev.guia_paqueteria||"");
 const [novedad, setNovedad] = useState(dev.novedad||false);
 const ciudad = ciudades.find(c=>c.code===dev.ciudad_codigo);
 const cond  = conductores.find(c=>String(c.id)===String(condId||dev.conductor_id||""));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);
 // Con empresa transportista: primero la empresa y despues solo SUS conductores.
 // Con transporte propio o mensajeria: todos los conductores activos.
 const conductoresElegibles = tipoEnvio==="empresa_transporte"
  ? (empresa ? conductoresActivos.filter(c=>c.nit_proveedor===empresa) : [])
  : conductoresActivos;
 const empresasOpciones = (transportistas||[]).filter(e=>e?.nit).map(e=>({value:e.nit,label:e.nombre||e.empresa||e.nit}));

 const cambiarEmpresa = (nit) => { setEmpresa(nit); setCondId(""); };
 const cambiarTipo = (valor) => {
  setTipoEnvio(valor);
  if (valor==="paqueteria") { setEmpresa(""); setCondId(""); }
  else { setPaqSel(""); setGuiaPaq(""); if (valor!=="empresa_transporte") setEmpresa(""); }
 };

 const guardar = async () => {
  if (tipoEnvio==="paqueteria" && !paqSel) { showToast("Selecciona la paqueteria","error"); return; }
  await onAsignar(dev.id, {
   tipo:           tipoEnvio,
   conductorId:    tipoEnvio==="paqueteria" ? "" : condId,
   paqueteria:     tipoEnvio==="paqueteria" ? paqSel : "",
   guiaPaqueteria: tipoEnvio==="paqueteria" ? guiaPaq : "",
   novedad,
  });
  showToast(" Devolucion actualizada","success");
  onClose();
 };
 const marcar = () => {
  onEntregado(dev.id, novedad, condId);
  showToast(novedad?" Marcada con novedad":" Recogida completada","success");
  onClose();
 };

 return (
  <ModalGestion
   titulo="Devolucion"
   id={dev.guia}
   estado={<ChipEstado estado={dev.estado} novedad={dev.novedad} />}
   descripcion={canEdit ? "Asigna transporte o cierra la devolucion" : "Detalle de la devolucion"}
   onClose={onClose}
   onGuardar={canEdit ? guardar : null}
   textoGuardar="Guardar asignacion"
   textoCierre="Marcar completada"
   onCierre={canEdit ? marcar : null}
  >
   <Resumen datos={[
    { label:"Factura", valor:dev.factura || "-", mono:true },
    { label:"Pedido", valor:dev.pedido_ref || "-", mono:true },
    { label:"Unidades · peso", valor:`${dev.unidades} uds · ${dev.peso_kg} kg` },
    { label:"Ciudad", valor:ciudad?.name || dev.ciudad_nombre || "Sin definir", falta:!dev.ciudad_nombre },
    { label:"Recogida", valor:dev.dir_recogida || "Sin registrar", falta:!dev.dir_recogida },
    { label:"Sede destino", valor:dev.dir_entrega || "Sin registrar", falta:!dev.dir_entrega },
   ]}>
    {dev.motivo && <FranjaAviso etiqueta="Motivo">{dev.motivo}</FranjaAviso>}
   </Resumen>

   {canEdit && (
    <>
     <Seccion titulo="Transporte" />
     <Fila>
      <Selector label="Tipo de transporte" valor={tipoEnvio} onChange={cambiarTipo}
       opciones={[
        { value:"propio", label:"Transporte propio" },
        { value:"empresa_transporte", label:"Empresa transportista" },
        { value:"mensajeria", label:"Mensajeria" },
        { value:"paqueteria", label:"Paqueteria tercero" },
       ]} />
      {tipoEnvio === "paqueteria" ? (
       <Selector label="Paqueteria" valor={paqSel} onChange={setPaqSel}
        placeholder="Seleccione"
        opciones={(paqueterias||[]).filter(x=>typeof x==="string"&&x).map(x=>({ value:x, label:x }))} />
      ) : tipoEnvio === "empresa_transporte" ? (
       <Selector label="Empresa transportista" valor={empresa} onChange={cambiarEmpresa}
        placeholder="Seleccione la empresa" opciones={empresasOpciones} />
      ) : (
       <Selector label="Asignar conductor" valor={condId} onChange={setCondId}
        placeholder="Sin asignar"
        opciones={conductoresElegibles.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
      )}
     </Fila>
     {tipoEnvio === "paqueteria" && (
      <Texto label="No. guia de paqueteria" mono valor={guiaPaq} onChange={setGuiaPaq} placeholder="SRV-2026-0001" />
     )}
     {tipoEnvio === "empresa_transporte" && (
      <>
       <Selector label="Asignar conductor" valor={condId} onChange={setCondId}
        deshabilitado={!empresa}
        placeholder={empresa ? "Sin asignar" : "Selecciona primero la empresa"}
        opciones={conductoresElegibles.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
       {empresa && conductoresElegibles.length === 0 && (
        <FranjaInfo>Esa empresa no tiene conductores activos registrados.</FranjaInfo>
       )}
      </>
     )}
     <CasillaNovedad marcada={novedad} onChange={setNovedad}>
      Marcar con novedad
     </CasillaNovedad>
    </>
   )}
  </ModalGestion>
 );
}

// ModuloRecogidas 

function ModuloRecogidas({ recogidas, conductores, ciudades, transportistas, paqueterias = [], showToast, user, recargar }) {
 const [modNueva, setModNueva] = useState(false);
 const [modEditar,setModEditar]= useState(null);
 const [modDet,  setModDet]  = useState(null);
 const [busq,   setBusq]   = useState("");
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const fileRef = useRef(null);

 const vacio = {
  dir_recogida:"", ciudad_recogida_cod:"", dir_entrega:"", ciudad_entrega_cod:"",
  unidades:"", volumen_m3:"", peso_kg:"", observaciones:"",
  tipo_envio:"conductor", conductor_id:"", paqueteria:"", guia_paqueteria:"",
  doc_data:null, doc_nombre:"",
 };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));
 const esCliente = user.rol==="cliente";
 const conductoresActivos = conductores.filter(c=>c.activo!==false);

 const abrirEditarCliente = (rec) => {
  setModEditar(rec);
  setForm({
   ...vacio,
   dir_recogida: rec.dir_recogida||"",
   ciudad_recogida_cod: rec.ciudad_recogida_cod||"",
   dir_entrega: rec.dir_entrega||"",
   ciudad_entrega_cod: rec.ciudad_entrega_cod||"",
   unidades: numTexto(rec.unidades),
   volumen_m3: numTexto(rec.volumen_m3),
   peso_kg: numTexto(rec.peso_kg),
   observaciones: rec.observaciones||"",
   doc_data: null, // el archivo actual no se descarga; solo se envia si se adjunta uno nuevo
   doc_nombre: rec.doc_nombre||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

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
  // La guia la asigna la base: el cliente solo ve sus propias solicitudes y
  // calcularla aqui producia numeros repetidos.
  const crec = (ciudades||[]).find(c=>c.code===form.ciudad_recogida_cod);
  const cent = (ciudades||[]).find(c=>c.code===form.ciudad_entrega_cod);
  const cond = user.rol!=="cliente" && form.tipo_envio==="conductor" ? conductores.find(c=>String(c.id)===String(form.conductor_id)) : null;
  if (modEditar) {
   const cambios = {
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
    ...(form.doc_data ? { doc_data: form.doc_data, doc_nombre: form.doc_nombre } : {}),
   };
   const { error } = await supabase.from('recogidas').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la recogida"),"error"); return; }
   cerrarFormulario();
   showToast(" Recogida actualizada","success");
   if (recargar) await recargar();
   return;
  }
  const nueva = {
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
   tipo: form.tipo_envio==="conductor" ? "propio" : (form.tipo_envio||"propio"),
   paqueteria: form.tipo_envio==="paqueteria"?form.paqueteria:null,
   guia_paqueteria: form.tipo_envio==="paqueteria"?form.guia_paqueteria:null,
   doc_data: form.doc_data,
   doc_nombre: form.doc_nombre,
   fecha_creacion: new Date().toISOString().split("T")[0],
   fecha_real: null, novedad: false,
   solicitado_por: user.nombre||user.user,
  };
  const { data: creada, error: recErr } = await supabase.from('recogidas').insert(nueva).select("id,guia").single();
  if (recErr) { showToast(mensajeError(recErr, "la recogida"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` Recogida creada Guia: ${creada?.guia || ""}`,"success");
  if (recargar) await recargar();
 };

 // Acepta conductor de una empresa transportista o asignacion a una paqueteria,
 // igual que el modal de pedidos.
 const asignar = async (id, datos) => {
  const { tipo = "propio", conductorId = "", paqueteria = "", guiaPaqueteria = "", novedad = false } = datos || {};
  const cond = conductores.find(c=>String(c.id)===String(conductorId));
  const esPaq = Boolean(paqueteria);
  const cambios = {
   conductor_id: esPaq ? null : (cond ? cond.id : null),
   placa: esPaq ? null : (cond ? cond.placa : null),
   nit_proveedor: esPaq ? null : (cond ? cond.nit_proveedor : null),
   tipo: esPaq ? "paqueteria" : tipo,
   paqueteria: esPaq ? paqueteria : null,
   guia_paqueteria: esPaq ? (guiaPaqueteria || null) : null,
   estado: (esPaq || cond) ? "en_transito" : "sin_asignar",
   novedad: Boolean(novedad),
  };
  const { error } = await supabase.from('recogidas').update(cambios).eq('id',id).select("id").single();
  if (error) { showToast(mensajeError(error, "la recogida"),"error"); return; }
  if (recargar) await recargar();
 };

 const marcarEntregado = async (id, novedad, condId) => {
  const hoy = new Date().toISOString().split("T")[0];
  const cond = conductores.find(c=>String(c.id)===String(condId));
  const cambios = {
   estado:novedad?"novedad":"entregado",
   fecha_real:hoy,
   novedad,
   ...(cond ? { conductor_id:cond.id, placa:cond.placa, nit_proveedor:cond.nit_proveedor } : {}),
  };
  await supabase.from('recogidas').update(cambios).eq('id',id);
  if (recargar) await recargar();
 };

 const filtradas = recogidas.filter(r=>{
  if (esCliente && ![user.nombre, user.user].includes(r.solicitado_por)) return false;
  const q=busq.toLowerCase();
  return !busq||r.guia.toLowerCase().includes(q)||(r.ciudad_recogida_nombre||"").toLowerCase().includes(q);
 });
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };
 const totalAbiertas = filtradas.filter(r => r.estado !== "entregado" && r.estado !== "novedad").length;
 const totalCerradas = filtradas.length - totalAbiertas;
 const pageItems = filtradas.slice((page - 1) * pageSize, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, pageSize]);

 return (
  <Pagina>
   <Encabezado
    titulo={esCliente ? "Mis recogidas" : "Recogidas"}
    descripcion="Gestion y seguimiento de solicitudes de recogida"
    acciones={<button onClick={()=>setModNueva(true)} style={botonPrincipal}><Plus size={16}/> Nueva recogida</button>}
   />

   <Indicadores items={[
    { label:"Abiertas", valor:totalAbiertas, color:T.color.marca, destacado:true },
    { label:"Cerradas", valor:totalCerradas, color:T.color.bienPunto },
    { label:"Con documento", valor:filtradas.filter(r=>r.doc_nombre).length, color:T.color.infoPunto },
    { label:"Total", valor:recogidas.length, color:T.color.neutroPunto },
   ]}/>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${filtradas.length} de ${recogidas.length}`}>
     <Buscador valor={busq} onChange={setBusq} placeholder="Buscar guia, ciudad o direccion" ancho={280}/>
    </BarraFiltros>

    <div style={{ overflowX:"auto" }}>
     <table style={{ width:"100%", borderCollapse:"collapse", minWidth:940 }}>
      <thead>
       <tr>
        <th style={th}>Guia</th>
        <th style={th}>Recogida</th>
        <th style={th}>Entrega</th>
        <th style={{...th, textAlign:"right"}}>Unidades</th>
        <th style={{...th, textAlign:"right"}}>Peso</th>
        <th style={th}>Estado</th>
        <th style={th}>Documento</th>
        <th style={{...th, textAlign:"right"}}>Acciones</th>
       </tr>
      </thead>
      <tbody>
       {pageItems.length===0 && (
        <tr><td colSpan={8} style={{ ...td, textAlign:"center", padding:48, color:T.color.tinta3, fontSize:14 }}>
         {recogidas.length===0 ? "Sin recogidas registradas." : "Ninguna recogida coincide con la busqueda."}
        </td></tr>
       )}
       {pageItems.map(r=>(
        <tr key={r.id} style={{ cursor:"pointer" }} onClick={()=>setModDet(r)}>
         <td style={td}><span style={chipMono}>{r.guia}</span></td>
         <td style={td}>
          <div style={{ color:T.color.tinta, fontWeight:600 }}>{r.ciudad_recogida_nombre || "-"}</div>
          <div style={{ ...T.texto.meta, color:T.color.tinta3 }}>{r.dir_recogida}</div>
         </td>
         <td style={td}>
          <div style={{ color:T.color.tinta, fontWeight:600 }}>{r.ciudad_entrega_nombre || "-"}</div>
          <div style={{ ...T.texto.meta, color:T.color.tinta3 }}>{r.dir_entrega}</div>
         </td>
         <td style={tdCifra}>{r.unidades}</td>
         <td style={tdCifra}>{r.peso_kg} kg</td>
         <td style={td}><ChipEstado estado={r.estado} novedad={r.novedad}/></td>
         <td style={td} onClick={e=>e.stopPropagation()}>
          {(r.doc_nombre || r.doc_data)
           ? <button style={botonFila} onClick={()=>abrirArchivoRemoto("recogidas", r.id, "doc_data", "doc_nombre", r.doc_nombre || "documento", showToast)}>Ver</button>
           : <span style={{ color:T.color.tinta4 }}>-</span>}
         </td>
         <td style={{ ...td, textAlign:"right" }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:"inline-flex", gap:6 }}>
           {esCliente && !r.conductor_id && r.estado==="sin_asignar" && (
            <button style={botonFila} onClick={()=>abrirEditarCliente(r)}>Editar</button>
           )}
           <button style={botonFila} onClick={()=>setModDet(r)}>Ver</button>
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${filtradas.length} ${filtradas.length===1 ? "recogida" : "recogidas"}`}
     derecha={<Paginador total={filtradas.length} page={page} setPage={setPage} pageSize={pageSize}/>}
    />
   </section>

   {(modNueva||modEditar)&&(
    <ModalForm
     titulo={modEditar ? "Editar solicitud de recogida" : "Nueva solicitud de recogida"}
     descripcion="Programa una recogida en origen y su entrega"
     ancho="M"
     onClose={cerrarFormulario}
     onPrimario={crear}
     textoPrimario={modEditar ? "Guardar cambios" : "Registrar recogida"}
    >
     <Seccion titulo="Recogida" />
     <Fila>
      <Texto label="Direccion de recogida" obligatorio valor={form.dir_recogida} onChange={f("dir_recogida")} placeholder="Cra 15 #93-47" />
      <Selector label="Ciudad de recogida" obligatorio valor={form.ciudad_recogida_cod} onChange={f("ciudad_recogida_cod")}
       placeholder="Seleccione"
       opciones={(ciudades||[]).map(c=>({ value:c.code, label:`${c.name} - ${c.code}` }))} />
     </Fila>

     <Seccion titulo="Entrega" />
     <Fila>
      <Texto label="Direccion de entrega" obligatorio valor={form.dir_entrega} onChange={f("dir_entrega")} placeholder="Av El Poblado #43A-15" />
      <Selector label="Ciudad de entrega" obligatorio valor={form.ciudad_entrega_cod} onChange={f("ciudad_entrega_cod")}
       placeholder="Seleccione"
       opciones={(ciudades||[]).map(c=>({ value:c.code, label:`${c.name} - ${c.code}` }))} />
     </Fila>

     <Seccion titulo="Carga" />
     <Fila columnas={3}>
      <Texto label="Unidades" obligatorio tipo="number" valor={form.unidades} onChange={f("unidades")} placeholder="5" />
      <Texto label="Volumen" obligatorio tipo="number" prefijo="m3" valor={form.volumen_m3} onChange={f("volumen_m3")} placeholder="0.5" />
      <Texto label="Peso" obligatorio tipo="number" prefijo="kg" valor={form.peso_kg} onChange={f("peso_kg")} placeholder="10" />
     </Fila>
     <AreaTexto label="Observaciones" opcional valor={form.observaciones} onChange={f("observaciones")}
      placeholder="Instrucciones especiales..." />

     {!esCliente && !modEditar && (
      <>
       <Seccion titulo="Transporte" />
       <Fila>
        <Selector label="Tipo de envio" valor={form.tipo_envio||"conductor"} onChange={f("tipo_envio")}
         opciones={[
          { value:"conductor", label:"Conductor propio" },
          { value:"empresa_transporte", label:"Empresa transportista" },
          { value:"mensajeria", label:"Mensajeria" },
          { value:"paqueteria", label:"Paqueteria tercero" },
         ]} />
        {(form.tipo_envio||"conductor")==="paqueteria" ? (
         <Selector label="Paqueteria" valor={form.paqueteria||""} onChange={f("paqueteria")}
          placeholder="Seleccione"
          opciones={(paqueterias||[]).filter(x=>typeof x==="string"&&x).map(x=>({ value:x, label:x }))} />
        ) : (
         <Selector label="Conductor" opcional valor={form.conductor_id} onChange={f("conductor_id")}
          placeholder="Sin asignar"
          opciones={conductoresActivos.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
        )}
       </Fila>
       {(form.tipo_envio||"conductor")==="paqueteria" && (
        <Texto label="No. guia de paqueteria" mono valor={form.guia_paqueteria||""} onChange={f("guia_paqueteria")} placeholder="SRV-2026-0001" />
       )}
      </>
     )}

     <Adjunto label="Documento de soporte" nombre={form.doc_nombre} onArchivo={(file)=>cargarDoc([file])} />
    </ModalForm>
   )}
   {modDet&&(
    <Modal title={`Recogida ${modDet.guia}`} onClose={()=>setModDet(null)} wide>
     <ModalDetalleRC rec={modDet} conductores={conductores} ciudades={ciudades}
      transportistas={transportistas} paqueterias={paqueterias}
      onClose={()=>setModDet(null)} onAsignar={asignar} onEntregado={marcarEntregado}
      showToast={showToast} canEdit={user.rol!=="cliente"}/>
    </Modal>
   )}
  </Pagina>
 );
}

function ModalDetalleRC({ rec, conductores, ciudades, transportistas = [], paqueterias = [], onClose, onAsignar, onEntregado, showToast, canEdit }) {
 const [tipoEnvio, setTipoEnvio] = useState(rec.tipo || (rec.paqueteria ? "paqueteria" : "propio"));
 const [empresa, setEmpresa] = useState(rec.nit_proveedor||"");
 const [condId, setCondId] = useState(rec.conductor_id||"");
 const [paqSel, setPaqSel] = useState(rec.paqueteria||"");
 const [guiaPaq, setGuiaPaq] = useState(rec.guia_paqueteria||"");
 const [novedad, setNovedad] = useState(rec.novedad||false);
 const cond = conductores.find(c=>String(c.id)===String(condId||rec.conductor_id||""));
 const conductoresActivos = conductores.filter(c=>c.activo!==false);
 // Con empresa transportista: primero la empresa y despues solo SUS conductores.
 // Con transporte propio o mensajeria: todos los conductores activos.
 const conductoresElegibles = tipoEnvio==="empresa_transporte"
  ? (empresa ? conductoresActivos.filter(c=>c.nit_proveedor===empresa) : [])
  : conductoresActivos;
 const empresasOpciones = (transportistas||[]).filter(e=>e?.nit).map(e=>({value:e.nit,label:e.nombre||e.empresa||e.nit}));

 const cambiarEmpresa = (nit) => { setEmpresa(nit); setCondId(""); };
 const cambiarTipo = (valor) => {
  setTipoEnvio(valor);
  if (valor==="paqueteria") { setEmpresa(""); setCondId(""); }
  else { setPaqSel(""); setGuiaPaq(""); if (valor!=="empresa_transporte") setEmpresa(""); }
 };

 const guardar = async () => {
  if (tipoEnvio==="paqueteria" && !paqSel) { showToast("Selecciona la paqueteria","error"); return; }
  await onAsignar(rec.id, {
   tipo:           tipoEnvio,
   conductorId:    tipoEnvio==="paqueteria" ? "" : condId,
   paqueteria:     tipoEnvio==="paqueteria" ? paqSel : "",
   guiaPaqueteria: tipoEnvio==="paqueteria" ? guiaPaq : "",
   novedad,
  });
  showToast(" Recogida actualizada","success");
  onClose();
 };
 const marcar = () => {
  onEntregado(rec.id, novedad, condId);
  showToast(novedad?" Marcada con novedad":" Recogida completada","success");
  onClose();
 };

 return (
  <ModalGestion
   titulo="Recogida"
   id={rec.guia}
   estado={<ChipEstado estado={rec.estado} novedad={rec.novedad} />}
   descripcion={canEdit ? "Asigna transporte o cierra la recogida" : "Detalle de la recogida"}
   onClose={onClose}
   onGuardar={canEdit ? guardar : null}
   textoGuardar="Guardar asignacion"
   textoCierre="Marcar completada"
   onCierre={canEdit ? marcar : null}
  >
   <Resumen datos={[
    { label:"Recogida", valor:rec.ciudad_recogida_nombre || "Sin definir", falta:!rec.ciudad_recogida_nombre },
    { label:"Entrega", valor:rec.ciudad_entrega_nombre || "Sin definir", falta:!rec.ciudad_entrega_nombre },
    { label:"Carga", valor:`${rec.unidades} uds · ${rec.peso_kg} kg` },
    { label:"Direccion de recogida", valor:rec.dir_recogida || "Sin registrar", falta:!rec.dir_recogida },
    { label:"Direccion de entrega", valor:rec.dir_entrega || "Sin registrar", falta:!rec.dir_entrega },
    { label:"Volumen", valor:`${rec.volumen_m3} m3` },
   ]}>
    {rec.observaciones && <FranjaAviso etiqueta="Observaciones">{rec.observaciones}</FranjaAviso>}
   </Resumen>

   {canEdit && (
    <>
     <Seccion titulo="Transporte" />
     <Fila>
      <Selector label="Tipo de transporte" valor={tipoEnvio} onChange={cambiarTipo}
       opciones={[
        { value:"propio", label:"Transporte propio" },
        { value:"empresa_transporte", label:"Empresa transportista" },
        { value:"mensajeria", label:"Mensajeria" },
        { value:"paqueteria", label:"Paqueteria tercero" },
       ]} />
      {tipoEnvio === "paqueteria" ? (
       <Selector label="Paqueteria" valor={paqSel} onChange={setPaqSel}
        placeholder="Seleccione"
        opciones={(paqueterias||[]).filter(x=>typeof x==="string"&&x).map(x=>({ value:x, label:x }))} />
      ) : tipoEnvio === "empresa_transporte" ? (
       <Selector label="Empresa transportista" valor={empresa} onChange={cambiarEmpresa}
        placeholder="Seleccione la empresa" opciones={empresasOpciones} />
      ) : (
       <Selector label="Asignar conductor" valor={condId} onChange={setCondId}
        placeholder="Sin asignar"
        opciones={conductoresElegibles.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
      )}
     </Fila>
     {tipoEnvio === "paqueteria" && (
      <Texto label="No. guia de paqueteria" mono valor={guiaPaq} onChange={setGuiaPaq} placeholder="SRV-2026-0001" />
     )}
     {tipoEnvio === "empresa_transporte" && (
      <>
       <Selector label="Asignar conductor" valor={condId} onChange={setCondId}
        deshabilitado={!empresa}
        placeholder={empresa ? "Sin asignar" : "Selecciona primero la empresa"}
        opciones={conductoresElegibles.map(c=>({ value:c.id, label:`${c.nombre} - ${c.placa||""}` }))} />
       {empresa && conductoresElegibles.length === 0 && (
        <FranjaInfo>Esa empresa no tiene conductores activos registrados.</FranjaInfo>
       )}
      </>
     )}
     <CasillaNovedad marcada={novedad} onChange={setNovedad}>
      Marcar con novedad
     </CasillaNovedad>
    </>
   )}
  </ModalGestion>
 );
}

// ModuloPQRS 

function ModuloPQRS({ pqrs, pedidos, showToast, user, recargar }) {
 const MOTIVOS = [
  "Entrega tarda fuera de tiempo estimado",
  "Mercancia averiada o daada en transito",
  "Entrega incompleta faltan unidades",
  "Entrega en direccion incorrecta",
  "Mercancia no recibida sin soporte de entrega",
  "Conductor no se present al punto de entrega",
  "Mala manipulacin de la mercanca",
  "Embalaje inadecuado en origen",
  "Error en la factura asociada al pedido",
  "Retraso en la asignacin del conductor",
  "Cambio de conductor sin previo aviso",
  "Vehiculo en mal estado o inapropiado",
  "Pedido cancelado pero ya fue despachado",
  "Doble cobro o cobro incorrecto de flete",
  "Soporte de entrega ilegible o incompleto",
  "Sin comunicacin del conductor durante el transito",
  "Novedad no reportada oportunamente",
  "Devolucion no gestionada a tiempo",
  "Incumplimiento de condiciones de temperatura / cadena de fro",
  "Otro motivo logstico",
 ];
 const ESTADOS_PQRS = {
  abierta:  { label:"Abierta",  color:"#dc2626", bg:"#fef2f2" },
  en_gestion: { label:"En Gestion", color:"#d97706", bg:"#fffbeb" },
  cerrada:  { label:"Cerrada",  color:"#059669", bg:"#ecfdf5" },
  rechazada: { label:"Rechazada", color:"#64748b", bg:"#f1f5f9" },
 };
 const [modNueva,  setModNueva]  = useState(false);
 const [modEditar, setModEditar] = useState(null);
 const [modGestion, setModGestion] = useState(null);
 const [busq,    setBusq]    = useState("");
 const [filtroEst, setFiltroEst] = useState("todos");
 const [gestion,  setGestion]  = useState("");
 const [gestionSoporte, setGestionSoporte] = useState({ data:null, nombre:"" });
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);
 const vacio = { factura:"", pedido_ref:"", motivo:"", descripcion:"" };
 const [form, setForm] = useState(vacio);
 const f = k => v => setForm(p=>({...p,[k]:v}));

 const abrirEditarCliente = (p) => {
  setModEditar(p);
  setForm({
   factura: p.factura||"",
   pedido_ref: p.pedido_ref||"",
   motivo: p.motivo||"",
   descripcion: p.descripcion||"",
  });
 };

 const cerrarFormulario = () => {
  setModNueva(false);
  setModEditar(null);
  setForm(vacio);
 };

 const crear = async () => {
  if (!form.factura.trim()||!form.pedido_ref.trim()||!form.motivo||!form.descripcion.trim()) {
   showToast("Todos los campos son obligatorios","error"); return;
  }
  if (modEditar) {
   const cambios = {
    factura: form.factura.trim(),
    pedido_ref: form.pedido_ref.trim(),
    motivo: form.motivo,
    descripcion: form.descripcion.trim(),
   };
   const { error } = await supabase.from('pqrs').update(cambios).eq('id', modEditar.id);
   if (error) { showToast(mensajeError(error, "la PQRS"),"error"); return; }
   cerrarFormulario();
   showToast(" PQRS actualizada","success");
   if (recargar) await recargar();
   return;
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
  if (error) { showToast(mensajeError(error, "la PQRS"),"error"); return; }
  setModNueva(false); setForm(vacio);
  showToast(` PQRS creada Caso: ${nueva.id}`,"success");
  if (recargar) await recargar();
 };

 const guardarGestion = async () => {
  if ((modGestion.respuesta||"").trim() || modGestion.fecha_gestion || modGestion.gestionado_por) {
   showToast("La respuesta de esta PQRS ya fue registrada y no se puede editar","error");
   return;
  }
  if (!gestion.trim()) { showToast("Escribe una respuesta de gestin","error"); return; }
  const cambios = { respuesta:gestion, gestionado_por:user.nombre||user.user,
   fecha_gestion:new Date().toISOString().split("T")[0], estado:"en_gestion",
   soporte_data: gestionSoporte.data || null,
   soporte_nombre: gestionSoporte.nombre || "" };
  const { error } = await supabase.from('pqrs').update(cambios).eq('id', modGestion.id);
  if (error) { showToast(mensajeError(error, "la gestion de PQRS"),"error"); return; }
  setModGestion(null); setGestion(""); setGestionSoporte({ data:null, nombre:"" });
  showToast(" Gestion registrada","success");
  if (recargar) await recargar();
 };

 const cargarSoporteGestion = async (files) => {
  const file = files?.[0];
  if (!file) return;
  const data = await fileToBase64(file);
  setGestionSoporte({ data, nombre:file.name });
 };

 const cerrar = async (id, estado) => {
  const { error } = await supabase.from('pqrs').update({estado}).eq('id', id);
  if (error) { showToast(mensajeError(error, "el cierre de PQRS"),"error"); return; }
  showToast(`Caso ${estado==="cerrada"?"cerrado":"rechazado"}`,"success");
  if (recargar) await recargar();
 };

 const esCliente = user.rol==="cliente";
 // Gestionar una PQRS (responder y cerrarla) es tarea de la operacion, no del cliente.
 const puedeGestionar = ["admin", "operador"].includes(user.rol);
 const esOperador = user.rol==="admin"||user.rol==="operador";
 const filt = pqrs.filter(p=>{
  if (esCliente && ![user.nombre, user.user].includes(p.solicitado_por)) return false;
  const q=busq.toLowerCase();
  const okB=!busq||p.id.toLowerCase().includes(q)||p.factura.toLowerCase().includes(q)||p.pedido_ref.toLowerCase().includes(q)||p.motivo.toLowerCase().includes(q);
  const okE=filtroEst==="todos"||p.estado===filtroEst;
  return okB&&okE;
 });
 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" };
 const primaryButton = { ...buttonBase, background:"#6d42d8", borderColor:"#6d42d8", color:"#fff" };
 const pageItems = filt.slice((page - 1) * pageSize, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, filtroEst, pageSize]);

 return (
  <Pagina>
   <Encabezado
    titulo="PQRS"
    descripcion="Peticiones, quejas, reclamos y sugerencias"
    acciones={<button onClick={()=>setModNueva(true)} style={botonPrincipal}><Plus size={16}/> Nueva PQRS</button>}
   />

   {/* Cada indicador filtra por su estado; volver a tocarlo quita el filtro. */}
   <Indicadores items={[
    { label:"Abiertas", valor:pqrs.filter(x=>x.estado==="abierta").length, color:T.color.malPunto,
      activo:filtroEst==="abierta", onClick:()=>setFiltroEst(filtroEst==="abierta"?"todos":"abierta") },
    { label:"En gestion", valor:pqrs.filter(x=>x.estado==="en_gestion").length, color:T.color.ojoPunto,
      activo:filtroEst==="en_gestion", onClick:()=>setFiltroEst(filtroEst==="en_gestion"?"todos":"en_gestion") },
    { label:"Cerradas", valor:pqrs.filter(x=>x.estado==="cerrada").length, color:T.color.bienPunto,
      activo:filtroEst==="cerrada", onClick:()=>setFiltroEst(filtroEst==="cerrada"?"todos":"cerrada") },
    { label:"Todas", valor:pqrs.length, color:T.color.neutroPunto,
      activo:filtroEst==="todos", onClick:()=>setFiltroEst("todos") },
   ]}/>

   <section style={{ ...tarjeta, overflow:"hidden" }}>
    <BarraFiltros derecha={`${filt.length} de ${pqrs.length}`}>
     <Buscador valor={busq} onChange={setBusq} placeholder="Buscar caso, factura, pedido o motivo" ancho={300}/>
     <SelectFiltro valor={filtroEst} onChange={setFiltroEst} ancho={190}>
      <option value="todos">Todos los estados</option>
      <option value="abierta">Abiertas</option>
      <option value="en_gestion">En gestion</option>
      <option value="cerrada">Cerradas</option>
     </SelectFiltro>
    </BarraFiltros>

    <div style={{ overflowX:"auto" }}>
     <table style={{ width:"100%", borderCollapse:"collapse", minWidth:940 }}>
      <thead>
       <tr>
        <th style={th}>Caso</th>
        <th style={th}>Factura</th>
        <th style={th}>Pedido</th>
        <th style={th}>Motivo</th>
        <th style={th}>Solicitado por</th>
        <th style={th}>Estado</th>
        <th style={{...th, textAlign:"right"}}>Acciones</th>
       </tr>
      </thead>
      <tbody>
       {pageItems.length===0 && (
        <tr><td colSpan={7} style={{ ...td, textAlign:"center", padding:48, color:T.color.tinta3, fontSize:14 }}>
         {pqrs.length===0 ? "Sin PQRS registradas." : "Ninguna PQRS coincide con el filtro."}
        </td></tr>
       )}
       {pageItems.map(x=>{
        const estilo = x.estado==="abierta"
         ? { fondo:T.color.malSuave, texto:T.color.mal, punto:T.color.malPunto, label:"Abierta" }
         : x.estado==="en_gestion"
         ? { fondo:T.color.ojoSuave, texto:T.color.ojo, punto:T.color.ojoPunto, label:"En gestion" }
         : { fondo:T.color.bienSuave, texto:T.color.bien, punto:T.color.bienPunto, label:"Cerrada" };
        return (
         <tr key={x.id}>
          <td style={td}><span style={chipMono}>{x.id}</span></td>
          <td style={td}><span style={mono}>{x.factura || "-"}</span></td>
          <td style={{ ...td, fontWeight:600, color:T.color.tinta }}>{x.pedido_ref || "-"}</td>
          <td style={{ ...td, maxWidth:260 }}>
           <div style={{ color:T.color.tinta, fontWeight:600 }}>{x.motivo}</div>
           {x.descripcion && (
            <div style={{ ...T.texto.meta, color:T.color.tinta3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
             {x.descripcion}
            </div>
           )}
          </td>
          <td style={td}>
           <div>{x.solicitado_por || "-"}</div>
           <div style={{ ...T.texto.meta, color:T.color.tinta3 }}>{x.fecha_creacion}</div>
          </td>
          <td style={td}>
           <span style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
            borderRadius:T.radio.pastilla, background:estilo.fondo, color:estilo.texto,
            fontSize:12, fontWeight:600, whiteSpace:"nowrap",
           }}>
            <span style={{ width:6, height:6, borderRadius:3, background:estilo.punto }}/>
            {estilo.label}
           </span>
          </td>
          <td style={{ ...td, textAlign:"right" }}>
           <div style={{ display:"inline-flex", gap:6 }}>
            {(x.soporte_nombre || x.soporte_data) && (
             <button style={botonFila} onClick={()=>abrirArchivoRemoto("pqrs", x.id, "soporte_data", "soporte_nombre", x.soporte_nombre || "soporte", showToast)}>Soporte</button>
            )}
            {puedeGestionar && x.estado!=="cerrada" && (
             <button style={{ ...botonFila, background:T.color.marca, border:"none", color:"#fff" }}
              onClick={()=>{ setGestion(x.respuesta || ""); setGestionSoporte({ data:null, nombre:"" }); setModGestion(x); }}>
              Gestionar
             </button>
            )}
            {esCliente && x.estado==="abierta" && (
             <button style={botonFila} onClick={()=>abrirEditarCliente(x)}>Editar</button>
            )}
           </div>
          </td>
         </tr>
        );
       })}
      </tbody>
     </table>
    </div>

    <PieTabla
     izquierda={`${filt.length} ${filt.length===1 ? "caso" : "casos"}`}
     derecha={<Paginador total={filt.length} page={page} setPage={setPage} pageSize={pageSize}/>}
    />
   </section>

   {(modNueva||modEditar)&&(
    <ModalForm
     titulo={modEditar ? "Editar PQRS" : "Nueva PQRS"}
     descripcion="Peticion, queja, reclamo o sugerencia"
     onClose={cerrarFormulario}
     onPrimario={crear}
     textoPrimario={modEditar ? "Guardar cambios" : "Radicar PQRS"}
    >
     {!modEditar && (
      <FranjaInfo>Se generara automaticamente el numero de caso PQRS-{new Date().getFullYear()}-XXXX</FranjaInfo>
     )}
     <Fila>
      <Texto label="N factura" obligatorio mono valor={form.factura} onChange={f("factura")} placeholder="FAC-2200" />
      <Texto label="N pedido de referencia" obligatorio mono valor={form.pedido_ref} onChange={f("pedido_ref")} placeholder="PED-001" />
     </Fila>
     <Selector label="Motivo" obligatorio valor={form.motivo} onChange={f("motivo")}
      placeholder="Seleccione el motivo"
      opciones={MOTIVOS.map(m=>({ value:m, label:m }))} />
     <AreaTexto label="Descripcion detallada" obligatorio filas={4} valor={form.descripcion} onChange={f("descripcion")}
      placeholder="Describe la situacion, la fecha del evento y las personas involucradas..." />
    </ModalForm>
   )}
   {modGestion&&(
   <ModalGestion
    titulo="PQRS"
    id={modGestion.id}
    estado={
     <span style={{
      display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px",
      borderRadius:T.radio.pastilla,
      background: modGestion.estado==="abierta" ? T.color.malSuave : T.color.ojoSuave,
      color: modGestion.estado==="abierta" ? T.color.mal : T.color.ojo,
      fontSize:12, fontWeight:600,
     }}>
      <span style={{ width:6, height:6, borderRadius:3,
       background: modGestion.estado==="abierta" ? T.color.malPunto : T.color.ojoPunto }}/>
      {modGestion.estado==="abierta" ? "Abierta" : "En gestion"}
     </span>
    }
    descripcion="Registra la respuesta al cliente"
    ancho="S"
    onClose={()=>setModGestion(null)}
    onGuardar={guardarGestion}
    textoGuardar="Registrar gestion"
    textoCierre="Cerrar PQRS"
    onCierre={()=>cerrar(modGestion.id, "cerrada")}
    cierreDeshabilitado={!gestion.trim() && !modGestion.respuesta}
   >
    <Resumen titulo={modGestion.descripcion} datos={[
     { label:"Tipo", valor:modGestion.motivo },
     { label:"Factura", valor:modGestion.factura || "-", mono:true },
     { label:"Pedido", valor:modGestion.pedido_ref || "-", mono:true },
     { label:"Reportado por", valor:modGestion.solicitado_por || "-" },
     { label:"Fecha", valor:modGestion.fecha_creacion || "-" },
     { label:"Estado", valor:modGestion.estado==="abierta" ? "Abierta" : "En gestion" },
    ]}/>

    <AreaTexto label="Respuesta / gestion realizada" obligatorio filas={4}
     valor={gestion} onChange={setGestion}
     placeholder="Describe la gestion realizada..." />

    <Adjunto label="Soporte de gestion" nombre={gestionSoporte.nombre}
     acepta="image/*,.pdf,.doc,.docx,.xls,.xlsx"
     onArchivo={(file)=>cargarSoporteGestion([file])} />
   </ModalGestion>
   )}
  </Pagina>
 );
}


// SidebarApp 

function MiUbicacion({ user }) {
 const [lat, setLat] = useState(window._gpsLat || null);
 const [lng, setLng] = useState(window._gpsLng || null);
 const [on, setOn] = useState(window._gpsOn || false);
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
   <h2 style={{margin:"0 0 22px",color:P[800],fontWeight:900}}> Mi Ubicacion GPS</h2>
   <Card style={{marginBottom:16}}>
    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
     <div style={{flex:1,fontSize:14}}>
      {lat&&lng?<><strong>Lat:</strong> {lat.toFixed(6)} <strong>Lng:</strong> {lng.toFixed(6)}</>:<span style={{color:"#94a3b8"}}>Presiona el botn para activar tu GPS</span>}
      {on&&<span style={{marginLeft:12,color:"#059669",fontWeight:700,fontSize:12}}> Compartiendo</span>}
     </div>
     <Btn variant={on?"danger":"success"} onClick={on?detener:iniciar}>{on?" Detener GPS":" Activar GPS"}</Btn>
    </div>
    {err&&<p style={{color:"#dc2626",fontSize:13,margin:"10px 0 0"}}> {err}</p>}
   </Card>
   <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${P[200]}`}}>
    <iframe title="mi-ubicacion" src={mapUrl} width="100%" height="360" style={{border:"none",display:"block"}} allowFullScreen loading="lazy"/>
   </div>
  </div>
 );
}

// Consultas (cliente interno) 

function Consultas({ pedidos, conductores, ciudades, devoluciones=[], recogidas=[], showToast }) {
 const [gpsTick, setGpsTick] = useState(0);
 useEffect(() => { const t = setInterval(()=>setGpsTick(n=>n+1), 10000); return ()=>clearInterval(t); }, []);
 const [busq, setBusq] = useState("");
 const [modMapa, setModMapa] = useState(null);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(10);

 const filtP = pedidos.filter(p => {
  const q = busq.toLowerCase();
  return !busq ||
   (p.id || "").toLowerCase().includes(q) ||
   (p.cliente || "").toLowerCase().includes(q) ||
   (p.factura || "").toLowerCase().includes(q) ||
   (p.ciudad_nombre || "").toLowerCase().includes(q) ||
   (p.guia_interna || "").toLowerCase().includes(q) ||
   (p.guia_paqueteria || "").toLowerCase().includes(q);
 });
 const pageItems = filtP.slice((page - 1) * pageSize, page * pageSize);
 useEffect(() => { setPage(1); }, [busq, pageSize]);

 const border = "#e5e7eb";
 const cardStyle = { background:"#fff", border:`1px solid ${border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(15,23,42,.03)" };
 const buttonBase = { border:`1px solid ${border}`, background:"#fff", color:"#111827", borderRadius:12, padding:"8px 12px", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" };
 const activos = filtP.filter(p => ["sin_asignar", "pendiente", "en_transito", "paqueteria"].includes(p.estado)).length;
 const entregados = filtP.filter(p => p.estado === "entregado").length;
 const novedades = filtP.filter(p => p.estado === "novedad" || p.novedad).length;
 const totalCajas = filtP.reduce((a,p)=>a+(parseInt(p.cajas)||0),0);

 const renderMapa = (p, cond, ciudad) => {
  const gps = p.conductor_id && window._gpsData && window._gpsData[String(p.conductor_id)];
  const gpsReciente = gps && (Date.now()-gps.ts) < 300000;
  const entregado = ["entregado","novedad"].includes(p.estado);
  if (entregado) return (
   <div style={{ background:"#ecfdf5", border:`1px solid #a7f3d0`, borderRadius:12, padding:"12px 16px", color:"#059669", fontWeight:750, fontSize:13 }}>
    Pedido entregado. Rastreo GPS no disponible.
   </div>
  );
  const mapSrc = gpsReciente
   ? `https://maps.google.com/maps?q=${gps.lat},${gps.lng}&output=embed&z=15`
   : `https://maps.google.com/maps?q=${encodeURIComponent((p.direccion||"") + ", " + (ciudad?.name||p.ciudad_nombre||"") + ", Colombia")}&output=embed&z=15`;
  return (
   <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${gpsReciente ? "#6d42d8" : border}`, background:"#fff" }}>
    {gpsReciente && <div style={{ background:"#6d42d8", color:"#fff", padding:"8px 14px", fontSize:12, fontWeight:800 }}>GPS en vivo · ultima actualizacion hace {Math.round((Date.now()-gps.ts)/60000)} min</div>}
    <iframe title={"mapa-"+p.id} width="100%" height="280" style={{ border:"none", display:"block" }} src={mapSrc} allowFullScreen loading="lazy" />
    <div style={{ background:"#f8fafc", padding:"9px 14px", fontSize:12, color:"#4b5563" }}>
     {gpsReciente ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : `${p.direccion || ""}, ${ciudad?.name || p.ciudad_nombre || ""}`}
     {cond && <span style={{ marginLeft:12 }}>{cond.nombre} · {p.placa}</span>}
     {!gpsReciente && <span style={{ marginLeft:8, color:"#9ca3af" }}>(GPS no activo, mostrando destino)</span>}
    </div>
   </div>
  );
 };

 return (
  <div style={{ minHeight:"100%", background:"#fafafa", margin:"-28px -24px", color:"#111827" }}>
   <header style={{ background:"#fff", borderBottom:`1px solid ${border}`, padding:"16px 32px" }}>
    <h1 style={{ margin:0, fontSize:22, lineHeight:1.2, fontWeight:850 }}>Estado de Pedidos</h1>
    <p style={{ margin:"5px 0 0", color:"#6b7280", fontSize:14 }}>Consulta y seguimiento de pedidos registrados</p>
   </header>

   <main style={{ maxWidth:1216, margin:"0 auto", padding:"24px 24px 42px", display:"flex", flexDirection:"column", gap:18 }}>
    <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
     <div style={{ ...cardStyle, padding:18 }}><div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Total pedidos</div><div style={{ fontSize:28, fontWeight:900, marginTop:8 }}>{filtP.length}</div></div>
     <div style={{ ...cardStyle, padding:18 }}><div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Activos</div><div style={{ fontSize:28, fontWeight:900, color:"#6d42d8", marginTop:8 }}>{activos}</div></div>
     <div style={{ ...cardStyle, padding:18 }}><div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Entregados</div><div style={{ fontSize:28, fontWeight:900, color:"#059669", marginTop:8 }}>{entregados}</div></div>
     <div style={{ ...cardStyle, padding:18 }}><div style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase", fontWeight:800 }}>Novedades</div><div style={{ fontSize:28, fontWeight:900, color:"#dc2626", marginTop:8 }}>{novedades}</div></div>
    </section>

    <section style={{ ...cardStyle, padding:0, overflow:"hidden" }}>
     <div style={{ padding:16, display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"center", borderBottom:`1px solid ${border}` }}>
      <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Buscar por pedido, guia, factura, cliente o ciudad..." style={{ ...iSt, borderRadius:12, background:"#fff" }}/>
      <span style={{ color:"#6b7280", fontSize:13, whiteSpace:"nowrap" }}>{filtP.length} pedidos · {totalCajas} cajas</span>
     </div>

     <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
       <thead>
        <tr style={{ color:"#6b7280", fontSize:12, textTransform:"uppercase" }}>
         {["Pedido", "Factura", "Cliente", "Destino", "Cajas", "Estado", "Transporte", "Acciones"].map(h => (
          <th key={h} style={{ padding:"14px 16px", textAlign:h==="Acciones" ? "right" : "left", borderBottom:`1px solid ${border}`, whiteSpace:"nowrap", width:h==="Acciones" ? 220 : undefined, minWidth:h==="Acciones" ? 220 : undefined }}>{h}</th>
         ))}
        </tr>
       </thead>
       <tbody>
        {filtP.length===0 && <tr><td colSpan={8} style={{ padding:42, textAlign:"center", color:"#9ca3af" }}>Sin resultados.</td></tr>}
        {pageItems.map(p=>{
         const cond = conductores.find(c=>String(c.id)===String(p.conductor_id));
         const ciudad = (ciudades||[]).find(c=>c.code===p.ciudad_codigo);
         const soportes = p.soportes || p.soportes_data || [];
         return (
          <React.Fragment key={p.id}>
           <tr style={{ borderBottom:`1px solid ${border}` }}>
            <td style={{ padding:"16px", color:"#5b33d6", fontWeight:850 }}><div>{p.guia_interna || p.id}</div><div style={{ color:"#6b7280", fontSize:12, fontFamily:"monospace", marginTop:3 }}>{p.id}</div></td>
            <td style={{ padding:"16px", color:"#4b5563", fontFamily:"monospace" }}>{p.factura}</td>
            <td style={{ padding:"16px", fontWeight:750 }}>{p.cliente}</td>
            <td style={{ padding:"16px" }}><div>{p.ciudad_nombre}</div><div style={{ color:"#6b7280", fontSize:12 }}>{p.direccion}</div></td>
            <td style={{ padding:"16px", fontWeight:850 }}>{p.cajas}</td>
            <td style={{ padding:"16px" }}><Badge estado={p.estado}/></td>
            <td style={{ padding:"16px" }}>{(() => { const tr = transportePedido(p, cond); if (tr.noAplica) return <span style={{ color:"#9ca3af" }}>No aplica</span>; if (!tr.principal) return <span style={{ color:"#9ca3af" }}>Sin conductor</span>; return <><div>{tr.principal}</div><div style={{ color:"#6b7280", fontSize:12, fontFamily:"monospace" }}>{tr.detalle}</div></>; })()}</td>
            <td style={{ padding:"16px", textAlign:"right", minWidth:220, width:220 }}><div style={{ display:"inline-flex", gap:8, flexWrap:"nowrap", justifyContent:"flex-end", alignItems:"center", whiteSpace:"nowrap" }}>{soportes.length>0&&<button style={{ ...buttonBase, color:"#059669", whiteSpace:"nowrap" }} onClick={()=>verPDFSoportes(p, showToast)}>Soportes ({soportes.length})</button>}<button style={{ ...buttonBase, whiteSpace:"nowrap" }} onClick={()=>setModMapa(modMapa?.id===p.id?null:p)}>{modMapa?.id===p.id?"Ocultar":"Rastreo"}</button></div></td>
           </tr>
           {modMapa?.id===p.id && <tr><td colSpan={8} style={{ padding:16, background:"#fafafa", borderBottom:`1px solid ${border}` }}>{renderMapa(p, cond, ciudad)}</td></tr>}
          </React.Fragment>
         );
        })}
       </tbody>
      </table>
     </div>
     <PaginationControls total={filtP.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />
    </section>
   </main>
  </div>
 );
}


export default function SomosProTracking() {
 const [user,      setUser]      = useState(null);
 const [tab,      setTab]      = useState("");
 const [cargando,    setCargando]    = useState(true);
 const [pedidos,    setPedidos]    = useState([]);
 const [conductores,  setConductores]  = useState([]);
 const [transportistas, setTransportistas] = useState([]);
 const [usuarios,    setUsuarios]    = useState([]);
 const [ciudades,    setCiudades]    = useState(CIUDADES_BASE);
 const [paqueterias,  setPaqueterias]  = useState([]);
 const [devoluciones,  setDevoluciones]  = useState([]);
 const [recogidas,   setRecogidas]   = useState([]);
 const [pqrs,      setPqrs]      = useState([]);
 const [promesas,    setPromesas]    = useState([]);
 const [facturas,    setFacturas]    = useState([]);
 const [collapsed,   setCollapsed]   = useState(false);
 const esMovil = useEsMovil();
 const [modCompartir,  setModCompartir]  = useState(false);
 // Lo que se elige en el buscador del dashboard: Pedidos se abre con esa consulta
 // ya aplicada, en vez de dejar al usuario buscando otra vez.
 const [busquedaPedidos, setBusquedaPedidos] = useState("");
 // Navegar por el menu o por las tarjetas del dashboard limpia esa consulta. Sin
 // esto, cada regreso a Pedidos volvia a aplicar la ultima busqueda, y cualquier
 // enlace terminaba mostrando siempre el mismo pedido.
 const [estadoPedidos, setEstadoPedidos] = useState("");
 const navegar = (destino) => { setBusquedaPedidos(""); setEstadoPedidos(""); setTab(destino); };
 const [toast,     setToast]     = useState(null);

 const showToast = (msg, type = "info") => setToast({ msg, type });

 const cargarTodo = async (perfil = user, { silencioso = false } = {}) => {
  if (!silencioso) setCargando(true);
  try {
   const rolActual = perfil?.rol;
   // Los roles del modulo de cartera no usan ninguna de estas tablas. Cargarlas
   // gastaria egress para nada y, ademas, la verificacion de usuarios de mas abajo
   // los sacaria de la aplicacion: sus politicas RLS no les dejan ver la tabla.
   if (ROLES_CARTERA.includes(rolActual)) { setCargando(false); return; }
   const puedeVerFacturas = ["admin", "operador"].includes(rolActual);
   const pedidosSelect = columnasPedidos(rolActual);
   const devolucionesSelect = COLUMNAS_DEVOLUCIONES;
   const recogidasSelect = COLUMNAS_RECOGIDAS;
   const pqrsSelect = COLUMNAS_PQRS;

   const [
    usuRes, traRes, conRes,
    pedRes, ciuRes, paqRes,
    devRes, recRes, pqrsRes,
    promRes,
   ] = await Promise.all([
    supabase.from('usuarios').select('*').order('created_at'),
    supabase.from('transportistas').select('*').order('created_at'),
    supabase.from('conductores').select('*').order('created_at'),
    cargarTodosLosPedidos(pedidosSelect),
    supabase.from('ciudades').select('*').order('name'),
    supabase.from('paqueterias').select('*').order('nombre'),
    supabase.from('devoluciones').select(devolucionesSelect).order('created_at', { ascending: false }),
    supabase.from('recogidas').select(recogidasSelect).order('created_at', { ascending: false }),
    supabase.from('pqrs').select(pqrsSelect).order('created_at', { ascending: false }),
    supabase.from('promesas_servicio').select('*'),
   ]);
   const results = [usuRes, traRes, conRes, pedRes, ciuRes, paqRes, devRes, recRes, pqrsRes, promRes];
   const failed = results.find(r => r.error);
   if (failed) throw failed.error;

   const { data: usu } = usuRes;
   const { data: tra } = traRes;
   const { data: con } = conRes;
   const { data: ped } = pedRes;
   const { data: ciu } = ciuRes;
   const { data: paq } = paqRes;
   const { data: dev } = devRes;
   const { data: rec } = recRes;
   const { data: pqrsd } = pqrsRes;
   const { data: prom } = promRes;

   // Si no hay usuarios en Supabase, detener carga. No sembrar datos desde el cliente.
   if (usu.length === 0) {
    showToast('No hay usuarios visibles en Supabase. Verifica datos, Auth o politicas RLS.', 'error');
    setCargando(false);
    return;
   }

   setUsuarios(usu || []);
   setTransportistas(tra || []);
   setConductores(con || []);
   setPedidos(ped || []);
   if (ciu && ciu.length > 0) setCiudades(ciu);
   setPaqueterias((paq || []).map(p => p.nombre));
   setDevoluciones(dev || []);
   setRecogidas(rec || []);
   setPqrs(pqrsd || []);
   setPromesas(prom || []);
   // Cargar facturas por separado - sin join anidado
   if (puedeVerFacturas) {
    try { setFacturas(await obtenerFacturasConGuias()); }
    catch(e) { console.error('facturas load error:', e); setFacturas([]); }
   } else {
    setFacturas([]);
   }
  } catch (e) {
   console.error('Error cargando datos:', e);
   showToast('No se pudo cargar Supabase: '+(e.message || 'verifica variables y permisos.'), 'error');
  }
  setCargando(false);
 };

 // Refresco en segundo plano: no muestra la pantalla de bienvenida, para no
 // desmontar la interfaz y hacerle perder al usuario modales, formularios y filtros.
 const refrescar = () => cargarTodo(user, { silencioso: true });

 // Refresco dirigido: despues de guardar, cada modulo recarga solo las tablas que
 // sus propias acciones pueden cambiar, en lugar de las diez de cargarTodo() (que
 // incluyen los miles de pedidos). Es lo que se hizo primero en Usuarios, donde el
 // usuario eliminado tardaba en desaparecer: ademas de responder al instante, evita
 // volver a descargar toda la base en cada guardado, el otro foco de egress.
 const recargadores = {
  usuarios: async () => {
   const { data, error } = await supabase.from('usuarios').select('*').order('created_at');
   if (!error && data) setUsuarios(data);
  },
  conductores: async () => {
   const { data, error } = await supabase.from('conductores').select('*').order('created_at');
   if (!error && data) setConductores(data);
  },
  transportistas: async () => {
   const { data, error } = await supabase.from('transportistas').select('*').order('created_at');
   if (!error && data) setTransportistas(data);
  },
  pedidos: async () => {
   const { data, error } = await cargarTodosLosPedidos(columnasPedidos(user?.rol));
   if (!error && data) setPedidos(data);
  },
  ciudades: async () => {
   const { data, error } = await supabase.from('ciudades').select('*').order('name');
   if (!error && data && data.length > 0) setCiudades(data);
  },
  paqueterias: async () => {
   const { data, error } = await supabase.from('paqueterias').select('*').order('nombre');
   if (!error && data) setPaqueterias(data.map(x => x.nombre));
  },
  promesas: async () => {
   const { data, error } = await supabase.from('promesas_servicio').select('*');
   if (!error && data) setPromesas(data);
  },
  devoluciones: async () => {
   const { data, error } = await supabase.from('devoluciones').select(COLUMNAS_DEVOLUCIONES).order('created_at', { ascending: false });
   if (!error && data) setDevoluciones(data);
  },
  recogidas: async () => {
   const { data, error } = await supabase.from('recogidas').select(COLUMNAS_RECOGIDAS).order('created_at', { ascending: false });
   if (!error && data) setRecogidas(data);
  },
  pqrs: async () => {
   const { data, error } = await supabase.from('pqrs').select(COLUMNAS_PQRS).order('created_at', { ascending: false });
   if (!error && data) setPqrs(data);
  },
  facturas: async () => {
   try { setFacturas(await obtenerFacturasConGuias()); } catch (e) { console.error('facturas refresh error:', e); }
  },
 };
 const refrescarTablas = (...nombres) => Promise.all(nombres.map(n => recargadores[n]()));

 // Un usuario con rol conductor o transportista tambien crea o desvincula filas en
 // esas dos tablas, por eso Usuarios y Conductores recargan las tres juntas.
 const recargarUsuarios = () => refrescarTablas("usuarios", "conductores", "transportistas");
 const recargarConductores = () => refrescarTablas("conductores", "usuarios");
 const recargarTransportistas = () => refrescarTablas("transportistas", "conductores", "usuarios");
 const recargarPedidos = () => refrescarTablas("pedidos");
 const recargarCiudades = () => refrescarTablas("ciudades");
 const recargarPaqueterias = () => refrescarTablas("paqueterias");
 const recargarPromesas = () => refrescarTablas("promesas");
 const recargarDevoluciones = () => refrescarTablas("devoluciones");
 const recargarRecogidas = () => refrescarTablas("recogidas");
 const recargarPqrs = () => refrescarTablas("pqrs");
 const recargarFacturas = () => refrescarTablas("facturas");

 const showToastYRecargar = async (msg, type = "success") => {
  showToast(msg, type);
  await refrescar();
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
  const def = { admin: "dashboard", operador: "dashboard", transportista: "mi_empresa", conductor: "mis_pedidos", cliente: "consultas", cartera: "cartera_cargar" };
  setTab(def[u.rol] || "dashboard");
  await cargarTodo(userWithConductorId);
 };

 const handleLogout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setTab("");
 };

 useEffect(() => {
  let mounted = true;

  const restaurarSesion = async () => {
   setCargando(true);
   try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const authUser = sessionData?.session?.user;
    if (!authUser) {
     if (mounted) setCargando(false);
     return;
    }

    const { data: perfil, error: perfilError } = await supabase
     .from('usuarios')
     .select('*')
     .eq('auth_user_id', authUser.id)
     .maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil) {
     await supabase.auth.signOut();
     if (mounted) {
      showToast("Sesion sin perfil asignado. Inicia sesion nuevamente.","error");
      setCargando(false);
     }
     return;
    }

    if (mounted) await handleLogin(perfil);
   } catch (error) {
    console.error("No se pudo restaurar sesion:", error);
    await supabase.auth.signOut();
    if (mounted) {
     setUser(null);
     setTab("");
     setCargando(false);
    }
   }
  };

  restaurarSesion();
  const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
   if (event === "SIGNED_OUT") {
    setUser(null);
    setTab("");
   }
  });

  return () => {
   mounted = false;
   authListener?.subscription?.unsubscribe();
  };
 }, []);

 useEffect(() => {
  const check = () => setCollapsed(window.innerWidth < 820);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
 }, []);

 if (cargando) return (
  <div style={{ minHeight:"100vh", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:18, fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
   <img src={logoSrc} alt="SomosPro" style={{ width:88, height:88, objectFit:"contain" }} />
   <div style={{ color:"#18213f", fontSize:20, fontWeight:800, textAlign:"center" }}>Bienvenido a SomosPro</div>
  </div>
 );

 if (!user) return <Login onLogin={handleLogin} />;

 const props = { pedidos, setPedidos, conductores, setConductores, usuarios, setUsuarios, showToast, user };

 window._recargar = refrescar;
 // Para los flujos que solo tocan pedidos (subir soportes desde el detalle).
 window._recargarPedidos = recargarPedidos;

 const renderContent = () => {
  const sb = supabase;
  const re = cargarTodo;
  switch (tab) {
   case "dashboard":   return <Dashboard pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas} pqrs={pqrs} promesas={promesas} ciudades={ciudades} setActiveTab={navegar}
    onBuscarPedido={(q)=>{ setBusquedaPedidos(q); setEstadoPedidos(""); setTab("pedidos"); }}
    onVerEstado={(e)=>{ setBusquedaPedidos(""); setEstadoPedidos(e); setTab("pedidos"); }}/>;
   case "pedidos":    return <Pedidos pedidos={pedidos} setPedidos={setPedidos} conductores={conductores} ciudades={ciudades} showToast={showToast} paqueterias={paqueterias} transportistas={transportistas} promesas={promesas} busquedaInicial={busquedaPedidos} estadoInicial={estadoPedidos} recargar={recargarPedidos} user={user}/>;
   case "rastreo":    return <RastreoGPS pedidos={pedidos} conductores={conductores} ciudades={ciudades}/>;
   case "conductores":  return <Conductores conductores={conductores} pedidos={pedidos} showToast={showToast} transportistas={transportistas} recargar={recargarConductores}
    onVerPedidos={(c)=>{ setEstadoPedidos(""); setBusquedaPedidos(c.placa || c.nombre || ""); setTab("pedidos"); }}/>;
   case "transportistas": return <Transportistas transportistas={transportistas} conductores={conductores} pedidos={pedidos} showToast={showToast} user={{rol:"admin",nombre:"Admin"}} recargar={recargarTransportistas} setActiveTabExterno={navegar}/>;
   case "resumen":    return <ResumenTransportador pedidos={pedidos} conductores={conductores} devoluciones={devoluciones} recogidas={recogidas}/>;
   case "facturas":    return user.rol==="admin"||user.rol==="operador"
    ? <FacturasProveedor facturas={facturas} transportistas={transportistas} pedidos={pedidos} showToast={showToast} recargar={recargarFacturas}/>
    : <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
   case "promesas":    return <GestionPromesas promesas={promesas} ciudades={ciudades} showToast={showToast} recargar={recargarPromesas}/>;
   case "ciudades":    return <Ciudades ciudades={ciudades} pedidos={pedidos} showToast={showToast} recargar={recargarCiudades}/>;
   case "paqueterias":  return <GestionPaqueterias paqueterias={paqueterias} pedidos={pedidos} showToast={showToast} recargar={recargarPaqueterias}/>;
   case "usuarios":    return <Usuarios usuarios={usuarios} transportistas={transportistas} showToast={showToast} recargar={recargarUsuarios}/>;
   case "mi_empresa":   return <Transportistas transportistas={transportistas} conductores={conductores} pedidos={pedidos} showToast={showToast} user={user} recargar={recargarTransportistas}/>;
   case "mis_pedidos":  return <MisPedidosConductor pedidos={pedidos} user={user} conductores={conductores} ciudades={ciudades} showToast={showToast} recargar={recargarPedidos}/>;
   case "mis_devoluciones": return <MisDevolucionesConductor devoluciones={devoluciones} user={user}/>;
   case "mis_recogidas": return <MisRecogidasConductor recogidas={recogidas} user={user}/>;
   case "mi_ubicacion":  return <MiUbicacion user={user}/>;
   case "consultas":   return <Consultas pedidos={pedidos} conductores={conductores} ciudades={ciudades} devoluciones={devoluciones} recogidas={recogidas} showToast={showToast}/>;
   case "pqrs":      return <ModuloPQRS pqrs={pqrs} pedidos={pedidos} showToast={showToast} user={user} recargar={recargarPqrs}/>;
   case "devoluciones":  return <ModuloDevoluciones devoluciones={devoluciones} conductores={conductores} ciudades={ciudades} transportistas={transportistas} paqueterias={paqueterias} showToast={showToast} user={user} recargar={recargarDevoluciones}/>;
   case "recogidas":   return <ModuloRecogidas recogidas={recogidas} conductores={conductores} ciudades={ciudades} transportistas={transportistas} paqueterias={paqueterias} showToast={showToast} user={user} recargar={recargarRecogidas}/>;
   // Modulo de cartera: todas sus vistas entran por el mismo despachador.
   case "cartera_sedes":
   case "cartera_asesores":
   case "cartera_vencida":
   case "cartera_cargar":
   case "cartera_pedidos":
   case "cartera_logistica":
   case "cartera_consultas":
    return <ModuloCartera tab={tab} user={user} showToast={showToast} setTab={setTab}/>;
   default:        return <Dashboard pedidos={pedidos} conductores={conductores}/>;
  }
 };

 return (
  <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#fafafa" }}>
   {!esMovil && (
    <SidebarApp user={user} activeTab={tab} setActiveTab={navegar} onLogout={handleLogout} onShareApp={()=>setModCompartir(true)} collapsed={collapsed} setCollapsed={setCollapsed} pqrs={pqrs} />
   )}
   <main style={{
    flex: 1, overflowY: "auto", maxWidth: "100%", boxSizing: "border-box", background: "#fafafa",
    padding: esMovil ? "16px 16px " + (ALTO_BARRA + 16) + "px" : "28px 24px",
   }}>
    {renderContent()}
   </main>
   {esMovil && (
    <NavegacionMovil user={user} activeTab={tab} setActiveTab={navegar} onLogout={handleLogout} onShareApp={()=>setModCompartir(true)} />
   )}
   {modCompartir && <LinkCompartir onClose={()=>setModCompartir(false)} />}
   {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
  </div>
 );
}


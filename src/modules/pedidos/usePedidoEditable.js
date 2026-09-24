import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ESTADOS_PEDIDO, ESTADOS_SIN_DESPACHO } from '../../Constants';
import { mensajeError } from '../../utils/errors';
import { numTexto, cargarSoportesPedido } from '../../utils/pedidos';

// Toda la edicion de un pedido -- el formulario, las reglas de estado y el
// guardado -- vive aqui y no en la pantalla. El modal de escritorio y la
// pantalla del celular la comparten, de modo que guardar signifique lo mismo en
// los dos sitios: las reglas de Cliente Recoge, el cierre con soportes y el
// trigger que exige que el conductor no toque nada mas se aplican una sola vez.
export function usePedidoEditable({
 pedido, conductores, ciudades, promesas = [], setPedidos, showToast, onClose,
 canEdit, canBasicEdit = false, canAssign = false, canDeliver = false,
}) {
 const [condId,   setCondId]   = useState(pedido.conductor_id||"") ;
 const [direccion, setDireccion] = useState(pedido.direccion||"");
 const [cajas,   setCajas]   = useState(numTexto(pedido.cajas));
 const [estadoDesp, setEstadoDesp] = useState(ESTADOS_SIN_DESPACHO.includes(pedido.estado) ? pedido.estado : (pedido.estado_despacho||"despachado"));
 const [novedad,  setNovedad]  = useState(pedido.novedad||false);
 const [tipoModal, setTipoModal] = useState(pedido.tipo||"propio");
 const [facturaEdit, setFacturaEdit] = useState(pedido.factura||"");
 const [fechaEdit,  setFechaEdit]  = useState(pedido.fecha_estimada||"");
 const [ciudadEdit, setCiudadEdit] = useState(pedido.ciudad_codigo||"");
 const [notasEdit, setNotasEdit] = useState(pedido.notas||"");
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
   notas: notasEdit,
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
  if (notasEdit !== (pedido.notas || "")) cambios.notas = notasEdit;
  return cambios;
 };

 // Registra la entrega en una sola escritura: los soportes, el cierre y -- si
 // el pedido era Cliente recoge o Solo facturar -- la modalidad, que hay que
 // conservar en estado_despacho porque la columna estado pasa a "entregado".
 // La usan la pantalla del conductor y la del operador, para que cerrar un
 // pedido signifique lo mismo en las dos.
 const registrarEntrega = async ({ fotos = [], conNovedad = false, fechaReal = null, recibe = {} }) => {
  if (pedidoCerrado) {
   showToast("No se puede modificar un pedido que ya fue entregado", "error");
   return false;
  }
  if (pedidoEnTransito && !canDeliver) {
   showToast("Solo el conductor puede registrar la entrega de un pedido en transito", "error");
   return false;
  }
  if (fotos.length === 0) {
   showToast("Adjunta al menos un soporte de entrega", "error");
   return false;
  }

  // Los soportes viejos no viajan en el listado: si el pedido ya tenia, hay
  // que traerlos antes de escribir o se perderian.
  let previos = soportesData;
  if (previos.length === 0 && (pedido.soportes || []).length > 0) {
   try { previos = await cargarSoportesPedido(pedido.id); } catch (e) { previos = []; }
  }

  const modalidad = ESTADOS_SIN_DESPACHO.includes(estadoDesp) ? estadoDesp
   : ESTADOS_SIN_DESPACHO.includes(pedido.estado) ? pedido.estado : null;

  const cambios = {
   soportes: [
    ...(pedido.soportes || []),
    ...fotos.map((_, i) => `soporte_${pedido.id}_${(pedido.soportes || []).length + i + 1}.jpg`),
   ],
   soportes_data: [...previos, ...fotos],
   estado: conNovedad ? "novedad" : "entregado",
   fecha_real: fechaReal || new Date().toISOString().split("T")[0],
   novedad: conNovedad,
   ...(modalidad ? { estado_despacho: modalidad } : {}),
  };

  // Quien recibio y donde. Van aparte porque son columnas nuevas: si la base
  // no las tiene todavia, la entrega se guarda igual sin ellas.
  const extras = {};
  for (const [k, v] of Object.entries(recibe)) {
   if (v !== null && v !== undefined && v !== "") extras[k] = v;
  }

  setPedidos(prev => prev.map(x => x.id === pedido.id ? { ...x, ...cambios } : x));
  showToast("Guardando...", "info");

  let { error } = await supabase.from("pedidos")
   .update({ ...cambios, ...extras }).eq("id", pedido.id).select("id").single();
  if (error && /column .* does not exist|could not find the .* column/i.test(error.message || "")) {
   showToast("Falta correr docs/pedidos_entrega.sql: se guarda la entrega sin los datos de quien recibe", "warning");
   ({ error } = await supabase.from("pedidos")
    .update(cambios).eq("id", pedido.id).select("id").single());
  }
  if (error) {
   showToast(mensajeError(error, "el registro de la entrega"), "error");
   return false;
  }

  showToast("Entrega registrada", "success");
  if (window._recargarPedidos) await window._recargarPedidos();
  onClose();
  return true;
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

 return {
  condId,
  setCondId,
  direccion,
  setDireccion,
  cajas,
  setCajas,
  estadoDesp,
  setEstadoDesp,
  novedad,
  setNovedad,
  tipoModal,
  setTipoModal,
  facturaEdit,
  setFacturaEdit,
  fechaEdit,
  setFechaEdit,
  ciudadEdit,
  setCiudadEdit,
  notasEdit,
  setNotasEdit,
  empTrans,
  setEmpTrans,
  paqModal,
  setPaqModal,
  guiaPaq,
  setGuiaPaq,
  verMapa,
  setVerMapa,
  verGuia,
  setVerGuia,
  verCamara,
  setVerCamara,
  novedadEntrega,
  setNovedadEntrega,
  soportesData,
  setSoportesData,
  fotosPendientes,
  setFotosPendientes,
  cond,
  ciudad,
  promesa,
  fechaLimitePromesa,
  fuenteRiesgo,
  tieneSoportes,
  pedidoCerrado,
  pedidoEnTransito,
  pedidoBloqueadoEdicion,
  puedeMarcarNovedadEntrega,
  sinTransporte,
  conductoresActivos,
  conductorHistorico,
  conductoresOpciones,
  guardar,
  registrarEntrega,
  cambiosPendientesDelFormulario,
  adjuntarFotos,
  caPrev,
 };
}

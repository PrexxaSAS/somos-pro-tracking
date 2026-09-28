// Renderiza las pantallas fuera del navegador para que un identificador que no
// existe o una prop mal pasada salgan aqui y no como una pantalla en blanco.
// El build no lo detecta: esbuild no resuelve identificadores.
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');

const raiz = process.cwd();
// El temporal va dentro del proyecto para que esbuild encuentre node_modules.
const tmp = fs.mkdtempSync(path.join(raiz, 'node_modules', '.render-'));

const entrada = `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Dashboard } from '${raiz.replace(/\\/g, '/')}/src/modules/dashboard/Dashboard';
import { NavegacionMovil, HojaMas } from '${raiz.replace(/\\/g, '/')}/src/components/layout/NavegacionMovil';
import { SidebarApp, MENUS } from '${raiz.replace(/\\/g, '/')}/src/components/layout/SidebarApp';
import { PedidosMovil, HojaFiltros } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/PedidosMovil';
import { DetallePedidoMovil } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/DetallePedidoMovil';
import { ModalDetalle, Consultas } from '${raiz.replace(/\\/g, '/')}/src/SomosProTracking';
import { EditarPedidoMovil, HojaConductores } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/EditarPedidoMovil';
import { RegistrarEntregaMovil } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/RegistrarEntregaMovil';
import { RegistrarEntregaOperador } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/RegistrarEntregaOperador';
import { GuiaImprimible } from '${raiz.replace(/\\/g, '/')}/src/components/delivery/GuiaImprimible';
import { GestionAsesores } from '${raiz.replace(/\\/g, '/')}/src/modules/cartera/ModuloCartera';
import { TarjetaEntrega, TarjetaEntregada, TarjetaDevolucion, TarjetaRecogida, CabeceraConductor, ProgresoRuta, Pestanas, ListaVacia, ReordenarRuta } from '${raiz.replace(/\\/g, '/')}/src/modules/conductor/PantallasConductor';
import { ordenarRuta } from '${raiz.replace(/\\/g, '/')}/src/modules/conductor/ruta';
import { DetallePedidoConductor } from '${raiz.replace(/\\/g, '/')}/src/modules/conductor/DetallePedidoConductor';
import { NuevoPedidoMovil } from '${raiz.replace(/\\/g, '/')}/src/modules/pedidos/NuevoPedidoMovil';
import { GestionEnvioMovil } from '${raiz.replace(/\\/g, '/')}/src/modules/gestion/GestionEnvioMovil';
import { GestionPqrsMovil } from '${raiz.replace(/\\/g, '/')}/src/modules/gestion/GestionPqrsMovil';

const pedidos = [
 { id:"PX000119704", estado:"en_transito", fecha_creacion:"2026-09-01", ciudad_codigo:"05001", ciudad_nombre:"Medellin", cliente:"ACME", cajas:4, conductor_id:7, guia_interna:"SPT-2026-0138" },
 { id:"PX000119696", estado:"entregado", fecha_creacion:"2026-09-02", fecha_real:"2026-09-04", ciudad_codigo:"05001", ciudad_nombre:"Medellin", cliente:"Beta", cajas:1 },
 { id:"PX000119693", estado:"sin_asignar", fecha_creacion:"2026-08-20", ciudad_codigo:"05001", ciudad_nombre:"Medellin", cliente:"Gamma", cajas:2 },
 { id:"PX000119690", estado:"paqueteria", tipo:"paqueteria", paqueteria:"Servientrega", guia_paqueteria:"SRV-1", fecha_creacion:"2026-08-18", ciudad_codigo:"11001", ciudad_nombre:"Bogota", cliente:"Delta", cajas:6 },
 { id:"PX000119688", estado:"novedad", novedad:true, fecha_creacion:"2026-08-17", ciudad_codigo:"11001", ciudad_nombre:"Bogota", cliente:"Epsilon con un nombre muy largo que no cabe", cajas:3 },
 { id:"PX000119687", estado:"solo_facturar", fecha_creacion:"2026-08-16", ciudad_codigo:"11001", ciudad_nombre:"Bogota", cliente:"Zeta", cajas:0 },
];
const promesas = [{ ciudad_codigo:"05001", dias_plazo:2 }];
const pqrs = [{ id:1, estado:"en_gestion" }];
const ROLES_PRUEBA = ["admin","operador","cartera","transportista","conductor","cliente"];

const casos = [];
casos.push(["Dashboard", React.createElement(Dashboard, {
 pedidos, conductores:[], devoluciones:[], recogidas:[], pqrs, promesas,
 ciudades:[{ code:"05001", name:"Medellin" }], setActiveTab(){}, onBuscarPedido(){}, onVerEstado(){},
})]);
casos.push(["PedidosMovil", React.createElement(PedidosMovil, {
 pedidos, filtrados: pedidos,
 conductores:[{ id:7, nombre:"J. Castrillon", placa:"ABC123" }],
 ciudades:[{ code:"05001", name:"Medellin" }, { code:"11001", name:"Bogota" }],
 conductoresActivos:[{ id:7, nombre:"J. Castrillon", placa:"ABC123" }],
 busq:"", setBusq(){}, filtro:"todos", setFiltro(){},
 conteoPorEstado: () => 3,
 estadosOrden:["sin_asignar","pendiente","en_transito","paqueteria","entregado","novedad","solo_facturar","cliente_recoge"],
 rango:"todo", setRango(){}, ciudadF:"", setCiudadF(){},
 conductorF:"", setConductorF(){}, tipoF:"", setTipoF(){},
 onAbrir(){}, onNuevo(){}, onPlanilla(){}, onCSV(){}, onCargarGuias(){}, avisos:1,
})]);

casos.push(["HojaFiltros", React.createElement(HojaFiltros, {
 pedidos,
 ciudades:[{ code:"05001", name:"Medellin" }, { code:"11001", name:"Bogota" }],
 conductoresActivos:[{ id:7, nombre:"J. Castrillon" }],
 total: pedidos.length,
 rango:"30", setRango(){}, ciudadF:"05001", setCiudadF(){},
 conductorF:"sin", setConductorF(){}, tipoF:"paqueteria", setTipoF(){},
 onLimpiar(){}, onClose(){},
})]);

// Cada estado dibuja una cabecera, un bloque y un pie distintos.
for (const p of pedidos) {
 casos.push(["DetallePedidoMovil/" + p.estado, React.createElement(DetallePedidoMovil, {
  pedido: p,
  conductor: p.conductor_id ? { id:7, nombre:"Juan Esteban Castrillon", placa:"NLX290", celular:"3001234567" } : undefined,
  promesa: { ciudad_codigo:p.ciudad_codigo, dias_plazo:2 },
  onCerrar(){}, onEditar(){}, onGuia(){}, onAcciones(){},
 })]);
}
// El modal de escritorio comparte el hook de edicion con la pantalla del
// celular: se prueba en los dos permisos que cambian lo que se puede tocar.
for (const [nombre, permisos] of [
 ["admin", { canEdit:true, canBasicEdit:false, canAssign:false, canDeliver:false }],
 ["operador", { canEdit:false, canBasicEdit:true, canAssign:true, canDeliver:false }],
 ["conductor", { canEdit:false, canBasicEdit:false, canAssign:false, canDeliver:true }],
]) {
 casos.push(["ModalDetalle/" + nombre, React.createElement(ModalDetalle, {
  pedido: pedidos[0],
  conductores:[{ id:7, nombre:"J. Castrillon", placa:"ABC123", activo:true }],
  ciudades:[{ code:"05001", name:"Medellin" }],
  transportistas:[], paqueterias:[], promesas:[{ ciudad_codigo:"05001", dias_plazo:2 }],
  onClose(){}, setPedidos(){}, showToast(){}, ...permisos,
 })]);
}

// La edicion cambia de forma con el estado (editable vs bloqueado) y con el
// tipo de transporte, que decide que campos aparecen.
for (const p of pedidos) {
 casos.push(["EditarPedidoMovil/" + p.estado, React.createElement(EditarPedidoMovil, {
  pedido: p, pedidos,
  conductores:[{ id:7, nombre:"J. Castrillon", placa:"ABC123", activo:true, empresa:"Transportes Prueba" }],
  ciudades:[{ code:"05001", name:"Medellin" }, { code:"11001", name:"Bogota" }],
  paqueterias:[{ id:1, nombre:"Servientrega" }], transportistas:[{ id:1, nombre:"Transportes Prueba" }],
  promesas:[{ ciudad_codigo:"05001", dias_plazo:2 }],
  setPedidos(){}, showToast(){}, onClose(){}, onGuia(){}, onMapa(){},
  canEdit:true,
 })]);
}
// Un pedido sin nada: los cuatro faltantes a la vez.
casos.push(["EditarPedidoMovil/vacio", React.createElement(EditarPedidoMovil, {
 pedido: { id:"PX1", estado:"sin_asignar" }, pedidos:[],
 conductores:[], ciudades:[], promesas:[],
 setPedidos(){}, showToast(){}, onClose(){}, onGuia(){}, onMapa(){}, canEdit:true,
})]);

// Los tres pasos se dibujan en el mismo componente segun su estado interno;
// aqui se comprueba el primero, que es el que monta la camara y el GPS.
for (const p of [pedidos[0], { id:"Z", estado:"en_transito" }]) {
 casos.push(["RegistrarEntregaMovil/" + p.id, React.createElement(RegistrarEntregaMovil, {
  pedido: p, promesa: { dias_plazo: 2 },
  onConfirmar(){}, onNovedad(){}, onClose(){},
 })]);
}

// La guia se dibuja igual en los dos anchos, y ademas monta una copia oculta
// para imprimir: el caso de paqueteria cambia el bloque del transportista.
for (const p of [pedidos[0], pedidos[3], { id:"SIN", estado:"sin_asignar" }]) {
 casos.push(["GuiaImprimible/" + p.id, React.createElement(GuiaImprimible, {
  pedido: p,
  conductores:[{ id:7, nombre:"J. Castrillon", placa:"ABC123", cedula:"1020", celular:"300", empresa:"Transportes Prueba" }],
  ciudades:[{ code:"05001", name:"Medellin" }, { code:"11001", name:"Bogota" }],
  onClose(){},
 })]);
}

// La entrega del operador: para los que nunca salen con conductor.
for (const p of [{ id:'CR', estado:'cliente_recoge', cliente:'X' }, { id:'SF', estado:'solo_facturar', cliente:'Y', soportes:['a.jpg'] }]) {
 casos.push(["RegistrarEntregaOperador/" + p.estado, React.createElement(RegistrarEntregaOperador, {
  pedido: p, conductores:[], ciudades:[], promesas:[],
  setPedidos(){}, showToast(){}, onClose(){}, canEdit:true,
 })]);
}

casos.push(["HojaConductores", React.createElement(HojaConductores, {
 conductores:[
  { id:7, nombre:"Andres Arevalo", placa:"NLX290", activo:true, empresa:"Transportes Prueba" },
  { id:8, nombre:"J. Castrillon", placa:"ABC123", activo:true },
 ],
 pedidos, tipo:"propio", seleccionado:"", onElegir(){}, onClose(){},
})]);

// Sin promesa y sin ninguna fecha: el caso que mas ramas nulas recorre.
casos.push(["DetallePedidoMovil/vacio", React.createElement(DetallePedidoMovil, {
 pedido: { id:"PX1", estado:"sin_asignar" },
 onCerrar(){}, onEditar(){}, onGuia(){}, onAcciones(){},
})]);

for (const rol of ROLES_PRUEBA) {
 const user = { nombre:"Oscar Tobon", rol };
 casos.push(["NavegacionMovil/" + rol, React.createElement(NavegacionMovil, {
  user, activeTab:"dashboard", setActiveTab(){}, onLogout(){}, onShareApp(){},
 })]);
 casos.push(["SidebarApp/" + rol, React.createElement(SidebarApp, {
  user, activeTab:"dashboard", setActiveTab(){}, onLogout(){}, onShareApp(){},
  collapsed:false, setCollapsed(){},
 })]);
 casos.push(["HojaMas/" + rol, React.createElement(HojaMas, {
  user, grupos: MENUS[rol] || [], activeTab:"dashboard",
  onIr(){}, onLogout(){}, onShareApp(){}, onClose(){},
 })]);
}

const devolucion = {
 id:"DV-1", guia:"DV-2026-0007", estado:"sin_asignar", factura:"F-991", pedido_ref:"PX000119704",
 dir_recogida:"Cra 43A 1-50", ciudad_nombre:"Medellin", unidades:3, volumen_m3:0.4, peso_kg:12,
 motivo:"Producto averiado", soporte_nombre:"soporte.pdf",
};
const recogida = {
 id:"RC-1", guia:"RC-2026-0003", estado:"en_transito", novedad:true,
 ciudad_recogida_nombre:"Bogota", ciudad_entrega_nombre:"Medellin",
 dir_recogida:"Calle 100 15-20", dir_entrega:"Cra 43A 1-50",
 unidades:8, volumen_m3:1.2, peso_kg:45, observaciones:"Llamar antes de llegar",
};

const usuarioCond = { nombre:"Juan Esteban Castrillon", rol:"conductor", placa:"NLX290" };
casos.push(["CabeceraConductor", React.createElement(CabeceraConductor, { user: usuarioCond, sobre:"Martes 23 de septiembre", titulo:"Mis entregas" })]);
casos.push(["ProgresoRuta", React.createElement(ProgresoRuta, { hechas: 4, total: 9, placa: "NLX290" })]);
casos.push(["Pestanas", React.createElement(Pestanas, { valor:"pendientes", onChange(){}, opciones:[
 { clave:"pendientes", label:"Pendientes", n:5 }, { clave:"entregadas", label:"Entregadas", n:4 }, { clave:"novedad", label:"Novedad", n:0 },
] })]);
casos.push(["TarjetaEntrega/actual", React.createElement(TarjetaEntrega, { pedido: pedidos[0], parada: 5, actual: true, promesa: promesas[0], onAbrir(){} })]);
casos.push(["TarjetaEntrega/siguiente", React.createElement(TarjetaEntrega, { pedido: pedidos[2], parada: 6, onAbrir(){} })]);
casos.push(["TarjetaEntregada/entregado", React.createElement(TarjetaEntregada, { pedido: { ...pedidos[1], soportes:["a.jpg"], recibe_nombre:"Carolina Rios" }, onAbrir(){}, onSoporte(){} })]);
casos.push(["TarjetaEntregada/novedad", React.createElement(TarjetaEntregada, { pedido: pedidos[4], onAbrir(){}, onSoporte(){} })]);
casos.push(["TarjetaDevolucion", React.createElement(TarjetaDevolucion, { d: devolucion, onSoporte(){} })]);
casos.push(["TarjetaRecogida", React.createElement(TarjetaRecogida, { r: recogida, onDocumento(){} })]);
casos.push(["ListaVacia", React.createElement(ListaVacia, null, "No tienes pedidos pendientes. Ruta terminada.")]);
casos.push(["ReordenarRuta/por_promesa", React.createElement(ReordenarRuta, { pedidos: pedidos.slice(0, 3), aMano: false, onGuardar(){}, onCancelar(){}, onRestablecer(){} })]);
casos.push(["ReordenarRuta/a_mano", React.createElement(ReordenarRuta, { pedidos: pedidos.slice(0, 3), aMano: true, onGuardar(){}, onCancelar(){}, onRestablecer(){} })]);
casos.push(["DetallePedidoConductor/en_transito", React.createElement(DetallePedidoConductor, {
 pedido: pedidos[0], parada: 5, totalParadas: 9, promesa: promesas[0],
 onCerrar(){}, onGuia(){}, onEntregar(){}, onVerSoportes(){},
})]);
casos.push(["DetallePedidoConductor/con_novedad", React.createElement(DetallePedidoConductor, {
 pedido: pedidos[0], parada: 5, totalParadas: 9, novedadInicial: true,
 fotosInicial: [{ data:"data:image/png;base64,iVBORw0KGgo=", nombre:"a.png", hora:"10:41" }],
 onCerrar(){}, onGuia(){}, onEntregar(){}, onVerSoportes(){},
})]);
casos.push(["DetallePedidoConductor/cerrado", React.createElement(DetallePedidoConductor, {
 pedido: { ...pedidos[1], soportes:["a.jpg","b.jpg"] }, onCerrar(){}, onGuia(){}, onEntregar(){}, onVerSoportes(){},
})]);

// Disenio 12: nuevo pedido en dos pasos.
const formNuevo = { id:"PED-012", cliente:"Empresa Destino S.A.S", ciudad_codigo:"05001", direccion:"Cra 15 #93-47", cajas:"10",
 factura:"FAC-3000", fecha_estimada:"", notas:"", conductor_id:"", tipo:"propio", paqueteria:"", guia_paqueteria:"" };
const ciudadesPrueba = [{ code:"05001", name:"Medellin" }, { code:"11001", name:"Bogota" }];
const conductoresPrueba = [{ id:7, nombre:"Juan Esteban Castrillon", placa:"NLX290", activo:true, nit_proveedor:"900" }];
casos.push(["NuevoPedidoMovil/paso1", React.createElement(NuevoPedidoMovil, {
 form: formNuevo, setForm(){}, ciudades: ciudadesPrueba, conductores: conductoresPrueba, conductoresActivos: conductoresPrueba,
 paqueterias: ["Servientrega"], transportistas: [], onCrear(){}, onClose(){},
})]);
casos.push(["NuevoPedidoMovil/paso2", React.createElement(NuevoPedidoMovil, {
 form: formNuevo, setForm(){}, ciudades: ciudadesPrueba, conductores: conductoresPrueba, conductoresActivos: conductoresPrueba,
 paqueterias: ["Servientrega"], transportistas: [], onCrear(){}, onClose(){}, pasoInicial: 1,
})]);

// Disenio 19: gestionar devolucion y recogida.
const devSinAsignar = { id:"DV-1", guia:"DV-2026-0001", estado:"sin_asignar", factura:"FAC-001", pedido_ref:"PED-001",
 unidades:5, peso_kg:20, volumen_m3:1, ciudad_nombre:"Medellin", dir_recogida:"Calle 52 #45-30, Centro", motivo:"Producto averiado en transporte" };
const recEnTransito = { id:"RC-1", guia:"RC-2026-0001", estado:"en_transito", conductor_id:7, tipo:"propio",
 dir_recogida:"Calle 45 #22-10", ciudad_recogida_nombre:"Abriaqui", dir_entrega:"Cra 43A #1-50, Of. 302", ciudad_entrega_nombre:"Medellin",
 unidades:5, peso_kg:10, volumen_m3:0.5, fecha_creacion:"2026-09-23", solicitado_por:"Operador", observaciones:"Fragil, llevar carretilla" };
const gestion = (props) => React.createElement(GestionEnvioMovil, {
 conductores: conductoresPrueba, transportistas: [{ nit:"900", nombre:"Transportes Andina" }], paqueterias: ["Servientrega"],
 onClose(){}, onAsignar(){}, onEntregado(){}, showToast(){}, ...props,
});
casos.push(["GestionEnvioMovil/devolucion_sin_asignar", gestion({ tipo:"devolucion", item: devSinAsignar })]);
casos.push(["GestionEnvioMovil/recogida_en_transito", gestion({ tipo:"recogida", item: recEnTransito })]);
casos.push(["GestionEnvioMovil/solo_lectura", gestion({ tipo:"devolucion", item: devSinAsignar, canEdit: false })]);

// Disenio 20: gestionar PQRS.
const pqrsAbierta = { id:"PQRS-2026-0002", estado:"abierta", factura:"FAC-02", pedido_ref:"PED-02", motivo:"Incidente",
 descripcion:"Sin comunicacion del conductor durante el transito", solicitado_por:"Cliente Interno Prueba", fecha_creacion:"2026-06-09" };
const pqrsGestionada = { ...pqrsAbierta, estado:"en_gestion", respuesta:"Se contacto al conductor y se confirmo la entrega.",
 gestionado_por:"Operador", fecha_gestion:"2026-06-11", soporte_nombre:"confirmacion-cliente.pdf" };
const gestionPqrs = (props) => React.createElement(GestionPqrsMovil, {
 onClose(){}, onRegistrar(){}, onCerrar(){}, onSoporte(){}, showToast(){}, ...props,
});
casos.push(["GestionPqrsMovil/abierta", gestionPqrs({ item: pqrsAbierta })]);
casos.push(["GestionPqrsMovil/en_gestion", gestionPqrs({ item: pqrsGestionada })]);
casos.push(["GestionPqrsMovil/cerrada", gestionPqrs({ item: { ...pqrsGestionada, estado:"cerrada" } })]);

// Estado de pedidos del cliente (escritorio).
casos.push(["Consultas/cliente", React.createElement(Consultas, {
 pedidos, conductores: conductoresPrueba, ciudades: ciudadesPrueba, showToast(){}, onNuevaPQRS(){},
})]);

casos.push(["GestionAsesores/admin", React.createElement(GestionAsesores, { showToast(){} })]);
casos.push(["GestionAsesores/cliente", React.createElement(GestionAsesores, { showToast(){}, soloCrear:true })]);

let fallos = 0;
for (const [nombre, elemento] of casos) {
 try {
  const html = renderToString(elemento);
  if (!html || html.length < 20) { console.log("VACIO  " + nombre); fallos++; }
  else console.log("ok     " + nombre + " (" + html.length + " car.)");
 } catch (e) {
  console.log("FALLA  " + nombre + ": " + e.message);
  fallos++;
 }
}
// El cliente puede crear asesores y nada mas. El importador de CSV hace upsert:
// sobre un codigo que ya existe sobrescribe el asesor de otro, que es justo lo
// que no se le concedio, asi que no debe verlo. Si alguien quita el recorte, la
// pantalla seguiria dibujando y solo fallaria contra la base; esto lo dice aqui.
{
 const dibujar = (props) => renderToString(React.createElement(GestionAsesores, props));
 const htmlAdmin = dibujar({ showToast(){} });
 const htmlCliente = dibujar({ showToast(){}, soloCrear:true });
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  asesores: " + queja); fallos++; } };
 exigir(htmlAdmin.includes("Importar CSV"), "el admin perdio el importador");
 exigir(!htmlCliente.includes("Importar CSV"), "el cliente ve el importador");
 exigir(htmlCliente.includes("Nuevo asesor"), "el cliente no puede crear");
 exigir(!htmlCliente.includes("Acciones"), "el cliente ve la columna de editar y borrar");
}

// La novedad del conductor se marca en el paso 1 y se confirma en el 2. Antes
// el boton llamaba a un onNovedad que no hacia nada visible y la confirmacion
// mandaba false fijo, asi que el pedido se guardaba Entregado. Si el estado
// deja de viajar hasta el resumen, esto lo dice.
{
 const entrega = (props) => renderToString(React.createElement(RegistrarEntregaMovil, {
  pedido: pedidos[0], promesa: promesas[0],
  onConfirmar(){}, onClose(){}, ...props,
 }));
 const conNovedad = entrega({ pasoInicial: 1, novedadInicial: true });
 const sinNovedad = entrega({ pasoInicial: 1, novedadInicial: false });
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  novedad: " + queja); fallos++; } };
 exigir(conNovedad.includes("Con Novedad"), "el paso de confirmar no avisa que queda con novedad");
 exigir(conNovedad.includes("Con novedad"), "el resumen no muestra el estado con novedad");
 exigir(sinNovedad.includes("Entregado"), "sin novedad el resumen no dice Entregado");
 exigir(!sinNovedad.includes("Con novedad"), "sin marcarla el resumen ya dice con novedad");
}

// Disenio 18: el pedido abierto ofrece registrar la entrega; con la novedad
// marcada la primaria cambia a "con novedad" y pide el motivo; el cerrado no
// ofrece nada, porque un pedido entregado ya no se toca. Si las acciones se
// cuelan en el cerrado, el conductor puede reabrir algo que ya cerro.
{
 const dibujar = (props) => renderToString(React.createElement(DetallePedidoConductor, {
  pedido: pedidos[0], onCerrar(){}, onGuia(){}, onEntregar(){}, onVerSoportes(){}, ...props,
 }));
 const abierto = dibujar({ parada: 5, totalParadas: 9 });
 const conNovedad = dibujar({ novedadInicial: true });
 const cerrado = dibujar({ pedido: { ...pedidos[1], soportes:["a.jpg"] } });
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  conductor: " + queja); fallos++; } };
 exigir(abierto.includes("Registrar entrega"), "el pedido activo no ofrece registrar la entrega");
 exigir(abierto.includes("Parada 5 de 9"), "el detalle no dice en que parada va");
 exigir(conNovedad.includes("Registrar con novedad"), "con novedad la primaria no cambia");
 exigir(conNovedad.includes("Elige el motivo"), "con novedad no pide el motivo");
 exigir(!cerrado.includes("Registrar entrega") && !cerrado.includes("Registrar con novedad"), "el pedido cerrado deja registrar la entrega otra vez");
 exigir(cerrado.includes("Ver soporte"), "el pedido cerrado con soportes no deja verlos");
 const tarjeta = renderToString(React.createElement(TarjetaEntrega, { pedido: pedidos[0], parada: 5, onAbrir(){} }));
 exigir(tarjeta.includes(pedidos[0].cliente) && tarjeta.includes("Medellin"), "la tarjeta no muestra a quien y a donde");
}

// La ruta del conductor: por urgencia de la promesa, salvo lo que el conductor
// ordeno a mano, que va primero; lo nuevo se agrega al final por urgencia.
{
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  ruta: " + queja); fallos++; } };
 const prom = [{ ciudad_codigo: "05001", dias_plazo: 2 }];
 const A = { id: "A", fecha_creacion: "2026-09-20", ciudad_codigo: "05001" };                          // vence 22
 const B = { id: "B", fecha_creacion: "2026-09-10", ciudad_codigo: "99999", fecha_estimada: "2026-09-25" }; // vence 25
 const C = { id: "C", fecha_creacion: "2026-09-01", ciudad_codigo: "99999" };                          // sin promesa
 const D = { id: "D", fecha_creacion: "2026-09-19", ciudad_codigo: "05001" };                          // vence 21
 const E = { id: "E", fecha_creacion: "2026-09-18", ciudad_codigo: "05001", fecha_estimada: "2026-09-30" }; // vence 20
 const ids = xs => xs.map(x => x.id).join("");
 // Sin tabla de promesas manda la fecha estimada, y sin ninguna fecha, la antiguedad.
 exigir(ids(ordenarRuta([A, B, C, D])) === "BCDA", "sin promesas no usa la fecha estimada ni la antiguedad: " + ids(ordenarRuta([A, B, C, D])));
 exigir(ids(ordenarRuta([A, B, C, D], {}, prom)) === "DABC", "sin orden a mano no va por urgencia de la promesa: " + ids(ordenarRuta([A, B, C, D], {}, prom)));
 exigir(ids(ordenarRuta([A, B, C, D], { B: 1, C: 2 }, prom)) === "BCDA", "lo ordenado a mano no va primero: " + ids(ordenarRuta([A, B, C, D], { B: 1, C: 2 }, prom)));
 exigir(ids(ordenarRuta([A, B, C, D, E], { B: 1, C: 2 }, prom)) === "BCEDA", "lo asignado despues no se agrega por urgencia: " + ids(ordenarRuta([A, B, C, D, E], { B: 1, C: 2 }, prom)));
 const reord = renderToString(React.createElement(ReordenarRuta, { pedidos: [A, B], aMano: false, onGuardar(){}, onCancelar(){}, onRestablecer(){} }));
 exigir(!reord.includes("Volver al orden por promesa"), "ofrece volver a la promesa cuando ya esta por promesa");
 const reord2 = renderToString(React.createElement(ReordenarRuta, { pedidos: [A, B], aMano: true, onGuardar(){}, onCancelar(){}, onRestablecer(){} }));
 exigir(reord2.includes("Volver al orden por promesa"), "con orden a mano no deja volver a la promesa");
}

// Disenio 19: sin conductor se ofrece elegirlo y se avisa; con conductor se
// muestra con su placa y se puede cambiar; el cliente solo lee. Disenio 12: el
// paso 2 se puede saltar y crea; el paso 1 solo continua.
{
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  gestion: " + queja); fallos++; } };
 const sin = renderToString(gestion({ tipo:"devolucion", item: devSinAsignar }));
 const con = renderToString(gestion({ tipo:"recogida", item: recEnTransito }));
 const lectura = renderToString(gestion({ tipo:"devolucion", item: devSinAsignar, canEdit: false }));
 exigir(sin.includes("Elegir conductor") && sin.includes("Sin conductor asignado"), "sin conductor no ofrece elegirlo");
 exigir(sin.includes("Motivo:") && sin.includes("Producto averiado"), "la devolucion no muestra el motivo");
 exigir(con.includes("Cambiar") && con.includes("NLX290") && !con.includes("Elegir conductor"), "con conductor no lo muestra con su placa");
 exigir(con.includes("Observaciones:"), "la recogida no muestra las observaciones");
 exigir(!lectura.includes("Guardar asignacion") && !lectura.includes("Completada") && lectura.includes("Cerrar"), "el cliente puede gestionar");
 const paso1 = renderToString(React.createElement(NuevoPedidoMovil, { form: formNuevo, setForm(){}, ciudades: ciudadesPrueba, conductores: conductoresPrueba, onCrear(){}, onClose(){} }));
 const paso2 = renderToString(React.createElement(NuevoPedidoMovil, { form: formNuevo, setForm(){}, ciudades: ciudadesPrueba, conductores: conductoresPrueba, onCrear(){}, onClose(){}, pasoInicial: 1 }));
 exigir(paso1.includes("Continuar") && !paso1.includes("Saltar"), "el paso 1 no continua o deja saltar");
 exigir(paso2.includes("Saltar") && paso2.includes("Crear pedido"), "el paso 2 no deja saltar ni crear");
}

// Disenio 20: la abierta pide la respuesta y deja registrar; la gestionada
// muestra la gestion como historial y ya no deja escribir otra (la base guarda
// una sola); la cerrada no ofrece acciones. Estado de pedidos: cabecera,
// indicadores como filtro, y Rastrear/Guia por fila.
{
 const exigir = (cond, queja) => { if (!cond) { console.log("FALLA  pqrs: " + queja); fallos++; } };
 const abierta = renderToString(gestionPqrs({ item: pqrsAbierta }));
 const gestionada = renderToString(gestionPqrs({ item: pqrsGestionada }));
 const cerrada = renderToString(gestionPqrs({ item: { ...pqrsGestionada, estado:"cerrada" } }));
 exigir(abierta.includes("Registrar gestion") && abierta.includes("Que se hizo y que se le respondio"), "la abierta no pide la respuesta");
 exigir(abierta.includes("Abierta hace"), "la abierta no dice cuanto lleva abierta");
 exigir(gestionada.includes("Gestiones") && gestionada.includes("Operador") && gestionada.includes("confirmacion-cliente.pdf"), "la gestionada no muestra el historial");
 exigir(!gestionada.includes("Que se hizo y que se le respondio") && gestionada.includes("ya fue registrada"), "la gestionada deja escribir otra respuesta");
 exigir(!cerrada.includes("Registrar gestion") && !cerrada.includes("Cerrar PQRS"), "la cerrada ofrece acciones");
 const consultas = renderToString(React.createElement(Consultas, { pedidos, conductores: conductoresPrueba, ciudades: ciudadesPrueba, showToast(){}, onNuevaPQRS(){} }));
 exigir(consultas.includes("Estado de pedidos") && consultas.includes("Nueva PQRS") && consultas.includes("Exportar"), "estado de pedidos sin cabecera");
 exigir(consultas.includes("Total pedidos") && consultas.includes("Novedades"), "estado de pedidos sin indicadores");
 exigir(consultas.includes("Rastrear") && consultas.includes("Guia"), "estado de pedidos sin acciones por fila");
}

globalThis.__fallos = fallos;
`;

const archivoEntrada = path.join(tmp, 'entrada.jsx');
fs.writeFileSync(archivoEntrada, entrada);

const salida = path.join(tmp, 'salida.cjs');
esbuild.buildSync({
  entryPoints: [archivoEntrada],
  bundle: true,
  outfile: salida,
  platform: 'node',
  format: 'cjs',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.png': 'dataurl' },
  jsx: 'automatic',
  logLevel: 'error',
  // La pantalla arrastra el cliente de Supabase, que lee import.meta.env. Fuera
  // del navegador no existe: se le dan valores de mentira porque la prueba solo
  // dibuja, nunca consulta.
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ejemplo.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('clave-de-prueba'),
  },
});

// El codigo consulta el ancho de la ventana al montar: fuera del navegador se
// responde que no es un celular, que es el caso que mas ramas recorre.
let anchoMovil = false;
global.window = {
  matchMedia: () => ({ matches: anchoMovil, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  location: { href: 'https://ejemplo.test/' },
};
global.document = { addEventListener() {}, removeEventListener() {}, body: { style: {} }, fonts: { ready: Promise.resolve() } };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.cancelAnimationFrame = clearTimeout;

for (const movil of [false, true]) {
  anchoMovil = movil;
  console.log("\n--- " + (movil ? "celular" : "escritorio") + " ---");
  delete require.cache[require.resolve(salida)];
  require(salida);
  if (globalThis.__fallos) break;
}

fs.rmSync(tmp, { recursive: true, force: true });
const fallos = globalThis.__fallos || 0;
console.log(fallos ? `\n${fallos} pantalla(s) no renderizan.` : '\nTodas las pantallas renderizan.');
process.exit(fallos ? 1 : 0);

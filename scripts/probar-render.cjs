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

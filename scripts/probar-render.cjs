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

const pedidos = [
 { id:"PX000119704", estado:"en_transito", fecha_creacion:"2026-09-01", ciudad_codigo:"05001", cliente:"ACME" },
 { id:"PX000119696", estado:"entregado", fecha_creacion:"2026-09-02", fecha_real:"2026-09-04", ciudad_codigo:"05001", cliente:"Beta" },
 { id:"PX000119693", estado:"sin_asignar", fecha_creacion:"2026-08-20", ciudad_codigo:"05001", cliente:"Gamma" },
];
const promesas = [{ ciudad_codigo:"05001", dias_plazo:2 }];
const pqrs = [{ id:1, estado:"en_gestion" }];
const ROLES_PRUEBA = ["admin","operador","cartera","transportista","conductor","cliente"];

const casos = [];
casos.push(["Dashboard", React.createElement(Dashboard, {
 pedidos, conductores:[], devoluciones:[], recogidas:[], pqrs, promesas,
 ciudades:[{ code:"05001", name:"Medellin" }], setActiveTab(){}, onBuscarPedido(){}, onVerEstado(){},
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

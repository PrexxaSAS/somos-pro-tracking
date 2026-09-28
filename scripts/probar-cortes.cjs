// Compara las dos formas de asignar cortes contra una base simulada en memoria:
// asignarCorte (un pedido a la vez, la que usa Gestion) y crearAsignadorCortes
// (el cargue por lotes). Con el mismo plano, las dos tienen que dar el mismo
// corte a cada pedido y dejar los mismos contadores. Si difieren, el cargue
// estaria repartiendo distinto de como reparte cartera al aprobar uno a uno.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const raiz = process.cwd();
const tmp = fs.mkdtempSync(path.join(raiz, 'node_modules', '.cortes-'));

// Base en memoria con lo minimo que usan las dos funciones.
const falsaBase = `
let db = {};
let n = 0;
export const reiniciar = (datos) => { db = JSON.parse(JSON.stringify(datos)); n = 0; };
export const tabla = (t) => db[t];
export const llamadas = { total: 0 };
function consulta(t) {
  const filtros = []; let op = 'select', valores = null, relacion = false;
  const q = {
    select(cols) { if (String(cols || '').includes('cortes_sede(')) relacion = true; return q; },
    eq(c, v) { filtros.push(r => r[c] === v); return q; },
    in(c, vs) { filtros.push(r => vs.includes(r[c])); return q; },
    insert(v) { op = 'insert'; valores = v; return q; },
    update(v) { op = 'update'; valores = v; return q; },
    ejecutar() {
      llamadas.total++;
      const filas = db[t] || (db[t] = []);
      if (op === 'insert') {
        const nuevos = (Array.isArray(valores) ? valores : [valores]).map(v => ({ id: 'id' + (++n), ...v }));
        filas.push(...nuevos); return nuevos;
      }
      const hallados = filas.filter(r => filtros.every(f => f(r)));
      if (op === 'update') { hallados.forEach(r => Object.assign(r, valores)); return hallados; }
      return hallados.map(r => relacion ? { ...r, cortes_sede: db.cortes_sede.filter(c => c.sede_id === r.id) } : { ...r });
    },
    maybeSingle() { const r = q.ejecutar(); return Promise.resolve({ data: r[0] || null, error: null }); },
    single() { const r = q.ejecutar(); return Promise.resolve({ data: r[0] || null, error: r[0] ? null : { message: 'sin fila' } }); },
    then(ok, mal) { return Promise.resolve({ data: q.ejecutar(), error: null }).then(ok, mal); },
  };
  return q;
}
export const supabase = { from: consulta };
`;
fs.writeFileSync(path.join(tmp, 'falsa.js'), falsaBase);

const entrada = `
import { asignarCorte, crearAsignadorCortes } from '${raiz.replace(/\\/g, '/')}/src/modules/cartera/ModuloCartera';
import { reiniciar, tabla, llamadas } from './falsa.js';
export { asignarCorte, crearAsignadorCortes, reiniciar, tabla, llamadas };
`;
fs.writeFileSync(path.join(tmp, 'entrada.js'), entrada);

const salida = path.join(tmp, 'salida.cjs');
const construir = () => esbuild.build({
  entryPoints: [path.join(tmp, 'entrada.js')], bundle: true, outfile: salida,
  platform: 'node', format: 'cjs', jsx: 'automatic', logLevel: 'error',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.png': 'dataurl' },
  plugins: [{
    name: 'base-falsa',
    setup(b) {
      b.onResolve({ filter: /(^|\/)supabase$/ }, () => ({ path: path.join(tmp, 'falsa.js') }));
    },
  }],
});
global.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

let m;
let fallos = 0;
const exigir = (cond, queja) => { if (!cond) { console.log('FALLA  ' + queja); fallos++; } };

(async () => {
  await construir();
  m = require(salida);
  // Cortes a las 23:58 y 23:59 de hoy (casi siempre en el futuro) con cupo 3 y
  // 2, mas uno ya pasado a las 00:00. Una sede inactiva y un DANE sin sede.
  const base = {
    sedes: [
      { id: 's1', nombre: 'CEDI La Estrella', dane_code: '5380', activa: true },
      { id: 's2', nombre: 'Funza', dane_code: '25286', activa: false },
    ],
    cortes_sede: [
      { id: 'c0', sede_id: 's1', hora_corte: '00:00:00', capacidad_corte: 50 },
      { id: 'c2', sede_id: 's1', hora_corte: '23:59:00', capacidad_corte: 2 },
      { id: 'c1', sede_id: 's1', hora_corte: '23:58:00', capacidad_corte: 3 },
      { id: 'c3', sede_id: 's2', hora_corte: '10:00:00', capacidad_corte: 5 },
    ],
    cortes_programados: [],
  };
  const plano = ['05380', '05380', '25286', '05380', '', '11001', '05380', '05380', '05380', '05380'];

  m.reiniciar(base);
  m.llamadas.total = 0;
  const viejo = [];
  for (const d of plano) { const c = await m.asignarCorte(d); viejo.push(c ? `${c.horaCorte}@${c.fechaCorte}` : null); }
  const cuentaViejo = m.tabla('cortes_programados').map(c => `${c.hora_corte}/${c.fecha}=${c.pedidos_asignados}`).sort();
  const llamadasViejo = m.llamadas.total;

  m.reiniciar(base);
  m.llamadas.total = 0;
  const a = await m.crearAsignadorCortes();
  const nuevo = [];
  for (const d of plano) { const c = await a.asignar(d); nuevo.push(c ? `${c.horaCorte}@${c.fechaCorte}` : null); }
  await a.guardar();
  const cuentaNuevo = m.tabla('cortes_programados').map(c => `${c.hora_corte}/${c.fecha}=${c.pedidos_asignados}`).sort();
  const llamadasNuevo = m.llamadas.total;

  exigir(JSON.stringify(viejo) === JSON.stringify(nuevo), 'los cortes asignados difieren:\n  uno a uno ' + JSON.stringify(viejo) + '\n  por lotes ' + JSON.stringify(nuevo));
  exigir(JSON.stringify(cuentaViejo) === JSON.stringify(cuentaNuevo), 'los contadores difieren: ' + JSON.stringify(cuentaViejo) + ' vs ' + JSON.stringify(cuentaNuevo));
  exigir(nuevo[2] === null && nuevo[4] === null && nuevo[5] === null, 'asigna corte a una sede inactiva, sin DANE o sin sede');
  exigir(llamadasNuevo < llamadasViejo, `el cargue no ahorra llamadas: ${llamadasNuevo} vs ${llamadasViejo}`);
  console.log(`asignaciones: ${JSON.stringify(nuevo)}`);
  console.log(`contadores: ${JSON.stringify(cuentaNuevo)}`);
  console.log(`llamadas a la base: uno a uno ${llamadasViejo}, por lotes ${llamadasNuevo}`);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fallos ? `\n${fallos} diferencia(s).` : '\nLas dos asignaciones coinciden.');
  process.exit(fallos ? 1 : 0);
})();

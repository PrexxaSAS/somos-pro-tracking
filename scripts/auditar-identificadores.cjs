const fs = require('fs');
const path = require('path');
const base = process.cwd();

// Comprueba que cada identificador que usa una vista exista: importado, definido
// en el modulo o declarado dentro del componente. Es el chequeo que el build no
// hace (esbuild no resuelve identificadores) y que produce pantallas en blanco.

function jsx(dir, salida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) jsx(p, salida);
    else if (e.name.endsWith('.jsx')) salida.push(p);
  }
  return salida;
}

// Nombres que vienen del entorno, no del modulo.
const GLOBALES = new Set([
  'React', 'window', 'document', 'console', 'navigator', 'localStorage', 'sessionStorage',
  'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise',
  'Set', 'Map', 'Intl', 'Error', 'File', 'FileReader', 'Blob', 'URL', 'FormData',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'alert', 'confirm',
  'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent', 'atob', 'btoa',
  'Fragment', 'TextDecoder', 'TextEncoder', 'Image', 'Audio', 'Intl',
]);

let problemas = 0;

for (const abs of jsx(path.join(base, 'src'))) {
  const rel = path.relative(base, abs).replace(/\\/g, '/');
  const texto = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const lineas = texto.split('\n');

  // Todo lo que el modulo trae o declara, sin distinguir alcance: basta con que
  // el nombre exista en alguna parte del archivo para descartar el fallo duro.
  const conocidos = new Set(GLOBALES);
  for (const m of texto.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    m[1].split(',').forEach(x => {
      const n = x.trim().split(/\s+as\s+/).pop().trim();
      if (n) conocidos.add(n);
    });
  }
  for (const m of texto.matchAll(/^import\s+([A-Za-z0-9_$]+)/gm)) conocidos.add(m[1]);
  for (const m of texto.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g)) conocidos.add(m[1]);
  // Desestructuraciones: const [a, setA] = ..., const {a, b} = ..., props del componente.
  for (const m of texto.matchAll(/(?:const|let|var)\s*[[{]([^\]}]+)[\]}]\s*=/g)) {
    m[1].split(',').forEach(x => {
      const n = x.split(':').pop().split('=')[0].trim().replace(/^\.\.\./, '');
      if (/^[A-Za-z0-9_$]+$/.test(n)) conocidos.add(n);
    });
  }
  for (const m of texto.matchAll(/function\s+[A-Za-z0-9_$]+\s*\(\s*\{([^}]*)\}/g)) {
    m[1].split(',').forEach(x => {
      const n = x.split(':').pop().split('=')[0].trim().replace(/^\.\.\./, '');
      if (/^[A-Za-z0-9_$]+$/.test(n)) conocidos.add(n);
    });
  }
  // Parametros de funciones flecha y callbacks: (a, b) => ..., ([a, b]) => ... y a => ...
  for (const m of texto.matchAll(/\(([^()]*)\)\s*=>/g)) {
    m[1].replace(/[[\]{}]/g, ' ').split(',').forEach(x => {
      const n = x.split(':').pop().split('=')[0].trim().replace(/^\.\.\./, '');
      if (/^[A-Za-z0-9_$]+$/.test(n)) conocidos.add(n);
    });
  }
  for (const m of texto.matchAll(/(?:^|[^A-Za-z0-9_$.])([A-Za-z0-9_$]+)\s*=>/g)) conocidos.add(m[1]);
  for (const m of texto.matchAll(/catch\s*\(\s*([A-Za-z0-9_$]+)/g)) conocidos.add(m[1]);
  for (const m of texto.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z0-9_$]+)/g)) conocidos.add(m[1]);

  // Usos que revientan en tiempo de ejecucion si el nombre no existe.
  const usos = new Map(); // nombre -> primera linea
  const anota = (n, i) => { if (!usos.has(n)) usos.set(n, i + 1); };
  lineas.forEach((l, i) => {
    for (const m of l.matchAll(/<([A-Z][A-Za-z0-9_$]*)/g)) anota(m[1], i);
    for (const m of l.matchAll(/\bon[A-Z][A-Za-z]*=\{([A-Za-z0-9_$]+)\}/g)) anota(m[1], i);
    for (const m of l.matchAll(/style=\{\{?\s*(?:\.\.\.)?([a-zA-Z][A-Za-z0-9_$]*)[,\s}]/g)) anota(m[1], i);
    for (const m of l.matchAll(/style=\{([a-zA-Z][A-Za-z0-9_$]*)\}/g)) anota(m[1], i);
  });

  const fallos = [...usos].filter(([n]) => !conocidos.has(n));
  if (fallos.length) {
    problemas += fallos.length;
    console.log('FALLA  ' + rel);
    fallos.forEach(([n, ln]) => console.log(`       linea ${ln}: ${n} no esta definido ni importado`));
  } else {
    console.log('ok     ' + rel);
  }
}

console.log(problemas
  ? `\n${problemas} identificador(es) sin definir.`
  : '\nTodos los identificadores usados existen.');
process.exit(problemas ? 1 : 0);

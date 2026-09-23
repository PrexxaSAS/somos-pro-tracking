const fs = require('fs');
const base = process.cwd() + '/';

// Comprueba que cada identificador que un modal invoca exista dentro del mismo
// componente. Es el chequeo que el build no hace y que produce pantallas en blanco.
const archivos = [
  'src/SomosProTracking.jsx',
  'src/modules/usuarios/Usuarios.jsx',
  'src/modules/conductores/Conductores.jsx',
  'src/modules/facturas/FacturasProveedor.jsx',
];

// Props de ModalForm y handlers que apuntan a una funcion del componente.
const patrones = [
  /onPrimario=\{([A-Za-z0-9_]+)\}/,
  /onClose=\{([A-Za-z0-9_]+)\}/,
  /onArchivo=\{\(file\)=>([A-Za-z0-9_]+)\(/,
];

let problemas = 0;
archivos.forEach(rel => {
  const lineas = fs.readFileSync(base + rel, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const comps = [];
  lineas.forEach((l, i) => {
    const m = l.match(/^(?:export )?function ([A-Za-z0-9_]+)\(/);
    if (m) comps.push({ nombre: m[1], ini: i });
  });
  comps.forEach((c, i) => { c.fin = i + 1 < comps.length ? comps[i + 1].ini : lineas.length; });

  const fallos = [];
  lineas.forEach((l, i) => {
    patrones.forEach(pat => {
      const m = l.match(pat);
      if (!m) return;
      const nombre = m[1];
      const comp = comps.find(c => i >= c.ini && i < c.fin);
      if (!comp) return;
      const cuerpo = lineas.slice(comp.ini, comp.fin).join('\n');
      const declarado =
        new RegExp('(const|let|function)\\s+' + nombre + '\\b').test(cuerpo) ||
        new RegExp('\\b' + nombre + '\\s*[,}]').test(lineas[comp.ini]); // prop del componente
      if (!declarado) fallos.push(`${comp.nombre} -> ${nombre}() (linea ${i + 1})`);
    });
  });

  if (fallos.length) { problemas += fallos.length; console.log('PROBLEMAS en ' + rel + ':\n  ' + fallos.join('\n  ')); }
  else console.log('ok  ' + rel);
});

console.log(problemas === 0 ? '\nTodas las acciones de los modales existen.' : `\n${problemas} referencias sin declarar.`);

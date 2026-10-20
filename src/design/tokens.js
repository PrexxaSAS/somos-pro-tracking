// Sistema de diseno de QTracking. La referencia escrita es docs/systemdesign.md:
// si algo se contradice, manda el documento.
//
// Un solo lugar para los colores, radios y tamanos de letra. Los modulos no
// deberian llevar hexadecimales sueltos: si un color hace falta, se agrega aqui.

export const T = {
 color: {
  // Superficies
  fondo:     "#f7f6fa",  // fondo de la aplicacion
  superficie:  "#ffffff",  // tarjetas, sidebar, modales
  superficie2: "#f7f6fa",  // relleno suave: busqueda, chips, segmento
  superficie3: "#f1f0f5",  // relleno mas marcado
  hoverFila:  "#fbfafd",
  borde:     "#ecebf1",  // borde de tarjeta
  borde2:    "#e6e4ec",  // borde de control
  divisor:    "#f0eff4",  // divisor entre filas

  // Texto
  tinta:    "#17141f",  // primario
  tinta2:    "#4a4657",  // secundario
  tinta3:    "#77738a",  // terciario
  tinta4:    "#8a8697",  // deshabilitado
  placeholder: "#a09cae",
  tenue:    "#c9c5d6",

  // Marca
  marca:    "#5b35d5",
  marcaFuerte: "#4b2ab8",
  marcaSuave:  "#f1edfd",
  marcaAvatar: "#e9e3fc",
  marcaBorde:  "#ddd0fb",

  // Semanticos: solo con significado operativo, nunca como color decorativo.
  mal:     "#c33a31",  // texto
  malPunto:   "#e04a3f",  // punto y acentos
  malSuave:   "#fdecea",
  malBorde:   "#f3d3cf",
  ojo:     "#8a6420",
  ojoPunto:   "#d98b1c",
  ojoSuave:   "#fbf4e6",
  bien:     "#177a56",
  bienPunto:  "#1f9a6e",
  bienSuave:  "#e5f5ee",
  info:     "#24568f",
  infoPunto:  "#2d6fb8",
  infoSuave:  "#e8f0fa",
  neutro:    "#4a4657",
  neutroPunto: "#a39db8",
  neutroSuave: "#f1f0f5",
 },

 // Estados del pedido: cada uno con un color propio y distinto de los demas
 // (antes casi todos eran tonos del morado de la marca y no se distinguian).
 // estado = el punto y la barra apilada; estadoTono = fondo y texto de la pastilla.
 estado: {
  sin_asignar:     "#9a96a8",  // gris
  en_transito:     "#f59e0b",  // amarillo-naranja
  paqueteria:      "#2d6fb8",  // azul
  entregado:       "#1f9a6e",  // verde
  novedad:         "#e04a3f",  // rojo
  solo_facturar:   "#0e9aa7",  // turquesa
  cliente_recoge:  "#d6409f",  // rosado
 },
 estadoTono: {
  sin_asignar:     { bg: "#f1f0f5", color: "#4a4657" },
  en_transito:     { bg: "#fef3dc", color: "#9a5a00" },
  paqueteria:      { bg: "#e8f0fa", color: "#24568f" },
  entregado:       { bg: "#e5f5ee", color: "#177a56" },
  novedad:         { bg: "#fdecea", color: "#c33a31" },
  solo_facturar:   { bg: "#e3f5f6", color: "#0b6e78" },
  cliente_recoge:  { bg: "#fcebf5", color: "#a3266f" },
 },

 fuente: {
  ui: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
 },

 radio: { chico: 6, control: 10, boton: 10, tarjeta: 14, pastilla: 999 },

 sombra: {
  tarjeta: "none",                    // las tarjetas se definen por el borde
  segmento: "0 1px 2px rgba(0,0,0,.08)",
  flotante: "0 12px 32px rgba(23,20,31,.14)",
 },

 texto: {
  titulo:   { fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" },
  subtitulo: { fontSize: 14, fontWeight: 400 },
  tarjeta:  { fontSize: 15, fontWeight: 700 },
  cifra:   { fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" },
  cifraGrande:{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" },
  seccion:  { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" },
  meta:    { fontSize: 12, fontWeight: 400 },
 },
};

// Tarjeta base: sin sombra, definida por su borde.
// Color de la pestana activa del filtro de Pedidos: el de su estado. Todos va
// en el color de la marca; fuera de promesa en rojo y en riesgo en ambar.
// fuerte = texto, linea o relleno; suave = fondo del contador.
export const tonoFiltroPedido = (clave) => {
  if (clave === "fuera_promesa") return { fuerte: T.color.mal, suave: T.color.malSuave };
  if (clave === "en_riesgo") return { fuerte: T.color.ojo, suave: T.color.ojoSuave };
  const tono = T.estadoTono[clave];
  return tono ? { fuerte: tono.color, suave: tono.bg } : { fuerte: T.color.marca, suave: T.color.marcaSuave };
};

export const tarjeta = {
 background: T.color.superficie,
 border: `1px solid ${T.color.borde}`,
 borderRadius: T.radio.tarjeta,
};

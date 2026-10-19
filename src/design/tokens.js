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

 // Estados del pedido para la barra apilada y los chips.
 estado: {
  sin_asignar:   "#a39db8",
  pendiente:    "#d6d2e2",
  en_transito:   "#9b7ff5",
  paqueteria:    "#c3b1fa",
  entregado:    "#5b35d5",
  novedad:     "#e04a3f",
  solo_facturar:  "#1f8a7a",
  cliente_recoge:  "#2d6fb8",
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
export const tarjeta = {
 background: T.color.superficie,
 border: `1px solid ${T.color.borde}`,
 borderRadius: T.radio.tarjeta,
};

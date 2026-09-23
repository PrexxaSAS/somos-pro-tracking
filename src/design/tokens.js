// Sistema de diseno de QTracking.
//
// Un solo lugar para los colores, radios, sombras y tamanos de letra. Los modulos
// no deberian llevar hexadecimales sueltos: si un color hace falta, se agrega aqui.
//
// La paleta de estado (T.estado) esta validada para graficas: los ocho estados de
// un pedido se distinguen entre si con vision normal y con daltonismo, incluso
// cuando aparecen pegados en la barra apilada del dashboard. Si se cambia alguno,
// hay que volver a validar la secuencia completa antes de usarla en una grafica.

export const T = {
 color: {
  // Superficies
  fondo:     "#f6f7f9",  // fondo de la aplicacion
  superficie:  "#ffffff",  // tarjetas, sidebar, modales
  superficie2: "#fafafb",  // filas alternas, zonas hundidas
  borde:     "#ececf1",
  borde2:    "#e2e3ea",  // bordes de controles

  // Texto
  tinta:    "#16161d",
  tinta2:    "#5b5b6b",
  tinta3:    "#8e8e9e",

  // Marca
  marca:    "#6d42d8",
  marcaFuerte: "#5a34bd",
  marcaSuave:  "#f1ecfd",
  marcaBorde:  "#ddd0fb",

  // Estado de la interfaz (avisos, no series de datos)
  bien:     "#15803d",
  bienSuave:  "#f0fdf4",
  ojo:     "#d97706",
  ojoSuave:   "#fffbeb",
  mal:     "#dc2626",
  malSuave:   "#fef2f2",
 },

 // Estados del pedido. El color se usa en badges, leyendas y en la barra apilada.
 // Secuencia validada en este orden; no reordenar sin volver a comprobarla.
 estado: {
  sin_asignar:   "#64748b", // gris a proposito: es el estado "sin nada todavia"
  pendiente:    "#d97706",
  en_transito:   "#7c3aed",
  paqueteria:    "#0891b2",
  entregado:    "#15803d",
  novedad:     "#dc2626",
  solo_facturar:  "#0d9488",
  cliente_recoge:  "#a21caf",
 },

 radio: { chico: 8, control: 10, tarjeta: 16, pastilla: 999 },

 sombra: {
  tarjeta: "0 1px 2px rgba(16,16,29,.04)",
  flotante: "0 12px 32px rgba(16,16,29,.12)",
 },

 texto: {
  titulo:   { fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" },
  subtitulo: { fontSize: 14, fontWeight: 500 },
  cifra:   { fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" },
  etiqueta:  { fontSize: 12, fontWeight: 600 },
  seccion:  { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
 },
};

// Tarjeta base: la usan el dashboard y los modulos que ya migraron al diseno nuevo.
export const tarjeta = {
 background: T.color.superficie,
 border: `1px solid ${T.color.borde}`,
 borderRadius: T.radio.tarjeta,
 boxShadow: T.sombra.tarjeta,
};

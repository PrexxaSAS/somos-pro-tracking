export const P = {
 950: "#1e0050", 900: "#3b0764", 800: "#4c1d95", 700: "#6d28d9",
 600: "#7c3aed", 500: "#8b5cf6", 400: "#a78bfa", 300: "#c4b5fd",
 200: "#ddd6fe", 100: "#ede9fe", 50: "#f5f3ff",
};

export const CIUDADES = [
 { code: "11001", name: "Bogot D.C." },
 { code: "05001", name: "Medelln" },
 { code: "76001", name: "Cali" },
 { code: "08001", name: "Barranquilla" },
 { code: "13001", name: "Cartagena" },
 { code: "68001", name: "Bucaramanga" },
 { code: "17001", name: "Manizales" },
 { code: "63001", name: "Armenia" },
 { code: "66001", name: "Pereira" },
 { code: "54001", name: "Ccuta" },
 { code: "73001", name: "Ibagu" },
 { code: "52001", name: "Pasto" },
 { code: "23001", name: "Montera" },
 { code: "41001", name: "Neiva" },
 { code: "50001", name: "Villavicencio" },
 { code: "15001", name: "Tunja" },
 { code: "20001", name: "Valledupar" },
 { code: "19001", name: "Popayn" },
 { code: "18001", name: "Florencia" },
 { code: "44001", name: "Riohacha" },
 { code: "70001", name: "Sincelejo" },
 { code: "27001", name: "Quibd" },
];

export const PAQUETERIAS = [
 "Servientrega", "Coordinadora", "Deprisa", "TCC",
 "Envia", "Interrapidsimo", "FedEx", "DHL", "Laar", "Saferbo", "Otra",
];

export const ESTADOS_PEDIDO = {
 sin_asignar: { label: "Sin Asignar", color: "#4a4657", bg: "#f1f0f5" },
 en_transito: { label: "En Transito", color: "#9a5a00", bg: "#fef3dc" },
 paqueteria: { label: "Paqueteria", color: "#24568f", bg: "#e8f0fa" },
 entregado:  { label: "Entregado",  color: "#177a56", bg: "#e5f5ee" },
 novedad:   { label: "Con Novedad", color: "#c33a31", bg: "#fdecea" },
 // Pedidos que solo se facturan (la mercancia ya se entrego). No son despachos
 // pendientes: no cuentan como activos, vencidos ni en riesgo.
 solo_facturar: { label: "Solo Facturar", color: "#0b6e78", bg: "#e3f5f6" },
 cliente_recoge: { label: "Cliente Recoge", color: "#a3266f", bg: "#fcebf5" },
};

// Filtros de Pedidos que no son un estado sino la promesa de servicio: se
// muestran como pestanas junto a los estados y el Dashboard lleva a ellos.
export const FILTROS_PROMESA = { fuera_promesa: "Fuera de promesa", en_riesgo: "En riesgo" };

// Estados que no son despachos pendientes: el pedido no sale con conductor ni
// transportadora, asi que no cuentan como activos, vencidos ni en riesgo.
export const ESTADOS_SIN_DESPACHO = ["solo_facturar", "cliente_recoge"];

export const ROLES = {
 admin:     "Administrador",
 operador:   "Operador",
 transportista: "Empresa Transportista",
 conductor:   "Conductor",
 cliente:    "Cliente Interno",
 // Unico rol nuevo del modulo de cartera: logistica y consultas resultaron ser
 // el operador y el cliente interno que ya existian.
 cartera:    "Cartera",
};

// Roles que solo usan el modulo de cartera. No consultan pedidos, devoluciones ni
// ninguna de las tablas de tracking, asi que su sesion no carga nada de eso.
// El operador y el cliente si las usan, aunque tambien vean vistas del modulo.
export const ROLES_CARTERA = ["cartera"];

// El modulo de cartera vive en staging mientras su esquema no este creado en
// produccion: sin las tablas, entrar a cualquiera de sus vistas da error. Con
// esto apagado sus menus no se dibujan y el modulo queda inalcanzable, aunque
// el codigo viaje. Para encenderlo basta ponerlo en true: nada mas depende de
// esta bandera, y las dos ramas llevan el mismo codigo.
export const CARTERA_ACTIVA = true;

// Sedes a donde se lleva la mercancia de una devolucion. Se guarda el texto
// completo en devoluciones.dir_entrega. Para agregar una sede basta con sumarla aqui.
export const SEDES_DESTINO = [
 "01 - PLANTA ETIQUETAS - SABANETA",
 "02 - PLANTA VASOS - LA ESTRELLA",
 "03 - PRINTIA - LA ESTRELLA",
 "20 - CEDI - LA ESTRELLA",
 "22 - CEDI MATERIAS PRIMAS - CALDAS",
];

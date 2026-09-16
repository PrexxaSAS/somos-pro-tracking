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
 sin_asignar: { label: "Sin Asignar", color: "#64748b", bg: "#f1f5f9" },
 pendiente:  { label: "Pendiente",  color: "#d97706", bg: "#fffbeb" },
 en_transito: { label: "En Transito", color: "#7c3aed", bg: "#f5f3ff" },
 paqueteria: { label: "Paqueteria", color: "#0891b2", bg: "#ecfeff" },
 entregado:  { label: "Entregado",  color: "#059669", bg: "#ecfdf5" },
 novedad:   { label: "Con Novedad", color: "#dc2626", bg: "#fef2f2" },
 // Pedidos que solo se facturan (la mercancia ya se entrego). No son despachos
 // pendientes: no cuentan como activos, vencidos ni en riesgo.
 solo_facturar: { label: "Solo Facturar", color: "#0f766e", bg: "#f0fdfa" },
 cliente_recoge: { label: "Cliente Recoge", color: "#0369a1", bg: "#f0f9ff" },
};

// Estados que no son despachos pendientes: el pedido no sale con conductor ni
// transportadora, asi que no cuentan como activos, vencidos ni en riesgo.
export const ESTADOS_SIN_DESPACHO = ["solo_facturar", "cliente_recoge"];

export const ROLES = {
 admin:     "Administrador",
 operador:   "Operador",
 transportista: "Empresa Transportista",
 conductor:   "Conductor",
 cliente:    "Cliente Interno",
};



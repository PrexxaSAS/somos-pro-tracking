export const USUARIOS_INICIALES = [
  { id: 1, nombre: "Admin Sistema",           user: "admin",    pass: "1039456779", rol: "admin" },
  { id: 2, nombre: "Laura Gómez",             user: "operador", pass: "op123",      rol: "operador" },
  { id: 3, nombre: "Transportes Veloz S.A.S", user: "veloz",    pass: "trans123",   rol: "transportista", nit: "900123456-1", empresa: "Transportes Veloz S.A.S" },
  { id: 4, nombre: "Juan Pérez",              user: "driver1",  pass: "cond123",    rol: "conductor", cedula: "1012345678", placa: "ABC-123", celular: "3001234567", nit_proveedor: "900123456-1", empresa: "Transportes Veloz S.A.S" },
  { id: 5, nombre: "Almacén Central",         user: "cliente",  pass: "cli123",     rol: "cliente" },
];

export const CONDUCTORES_INICIALES = [
  { id: 4, nombre: "Juan Pérez", cedula: "1012345678", placa: "ABC-123", celular: "3001234567", nit_proveedor: "900123456-1", empresa: "Transportes Veloz S.A.S", activo: true },
];

export const TRANSPORTISTAS_INICIALES = [
  { id: 1, nombre: "Transportes Veloz S.A.S", nit: "900123456-1", contacto: "Pedro Veloz", tel: "3001234567" },
];

export const PAQUETERIAS_INICIALES = [
  "Servientrega","Coordinadora","Deprisa","TCC","Envia","Interrapidísimo","FedEx","DHL","Laar","Saferbo",
];

export const PEDIDOS_INICIALES = [
  {
    id: "PED-001", guia_interna: "SPT-2026-0001",
    cliente: "Inversiones ABC S.A.S",
    ciudad_codigo: "11001", ciudad_nombre: "Bogotá D.C.",
    direccion: "Cra 15 #93-47 Of 302", cajas: 8, factura: "FAC-2200",
    conductor_id: 4, placa: "ABC-123", nit_proveedor: "900123456-1",
    estado: "en_transito", estado_despacho: "despachado",
    novedad: false,
    fecha_creacion: "2026-04-10", fecha_estimada: "2026-04-12", fecha_real: null,
    tipo: "propio", empresa_transporte: null, paqueteria: null, guia_paqueteria: null,
    soportes: [], soportes_data: [], notas: "Frágil, manejo cuidadoso",
  },
  {
    id: "PED-002", guia_interna: "SPT-2026-0002",
    cliente: "Distribuidora del Sur Ltda",
    ciudad_codigo: "76001", ciudad_nombre: "Cali",
    direccion: "Av. 6N #23-10", cajas: 14, factura: "FAC-2201",
    conductor_id: 4, placa: "ABC-123", nit_proveedor: "900123456-1",
    estado: "en_transito", estado_despacho: "despachado",
    novedad: false,
    fecha_creacion: "2026-04-11", fecha_estimada: "2026-04-14", fecha_real: null,
    tipo: "propio", empresa_transporte: null, paqueteria: null, guia_paqueteria: null,
    soportes: [], soportes_data: [], notas: "",
  },
  {
    id: "PED-003", guia_interna: "SPT-2026-0003",
    cliente: "Tech Solutions Colombia",
    ciudad_codigo: "05001", ciudad_nombre: "Medellín",
    direccion: "El Poblado, Cra 43A #18-111", cajas: 3, factura: "FAC-2202",
    conductor_id: null, placa: null, nit_proveedor: null,
    estado: "sin_asignar", estado_despacho: "despachado",
    novedad: false,
    fecha_creacion: "2026-04-12", fecha_estimada: "2026-04-16", fecha_real: null,
    tipo: "propio", empresa_transporte: null, paqueteria: null, guia_paqueteria: null,
    soportes: [], soportes_data: [], notas: "",
  },
  {
    id: "PED-004", guia_interna: null,
    cliente: "Ferretería El Tornillo",
    ciudad_codigo: "68001", ciudad_nombre: "Bucaramanga",
    direccion: "Calle 35 #28-16", cajas: 5, factura: "FAC-2203",
    conductor_id: null, placa: null, nit_proveedor: null,
    estado: "paqueteria", estado_despacho: "despachado",
    novedad: false,
    fecha_creacion: "2026-04-09", fecha_estimada: "2026-04-13", fecha_real: null,
    tipo: "paqueteria", empresa_transporte: null, paqueteria: "Servientrega", guia_paqueteria: "SRV-2026-88741",
    soportes: [], soportes_data: [], notas: "",
  },
  {
    id: "PED-005", guia_interna: "SPT-2026-0004",
    cliente: "Papelería y Más S.A.S",
    ciudad_codigo: "08001", ciudad_nombre: "Barranquilla",
    direccion: "Vía 40 #73-25 Bodega 8", cajas: 20, factura: "FAC-2204",
    conductor_id: 4, placa: "ABC-123", nit_proveedor: "900123456-1",
    estado: "entregado", estado_despacho: "despachado",
    novedad: false,
    fecha_creacion: "2026-04-07", fecha_estimada: "2026-04-09", fecha_real: "2026-04-09",
    tipo: "propio", empresa_transporte: null, paqueteria: null, guia_paqueteria: null,
    soportes: ["firma_recibido.jpg"], soportes_data: [], notas: "Entregado al portero",
  },
];
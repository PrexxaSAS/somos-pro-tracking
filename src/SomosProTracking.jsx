import React, { useState, useEffect } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  LogOut, Plus, Search, MapPin, Bell, FileText, 
  Printer, CheckCircle, Upload, Eye, UserCog,
  Trash2, Edit, ChevronRight, X, Boxes
} from 'lucide-react';

// --- CONSTANTES ---
const P = {
  950: "#1e0050", 900: "#3b0764", 800: "#4c1d95", 700: "#6d28d9",
  600: "#7c3aed", 500: "#8b5cf6", 400: "#a78bfa", 300: "#c4b5fd",
  200: "#ddd6fe", 100: "#ede9fe", 50:  "#f5f3ff",
};

// --- COMPONENTES UI ---
const Card = ({ children, title, action }) => (
  <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
      <h3 style={{ margin: 0, color: P[900], fontSize: '1.2rem' }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style = {} }) => (
  <button onClick={onClick} style={{
    padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: "600", display: "flex", alignItems: "center", gap: "8px",
    background: variant === "primary" ? P[600] : P[100],
    color: variant === "primary" ? "white" : P[700],
    transition: "all 0.2s",
    ...style
  }}>{children}</button>
);

// --- COMPONENTE PRINCIPAL ---
export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  
  // --- ESTADOS DE DATOS ---
  const [pedidos, setPedidos] = useState([
    { id: "PED-8822", factura: "FAC-550", cajas: 12, destino: "Bogotá", estado: "Pendiente", conductorId: null }
  ]);
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Admin Sistema", user: "admin", pass: "1039456779", rol: "admin" },
    { id: 2, nombre: "Transportes Express", user: "trans1", pass: "123", rol: "transportista" },
    { id: 3, nombre: "Juan Conductor", user: "driver1", pass: "123", rol: "conductor" }
  ]);
  const [transportistas, setTransportistas] = useState([
    { id: 1, nombre: "Transportes Express", nit: "900.123.456", conductoresAsignados: [3] }
  ]);

  // --- LÓGICA DE LOGIN ---
  const [loginForm, setLoginForm] = useState({ u: "", p: "" });
  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: P[50] }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", width: "350px" }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
             <h2 style={{ color: P[800], margin: 0 }}>PRO_Tracking</h2>
             <p style={{ color: '#666', fontSize: '0.9rem' }}>Logística de Precisión</p>
          </div>
          <input type="text" placeholder="Usuario" style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} onChange={e => setLoginForm({...loginForm, u: e.target.value})} />
          <input type="password" placeholder="Contraseña" style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} onChange={e => setLoginForm({...loginForm, p: e.target.value})} />
          <Btn style={{ width: "100%", marginTop: '10px' }} onClick={() => {
            const found = usuarios.find(u => u.user === loginForm.u && u.pass === loginForm.p);
            if (found) setUser(found); else alert("Acceso denegado");
          }}>Ingresar</Btn>
        </div>
      </div>
    );
  }

  // --- FUNCIONES MÓDULOS (Ajustado a Pedido/Factura/Cajas) ---
  const agregarPedido = () => {
    const numPedido = prompt("Número de Pedido:");
    const numFactura = prompt("Número de Factura:");
    const cantCajas = prompt("Cantidad de Cajas:");
    const ciudadDestino = prompt("Ciudad Destino:");

    if (numPedido && numFactura && cantCajas) {
      setPedidos([...pedidos, { 
        id: numPedido, 
        factura: numFactura, 
        cajas: cantCajas, 
        destino: ciudadDestino || "N/A", 
        estado: "Pendiente", 
        conductorId: null 
      }]);
    }
  };

  const imprimirPlanilla = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><style>body{font-family:sans-serif;padding:40px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:12px;text-align:left}</style></head>
      <body><h1>Planilla de Cargue PRO_Tracking</h1><p>Fecha: ${new

import React, { useState, useEffect } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  LogOut, Plus, Search, MapPin, Bell, FileText, 
  Printer, CheckCircle, Upload, Eye, UserCog
} from 'lucide-react';

// --- CONSTANTES DE DISEÑO ---
const P = {
  950: "#1e0050", 900: "#3b0764", 800: "#4c1d95", 700: "#6d28d9",
  600: "#7c3aed", 500: "#8b5cf6", 400: "#a78bfa", 300: "#c4b5fd",
  200: "#ddd6fe", 100: "#ede9fe", 50:  "#f5f3ff",
};

// --- COMPONENTES UI REUTILIZABLES ---
const Card = ({ children, title, action }) => (
  <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
      <h3 style={{ margin: 0, color: P[900] }}>{title}</h3>
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
    ...style
  }}>{children}</button>
);

// --- COMPONENTE PRINCIPAL ---
export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  
  // DATOS DEL SISTEMA
  const [pedidos, setPedidos] = useState([
    { id: "PRO-1001", cliente: "Ferretería Central", destino: "Bogotá", estado: "Pendiente", conductor: "Sin Asignar", soportes: [] }
  ]);
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Admin Sistema", user: "admin", pass: "1039456779", rol: "admin" },
    { id: 2, nombre: "Transportes ABC", user: "trans1", pass: "123", rol: "transportista" },
    { id: 3, nombre: "Carlos Chofer", user: "driver1", pass: "123", rol: "conductor" },
    { id: 4, nombre: "Logística Interna", user: "cliente1", pass: "123", rol: "cliente" }
  ]);
  const [conductores, setConductores] = useState([
    { id: 101, nombre: "Carlos Chofer", transportista: "Transportes ABC", vehiculo: "Camión JAC", placa: "ABC-123" }
  ]);

  // LOGIN LÓGICA
  const [loginData, setLoginData] = useState({ u: "", p: "" });
  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: P[50] }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", width: "350px" }}>
          <h2 style={{ textAlign: "center", color: P[800] }}>PRO_Tracking</h2>
          <input type="text" placeholder="Usuario" style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} onChange={e => setLoginData({...loginData, u: e.target.value})} />
          <input type="password" placeholder="Contraseña" style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} onChange={e => setLoginData({...loginData, p: e.target.value})} />
          <Btn style={{ width: "100%" }} onClick={() => {
            const found = usuarios.find(u => u.user === loginData.u && u.pass === loginData.p);
            if (found) setUser(found); else alert("Datos incorrectos");
          }}>Entrar al Sistema</Btn>
        </div>
      </div>
    );
  }

  // FUNCIONES DE NEGOCIO
  const nuevoPedido = () => {
    const cli = prompt("Nombre del Cliente:");
    const des = prompt("Ciudad Destino:");
    if (cli && des) {
      setPedidos([...pedidos, { id: `PRO-${Date.now().toString().slice(-4)}`, cliente: cli, destino: des, estado: "Pendiente", conductor: "Sin Asignar", soportes: [] }]);
    }
  };

  const imprimirPlanilla = () => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Planilla</title></head><body><h1>Planilla de Despacho PRO</h1><table border="1" width="100%"><tr><th>ID</th><th>Cliente</th><th>Destino</th></tr>${pedidos.map(p=>`<tr><td>${p.id}</td><td>${p.cliente}</td><td>${p.destino}</td></tr>`).join('')}</table></body></html>`);
    win.print();
  };

  const renderContent = () => {
    switch (tab) {
      case "dashboard": return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <Card title="Entregas Hoy"><h2>12</h2></Card>
          <Card title="En Ruta"><h2>{pedidos.length}</h2></Card>
          <Card title="Alertas"><h2>0</h2></Card>
        </div>
      );
      case "pedidos": return (
        <Card title="Gestión de Pedidos" action={<div style={{display:"flex", gap:"10px"}}><Btn onClick={nuevoPedido}><Plus size={18}/> Nuevo</Btn><Btn onClick={imprimirPlanilla} variant="secondary"><Printer size={18}/> Planilla</Btn></div>}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}><th>ID</th><th>Cliente</th><th>Destino</th><th>Conductor</th><th>Estado</th></tr></thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}><td>{p.id}</td><td>{p.cliente}</td><td>{p.destino}</td><td>{p.conductor}</td><td><span style={{color:P[600], fontWeight:"bold"}}>{p.estado}</span></td></tr>
              ))}
            </tbody>
          </table>
        </

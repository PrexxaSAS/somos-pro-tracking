import React, { useState } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  LogOut, Plus, Search, MapPin, Bell, FileText, 
  Printer, CheckCircle, Upload, Eye, UserCog,
  Trash2, Edit, ChevronRight, X, Boxes, FileStack
} from 'lucide-react';

// --- CONSTANTES ---
const P = {
  950: "#1e0050", 900: "#3b0764", 800: "#4c1d95", 700: "#6d28d9",
  600: "#7c3aed", 500: "#8b5cf6", 400: "#a78bfa", 300: "#c4b5fd",
  200: "#ddd6fe", 100: "#ede9fe", 50:  "#f5f3ff",
};

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
    ...style
  }}>{children}</button>
);

export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  
  // --- ESTADOS DE DATOS ---
  const [pedidos, setPedidos] = useState([
    { id: "PED-8822", factura: "FAC-550", cajas: 12, destino: "Bogotá", direccion: "Calle 80 #12-34", estado: "Pendiente" },
    { id: "PED-9933", factura: "FAC-551", cajas: 5, destino: "Medellín", direccion: "Cra 43 #10-20", estado: "Pendiente" }
  ]);
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Admin", user: "admin", pass: "1039456779", rol: "admin" }
  ]);
  const [conductores, setConductores] = useState([
    { id: 101, nombre: "Juan Perez", vehiculo: "Turbo NHR", placa: "XYZ-123" },
    { id: 102, nombre: "Mario Ruiz", vehiculo: "Sencillo", placa: "ABC-789" }
  ]);

  // --- ESTADO DEL GENERADOR DE GUÍAS ---
  const [guiaActual, setGuiaActual] = useState({
    placa: "",
    pedidosSeleccionados: []
  });

  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: P[50] }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "20px", width: "350px", textAlign: 'center' }}>
          <h2 style={{ color: P[800] }}>PRO_Tracking</h2>
          <input type="text" placeholder="Usuario" style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} onChange={e => setUser({rol: 'admin', nombre: 'Admin'})} />
          <Btn style={{ width: "100%" }} onClick={() => setUser({rol: 'admin', nombre: 'Admin'})}>Ingresar</Btn>
        </div>
      </div>
    );
  }

  // --- LÓGICA DE GENERACIÓN ---
  const agregarPedidoAGuia = (pedido) => {
    if (!guiaActual.pedidosSeleccionados.find(p => p.id === pedido.id)) {
      setGuiaActual({
        ...guiaActual,
        pedidosSeleccionados: [...guiaActual.pedidosSeleccionados, pedido]
      });
    }
  };

  const imprimirGuiaDespacho = () => {
    if (!guiaActual.placa || guiaActual.pedidosSeleccionados.length === 0) {
      alert("Selecciona un vehículo y al menos un pedido");
      return;
    }

    const vehiculo = conductores.find(c => c.placa === guiaActual.placa);
    const totalCajas = guiaActual.pedidosSeleccionados.reduce((acc, p) => acc + Number(p.cajas), 0);

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><style>
        body{font-family:sans-serif;padding:30px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #333;padding:10px;text-align:left;font-size:12px}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:10px}
        .footer{margin-top:20px;text-align:right;font-size:1.2rem;font-weight:bold}
      </style></head>
      <body>
        <div class="header">
          <div><h1>GUÍA DE DESPACHO</h1><p>Fecha: ${new Date().toLocaleDateString()}</p></div>
          <div><p><strong>Vehículo:</strong> ${vehiculo?.vehiculo} (${guiaActual.placa})</p><p><strong>Conductor:</strong> ${vehiculo?.nombre}</p></div>
        </div>
        <table>
          <thead><tr><th>Factura</th><th>Ciudad</th><th>Dirección</th><th>Cajas</th><th>Recibido (Firma)</th></tr></thead>
          <tbody>
            ${guiaActual.pedidosSeleccionados.map(p => `
              <tr>
                <td>${p.factura}</td>
                <td>${p.destino}</td>
                <td>${p.direccion}</td>
                <td>${p.cajas}</td>
                <td style="width:150px"></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">TOTAL CAJAS: ${totalCajas}</div>
      </body></html>
    `);
    win.print();
  };

  const renderContent = () => {
    switch (tab) {
      case "generador_guia": return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card title="1. Seleccionar Vehículo">
            <select 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
              onChange={(e) => setGuiaActual({...guiaActual, placa: e.target.value})}
            >
              <option value="">-- Buscar Vehículo por Placa --</option>
              {conductores.map(c => <option key={c.placa} value={c.placa}>{c.placa} - {c.nombre}</option>)}
            </select>
            
            <h4 style={{marginTop: '20px'}}>Pedidos Disponibles</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {pedidos.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <span>{p.factura} ({p.destino})</span>
                  <Btn variant="secondary" onClick={() => agregarPedidoAGuia(p)}><Plus size={14}/></Btn>
                </div>
              ))}
            </div>
          </Card>

          <Card title="2. Resumen de Carga" action={<Btn onClick={imprimirGuiaDespacho}><Printer size={18}/> Imprimir Guía</Btn>}>
            <div style={{ minHeight: '300px' }}>
              <p>Vehículo: <b>{guiaActual.placa || "No seleccionado"}</b></p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{textAlign:'left'}}><th>Factura</th><th>Cajas</th><th>Eliminar</th></tr></thead>
                <tbody>
                  {guiaActual.pedidosSeleccionados.map(p => (
                    <tr key={p.id}>
                      <td>{p.factura}</td>
                      <td>{p.cajas}</td>
                      <td><button onClick={() => setGuiaActual({...guiaActual, pedidosSeleccionados: guiaActual.pedidosSeleccionados.filter(x => x.id !== p.id)})} style={{color:'red', border:'none', background:'none', cursor:'pointer'}}><X size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '10px', textAlign: 'right' }}>
                <strong>Total Cajas: {guiaActual.pedidosSeleccionados.reduce((acc, p) => acc + Number(p.cajas), 0)}</strong>
              </div>
            </div>
          </Card>
        </div>
      );
      
      case "pedidos": return (
        <Card title="Gestión de Pedidos" action={<Btn onClick={() => {
          const id = prompt("N° Pedido:");
          const fac = prompt("N° Factura:");
          const caj = prompt("Cajas:");
          const des = prompt("Ciudad:");
          const dir = prompt("Dirección:");
          if(id && fac && caj) setPedidos([...pedidos, {id, factura: fac, cajas: caj, destino: des, direccion: dir, estado: 'Pendiente'}]);
        }}>+ Nuevo</Btn>}>
           <table style={{ width: "100%" }}>
            <thead><tr style={{ textAlign: "left" }}><th>Factura</th><th>Ciudad</th><th>Dirección</th><th>Cajas</th></tr></thead>
            <tbody>
              {pedidos.map(p => (
                <tr key={p.id}><td>{p.factura}</td><td>{p.destino}</td><td>{p.direccion}</td><td>{p.cajas}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      );

      default: return <h2>Módulo de Dashboard</h2>;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc" }}>
      <aside style={{ width: "260px", background: P[950], color: "white", padding: "25px", display: "flex", flexDirection: "column" }}>
        <h2 style={{ color: P[400], marginBottom: "30px" }}>PRO_Tracking</h2>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <Btn onClick={() => setTab("dashboard")} variant={tab === "dashboard" ? "primary" : "secondary"}>Dashboard</Btn>
          <Btn onClick={() => setTab("pedidos")} variant={tab === "pedidos" ? "primary" : "secondary"}>Pedidos</Btn>
          <Btn onClick={() => setTab("generador_guia")} variant={tab === "generador_guia" ? "primary" : "secondary"}><FileStack size={18}/> Generador Guías</Btn>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        <header style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{tab.replace('_', ' ').toUpperCase()}</h1>
          <strong>{user.nombre}</strong>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

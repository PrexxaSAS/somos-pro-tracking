import React, { useState, useEffect } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  LogOut, Plus, Search, MapPin, Bell, FileText, 
  Printer, CheckCircle, Upload, Eye, UserCog,
  Trash2, Edit, ChevronRight, X
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
  
  // --- ESTADOS DE DATOS (Simulación de DB) ---
  const [pedidos, setPedidos] = useState([
    { id: "PRO-1001", cliente: "Ferretería Central", destino: "Bogotá", estado: "Pendiente", conductorId: null, soportes: [] }
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

  // --- FUNCIONES MÓDULOS ---
  const agregarPedido = () => {
    const cliente = prompt("Nombre del Cliente:");
    const destino = prompt("Destino:");
    if (cliente && destino) {
      setPedidos([...pedidos, { id: `PRO-${Math.floor(1000 + Math.random() * 9000)}`, cliente, destino, estado: "Pendiente", conductorId: null, soportes: [] }]);
    }
  };

  const imprimirPlanilla = (p) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><style>body{font-family:sans-serif;padding:40px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:12px;text-align:left}</style></head>
      <body><h1>Planilla de Cargue PRO_Tracking</h1><p>Fecha: ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>ID Pedido</th><th>Cliente</th><th>Destino</th><th>Firma Recibido</th></tr></thead>
      <tbody>${pedidos.map(p => `<tr><td>${p.id}</td><td>${p.cliente}</td><td>${p.destino}</td><td></td></tr>`).join('')}</tbody></table>
      </body></html>
    `);
    win.print();
  };

  const renderContent = () => {
    switch (tab) {
      case "dashboard": return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          <Card title="Total Pedidos"><h2>{pedidos.length}</h2></Card>
          <Card title="Conductores"><h2>{usuarios.filter(u => u.rol === 'conductor').length}</h2></Card>
          <Card title="Entregados"><h2>0</h2></Card>
        </div>
      );

      case "pedidos": return (
        <Card title="Administración de Pedidos" action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn onClick={imprimirPlanilla} variant="secondary"><Printer size={18}/> Planilla</Btn>
            <Btn onClick={agregarPedido}><Plus size={18}/> Nuevo Pedido</Btn>
          </div>
        }>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}><th>ID</th><th>Cliente</th><th>Destino</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: '12px 0' }}>{p.id}</td>
                    <td>{p.cliente}</td>
                    <td>{p.destino}</td>
                    <td><b style={{ color: P[600] }}>{p.estado}</b></td>
                    <td><Btn variant="secondary" onClick={() => alert("Asignar conductor a " + p.id)}>Asignar</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      );

      case "transportistas": return (
        <Card title="Transportistas y Conductores">
          {transportistas.map(t => (
            <div key={t.id} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4>{t.nombre} - NIT: {t.nit}</h4>
                <Btn variant="secondary" onClick={() => alert("Agregar conductor a esta empresa")}>+ Conductor</Btn>
              </div>
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>Conductores Vinculados:</p>
                {t.conductoresAsignados.map(cid => {
                  const cond = usuarios.find(u => u.id === cid);
                  return <div key={cid} style={{ padding: '5px 10px', background: P[50], display: 'inline-block', borderRadius: '5px', marginRight: '10px' }}>{cond?.nombre}</div>
                })}
              </div>
            </div>
          ))}
        </Card>
      );

      case "usuarios": return (
        <Card title="Gestión de Usuarios" action={<Btn onClick={() => alert("Crear nuevo usuario")}>+ Usuario</Btn>}>
          <table style={{ width: "100%" }}>
            <thead><tr style={{ textAlign: "left" }}><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}><td>{u.nombre}</td><td><small>{u.rol.toUpperCase()}</small></td><td><div style={{display:'flex', gap:'5px'}}><Edit size={16}/><Trash2 size={16} color="red"/></div></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      );

      case "mis_pedidos": return (
        <Card title="Panel del Conductor (Mis Entregas)">
          {pedidos.map(p => (
            <div key={p.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.cliente}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>Destino: {p.destino}</p>
              </div>
              <Btn onClick={() => alert("Subir foto de comprobante para " + p.id)}><Upload size={18}/> Comprobante</Btn>
            </div>
          ))}
        </Card>
      );

      case "cliente_interno": return (
        <Card title="Consulta de Pedidos y Descarga">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <input placeholder="ID Pedido / Cliente" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
             <Btn><Search size={18}/> Buscar</Btn>
          </div>
          {pedidos.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{p.id} - {p.cliente}</span>
              <Btn variant="secondary" onClick={() => alert("Descargando soporte PDF...")}><FileText size={18}/> Soporte</Btn>
            </div>
          ))}
        </Card>
      );

      default: return <h2>Módulo no encontrado</h2>;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc" }}>
      {/* SIDEBAR */}
      <aside style={{ width: "260px", background: P[950], color: "white", padding: "25px", display: "flex", flexDirection: "column" }}>
        <h2 style={{ color: P[400], marginBottom: "30px" }}>PRO_Tracking</h2>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          {user.rol === 'admin' && (
            <>
              <Btn onClick={() => setTab("dashboard")} variant={tab === "dashboard" ? "primary" : "secondary"}>Dashboard</Btn>
              <Btn onClick={() => setTab("pedidos")} variant={tab === "pedidos" ? "primary" : "secondary"}>Pedidos</Btn>
              <Btn onClick={() => setTab("transportistas")} variant={tab === "transportistas" ? "primary" : "secondary"}>Transportistas</Btn>
              <Btn onClick={() => setTab("usuarios")} variant={tab === "usuarios" ? "primary" : "secondary"}>Usuarios</Btn>
              <Btn onClick={() => setTab("cliente_interno")} variant={tab === "cliente_interno" ? "primary" : "secondary"}>Consulta Cliente</Btn>
            </>
          )}
          {user.rol === 'conductor' && <Btn onClick={() => setTab("mis_pedidos")}>Mis Pedidos</Btn>}
        </nav>
        <Btn variant="secondary" onClick={() => setUser(null)} style={{ background: '#442266', color: 'white' }}>
          <LogOut size={18}/> Cerrar Sesión
        </Btn>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        <header style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, textTransform: 'capitalize' }}>{tab.replace('_', ' ')}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={20} color={P[600]}/>
            <strong>{user.nombre}</strong>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}

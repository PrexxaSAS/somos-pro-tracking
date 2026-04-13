import React, { useState } from 'react';
import { 
  Layout, Users, Package, Truck, ClipboardList, 
  LogOut, Plus, Search, MapPin, Bell 
} from 'lucide-react';
import { P } from './Constants';
import { Logo, Card, Badge } from './Subcomponentes';

export default function SomosProTracking() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  const manejarLogin = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "1039456779") {
      setUser({ name: "Administrador", role: "admin" });
    } else {
      alert("Credenciales incorrectas");
    }
  };

  if (!user) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: P[50] }}>
        <Card style={{ width: '350px', textAlign: 'center' }}>
          <Logo size={60} />
          <h2 style={{ color: P[800], margin: '20px 0' }}>Iniciar Sesión</h2>
          <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Usuario" value={u} onChange={e => setU(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${P[200]}` }} />
            <input type="password" placeholder="Contraseña" value={p} onChange={e => setP(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${P[200]}` }} />
            <button type="submit" style={{ padding: '12px', background: P[600], color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* SIDEBAR COMPLETO */}
      <aside style={{ width: '260px', background: P[950], color: 'white', padding: '25px' }}>
        <Logo size={50} />
        <nav style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setTab('dashboard')} style={{ background: tab === 'dashboard' ? P[600] : 'transparent', color: 'white', border: 'none', padding: '12px', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layout size={20} /> Dashboard
          </button>
          <button onClick={() => setTab('pedidos')} style={{ background: tab === 'pedidos' ? P[600] : 'transparent', color: 'white', border: 'none', padding: '12px', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={20} /> Pedidos
          </button>
          <button onClick={() => setTab('conductores')} style={{ background: tab === 'conductores' ? P[600] : 'transparent', color: 'white', border: 'none', padding: '12px', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={20} /> Conductores
          </button>
          <button onClick={() => setUser(null)} style={{ marginTop: 'auto', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div>
            <h1>Bienvenido, {user.name}</h1>
            <p style={{ color: '#64748b' }}>Panel de gestión logística v1.0</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: P[600], color: 'white', fontWeight: 'bold' }}>+ Nuevo Pedido</button>
          </div>
        </header>

        {tab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Card><h3>24</h3><p>Pedidos en Ruta</p></Card>
            <Card><h3>12</h3><p>Entregados Hoy</p></Card>
            <Card><h3>5</h3><p>Vehículos Activos</p></Card>
            <Card style={{ gridColumn: 'span 3' }}>
              <h3>Actividad Reciente</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}><th>ID</th><th>Cliente</th><th>Estado</th></tr></thead>
                <tbody>
                  <tr><td>#PRO-101</td><td>Ferretería Central</td><td><Badge color={P[700]} bg={P[100]}>En Ruta</Badge></td></tr>
                  <tr><td>#PRO-102</td><td>Almacenes Éxito</td><td><Badge color="#059669" bg="#ecfdf5">Entregado</Badge></td></tr>
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {tab === 'pedidos' && (
          <Card>
            <h3>Módulo de Pedidos</h3>
            <p>Aquí se cargará la lista completa de guías y rastreo.</p>
          </Card>
        )}
      </main>
    </div>
  );
}

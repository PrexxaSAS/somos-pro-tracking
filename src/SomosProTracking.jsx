import { useState } from "react";

export default function SomosProTracking() {
  const [rolLogueado, setRolLogueado] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("admin");
  const [error, setError] = useState("");

  const manejarLogin = (e) => {
    e.preventDefault();
    if (tipo === "admin" && usuario === "admin" && password === "1039456779") {
      setRolLogueado("admin");
      setError("");
    } else if (tipo !== "admin" && usuario !== "" && password !== "") {
      setRolLogueado(tipo);
      setError("");
    } else {
      setError("Datos incorrectos. Verifica usuario y contraseña.");
    }
  };

  // --- VISTA DEL DASHBOARD (ADMINISTRADOR) ---
  if (rolLogueado === 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <header style={{ background: '#7c3aed', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>PRO_Tracking - Admin</h2>
          <button onClick={() => setRolLogueado(null)} style={{ background: 'white', color: '#7c3aed', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Cerrar Sesión
          </button>
        </header>

        <main style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {[
              { titulo: 'Pedidos Activos', valor: '12', color: '#7c3aed' },
              { titulo: 'Transportistas', valor: '5', color: '#10b981' },
              { titulo: 'Entregas Hoy', valor: '3', color: '#3b82f6' },
              { titulo: 'Alertas', valor: '1', color: '#ef4444' }
            ].map((item, index) => (
              <div key={index} style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: `6px solid ${item.color}` }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '14px', uppercase: 'true' }}>{item.titulo}</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0 0 0', color: '#1f2937' }}>{item.valor}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '30px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3>Panel de Control Principal</h3>
            <p style={{ color: '#6b7280' }}>Selecciona una acción para gestionar la plataforma:</p>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button style={{ padding: '12px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Inscribir Usuario</button>
              <button style={{ padding: '12px 20px', background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Ver Todos los Pedidos</button>
              <button style={{ padding: '12px 20px', background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Reportes de Flota</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- VISTA DE LOGIN (SI NO ESTÁ LOGUEADO) ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#7c3aed', fontSize: '48px', fontWeight: 'bold', margin: '0' }}>PRO_Tracking</h1>
        <p style={{ color: '#6b7280', marginTop: '10px', fontSize: '18px' }}>Gestión Logística Integral</p>
      </div>

      <div style={{ padding: '30px', maxWidth: '380px', width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#1f2937', marginBottom: '20px' }}>Iniciar Sesión</h2>
        
        {error && <p style={{ color: '#ef4444', fontSize: '14px', background: '#fee2e2', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>{error}</p>}
        
        <form onSubmit={manejarLogin

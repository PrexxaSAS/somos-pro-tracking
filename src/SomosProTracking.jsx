import { useState } from "react";

export default function SomosProTracking() {
  const [rolLogueado, setRolLogueado] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState("admin");
  const [error, setError] = useState("");

  // Lógica de Login
  const manejarLogin = (e) => {
    e.preventDefault();
    if (tipo === "admin" && usuario === "admin" && password === "1039456779") {
      setRolLogueado("admin");
    } else {
      setError("Datos incorrectos.");
    }
  };

  // --- INTERFAZ DEL ADMINISTRADOR ---
  if (rolLogueado === 'admin') {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <header style={{ background: '#7c3aed', color: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <h2>PRO_Tracking - Dashboard Admin</h2>
          <button onClick={() => setRolLogueado(null)}>Cerrar Sesión</button>
        </header>

        {/* Tarjetas de Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {[
            { titulo: 'Pedidos Activos', valor: '12' },
            { titulo: 'Transportistas', valor: '5' },
            { titulo: 'Entregas Hoy', valor: '3' },
            { titulo: 'Alertas', valor: '1' }
          ].map((item, index) => (
            <div key={index} style={{ padding: '20px', background: '#f3f4f6', borderRadius: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
              <h4 style={{ margin: 0, color: '#666' }}>{item.titulo}</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>{item.valor}</p>
            </div>
          ))}
        </div>

        {/* Módulos de Acción */}
        <div style={{ marginTop: '30px' }}>
          <h3>Acciones Rápidas</h3>
          <button style={{ marginRight: '10px', padding: '10px' }}>+ Registrar Usuario</button>
          <button style={{ padding: '10px' }}>+ Nuevo Pedido</button>
        </div>
      </div>
    );
  }

  // Login inicial...
  return ( /* ... (tu formulario de login anterior) ... */ );
}
